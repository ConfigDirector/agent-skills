# ConfigDirector plugins for Claude Code

The `configdirector` plugin connects Claude Code to [ConfigDirector](https://www.configdirector.com), a managed service for feature flags and remote configuration. It adds:

- The ConfigDirector MCP server, so Claude can read and update your projects, environments, configs, and targeting rules.
- The `/configdirector:setup` skill, which adds ConfigDirector to the current project: it picks the SDK for your framework, installs and initializes it, creates a first feature flag after asking you, and evaluates it in your code.

## Before you install

Create an API token in the ConfigDirector dashboard under **API Tokens**. The token's permissions decide what Claude can do:

- `Projects: Read`, `Environments: Read`, and `Configs: Read` to explore and answer questions.
- Add `Configs: Create` for the setup skill to create a first flag.
- Add `Configs: Update Settings` and `Configs: Update Targeting Rules` to let Claude change configs and roll flags out.

Setting an expiration on the token is recommended.

## Install

In Claude Code:

```
/plugin marketplace add ConfigDirector/claude-plugins
/plugin install configdirector@configdirector
```

Choose where to install it, then paste the API token when Claude Code asks for it. Claude Code keeps the token in your system's secure credential storage, not in a settings file.

Run `/mcp` to check: the `configdirector` server from the plugin should be connected.

### If you skipped the token

The plugin installs without it, but the MCP server does not start. To add the token later, run `/plugin`, open **Installed**, select **ConfigDirector**, choose **Configure options**, enter the token, and run `/reload-plugins`. Use the same steps to replace an expired token.

## Use

- Run `/configdirector:setup` in a project to add ConfigDirector to it.
- Or ask directly, for example "list the flags in the checkout project" or "roll new-search out to 10 percent of users in production".

Every change Claude makes goes through the same validations as the dashboard and shows in the config's audit log with the source **MCP**. Each tool call counts as one Admin API request against your plan.

More: https://docs.configdirector.com/integrations/mcp

## License

MIT
