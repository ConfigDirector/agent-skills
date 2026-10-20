---
name: configdirector-connect
description: Set up and check this coding agent's access to ConfigDirector, through the ConfigDirector MCP server or the ConfigDirector CLI, with an API token the user creates and keeps and the agent never sees, one for each organization the user works with. Use when the user asks to connect ConfigDirector or another ConfigDirector organization, when a ConfigDirector tool or command is missing or refused, or when another ConfigDirector skill sends the user here.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.9.0
---

# Connect this agent to ConfigDirector

Work through the steps in order. The result is one route to the user's ConfigDirector account, the MCP server or the CLI, checked with one read on MCP and two on the CLI.

The check needs an API token with `Projects: Read`, as the ConfigDirector dashboard names it under **API tokens**, plus the permissions the user chooses in step 1.

The token is the user's. Never ask for it, never read it from a file, never write it anywhere, and never run `configdirector login` yourself. If the user pastes a token into the conversation, tell them it is now in the transcript, ask them to revoke it on the **API tokens** page and create another, and go on without it.

## 1. Ask what the agent will do

Ask what the user wants the agent to do with ConfigDirector, and name the permissions for it, in the dashboard's wording under **API tokens**:

| The agent will                      | Permissions                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Explore and answer questions        | `Projects: Read`, `Environments: Read`, `Configs: Read`                                                        |
| Create and change configs and flags | the reading permissions, plus `Configs: Create`, `Configs: Update settings`, `Configs: Update targeting rules` |
| Clean flags up                      | the changing permissions, plus `Configs: Archive`                                                              |
| Work with segments                  | any of the rows above, plus `Segments: Read`                                                                   |

Recommend an expiration on the token, as the MCP docs page does. How long is the user's choice.

## 2. The user creates the token

Tell the user to create the token in the ConfigDirector dashboard under **API tokens**, with the permissions from step 1 and the expiration they chose, and to keep it themselves: never in a tracked file, and never in this conversation. A token belongs to one organization, so a user who works with several creates one in each.

## 3. Pick the route and set it up

Ask the user whether their agent supports MCP servers. If it does, set up the MCP server; otherwise set up the CLI. Set up one route, never both.

### MCP

1. Fetch https://docs.configdirector.com/integrations/mcp and use the section for the user's agent. That page is the source for the configuration; do not write it from memory.
2. Ask whether the user works with more than one ConfigDirector organization. If they do, ask which one this repository belongs to, and follow the page's **More than one organization** section for their agent:
   - Where the section gives a configuration for each repository, the local scope for Claude Code or the project file for Cursor, VS Code and Gemini CLI, write it there, in the form the agent's own section shows, with a variable named for the organization in place of `CONFIGDIRECTOR_TOKEN`, such as `CONFIGDIRECTOR_TOKEN_ACME`. Where that form is the editor's secret prompt, give the prompt's input an id named for the organization, such as `configdirector-token-acme`. Then go on with item 4.
   - For an agent the section configures once for every repository, tell the user what the section says for it, and go on with item 3 for the organization they choose for this agent.
3. Otherwise, ask whether the configuration goes in the project-level file or the user-level file the page describes for that agent. A project-level file is committed, so the token itself never goes in it. Write the configuration in the form that references the token through the `CONFIGDIRECTOR_TOKEN` environment variable, or through the editor's secret prompt where the page shows one for that agent.
4. Write the variable's name, never its value: when you add the server with `claude mcp add`, keep the header in single quotes, as the page shows it, so your shell leaves the variable for Claude Code to read when it starts.
5. Tell the user to set the variable the configuration names to their token where the agent starts, or to enter the token in the prompt the editor shows, and to reconnect or restart the agent as the page says for that agent. Wait for them to say it is done.

### CLI

1. Tell the user to install `@configdirector/cli` as the Install section of https://docs.configdirector.com/integrations/cli shows.
2. Tell the user to run `configdirector login` in their own terminal, which hides the token while they paste it, once for each organization they work with: the CLI keeps one sign-in per organization, and signing in again to the same organization replaces its sign-in. An agent that works with one organization only can instead have `CONFIGDIRECTOR_TOKEN` set where it runs commands; the CLI uses that variable ahead of every sign-in, so with several organizations it stays unset there. Wait for them to say it is done.

## 4. Check with one read on MCP, two on the CLI

### MCP

Call `list_projects`. Report the projects it returns and the ConfigDirector tools the server lists. The server exposes only the tools the token's permissions allow, so a tool missing from the list names a missing permission: `create_config` needs `Configs: Create`, `update_targeting_rules` needs `Configs: Update targeting rules`, and every other tool the permission its name points at. If no ConfigDirector tool is available at all, the agent has not picked up the configuration or the token: ask the user to repeat item 5 of the MCP setup, then try again.

When the repository's `configdirector.json` has an `organization` and the projects carry another `organizationId`, the token belongs to another organization than the repository's. Tell the user so, and set the server up for the repository's organization as item 2 of the MCP setup says, then try again.

### CLI

Run `configdirector projects list --json`, then `configdirector api-token get --json`, from the directory that holds `configdirector.json` when the repository has one. Report the projects `projects list` lists, by name and slug. Read the result like this:

- Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names the one meant here. Ask the user which organization they mean, offering the names the message lists, and run both commands again with `--organization <name>`.
- Exit 2 with `No API token found` or `No CLI sign-in is for the organization`: the CLI has no sign-in for the organization, or none at all. Ask the user to repeat item 2 of the CLI setup with a token of that organization, then try again.
- Exit 2 with `unknown command 'projects'` or `unknown command 'api-token'`: the installed CLI is older than the commands the skills use, which need `0.10.0-beta.1` or later. Ask the user to repeat item 1 of the CLI setup, which updates it, then try again.
- Exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`: the message names the missing permission in its short form, such as `projects:read`. Tell the user which one in the dashboard's wording, `Projects: Read`, and that they can add it to the token on the **API tokens** page.
- Exit 2 with `The Admin API refused the request` and another code, such as `API_TOKEN_EXPIRED`: the token was rejected, and the message says why. Ask the user to create another token as in step 2 and repeat item 2 of the CLI setup, then try again.
- Exit 0 from both: `api-token get` names the token's organization in `organization.name` and lists its permissions in `permissions`, in their short form. Report the organization's name, and each permission in the dashboard's wording: the part before the colon with a capital first letter and spaces for hyphens, a colon, then the part after it with a capital first letter, such as `projects:read` as `Projects: Read` and `code-references:update` as `Code references: Update`, except `config-settings:update`, which is `Configs: Update settings`, and `config-targeting-rules:update`, which is `Configs: Update targeting rules`. Name any permission from step 1 the list lacks, and tell the user they can add it to the token on the **API tokens** page.

When the repository's `configdirector.json` has an `organization` other than `organization.id`, commands in the repository stop on this token: it comes from `CONFIGDIRECTOR_TOKEN` or `CONFIGDIRECTOR_ORGANIZATION` set where the agent runs commands, which the CLI uses ahead of the repository's organization. Ask the user to unset it there and sign in to the repository's organization as item 2 of the CLI setup says, then try again.

## 5. Hand over

In a few lines, tell the user:

- which route is set up, MCP or CLI;
- which organization it reaches: on the CLI, by the name `api-token get` reported; on MCP, by the name the user gave in item 2 of the MCP setup, or else by the `organizationId` of the projects listed;
- where the configuration lives: the file you wrote and the variable it reads, or the CLI's sign-in for that organization or `CONFIGDIRECTOR_TOKEN`;
- which permissions the token has: on MCP, from the tools the server listed; on the CLI, from `api-token get`, in the dashboard's wording.
