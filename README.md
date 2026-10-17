# ConfigDirector agent skills

Agent skills for [ConfigDirector](https://www.configdirector.com), a managed service for feature flags and remote configuration. An agent skill is a set of instructions your coding agent loads to carry out one ConfigDirector task, so it works with ConfigDirector the way someone who has read the docs would. Ask your agent to add ConfigDirector or feature flags to your project, and it picks up the matching skill on its own.

| Skill                  | What it does                                                                                                                                                                                                                       | API token permissions                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `configdirector-setup` | Adds ConfigDirector to the current project: picks the SDK for your framework, installs it, reads the SDK key from an environment variable, creates a first feature flag after you confirm it, and evaluates the flag in your code. | `Projects: Read`, `Configs: Read`, `Configs: Create` |

## Install

In your project:

```sh
npx skills add ConfigDirector/agent-skills
```

Add `--skill configdirector-setup` to install only that skill, and `-g` to install for every project instead of the current one.

`npx skills add` installs into Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, Windsurf, OpenCode and [the other agents it supports](https://github.com/vercel-labs/skills#supported-agents).

## Connect your agent to ConfigDirector

The skills reach your ConfigDirector account through the ConfigDirector MCP server. Create an API token in the ConfigDirector dashboard under **API tokens**, with the permissions in the table above, and set up the server for your agent as the [MCP docs page](https://docs.configdirector.com/integrations/mcp) shows. Keep the token in an environment variable or your editor's secret storage, as that page explains, and never paste it into the chat.

Without the MCP server, `configdirector-setup` still adds the SDK to your project, and asks you to create the first flag in the dashboard.

## If you used the Claude Code plugin

This repository was `ConfigDirector/claude-plugins`, the ConfigDirector plugin for Claude Code. The plugin is no longer published, and these skills replace its setup skill. The plugin also connected Claude Code to the ConfigDirector MCP server, which the skills do not do: once you remove the plugin, set the server up from the [MCP docs page](https://docs.configdirector.com/integrations/mcp).

## License

MIT, see [LICENSE](LICENSE).
