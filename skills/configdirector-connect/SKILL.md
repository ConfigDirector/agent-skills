---
name: configdirector-connect
description: Set up and check this coding agent's access to ConfigDirector, through the ConfigDirector MCP server or the ConfigDirector CLI, with an API token the user creates and keeps and the agent never sees. Use when the user asks to connect ConfigDirector, when a ConfigDirector tool or command is missing or refused, or when another ConfigDirector skill sends the user here.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.3.0
---

# Connect this agent to ConfigDirector

Work through the steps in order. The result is one route to the user's ConfigDirector account, the MCP server or the CLI, checked with a single read.

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

Tell the user to create the token in the ConfigDirector dashboard under **API tokens**, with the permissions from step 1 and the expiration they chose, and to keep it themselves: never in a tracked file, and never in this conversation.

## 3. Pick the route and set it up

Ask the user whether their agent supports MCP servers. If it does, set up the MCP server; otherwise set up the CLI. Set up one route, never both.

### MCP

1. Fetch https://docs.configdirector.com/integrations/mcp and use the section for the user's agent. That page is the source for the configuration; do not write it from memory.
2. Ask whether the configuration goes in the project-level file or the user-level file the page describes for that agent. A project-level file is committed, so the token itself never goes in it.
3. Write the configuration in the form that references the token through the `CONFIGDIRECTOR_TOKEN` environment variable, or through the editor's secret prompt where the page shows one for that agent.
4. Tell the user to set `CONFIGDIRECTOR_TOKEN` to their token where the agent starts, or to enter the token in the prompt the editor shows, and to reconnect or restart the agent as the page says for that agent. Wait for them to say it is done.

### CLI

1. Tell the user to install `@configdirector/cli@beta` as the Install section of https://docs.configdirector.com/integrations/cli shows.
2. Tell the user to run `configdirector login` in their own terminal, which hides the token while they paste it, or to set `CONFIGDIRECTOR_TOKEN` where the agent runs commands. Wait for them to say it is done.

## 4. Check with one read

### MCP

Call `list_projects`. Report the projects it returns and the ConfigDirector tools the server lists. The server exposes only the tools the token's permissions allow, so a tool missing from the list names a missing permission: `create_config` needs `Configs: Create`, `update_targeting_rules` needs `Configs: Update targeting rules`, and every other tool the permission its name points at. If no ConfigDirector tool is available at all, the agent has not picked up the configuration or the token: ask the user to repeat item 4 of the MCP setup, then try again.

### CLI

Run `configdirector projects list --json`. Report the projects it lists, by name and slug. Read the result like this:

- Exit 2 with `No API token found`: the token is not where the agent runs commands. Ask the user to repeat item 2 of the CLI setup, then try again.
- Exit 2 with `unknown command 'projects'`: the installed CLI is older than the commands the skills use. Ask the user to repeat item 1 of the CLI setup, which updates it, then try again.
- Exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`: the message names the missing permission in its short form, such as `projects:read`. Tell the user which one in the dashboard's wording, `Projects: Read`, and that they can add it to the token on the **API tokens** page.
- Exit 2 with `The Admin API refused the request` and another code, such as `API_TOKEN_EXPIRED`: the token was rejected, and the message says why. Ask the user to create another token as in step 2 and repeat item 2 of the CLI setup, then try again.
- Exit 0: the token reads the organization's projects, which proves `Projects: Read`.

The CLI cannot list a token's permissions. Report what the check proved and, separately, the permissions the user chose in step 1.

## 5. Hand over

In a few lines, tell the user:

- which route is set up, MCP or CLI;
- where the configuration lives: the file you wrote, or the CLI's saved sign-in or `CONFIGDIRECTOR_TOKEN`;
- which permissions the token has: on MCP, from the tools the server listed; on the CLI, what the check proved and what they chose.
