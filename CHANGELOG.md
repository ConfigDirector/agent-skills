# Changelog

All notable changes to the ConfigDirector agent skills are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The skills are released together, and each skill's `metadata.version` is the version of the newest release below.

## [Unreleased]

### Added

- The `configdirector-use-configs-in-code` skill. It gives your coding agent the rules the SDK docs state for code that reads a config, each with its reason: what the in-code default value is and is not, the type each config is served as, which configs each kind of SDK receives, the evaluation context, keys the CLI can resolve, and one client per application. It finds the SDK from the project's dependencies, fetches the exact calls from the SDK's docs page, and reviews a project's reads against the rules and `configdirector validate`. It touches no account.
- The `configdirector-test-with-flags` skill. It gives your coding agent the rules for testing code that reads a config: the SDK's test client or the OpenFeature in-memory provider as the SDK's docs page shows, never a mock of the SDK's module or a real SDK key, both branches of a flag, the code's own keys through the same constants, and test values of the config's type. It touches no account.
- The `configdirector-connect` skill. It sets up your coding agent's access to ConfigDirector, through the ConfigDirector MCP server when your agent supports MCP servers and through the ConfigDirector CLI otherwise, and checks it with one read. It asks what the agent will do and names the API token permissions for it; you create the token and set it where the agent runs, so the token never passes through the agent.

### Changed

- `configdirector-setup` sends you to `configdirector-connect` when it finds no ConfigDirector tools, instead of to the MCP docs page.

## [0.1.0] - 2026-10-17

### Added

- The `configdirector-setup` skill, in the shared agent skill format that `npx skills add` installs into Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, Windsurf and other coding agents. It adds ConfigDirector to the current project: it picks the SDK for your framework, installs and initializes it with the SDK key read from an environment variable, creates a first feature flag after you confirm its key and settings, and evaluates the flag in your code. Without the ConfigDirector MCP server, it tells you how to connect the server and asks you to create the flag in the dashboard.

### Removed

- The ConfigDirector plugin for Claude Code, and with it the ConfigDirector MCP server the plugin set up. Set the MCP server up for your coding agent from the [MCP docs page](https://docs.configdirector.com/integrations/mcp).
