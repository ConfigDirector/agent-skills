# Changelog

All notable changes to the ConfigDirector agent skills are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The skills are released together, and each skill's `metadata.version` is the version of the newest release below.

## [Unreleased]

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
