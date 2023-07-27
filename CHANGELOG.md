
## Changelog

#### [Upcoming](https///github.com/kuvaus/dependabot-group-merge-approve-action/compare/v1.0.1...HEAD)

#### [v1.0.1](https://github.com/kuvaus/dependabot-group-merge-approve-action/releases/tag/v1.0.1)

> 27 July 2023

- Ability to use on other bots than just dependabot
- Change `'prefix'` to `'botname'`. Now you can specify the bot user whose pull requests are merged.
- Works for both dependabot[bot] and renovate[bot]. The action adds the [bot] suffix automatically.
- `'merge_dependabot_individually'` is now `'merge_individually'` to reflect the ability to change bots
- Add attempt to update branch before merging to avoid conflicts

#### [v1.0.0](https://github.com/kuvaus/dependabot-group-merge-approve-action/releases/tag/v1.0.0)

> 26 July 2023

- Initial Version
