# dependabot-group-merge-approve-action

Automatically group dependabot pull requests into a single one and merge it.

## Usage

Here is a simple workflow to get started. Look at the **options** below for more details.

```yaml
jobs:
  dependabot:
    runs-on: ubuntu-latest
    name: Combine dependabot pull requests
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Combine dependabot pull requests
        uses: kuvaus/dependabot-group-merge-approve-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.DEPLOY_KEY }}
```



> **Note**
>  Note that the script needs the `GITHUB_TOKEN` for creating or updating the release.

## Options

Optionally there are `inputs` that you can change to modify the actions behavior. Below is a more detailed version with all the possible options:

```yaml
jobs:
  dependabot:
    runs-on: ubuntu-latest
    name: Combine dependabot pull requests
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Combine dependabot pull requests
        uses: kuvaus/dependabot-group-merge-approve-action@v1
        with:
          botname: "dependabot" # Name of the bot. E.g. dependabot or renovate
          require_green: "true" # Require the pull requests to be green
          combined_pr_name: "combined" # Branch name for the combined pull request
          ignore: "ignore" # Ignore pull requests with this name
          close_merged: "false" # Close merged pull requests automatically
          auto_merge_combined: "false" # Automatically merge the combined pull request
          day: "Monday" # Run on a specific day, any Monday
          hour: "16" # Run after a specific hour, 4 PM
          wait: "1" # Wait N seconds before starting
          merge_individually: "false" # Merge individually instead of combining
        env:
          GITHUB_TOKEN: ${{ secrets.DEPLOY_KEY }}
```
#### Combine dependabot pull requests and merge the combined pull request automatically

By default the action will leave the pull requests open so you can verify before you merge. But sometimes dependabot just updates your `package.json` so it is useful to merge the pull requests automatically. Here is a basic workflow that automatically combines the dependabot pull requests into a single pull request and then automatically merges it. It also closes the open pull requests for you after merge to avoid clutter. Note that the action runs on `workflow_dispatch` meaning you have to trigger it. Another option is to run it on  `pull_request_target` but set the `wait` option to e.g. `120` (2 minutes) so that it waits dependabot pull requests to come before it starts combining them.

```yaml
name: Combine dependabot pull requests

on:
  workflow_dispatch:

jobs:
  dependabot:
    runs-on: ubuntu-latest
    name: Combine dependabot pull requests
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Combine dependabot pull requests
        uses: kuvaus/dependabot-group-merge-approve-action@v1
        with:
          close_merged: "true"
          auto_merge_combined: "true"
        env:
          GITHUB_TOKEN: ${{ secrets.DEPLOY_KEY }}
```

#### Merge dependabot pull requests individually as they come

If you want to just automatically merge all dependabot pull requests individually as they come  (no combining), you can use this workflow. Note that the action runs on `pull_request_target` meaning it will run automatically on each pull request.



```yaml
name: Merge dependabot pull requests automatically

on:
  pull_request_target:

jobs:
  dependabot:
    runs-on: ubuntu-latest
    name: Merge dependabot pull requests automatically
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Merge dependabot pull requests automatically
        uses: kuvaus/dependabot-group-merge-approve-action@v1
        with:
          merge_dependabot_individually: "true"
        env:
          GITHUB_TOKEN: ${{ secrets.DEPLOY_KEY }}
```

#### Use on renovatebot instead of dependabot

If you're using another bot, for example renovatebot, you can just change the `botname` parameter. The below script now searches the pull requests from `renovate[bot]` instead of `dependabot[bot]`. The action adds the `[bot]` suffix automatically.


```yaml
with:
  botname: "renovate" # Name of the bot. E.g. dependabot or renovate
```

## License

This project is licensed under the MIT [License](https://github.com/kuvaus/dependabot-group-merge-approve-action/blob/main/LICENSE)
