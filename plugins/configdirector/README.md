# ConfigDirector

Manage [ConfigDirector](https://www.configdirector.com) feature flags, remote configs, and targeting rules from Claude, and add ConfigDirector to a project with one command.

ConfigDirector is a managed service for feature flags and remote configuration that validates values before they reach your applications: enforced types, JSON Schema validation, safe renaming of keys already in production, and lifecycle tracking that shows which flags are stale.

## What the plugin adds

- **The ConfigDirector MCP server**, so Claude can list and read your projects, environments, and configs, create configs and feature flags, and update their settings and targeting rules. Which of these tools Claude gets depends on the permissions of the API token you provide.
- **The `/configdirector:setup` skill**, which adds ConfigDirector to the current project. It detects your framework, reads the matching SDK's documentation, installs the SDK with your project's package manager, initializes it with the SDK key read from an environment variable, proposes a first feature flag and creates it only after you confirm, and evaluates the flag in your code.

## Requirements

A ConfigDirector account and an API token, created under **API Tokens** in the ConfigDirector dashboard. Give the token `Projects: Read`, `Environments: Read`, and `Configs: Read` to explore, and `Configs: Create`, `Configs: Update Settings`, and `Configs: Update Targeting Rules` to let Claude create and change configs. Claude asks for the token when you install the plugin and keeps it in your system's secure credential storage.

## What the plugin sends and fetches

- **MCP tool calls** go to `https://mcp.configdirector.com` with your API token in the `Authorization` header. Each call counts as an Admin API request against your ConfigDirector plan. Every change goes through the same validations as the dashboard and appears in the config's audit log with the source MCP. The server never returns SDK keys or API tokens.
- **The setup skill** reads SDK documentation pages from `https://docs.configdirector.com` and installs the ConfigDirector SDK package from your project's usual package registry, using your project's package manager. It never writes SDK keys or API tokens into your project's files.
- The plugin sends nothing anywhere else and runs no code of its own: it contains no scripts, hooks, or bundled programs.

## Privacy and support

ConfigDirector's privacy policy: https://www.configdirector.com/privacy

Documentation: https://docs.configdirector.com/integrations/mcp

Support: support@configdirector.com

## License

MIT
