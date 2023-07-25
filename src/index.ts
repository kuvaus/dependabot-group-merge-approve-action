import * as core from '@actions/core';
import { Octokit } from "@octokit/rest";
import * as github from '@actions/github';

const token = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: token }); 

const context = github.context;
const owner = context.repo.owner;
const repo = context.repo.repo;

interface Options {
    prefix:              string;
    require_green:       string;
    combined_pr_name:    string;
    ignore:              string;
    close_merged:        string;
    auto_merge_combined: string;
}

async function parse_options() {
    const options: Options = {
        prefix:              core.getInput('prefix')              || 'dependabot',
        require_green:       core.getInput('require_green')       || 'true',
        combined_pr_name:    core.getInput('combined_pr_name')    || 'combined',
        ignore:              core.getInput('ignore')              || 'ignore',
        close_merged:        core.getInput('close_merged')        || 'false',
        auto_merge_combined: core.getInput('auto_merge_combined') || 'false',
    };
    
    console.log(options);
    return options;
}    

async function get_pull_requests() {
  let response = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
    owner: owner,
    repo: repo
  });
  return response.data;
}

async function create_combined_branch(options: Options, base_sha: string) {
  try {
    await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
      owner: owner,
      repo: repo,
      ref: 'refs/heads/'+options.combined_pr_name,
      sha: base_sha
    });
  } catch (error: any) {
    if (error.status !== 422) { // 422 means the branch already exists
      throw error;
    }
    console.log(`Branch ${options.combined_pr_name} already exists`);
  }
}

async function merge_into_combined_branch(options: Options, pull: any) {
  const branch = pull.head.ref;
  
  // Check if the branch is the same as the combined branch
  if (branch === options.combined_pr_name) {
    console.log(`Skipping merge of ${branch} into itself`);
    return false;
  }
  
  try {
    const merge_result = await octokit.request('POST /repos/{owner}/{repo}/merges', {
      owner: owner,
      repo: repo,
      base: options.combined_pr_name,
      head: branch,
    });

    // Only close the original pull request if it was successfully merged and options.close_merged is true
    if (merge_result.status === 201 && options.close_merged === 'true') {
        await octokit.pulls.update({
          owner: owner,
          repo: repo,
          pull_number: pull.number,
          state: 'closed'
        });
    }
    return true;
  } catch (error) {
    return false;
  }
}

/*
async function create_combined_pull_request(options: Options, combined_prs: string[], base_branch: string) {
  // Check if there are any PRs to combine
  if (combined_prs.length === 0) {
    console.log(`No pull requests to combine`);
    return;
  }

  const combined_prs_string = combined_prs.join('\n');
  let body = 'This pull request contains the following pull requests:\n' + combined_prs_string;

  // Check if a pull request already exists
  const existingPRs = await octokit.pulls.list({
    owner: owner,
    repo: repo,
    state: 'open',
    head: owner + ':' + options.combined_pr_name
  });

  if (existingPRs.data.length > 0) {
    console.log(`Updating existing pull request`);
    const existingPR = existingPRs.data[0];
    await octokit.pulls.update({
      owner: owner,
      repo: repo,
      pull_number: existingPR.number,
      title: 'Combined pull request',
      body: body,
      state: 'open'
    });
  } else {
    await octokit.request('POST /repos/{owner}/{repo}/pulls', {
      owner: owner,
      repo: repo,
      title: 'Combined pull request',
      head: options.combined_pr_name,
      base: base_branch,
      body: body
    });
  }
}
*/

async function create_combined_pull_request(options: Options, combined_prs: string[], base_branch: string) {
  // Check if there are any PRs to combine
  if (combined_prs.length === 0) {
    console.log(`No pull requests to combine`);
    return;
  }

  const combined_prs_string = combined_prs.join('\n');

  // Check if a pull request already exists
  const existingPRs = await octokit.pulls.list({
    owner: owner,
    repo: repo,
    state: 'open',
    head: owner + ':' + options.combined_pr_name
  });

  let pr_number;
  if (existingPRs.data.length > 0) {
    console.log(`Updating existing pull request`);
    const existingPR = existingPRs.data[0];

    // Get the existing body and append the new pull requests
    let body = existingPR.body + '\n' + combined_prs_string;

    await octokit.pulls.update({
      owner: owner,
      repo: repo,
      pull_number: existingPR.number,
      title: 'Combined pull request',
      body: body,
      state: 'open'
    });
    pr_number = existingPR.number;
  } else {
    let body = 'This pull request contains the following pull requests:\n' + combined_prs_string;
    const pull_request = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
      owner: owner,
      repo: repo,
      title: 'Combined pull request',
      head: options.combined_pr_name,
      base: base_branch,
      body: body
    });
    pr_number = pull_request.data.number;
  }

  if (options.auto_merge_combined === 'true') {
    await auto_merge_combined_pull_request(pr_number);
  }
}


async function auto_merge_combined_pull_request(pr_number: number) {
  try {
    const merge_result = await octokit.pulls.merge({
      owner: owner,
      repo: repo,
      pull_number: pr_number
    });

    if (merge_result.status === 204) {
        console.log(`Pull request #${pr_number} merged successfully`);
        return true;
    } else {
        console.log(`Failed to merge pull request #${pr_number}`);
        return false;
    }
  } catch (error) {
    console.log(`Error merging pull request #${pr_number}: ${error}`);
    return false;
  }
}


async function main() {
  const options = await parse_options();
  const pulls = await get_pull_requests();
  const base_sha = pulls[0].base.sha;
  await create_combined_branch(options, base_sha);

  let combined_prs = [];
  for (const pull of pulls) {
    // Only merge pull requests that have a branch name starting with the prefix specified in the options.prefix
    if (!pull.head.ref.startsWith(options.prefix)) {
      continue;
    }

    let label = pull.head.label;
    if (label.toLowerCase().includes(options.ignore.toLowerCase())) {
      console.log("ignored label");
      continue;
    }

    const merge_success = await merge_into_combined_branch(options, pull);
    if (options.require_green === 'true') {
        if (merge_success) combined_prs.push(pull.head.ref);
    } else {
        combined_prs.push(pull.head.ref);
    }
  }

  const base_branch = pulls[0].base.ref;
  await create_combined_pull_request(options, combined_prs, base_branch);
}


if (require.main === module) {
    main();
}
