---
name: configdirector-flag-a-change
description: Wrap a code change in a new temporary ConfigDirector feature flag that is off in every environment, created through the ConfigDirector MCP server or CLI after the user confirms its key and settings, with the new code where the flag is on and the current behavior where it is off. Use when the user asks to put a change behind a flag, to feature-flag something, or to ship a change dark.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.14.0
---

# Wrap a change in a feature flag

Work through the steps in order. The result is a new temporary feature flag, off in every environment, and the change behind it: the new code runs where the flag is on, and the current behavior stays where it is off. Confirm with the user before creating anything in their ConfigDirector account, and whenever the code gives more than one plausible answer.

Creating the flag needs an API token with these permissions, as the ConfigDirector dashboard names them under **API tokens**: `Projects: Read`, `Configs: Read`, `Configs: Create`.

The project must already use ConfigDirector: a dependency whose name contains `configdirector`, or an OpenFeature SDK next to a ConfigDirector provider. If it does not, `configdirector-setup` adds it and creates a first flag; stop here.

## 1. Reach the account, find the project and check the permissions

Use the ConfigDirector MCP tools when the ConfigDirector MCP server is connected, and the `configdirector` CLI otherwise; never both in one run. With the CLI, always pass `--json` and read the output, never the human text. Each step names the MCP tool first and the CLI command second.

List the projects: `list_projects` / `configdirector projects list --json`. When the repository has `configdirector.json`, the project is the one whose slug is its `project`, and every CLI command, `projects list` included, runs from the directory that holds the file. Otherwise it is the only project listed, or the one the user picks when there are several: ask which one this app belongs to. Then pass `--project <slug>` to every CLI command below.

Then read the token's permissions, before proposing anything. On MCP, they are the ConfigDirector tools you can see by name, loaded or not, since the server offers only the tools the token allows; on the CLI, `configdirector api-token get --json` lists them in short form in `permissions`. The table gives each permission in the dashboard's wording, its short form and the MCP tool that needs it:

| Permission        | Short form       | MCP tool        |
| ----------------- | ---------------- | --------------- |
| `Projects: Read`  | `projects:read`  | `list_projects` |
| `Configs: Read`   | `configs:read`   | `list_configs`  |
| `Configs: Create` | `configs:create` | `create_config` |

When any of them is missing, stop and ask before proposing anything.

When a step fails, tell the user why. The CLI sign-ins case runs the command again; every other case means nothing can be created or changed, so stop and ask, with the case's fix as the first choice:

- No route answers: no ConfigDirector tool is available, and `configdirector` is not installed, or `projects list` exits 2 with `No API token found` or `No CLI sign-in is for the organization`, or with `The Admin API refused the request` and a code other than `INSUFFICIENT_PERMISSIONS`, such as `API_TOKEN_EXPIRED`. Send the user to `configdirector-connect` for a token with the permissions above.
- Exit 2 with `unknown command`: the installed CLI is older than the commands this skill uses. Tell the user to install `@configdirector/cli` again, which updates it, as the Install section of https://docs.configdirector.com/integrations/cli shows.
- Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
- The token belongs to another organization than the one `configdirector.json` names: the projects `list_projects` or `projects list` returns carry another `organizationId` than its `organization`, or a CLI command exits 2 with `The token from` and `belongs to the organization`. Tell the user so, and where the token came from: the MCP server's configuration, the source the CLI's message names, or else `CONFIGDIRECTOR_TOKEN` or `CONFIGDIRECTOR_ORGANIZATION` set where you run commands, which the CLI uses ahead of the repository's organization. Send them to `configdirector-connect`.
- A permission is missing: on MCP, a tool of the table that you cannot see, or a tool error naming the permission; on the CLI, one the table lists that `permissions` lacks, or exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`. A refusal names the permission in its short form. Tell the user which one in the dashboard's wording, from the table, and that they can add it to the token on the **API tokens** page.
- Exit 2 with any other message, or any other tool error, such as a suspended service or an unreachable API: report the message, which says what to do.

Stop and ask means: stop at once, before any other work, including the code of step 4 and work the user asked for outside this skill. Tell the user what was not created or changed and why, with a missing permission in the dashboard's wording, and ask how to go on:

1. They fix it, as the case says, and you try again.
2. They make the change in the dashboard, with the settings you show them, and you go on with step 4.
3. You go on with step 4 without the flag: the change is wrapped around its key, and the in-code default value `false` keeps the current behavior until the flag exists.

Wait for their answer. On choice 2 or 3 before the settings are settled, settle them with the user as step 2 does, skipping any read that fails, and create nothing.

## 2. Propose the flag

1. Read the change the user described and the code it touches. Propose a key in kebab case named after what the flag controls, such as `new-checkout-page` or `faster-search-results`, never after a ticket number or a date.
2. Make sure no config has the key as its `key` or among its `deprecatedKeys`: `list_configs` / `configdirector configs list --json`. When one does, propose another.
3. Find the kind of SDK that will read the flag: the SDK's docs page says whether it is a client SDK (browsers and mobile apps) or a server SDK (backend services), and `configdirector-use-configs-in-code` shows how to find that page. A Next.js or Nuxt app that reads the flag on both sides needs both.
4. Show the user the settings, and wait for their yes before creating anything:
   - key: the one from item 1
   - type: boolean
   - role: feature flag, always temporary, so ConfigDirector tracks it until it is removed
   - default targeting rule value: `false` in every environment, so nothing changes for users until the flag is turned on
   - delivered to client SDKs, server SDKs, or both, from item 3

## 3. Create the flag

After the user's yes, create it with those settings: `create_config` / `configdirector configs create --key <key> --type boolean --role flag --default-value false --json`, adding `--client-only` or `--server-only` when only one kind of SDK receives it. The role makes the flag temporary, so the create sends no lifetime on either route.

When the create reports the key taken (on the CLI, exit 1 with the config that has it), propose another key and return to step 2. On the CLI, exit 2 with `required option '--lifetime <lifetime>' not specified` means the installed CLI is older than this command: read it as step 1's `unknown command` case. Read any other failure, such as a missing permission, as step 1 does, and stop and ask.

## 4. Wrap the change

Follow `configdirector-use-configs-in-code` for the call: it finds the SDK's docs page, and the evaluation call comes from that page, never from memory.

1. Evaluate the flag once, where the new code and the current behavior part ways, through the client the project already has. Write the key as a string literal or a constant assigned once; when the tests of item 4 give the key to the test client, use one constant for both.
2. Pass `false` as the in-code default value. The SDK returns it only when it cannot evaluate the flag, so users then keep the current behavior. It is not the default targeting rule value, which lives in ConfigDirector and is what turns the flag on; never pass `true` to release the change.
3. Put the new code on the `true` branch and keep the current behavior on the `false` branch, unchanged. Keep the branch small, so removing the flag later means deleting one side, which `configdirector-clean-up-flag` does once the flag has settled.
4. Add or adjust tests for both branches, one with the flag on and one with it off, following `configdirector-test-with-flags`.
5. Run the project's build, typecheck and tests, and fix anything the change broke.

## 5. Hand over

In a few lines, tell the user:

- first, anything they asked for in ConfigDirector that was not created or changed, and why, ahead of what was done;
- the flag's key and, once it exists, that it is off in every environment: each serves `false` until its targeting rules change;
- where the code reads it, by file and line, and the tests for each branch;
- how to turn it on, one environment at a time: in the dashboard on the flag's **Targeting rules** tab, by setting the default targeting rule value to `true`, or by asking you to turn it on, which `configdirector-roll-out` does through the MCP server or the CLI.
