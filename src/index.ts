import * as core from '@actions/core';
import { Octokit } from "@octokit/rest";
import * as github from '@actions/github';

//const HTTP_STATUS_OK = 200;
const HTTP_STATUS_CREATED = 201;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_UNPROCESSABLE_ENTITY = 422;


const token = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: token }); 

const context = github.context;
const owner = context.repo.owner;
const repo = context.repo.repo;

type Options = {
    prefix:                        string;
    require_green:                 string;
    combined_pr_name:              string;
    ignore:                        string;
    close_merged:                  string;
    auto_merge_combined:           string;
    day:                           string | undefined;
    hour:                          number | undefined;
    merge_dependabot_individually: string;
}

async function parse_options() {
    const options: Options = {
        prefix:                        core.getInput('prefix')                        || 'dependabot',
        require_green:                 core.getInput('require_green')                 || 'true',
        combined_pr_name:              core.getInput('combined_pr_name')              || 'combined',
        ignore:                        core.getInput('ignore')                        || 'ignore',
        close_merged:                  core.getInput('close_merged')                  || 'false',
        auto_merge_combined:           core.getInput('auto_merge_combined')           || 'false',
        day:                           core.getInput('day')                           || undefined,
        hour:                          parseInt(core.getInput('hour'))                || undefined,        
        merge_dependabot_individually: core.getInput('merge_dependabot_individually') || 'false',
    };
    
    console.log(options);
    return options;
}    


async function is_specific_time(day: string | undefined, hour: number | undefined) {
  const day_list = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const now = new Date();
  const current_day = day_list[now.getDay()];
  const current_hour = now.getHours();

  if ((day && current_day !== day) || (hour !== undefined && current_hour < hour)) {
    return false; // If it's not the correct day or hour, don't run the function
  }
  return true;
}

async function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}


async function get_pull_requests() {
    try {    
      let response = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
        owner: owner,
        repo: repo
      });
      return response.data;
    } catch (error: any) {
        if (error.status === HTTP_STATUS_NOT_FOUND) {
            // If the error is a 404 (Not Found), return an empty array
            return [];
        } else {
            // If the error is something else, re-throw it
            throw error;
        }
    }
}


async function get_dependabot_pull_requests() {
    try {
        let pulls = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
            owner: owner,
            repo: repo,
            state: 'open',
        });

        const dependabot_pull_requests = pulls.data.filter(pr => pr.user?.login === 'dependabot[bot]');

        if (dependabot_pull_requests.length > 0) {
            // Dependabot has finished its run
            return dependabot_pull_requests;
        }

        // If Dependabot has not finished its run, return an empty array
        return [];
    } catch (error: any) {
        if (error.status === HTTP_STATUS_NOT_FOUND) {
            // If the error is a 404 (Not Found), return an empty array
            return [];
        } else {
            // If the error is something else, re-throw it
            throw error;
        }
    }
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
    if (error.status !== HTTP_STATUS_UNPROCESSABLE_ENTITY) { // 422 means the branch already exists
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
    // and options.auto_merge_combined is false
    if (merge_result.status === HTTP_STATUS_CREATED && options.close_merged === 'true' && options.auto_merge_combined === 'true') {
        // PRs can be merged but we will handle merging after combined PR is merged
        return true;
    }
    if (merge_result.status === HTTP_STATUS_CREATED && options.close_merged === 'true' && options.auto_merge_combined === 'false') {
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


async function check_if_combined_exists(options: Options) {
    
  // Check if a pull request already exists
  const existing_prs = await octokit.pulls.list({
    owner: owner,
    repo: repo,
    state: 'open',
    head: owner + ':' + options.combined_pr_name
  });
  return existing_prs;
 }

async function create_combined_pull_request(options: Options, combined_prs: string[], base_branch: string) {
  // Check if there are any PRs to combine
  if (combined_prs.length === 0) {
    console.log(`No pull requests to combine`);
    return;
  }

  const combined_prs_string = combined_prs.join('\n');

  // Check if a pull request already exists
  const existing_prs = await check_if_combined_exists(options);

  let pr_number;
  if (existing_prs.data.length > 0) {
    console.log(`Updating existing pull request`);
    const existing_pr = existing_prs.data[0];

    // Get the existing body and append the new pull requests
    let body = existing_pr.body + '\n' + combined_prs_string;

    await octokit.pulls.update({
      owner: owner,
      repo: repo,
      pull_number: existing_pr.number,
      title: 'Combined pull request',
      body: body,
      state: 'open'
    });
    pr_number = existing_pr.number;
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
    // Get the pull request
    const pr = await octokit.pulls.get({
      owner: owner,
      repo: repo,
      pull_number: pr_number
    });

    // Check if the pull request is mergeable
    if (pr.data.mergeable) {
      const merge_result = await octokit.pulls.merge({
        owner: owner,
        repo: repo,
        pull_number: pr_number
      });

      if ((merge_result.status as 200 | 204) === 204) {
          console.log(`Pull request #${pr_number} merged successfully`);

          // Get the individual Dependabot pull requests that were included in the combined pull request
          const dependabotPullRequests = await get_dependabot_pull_requests();

          // Close each individual pull request
          for (const pull of dependabotPullRequests) {
            await octokit.pulls.update({
              owner: owner,
              repo: repo,
              pull_number: pull.number,
              state: 'closed'
            });
          }

          return true;
      } else {
          console.log(`Failed to merge pull request #${pr_number}`);
          return false;
      }
    } else {
      console.log(`Pull request #${pr_number} is not mergeable`);
      return false;
    }
  } catch (error) {
    console.log(`Error merging pull request #${pr_number}: ${error}`);
    return false;
  }
}


async function merge_dependabot_prs_individually(options: Options) {
    const { owner, repo } = github.context.repo;

    const pulls = await octokit.pulls.list({
        owner,
        repo,
        state: 'open'
    });
    
    for (const pull of pulls.data) {
        
        
        // Only merge pull requests that have a branch name starting with the prefix specified in the options.prefix
        if (!pull.head.ref.startsWith(options.prefix)) {
          continue;
        }
        //Ignore ignored-label PRs
        let label = pull.head.label;
        if (label.toLowerCase().includes(options.ignore.toLowerCase())) {
          console.log("Ignored label");
          continue;
        }
        
        
        if (pull.user && pull.user.login === 'dependabot[bot]') {
            try {
                await octokit.pulls.createReview({
                    owner,
                    repo,
                    pull_number: pull.number,
                    event: 'APPROVE'
                });
    
                await octokit.pulls.merge({
                    owner,
                    repo,
                    pull_number: pull.number
                });
    
                core.info(`Merged pull request #${pull.number}`);
            } catch (error) {
                if (error instanceof Error) {
                    core.setFailed(error.message);
                }
            }
        }
    }
}



async function main() {
    
  const options = await parse_options();
  
  // run only on specific time/date if specified
  const time_boolean = await is_specific_time(options.day, options.hour);
  if(!time_boolean) { return }
  
  //wait 1 second so that pull requests will be green
  await delay(1000);
  
  const pulls = await get_pull_requests();
  const dependabot_pulls = await get_dependabot_pull_requests();
  if(pulls.length === 0) { return }
  const base_sha = pulls[0].base.sha;
  
  
  
  // If merge_dependabot_individually is true and the PR is from Dependabot, merge it individually
  if (options.merge_dependabot_individually === 'true') {
    await merge_dependabot_prs_individually(options);
    return;
  }
  
  await create_combined_branch(options, base_sha);

  let combined_prs = [];
  //might need to change this
  for (const pull of dependabot_pulls) {
    // Only merge pull requests that have a branch name starting with the prefix specified in the options.prefix
    if (!pull.head.ref.startsWith(options.prefix)) {
      continue;
    }

    let label = pull.head.label;
    if (label.toLowerCase().includes(options.ignore.toLowerCase())) {
      console.log("Ignored label");
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
  
  const existing_prs = await check_if_combined_exists(options);
  if (existing_prs.data.length !== 0) { 
    
    if (options.auto_merge_combined === 'true') {
      await auto_merge_combined_pull_request(existing_prs.data[0].number);
    }
  }
}


if (require.main === module) {
    main();
}
