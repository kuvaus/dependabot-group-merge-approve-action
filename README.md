# dependabot-group-merge-approve-action

Automatically group dependabot pull requests into one and approve merge.


## Usage


```yaml
jobs:
  releasenotes:
    runs-on: ubuntu-latest
    name: Generate release notes
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Generate release notes
        uses: kuvaus/dependabot-group-merge-approve-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.DEPLOY_KEY }}
```

The simple script above is enough for most usage. It extracts the changes of newest tag from `CHANGELOG.md`, skips the date, and uploads them into github release description body. If no release has been specified, it will create one, but if a release with the tag already exists, it will modify its release description.

> **Note**
>  Note that the script needs the `GITHUB_TOKEN` for creating or updating the release.

## Options

**Version 2** `kuvaus/changelog-releasenotes-action@v1` uses Node 18. There is also an optional old **Version 1** `kuvaus/changelog-releasenotes-action@v1` that uses Node 16.


Optionally there are `inputs` that you can change to modify the actions behavior. The action also `outputs` the filtered release notes as `releasenotes`. Below is a more detailed version with all the possible options:


## License

This project is licensed under the MIT [License](https://github.com/kuvaus/dependabot-group-merge-approve-action/blob/main/LICENSE)
