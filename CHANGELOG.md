# Changelog

All notable changes to the ConfigDirector agent skills are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The skills are released together, and each skill's `metadata.version` is the version of the newest release below.

## [Unreleased]

### Added

- The `configdirector-connect` skill. It sets up your coding agent's access to ConfigDirector, through the ConfigDirector MCP server when your agent supports MCP servers and through the ConfigDirector CLI otherwise, and checks it with one read. It asks what the agent will do and names the API token permissions for it; you create the token and set it where the agent runs, so the token never passes through the agent.

### Changed

- `configdirector-setup` sends you to `configdirector-connect` when it finds no ConfigDirector tools, instead of to the MCP docs page.

## [0.1.0] - 2026-10-17

### Added

- The `configdirector-setup` skill, in the shared agent skill format that `npx skills add` installs into Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, Windsurf and other coding agents. It adds ConfigDirector to the current project: it picks the SDK for your framework, installs and initializes it with the SDK key read from an environment variable, creates a first feature flag after you confirm its key and settings, and evaluates the flag in your code. Without the ConfigDirector MCP server, it tells you how to connect the server and asks you to create the flag in the dashboard.

### Removed

- The ConfigDirector plugin for Claude Code, and with it the ConfigDirector MCP server the plugin set up. Set the MCP server up for your coding agent from the [MCP docs page](https://docs.configdirector.com/integrations/mcp).
