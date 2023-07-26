# dependabot-group-merge-approve-action

Automatically group dependabot pull requests into a single one and merge it.

## Usage


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
          prefix: "dependabot" # Prefix to find the pull requests.
          require_green: "true" # Require the pull requests to be green
          combined_pr_name: "combined" # Branch name for the combined pull request
          ignore: "ignore" # Ignore pull requests with this name
          close_merged: "false" # Close merged pull requests automatically
          auto_merge_combined: "false" # Automatically merge the combined pull request
          day: "Monday" # Run on a specific day, any Monday
          hour: "16" # Run after a specific hour, 4 PM
          merge_dependabot_individually: # Merge individually instead of combining
        env:
          GITHUB_TOKEN: ${{ secrets.DEPLOY_KEY }}
```


## License

This project is licensed under the MIT [License](https://github.com/kuvaus/dependabot-group-merge-approve-action/blob/main/LICENSE)
