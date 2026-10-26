# Changelog

All notable changes to the ConfigDirector agent skills are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The skills are released together, and each skill's `metadata.version` is the version of the newest release below.

## [Unreleased]

## [0.11.0] - 2026-10-26

### Changed

- `configdirector-setup` reads the flag you name. Asked to add ConfigDirector and read a flag by its key, it looks the key up in your project, under current and old keys. When the project has it as a boolean flag, it evaluates that flag in your code and creates nothing; when the flag is not delivered to the kind of SDK it installed, client or server, it tells you so and names the config's **Settings** tab, where you change which SDKs receive it. When the project has the key with another type, it says so and asks whether to create a new boolean flag. When no config has the key, it proposes creating the flag with that key, with the same settings and confirmation as before. A request that names no flag still gets a proposed key.

## [0.10.0] - 2026-10-20

### Added

- The `configdirector-migrate-from-launchdarkly` skill, a developer skill in two stages that follows the [LaunchDarkly migration guide](https://docs.configdirector.com/migration-guides/launchdarkly), which it fetches at the start of every run. Stage 1 recreates one LaunchDarkly project's flags in your ConfigDirector project: you map each LaunchDarkly environment to one of yours, export the flags, their statuses and the segments of each environment with requests you run in your own terminal, so the agent never handles a LaunchDarkly token, and confirm which flags to move. It proposes leaving out every flag that is launched or inactive in every environment, to be hardcoded at the value it serves, and lists what has no equivalent in ConfigDirector, such as prerequisites, regular expressions or list-based segments, with the guide's alternative. It creates the segments first, through `configdirector-segments`, with the definition most environments share as the project definition and an environment override where one differs, then the configs in batches of up to ten, each flag shown with its settings and every environment's rules next to LaunchDarkly's and confirmed with one yes per batch, keeping the flag's key and setting the default targeting rule value to what LaunchDarkly serves most users in production, and checks one context per rule with an evaluation. A segment or config key the project already has is skipped and never changed, which is how a later run continues. Stage 2 switches one application: it finds the LaunchDarkly SDK in the dependency manifest and its replacement in the guide, shows every read to replace before editing, installs and initializes the ConfigDirector SDK with the key from an environment variable, rewrites each read as the guide shows, with the value LaunchDarkly serves today as the in-code default value, updates the tests, runs `configdirector validate` and your project's checks, and removes the LaunchDarkly package and key once no read remains, on your yes. It changes nothing in LaunchDarkly. It works through the ConfigDirector MCP server or the ConfigDirector CLI, with an API token that has `Projects: Read`, `Environments: Read`, `Configs: Read`, `Configs: Create`, `Configs: Update targeting rules`, `Segments: Read` and `Segments: Create`, plus `Tags: Read` and `Configs: Update settings` for flags with tags, and needs the CLI for `validate` on either route.

## [0.9.0] - 2026-10-20

### Added

- The `configdirector-segments` skill, the third operator skill. It creates a segment or changes one from your description: who is in it, as condition groups where a context is in the segment when every condition of any one group matches, its name or key, and an environment override added, changed or removed. It reads the segment, the configs that use it and the targeting rules reference before composing anything, so every condition and operator it writes is one ConfigDirector takes, and keeps every condition you did not ask it to change. Before writing, it shows the current and the resulting definition side by side, for the project definition and each override the change touches, says in words which environments the change reaches, lists the configs that use the segment there, and waits for your yes; when one of those environments is live and a config uses the segment there, it tells you so, shows the change again and asks for an explicit yes. It ends by printing the previous definition, so you can put it back. When ConfigDirector refuses the segment, it shows the reasons, fixes the segment and asks again. It never deletes a segment: asked to, it shows the configs whose rules use it, names `configdirector-roll-out` to remove those segment conditions first, and gives you `configdirector segments delete` or the segment's page in the dashboard to run the delete yourself. It works through the ConfigDirector MCP server or the ConfigDirector CLI, with an API token that has `Projects: Read`, `Environments: Read` and `Segments: Read`, plus `Segments: Create` to create a segment and `Segments: Update` to change one. The CLI route needs `@configdirector/cli` 0.12.0 or later, and the skill asks you to install it again when it is older.

### Changed

- `configdirector-roll-out` names `configdirector-segments` as the way to create or change a segment, where it says it changes no segment and where no segment has the name you gave.

## [0.8.0] - 2026-10-19

### Changed

- The skills install and run the CLI as `@configdirector/cli`, without `@beta`, since the CLI is published under npm's `latest` tag from 0.11.0. `configdirector-validate-in-ci` gives you `npx --yes @configdirector/cli` for GitLab and other CI systems, and when a skill finds the CLI too old for its commands, it asks you to install `@configdirector/cli` again, which also moves an `@beta` install, left on the last beta, to the newest release.

## [0.7.0] - 2026-10-19

### Changed

- `configdirector-connect` sets up access for each organization you work with. On the CLI, it has you run `configdirector login` once for each organization, and checks the access with a second read, `configdirector api-token get`, which reports the token's organization and its permissions in the dashboard's wording; when the CLI is signed in to several organizations and nothing names the one you mean, it asks which. Through the MCP server, it asks whether you work with more than one organization, and if you do, writes each repository's configuration with a variable named for its organization, such as `CONFIGDIRECTOR_TOKEN_ACME`, as the MCP docs page shows. It ends by naming the organization the agent reaches. The CLI check needs `@configdirector/cli` 0.10.0-beta.1 or later, and the skill asks you to update an older CLI.
- Every skill that runs the CLI asks which organization you mean when the CLI is signed in to several and nothing names the repository's. It then adds the organization to the repository's `configdirector.json` with `configdirector init --organization` and tells you the file changed, so it goes in your next commit. `configdirector-validate-in-ci` also asks which organization when the project's slug is found in several, and asks for the slug again when no organization the CLI is signed in to has it.
- When the token belongs to another organization than the one `configdirector.json` names, every skill that runs the CLI tells you so, and where the token came from, such as `CONFIGDIRECTOR_TOKEN`, and sends you to `configdirector-connect` instead of using it. The skills that find the project in your account, `setup`, `flag-a-change`, `create-config`, `roll-out` and `clean-up-flag`, check this through the MCP server too.

## [0.6.0] - 2026-10-18

### Changed

- `configdirector-validate-in-ci` adds the ConfigDirector Code Scan action, `ConfigDirector/scan-code@v1`, on GitHub, in place of the `npx` step. The action runs `configdirector validate` on pull requests, as the step did, and on pushes to your default branch also uploads where each config is read, so each config's **Code references** tab in the dashboard shows the code that reads it, and the configs list marks the configs no scanned repository reads outside tests as **Not in code**. The skill asks whether the action should upload and, since an upload sends a few lines of code around each reference, whether to leave them out, and names the CI token's permissions for your answer: `Projects: Read`, `Configs: Read` and `Code references: Update` with the upload, and `Projects: Read` and `Configs: Read` with `upload: false`. GitLab and other CI systems keep the `npx` command, and so does GitHub when you ask for it.

## [0.5.0] - 2026-10-17

### Added

- The `configdirector-clean-up-flag` skill. It removes a settled temporary feature flag from your code, keeping the branch the flag serves. It reads the config's lifecycle state, its recent evaluations and which environments are live, and goes on only for a flag that is settled, archive ready or stale: a new or in-use flag, a kill switch or a permanent config stops it, with the facts shown, which environments evaluated the flag, when, from which SDKs, and the rules in each. It finds every reference with `configdirector scan`, direct, indirect and test references, under the current key and any old key, and stops when the scan lists a dynamic reference it cannot resolve. It proposes the branch to keep, the single value the live environments serve for a settled flag, and lists every reference and what happens to it before editing: the evaluation replaced by the kept branch, the other branch and its tests removed, the constant removed when nothing else reads it. After your yes it edits, runs your project's checks and scans again. It archives the config only once you confirm the removal is deployed everywhere that read the flag, and advises waiting a day or two after that deploy in case of a rollback; otherwise it ends without archiving and tells you how to archive later. It works through the ConfigDirector MCP server or the ConfigDirector CLI, with an API token that has `Projects: Read`, `Environments: Read`, `Configs: Read` and `Configs: Archive`, and needs the CLI for `scan` on either route.

### Changed

- `configdirector-flag-a-change` names `configdirector-clean-up-flag` as the way to remove the flag once it has settled.

## [0.4.0] - 2026-10-17

### Added

- The `configdirector-roll-out` skill, the second operator skill. It changes a config's targeting rules in one environment from your description: it turns a flag on or off, rolls a change out to a percentage, targets specific users, contexts with certain attributes, or a segment, sets an experiment split, or changes the value the config serves. It reads the environment's current rules and the targeting rules reference before composing anything, so every condition and operator it writes is one ConfigDirector takes, and keeps every rule you did not ask it to change. Before writing, it shows the current and the resulting rules side by side, says in words what changes, and waits for your yes; in a live environment, it tells you the environment serves real traffic, shows the change again and asks for an explicit yes. When ConfigDirector refuses the rules, it shows the reasons, fixes the rules and asks again. On request, it evaluates the config for a context you describe and shows the value served and the rule that served it. It ends by printing the previous rules, so you can put them back. It works through the ConfigDirector MCP server or the ConfigDirector CLI, with an API token that has `Projects: Read`, `Environments: Read`, `Configs: Read` and `Configs: Update targeting rules`, plus `Segments: Read` for rules with a segment and `Contexts: Read` to evaluate a saved context.

### Changed

- `configdirector-setup` and `configdirector-flag-a-change` name `configdirector-roll-out` as the way to turn the new flag on from your agent, through the MCP server or the CLI, beside the dashboard's **Targeting rules** tab, and `configdirector-create-config` names it as the way to change the new config's targeting rules. Before, they named the MCP server's `update_targeting_rules`.

## [0.3.0] - 2026-10-17

### Added

- The `configdirector-create-config` skill, the first operator skill. It creates a config of any role and type from your description: a feature flag, kill switch, config or experiment, with its lifetime, its type's constraints (a number's range, a timespan's unit and range, an enum's allowed values, HTTPS only for a URL, a JSON Schema), the SDKs that receive it, tags by name and an experiment's variations. Before creating anything, it shows you every setting and the default targeting rule value every environment starts with, asks for any setting it cannot work out from your description instead of guessing it, and waits for your yes. A tag name no tag of the project has is reported, never created. It works through the ConfigDirector MCP server or the ConfigDirector CLI, with an API token that has `Projects: Read`, `Configs: Read` and `Configs: Create`, plus `Tags: Read` and `Configs: Update settings` for a config with tags.

## [0.2.0] - 2026-10-17

### Added

- The `configdirector-flag-a-change` skill. It wraps a code change in a new temporary feature flag: it proposes a key named after what the change controls, checks that no config in the project has it, and once you confirm, creates a boolean feature flag served to the kind of SDK your code uses, with the default targeting rule value `false` in every environment. It then reads the flag once with the in-code default value `false`, puts the new code where the flag is on and keeps the current behavior where it is off, tests both branches, runs your project's checks, and tells you how to turn the flag on. It works through the ConfigDirector MCP server or the ConfigDirector CLI, with an API token that has `Projects: Read`, `Configs: Read` and `Configs: Create`.

### Changed

- `configdirector-setup` creates the first flag through the ConfigDirector CLI when the MCP server is not connected, instead of asking you to create it in the dashboard. On the CLI, it links the repository to the project with `configdirector init` when the repository has no `configdirector.json`, and when the repository has one, the flag goes in the project it names. With neither the MCP server nor the CLI set up, it sends you to `configdirector-connect` and asks you to create the flag in the dashboard, as before.
- `configdirector-connect` checks CLI access by listing your projects with `configdirector projects list`, so the check no longer asks for a project slug or writes `configdirector.json`. The command needs `@configdirector/cli` 0.5.0-beta.1 or later, and the skill asks you to update an older CLI. When ConfigDirector rejects the token, for example because it expired, the skill says so and asks you to create another.

## [0.1.0] - 2026-10-17

### Added

- The `configdirector-setup` skill, in the shared agent skill format that `npx skills add` installs into Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, Windsurf and other coding agents. It adds ConfigDirector to the current project: it picks the SDK for your framework, installs and initializes it with the SDK key read from an environment variable, creates a first feature flag after you confirm its key and settings, and evaluates the flag in your code. Without the ConfigDirector MCP server, it sends you to `configdirector-connect` and asks you to create the flag in the dashboard.
- The `configdirector-connect` skill. It sets up your coding agent's access to ConfigDirector, through the ConfigDirector MCP server when your agent supports MCP servers and through the ConfigDirector CLI otherwise, and checks it with one read. It asks what the agent will do and names the API token permissions for it; you create the token and set it where the agent runs, so the token never passes through the agent.
- The `configdirector-use-configs-in-code` skill. It gives your coding agent the rules the SDK docs state for code that reads a config, each with its reason: what the in-code default value is and is not, the type each config is served as, which configs each kind of SDK receives, the evaluation context, keys the CLI can check, and one client per application. It finds the SDK from the project's dependencies, fetches the exact calls from the SDK's docs page, and reviews a project's reads against the rules and `configdirector validate`. It needs no API token of its own, and runs the CLI's checks only when the CLI is set up.
- The `configdirector-test-with-flags` skill. It gives your coding agent the rules for testing code that reads a config: the SDK's test client or the OpenFeature in-memory provider as the SDK's docs page shows, never a mock of the SDK's module or a real SDK key, both branches of a flag, the code's own keys through the same constants, and test values of the config's type. It needs no API token of its own, and runs the CLI's checks only when the CLI is set up.
- The `configdirector-validate-in-ci` skill. It adds `configdirector validate` to your repository's CI, so the build fails when the code reads a config key that does not exist, was renamed, or has the wrong type. It links the repository to its project with `configdirector init`, adds the GitHub Actions workflow or step, or the GitLab job, from the CLI docs page, and runs the check once to explain each finding and what exit codes 1 and 2 mean for the build. You create an API token used only by CI, with `Projects: Read` and `Configs: Read`, and save it as the `CONFIGDIRECTOR_TOKEN` secret; the token never passes through the agent.

### Removed

- The ConfigDirector plugin for Claude Code, and with it the ConfigDirector MCP server the plugin set up. Set the MCP server up for your coding agent with `configdirector-connect`, or from the [MCP docs page](https://docs.configdirector.com/integrations/mcp).
