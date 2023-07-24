# dependabot-group-merge-approve-action

Automatically group dependabot pull requests into one and approve merge.

> **Warning**

>  DOES NOT WORK YET! DO NOT USE!

## Usage


```yaml
jobs:
  releasenotes:
    runs-on: ubuntu-latest
    name: Group Depenadabot PRs
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Group Depenadabot PRs
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
  releasenotes:
    runs-on: ubuntu-latest
    name: Group Depenadabot PRs
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Group Depenadabot PRs
        uses: kuvaus/dependabot-group-merge-approve-action@v1
        with:
          prefix: "dependabot" # Prefix to find the pull requests.
          require_green: "True" # Require the pull requests to be green
          combined_pr_name: "combined" # Branch name for the combined pull request
          ignore: "ignore" # Ignore pull requests with this name
        env:
          GITHUB_TOKEN: ${{ secrets.DEPLOY_KEY }}
```


## License

This project is licensed under the MIT [License](https://github.com/kuvaus/dependabot-group-merge-approve-action/blob/main/LICENSE)
