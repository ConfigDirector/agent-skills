# ConfigDirector agent skills

Agent skills for [ConfigDirector](https://www.configdirector.com), a managed service for feature flags and remote configuration. An agent skill is a set of instructions your coding agent loads to carry out one ConfigDirector task, so it works with ConfigDirector the way someone who has read the docs would. Ask your agent to add ConfigDirector or feature flags to your project, and it picks up the matching skill on its own. The [Agents docs page](https://docs.configdirector.com/integrations/agents) in the ConfigDirector docs also explains how the skills reach your account and the safety rules they follow.

| Skill                                | What it does                                                                                                                                                                                                                                                                                                                                                                                                      | API token permissions                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `configdirector-setup`               | Adds ConfigDirector to the current project: picks the SDK for your framework, installs it, reads the SDK key from an environment variable, creates a first feature flag after you confirm it, and evaluates the flag in your code.                                                                                                                                                                                | `Projects: Read`, `Configs: Read`, `Configs: Create`            |
| `configdirector-connect`             | Sets up your agent's access to ConfigDirector, through the MCP server or the CLI, and checks it with one read. Asks what the agent will do and names the permissions for it; you create the token and set it where the agent runs, so the agent never sees it.                                                                                                                                                    | `Projects: Read`, plus the permissions you choose for the agent |
| `configdirector-use-configs-in-code` | Gives your agent the rules for code that reads a config: what the in-code default value is and is not, the type each config is served as, which SDKs receive which configs, the evaluation context, keys the CLI can check, and one client per app. Applies when the agent writes or reviews such code, and fetches the exact calls from the SDK's docs page.                                                     | none                                                            |
| `configdirector-test-with-flags`     | Gives your agent the rules for testing code that reads a config: the SDK's test client or the OpenFeature in-memory provider instead of a mock, no real SDK key, both branches of a flag, the code's own keys and values of the config's type. Applies when the agent writes tests around flagged code, and fetches the test client from the SDK's docs page.                                                     | none                                                            |
| `configdirector-validate-in-ci`      | Adds `configdirector validate` to your repository's CI, so the build fails when the code reads a config key that does not exist, was renamed, or has the wrong type. Links the repository to its project, adds the GitHub Actions or GitLab job from the CLI docs page, and runs the check once. You create a token used only by CI and save it as the `CONFIGDIRECTOR_TOKEN` secret, so the agent never sees it. | `Projects: Read`, `Configs: Read`, for the CI token you create  |

## Install

In your project:

```sh
npx skills add ConfigDirector/agent-skills
```

Add `--skill configdirector-setup` to install only that skill, and `-g` to install for every project instead of the current one.

`npx skills add` installs into Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, Windsurf, OpenCode and [the other agents it supports](https://github.com/vercel-labs/skills#supported-agents).

## Connect your agent to ConfigDirector

The skills reach your ConfigDirector account through the ConfigDirector MCP server or the ConfigDirector CLI. Ask your agent to connect ConfigDirector, and the `configdirector-connect` skill walks you through it: it names the permissions for what you want the agent to do, you create an API token with them in the ConfigDirector dashboard under **API tokens**, and the agent writes the MCP configuration with the token referenced from an environment variable, or walks you through the CLI sign-in, then checks the access with one read. The agent never sees the token, so never paste it into the chat.

To set it up by hand instead, follow the [MCP docs page](https://docs.configdirector.com/integrations/mcp) or the [CLI docs page](https://docs.configdirector.com/integrations/cli).

Without the MCP server, `configdirector-setup` still adds the SDK to your project, and asks you to create the first flag in the dashboard.

## If you used the Claude Code plugin

This repository was `ConfigDirector/claude-plugins`, the ConfigDirector plugin for Claude Code. The plugin is no longer published, and these skills replace its setup skill. The plugin also connected Claude Code to the ConfigDirector MCP server, which the skills do not do: once you remove the plugin, ask your agent to connect ConfigDirector, or set the server up from the [MCP docs page](https://docs.configdirector.com/integrations/mcp).

## License

MIT, see [LICENSE](LICENSE).
