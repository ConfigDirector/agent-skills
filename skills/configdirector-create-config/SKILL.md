---
name: configdirector-create-config
description: Create a ConfigDirector config of any role and type from a description, such as a kill switch, a timespan with a range, an enum, a JSON config or an experiment with variations, with its constraints, availability and tags, through the ConfigDirector MCP server or CLI once the user confirms every setting and the default targeting rule value every environment starts with. Use when the user asks to create a config, flag, kill switch or experiment, except an untagged temporary boolean feature flag that wraps a code change, which configdirector-flag-a-change covers.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.10.0
---

# Create a config

Work through the steps in order. The result is a new config in the user's ConfigDirector project, with the settings the user confirmed and the same default targeting rule value in every environment. Confirm with the user before creating anything. When the description leaves a setting open, propose the usual answer step 2 gives for it, and ask when step 2 gives none: never guess one.

To put a code change behind a new temporary boolean feature flag without tags, use `configdirector-flag-a-change` instead, which also writes the code.

Creating the config needs an API token with these permissions, as the ConfigDirector dashboard names them under **API tokens**: `Projects: Read`, `Configs: Read`, `Configs: Create`. A config with tags also needs `Tags: Read` and `Configs: Update settings`.

## 1. Reach the account and find the project

Use the ConfigDirector MCP tools when the ConfigDirector MCP server is connected, and the `configdirector` CLI otherwise; never both in one run. With the CLI, always pass `--json` and read the output, never the human text. Each step names the MCP tool first and the CLI command second.

List the projects: `list_projects` / `configdirector projects list --json`. When the current repository has `configdirector.json`, the project is the one whose slug is its `project`, and every CLI command, `projects list` included, runs from the directory that holds the file. Otherwise it is the only project listed, or the one the user picks when there are several: ask which one the config belongs to. Then pass `--project <slug>` to every CLI command below.

When a step fails, tell the user why, and go on only once it is fixed:

- No route answers: no ConfigDirector tool is available, and `configdirector` is not installed, or `projects list` exits 2 with `No API token found` or `No CLI sign-in is for the organization`, or with `The Admin API refused the request` and a code other than `INSUFFICIENT_PERMISSIONS`, such as `API_TOKEN_EXPIRED`. Send the user to `configdirector-connect` for a token with the permissions above.
- Exit 2 with `unknown command`: the installed CLI is older than the commands this skill uses. Tell the user to install `@configdirector/cli` again, which updates it, as the Install section of https://docs.configdirector.com/integrations/cli shows.
- Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
- The token belongs to another organization than the one `configdirector.json` names: the projects `list_projects` or `projects list` returns carry another `organizationId` than its `organization`, or a CLI command exits 2 with `The token from` and `belongs to the organization`. Tell the user so, and where the token came from: the MCP server's configuration, the source the CLI's message names, or else `CONFIGDIRECTOR_TOKEN` or `CONFIGDIRECTOR_ORGANIZATION` set where you run commands, which the CLI uses ahead of the repository's organization. Send them to `configdirector-connect`.
- A permission is missing: on MCP, a tool missing from the list, such as `create_config` without `Configs: Create` or `find_tag_by_name` without `Tags: Read`, or a tool error naming the permission; on the CLI, exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`. Either message names the permission in its short form. Tell the user which one in the dashboard's wording (`projects:read` is `Projects: Read`, `configs:read` is `Configs: Read`, `configs:create` is `Configs: Create`, `tags:read` is `Tags: Read`, `config-settings:update` is `Configs: Update settings`), and that they can add it to the token on the **API tokens** page.
- Exit 2 with any other message, such as a suspended service or an unreachable API: report the message, which says what to do, and stop.

## 2. Propose the config

Read the user's description, and settle each setting below from it. When the description leaves a setting open and the item gives no usual answer, ask for it before going on.

1. Key: propose one in kebab case named after what the config controls, such as `checkout-timeout` or `disable-payments`, never after a ticket number or a date. Make sure no config has it as its `key` or among its `deprecatedKeys`: `list_configs` / `configdirector configs list --json`. When one does, propose another.
2. Role and lifetime. The role decides which types the config can have. The values in code font are what MCP and the CLI take:

   | Role         | `role` / `--role` | Types it allows                 | Usual `lifetime` / `--lifetime` |
   | ------------ | ----------------- | ------------------------------- | ------------------------------- |
   | feature flag | `flag`            | boolean                         | `temporary`                     |
   | kill switch  | `kill-switch`     | boolean                         | `permanent`                     |
   | experiment   | `experiment`      | boolean, string, integer, float | `temporary`                     |
   | config       | `config`          | every type                      | `permanent`                     |

   A temporary config is one the team means to remove, and ConfigDirector tracks it until it is; a permanent one stays.

3. Type and constraints: `boolean`, `string`, `integer`, `float`, `timespan`, `enum`, `url` or `json`, as `type` / `--type`. On MCP the constraints go in `typeOptions`, in the shape `create_config` describes for each type; the CLI has an option for each:

   | Type            | Constraints                                                                                                         | CLI options                                                                              |
   | --------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
   | integer, float  | an optional lower and upper bound, each inclusive or exclusive                                                      | `--min`, `--max` (inclusive), `--exclusive-min`, `--exclusive-max`                       |
   | timespan        | the unit, a lower and an upper bound, inclusive whole numbers from 0, and whether fractions of the unit are allowed | `--unit` (`milliseconds`, `seconds` or `minutes`), `--min`, `--max`, `--allow-fractions` |
   | enum            | at least two allowed values, and whether they are strings or numbers                                                | `--allowed-value` once per value, `--enum-value-type` (`string` or `number`)             |
   | url             | whether only HTTPS URLs are allowed, as the dashboard proposes, or HTTP ones too                                    | `--https-only`                                                                           |
   | json            | an optional JSON Schema every value must match                                                                      | `--json-schema <file>`                                                                   |
   | boolean, string | none                                                                                                                | none                                                                                     |

   A timespan always needs its unit and both bounds, and an enum its values.

4. Availability: client SDKs (browsers and mobile apps), server SDKs (backend services), or both. Take it from the description. When the description leaves it open and the code that will read the config is in the current repository, take it from the SDK that code uses, whose docs page `configdirector-use-configs-in-code` shows how to find; otherwise ask. On MCP it is `client` and `server`; on the CLI, `--client-only` or `--server-only`, and neither for both.
5. Tags: only those the user names, by name. This skill never creates a tag.
6. Variations, for an experiment of a type other than boolean: at least two, each with a short name, such as `control` or `treatment`, and a different value of the config's type. A boolean experiment's variations are `true` and `false`, so it takes none.
7. Description: one sentence on what the config is for, from the user's words, as `description` / `--description`.
8. Default targeting rule value: the value every environment serves until its targeting rules change, in the config's type, within its constraints, and one of the variations for an experiment. A feature flag starts at `false`, so nothing changes until it is turned on, and a kill switch at the value that keeps the feature running. For any other config, take it from the description.

Show the user every setting in one block, and wait for their yes before creating anything. Say that the default targeting rule value applies in every environment of the project; do not list the environments. For example:

```
key: checkout-timeout
role: config
lifetime: permanent
type: timespan in seconds, from 1 to 120, whole seconds only
availability: server SDKs
tags: checkout
description: How long checkout waits for the payment provider before it gives up.
default targeting rule value: 30, in every environment
```

When the user changes a setting, check it against the items above and show the block again.

## 3. Create the config

After the user's yes, create it with those settings:

- MCP: resolve each tag name to its ID with `find_tag_by_name`, then call `create_config` with the project's ID, the settings, `tagIds`, `variations` and `defaultValue`. A JSON config's value goes as its JSON text.
- CLI: `configdirector configs create --key <key> --type <type> --role <role> --lifetime <lifetime> --default-value <value> --json`, adding the constraint options from step 2, `--client-only` or `--server-only`, `--description <text>`, `--tag <name>` once per tag and `--variation <name>=<value>` once per variation.

On the CLI, a JSON Schema or a JSON default targeting rule value goes in a new file in the operating system's temporary directory, never in the repository: pass the schema as `--json-schema <file>` and the value as `--default-value @<file>`. Delete the files once the command ends, whatever its outcome.

When the create does not succeed, nothing is created. Tell the user what happened:

- The key is taken: on MCP, an error that the key is already in use, and `get_config` with the key returns the config that has it; on the CLI, exit 1 with that config. Show it, propose another key, and return to step 2.
- A tag name no tag has: on MCP, `find_tag_by_name` finds no tag; on the CLI, exit 2 with `No tag in <project> has the name "<name>".` Report it, never create the tag, ask what to change, and return to step 2.
- A setting is refused: on MCP, a tool error listing the reasons; on the CLI, exit 2 with `The Admin API rejected the request:` and the reasons, or with a message about one of the command's options, such as `--default-value takes a number with --type integer, not ten.` Show the reasons, ask what to change, and return to step 2.
- Any other failure, such as a missing permission: read it as step 1 does.

## 4. Hand over

In a few lines, tell the user:

- what was created, with its settings as ConfigDirector returned them;
- that every environment serves the default targeting rule value until its targeting rules change;
- how to read it in code: `configdirector-use-configs-in-code` gives the rules, such as the type each SDK serves it as and what the in-code default value is for;
- how to change its targeting rules, one environment at a time: in the dashboard on the config's **Targeting rules** tab, or by asking you to, which `configdirector-roll-out` does through the MCP server or the CLI.
