---
name: configdirector-create-config
description: Create a ConfigDirector config of any role and type from a description, such as a kill switch, a timespan with a range, an enum, a JSON config or an experiment with variations, with its constraints, availability and tags, through the ConfigDirector MCP server or CLI once the user confirms every setting and the default targeting rule value every environment starts with, or update a feature flag's role to kill switch, or back. Use when the user asks to make a flag permanent or a kill switch, or a kill switch a flag, or to create a config, flag, kill switch or experiment, except an untagged temporary boolean feature flag that wraps a code change, which configdirector-flag-a-change covers.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.13.0
---

# Create a config

Work through the steps in order. The result is a new config in the user's ConfigDirector project, with the settings the user confirmed and the same default targeting rule value in every environment. Confirm with the user before creating anything. When the description leaves a setting open, propose the usual answer step 2 gives for it, and ask when step 2 gives none: never guess one.

To put a code change behind a new temporary boolean feature flag without tags, use `configdirector-flag-a-change` instead, which also writes the code. To update a feature flag's role to kill switch, or a kill switch's to feature flag, do step 1, then follow [Update a role](#update-a-role) in place of steps 2 to 4.

Creating the config needs an API token with these permissions, as the ConfigDirector dashboard names them under **API tokens**: `Projects: Read`, `Configs: Read`, `Configs: Create`. A config with tags also needs `Tags: Read` to find the tags the project already has, and `Tags: Create` to make new ones. Updating a role through the MCP server needs `Configs: Update settings` in place of `Configs: Create`.

## 1. Reach the account, find the project and check the permissions

Use the ConfigDirector MCP tools when the ConfigDirector MCP server is connected, and the `configdirector` CLI otherwise; never both in one run. With the CLI, always pass `--json` and read the output, never the human text. Each step names the MCP tool first and the CLI command second.

List the projects: `list_projects` / `configdirector projects list --json`. When the current repository has `configdirector.json`, the project is the one whose slug is its `project`, and every CLI command, `projects list` included, runs from the directory that holds the file. Otherwise it is the only project listed, or the one the user picks when there are several: ask which one the config belongs to. Then pass `--project <slug>` to every CLI command below.

Then read the token's permissions, before proposing anything. On MCP, they are the ConfigDirector tools you can see by name, loaded or not, since the server offers only the tools the token allows; on the CLI, `configdirector api-token get --json` lists them in short form in `permissions`. The table gives each permission in the dashboard's wording, its short form and the MCP tool that needs it:

| Permission                 | Short form               | MCP tool                 |
| -------------------------- | ------------------------ | ------------------------ |
| `Projects: Read`           | `projects:read`          | `list_projects`          |
| `Configs: Read`            | `configs:read`           | `list_configs`           |
| `Configs: Create`          | `configs:create`         | `create_config`          |
| `Tags: Read`               | `tags:read`              | `find_tag_by_name`       |
| `Tags: Create`             | `tags:create`            | `create_tag`             |
| `Configs: Update settings` | `config-settings:update` | `update_config_settings` |

When `Projects: Read` or `Configs: Read` is missing, or `Configs: Create` for a new config, or `Configs: Update settings` for a role update on MCP, stop and ask before proposing anything. When `Tags: Read` is missing, tell the user that tags the project already has need it, and when `Tags: Create` is missing, that new tags need it, and go on; once a named tag needs a missing permission, stop and ask before showing the settings.

When a step fails, tell the user why. The CLI sign-ins case runs the command again; every other case means nothing can be created or changed, so stop and ask, with the case's fix as the first choice:

- No route answers: no ConfigDirector tool is available, and `configdirector` is not installed, or `projects list` exits 2 with `No API token found` or `No CLI sign-in is for the organization`, or with `The Admin API refused the request` and a code other than `INSUFFICIENT_PERMISSIONS`, such as `API_TOKEN_EXPIRED`. Send the user to `configdirector-connect` for a token with the permissions above.
- Exit 2 with `unknown command`: the installed CLI is older than the commands this skill uses. Tell the user to install `@configdirector/cli` again, which updates it, as the Install section of https://docs.configdirector.com/integrations/cli shows.
- Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
- The token belongs to another organization than the one `configdirector.json` names: the projects `list_projects` or `projects list` returns carry another `organizationId` than its `organization`, or a CLI command exits 2 with `The token from` and `belongs to the organization`. Tell the user so, and where the token came from: the MCP server's configuration, the source the CLI's message names, or else `CONFIGDIRECTOR_TOKEN` or `CONFIGDIRECTOR_ORGANIZATION` set where you run commands, which the CLI uses ahead of the repository's organization. Send them to `configdirector-connect`.
- A permission is missing: on MCP, a tool of the table that you cannot see, or a tool error naming the permission; on the CLI, one the table lists that `permissions` lacks, or exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`. A refusal names the permission in its short form. Tell the user which one in the dashboard's wording, from the table, and that they can add it to the token on the **API tokens** page.
- Exit 2 with any other message, or any other tool error, such as a suspended service or an unreachable API: report the message, which says what to do.

Stop and ask means: stop at once, before any other work, including work the user asked for outside this skill, such as code that reads the config. Tell the user what was not created or changed and why, with a missing permission in the dashboard's wording, and ask how to go on:

1. They fix it, as the case says, and you try again.
2. They make the change in the dashboard, with the settings you show them, and you go on.
3. Only when the user's task has work left that does not need the config, such as code that reads it: you go on with that work without it, and the code reads its in-code default value until the config exists. Run on its own, this skill offers the first two.

Wait for their answer. On choice 2 or 3 before the settings are settled, settle them with the user as step 2 does, skipping any read that fails, and create nothing. For a role update, show the update as [Update a role](#update-a-role) does instead, and update nothing.

## 2. Propose the config

Read the user's description, and settle each setting below from it. When the description leaves a setting open and the item gives no usual answer, ask for it before going on.

1. Key: propose one in kebab case named after what the config controls, such as `checkout-timeout` or `disable-payments`, never after a ticket number or a date. Make sure no config has it as its `key` or among its `deprecatedKeys`: `list_configs` / `configdirector configs list --json`. When one does, propose another.
2. Role and lifetime. The role decides which types the config can have, and its lifetime. The values in code font are what MCP and the CLI take:

   | Role         | `role` / `--role` | Types it allows                 | Lifetime                                      |
   | ------------ | ----------------- | ------------------------------- | --------------------------------------------- |
   | feature flag | `flag`            | boolean                         | always temporary                              |
   | kill switch  | `kill-switch`     | boolean                         | always permanent                              |
   | experiment   | `experiment`      | boolean, string, integer, float | always temporary                              |
   | config       | `config`          | every type                      | the user's choice, `temporary` or `permanent` |

   A temporary config is one the team means to remove, and ConfigDirector tracks it until it is; a permanent one stays. Only the config role takes a lifetime, as `lifetime` / `--lifetime`: take it from the description, and propose `permanent` when the description leaves it open. Every other role carries its lifetime: state it, and send no `lifetime` / `--lifetime`. A boolean the team keeps for good is a kill switch, and one they mean to remove is a feature flag, so for a permanent feature flag or a temporary kill switch, propose the other role.

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
5. Tags: the tags the user names, by name. With `Tags: Read`, look each one up: `find_tag_by_name` / `configdirector configs list --tag <name> --json`, one name per command. A name no tag has is a new tag: on MCP, `No tag with name '<name>' exists in the project.`; on the CLI, exit 2 with `No tag in <project> has the name "<name>".` Without `Tags: Read`, every named tag is a new tag. Make only the new tags the user confirms.
6. Variations, for an experiment of a type other than boolean: at least two, each with a short name, such as `control` or `treatment`, and a different value of the config's type. A boolean experiment's variations are `true` and `false`, so it takes none.
7. Description: one sentence on what the config is for, from the user's words, as `description` / `--description`.
8. Default targeting rule value: the value every environment serves until its targeting rules change, in the config's type, within its constraints, and one of the variations for an experiment. A feature flag starts at `false`, so nothing changes until it is turned on, and a kill switch at the value that keeps the feature running. For any other config, take it from the description.

Show the user every setting in one block, and wait for their yes before creating anything. Say that the default targeting rule value applies in every environment of the project; do not list the environments. Mark each new tag `(new)`, so a misspelled name is seen before the yes. Give the config role a `lifetime` line, the choice the user confirms, and write any other role's lifetime on its role line, such as `role: kill switch, always permanent`. For example:

```
key: checkout-timeout
role: config
lifetime: permanent
type: timespan in seconds, from 1 to 120, whole seconds only
availability: server SDKs
tags: checkout, payment-provider (new)
description: How long checkout waits for the payment provider before it gives up.
default targeting rule value: 30, in every environment
```

When the user changes a setting, check it against the items above and show the block again.

## 3. Create the config

After the user's yes, create it with those settings:

- MCP: take each existing tag's ID from `find_tag_by_name`, and make each new tag with `create_tag`, which returns its ID. Then call `create_config` with the project's ID, the settings, `lifetime` for the config role only, every tag's ID as `tagIds`, `variations` and `defaultValue`. A JSON config's value goes as its JSON text.
- CLI: `configdirector configs create --key <key> --type <type> --role <role> --default-value <value> --json`, adding `--lifetime <lifetime>` for the config role only, the constraint options from step 2, `--client-only` or `--server-only`, `--description <text>`, `--tag <name>` once per existing tag, `--new-tag <name>` once per new tag and `--variation <name>=<value>` once per variation.

On the CLI, a JSON Schema or a JSON default targeting rule value goes in a new file in the operating system's temporary directory, never in the repository: pass the schema as `--json-schema <file>` and the value as `--default-value @<file>`. Delete the files once the command ends, whatever its outcome.

When the create does not succeed, no config is created. Tell the user what happened:

- The key is taken: on MCP, an error that the key is already in use, and `get_config` with the key returns the config that has it; on the CLI, exit 1 with that config. Show it, propose another key, and return to step 2.
- A new tag has a name a tag already has: on MCP, `create_tag` rejects it with `A tag named "<name>" already exists.`; on the CLI, exit 2 with `The Admin API rejected the request:`, the same reason and `use --tag instead of --new-tag`. With `Tags: Read`, report it and return to step 2 with that tag as an existing one. Without it, stop and ask, with adding `Tags: Read` as the fix.
- On the CLI, exit 2 with `unknown option '--new-tag'`, or with `required option '--lifetime <lifetime>' not specified` for a role other than config: the installed CLI is older than the command this step runs. Read it as step 1's `unknown command` case, and stop and ask.
- A setting is refused: on MCP, a tool error listing the reasons; on the CLI, exit 2 with `The Admin API rejected the request:` and the reasons, or with a message about one of the command's options, such as `--default-value takes a number with --type integer, not ten.` Show the reasons, ask what to change, and return to step 2.
- Any other failure, such as a missing permission: read it as step 1 does, and stop and ask.

When new tags were made before the failure, the CLI names them on a line starting `Created the tag`. Tell the user which tags were made, that they stay in the project's tag catalog, and that a retry gives them as existing tags: on MCP by the IDs `create_tag` returned, on the CLI with `--tag`, which needs `Tags: Read`, so without it, stop and ask.

## 4. Hand over

In a few lines, tell the user:

- first, anything they asked for in ConfigDirector that was not created or changed, and why, ahead of what was done;
- what was created: the config, with its settings as ConfigDirector returned them, and each new tag this run made;
- that every environment serves the default targeting rule value until its targeting rules change;
- how to read it in code: `configdirector-use-configs-in-code` gives the rules, such as the type each SDK serves it as and what the in-code default value is for;
- how to change its targeting rules, one environment at a time: in the dashboard on the config's **Targeting rules** tab, or by asking you to, which `configdirector-roll-out` does through the MCP server or the CLI.

## Update a role

A feature flag and a kill switch are both boolean, so each can update its role to the other and keep everything else. No other role is ever updated.

1. Read the config: `get_config` / `configdirector configs get <key> --json`. Note its current `key`, which the user may have named by an old one, its `role` and its `state`. When no config has the key (on MCP, an error saying so; on the CLI, exit 2 with `No config in <project> has the key`), list the configs with `list_configs` / `configdirector configs list --json` and ask which one the user means.
2. Decide from its `role` and the request, and stop where a line says so:
   - `flag`, asked to become a kill switch or permanent: the new role is `kill-switch`.
   - `kill-switch`, asked to become a feature flag or temporary: the new role is `flag`.
   - `flag` asked to become a feature flag or temporary, or `kill-switch` asked to become a kill switch or permanent: it already is. Say so, and stop.
   - `config`, asked to become permanent or temporary: its lifetime is the user's choice, and its role stays. Tell them they update the lifetime in the dashboard, with the **Edit lifetime** pencil on the config's **Settings** tab, and stop.
   - Any other request, such as a permanent experiment or a feature flag turned into a config: tell the user that ConfigDirector updates a role only from feature flag to kill switch and back, so a config with the role they want is a new one, which steps 2 to 4 create. For an experiment, add that it is always temporary. Stop.
3. Show what the update does, with the lifecycle line written from the config's current `state`. For a settled feature flag becoming a kill switch, for example:

   ```
   checkout-banner: feature flag, temporary → kill switch, permanent
   - Its lifetime becomes permanent.
   - Lifecycle tracking stops: it is settled now and returns to in use, and any open settled, archive-ready or in-code default value mismatch alert on it is resolved at once.
   - Its key, boolean type, targeting rules in every environment, tags and SDK availability stay as they are.
   ```

   For a kill switch becoming a feature flag, the lifetime becomes temporary and lifecycle tracking starts: ConfigDirector tells the team once the flag has settled, serving one value in every live environment, and `configdirector-clean-up-flag` can then remove it from the code.

4. On MCP, wait for the user's yes, then call `update_config_settings` with the project's ID, the config's current `key` as `configKey` and the new `role`, and no other field: the role brings its lifetime. The CLI has no command that updates a role: tell the user to update it in the dashboard, with the **Edit role** pencil on the config's **Settings** tab, and update nothing yourself.

   When ConfigDirector refuses the update, nothing changes: a tool error lists the reasons. Show the reasons, and stop and ask. Read any other failure, such as a missing permission, as the skill's step 1 does, and stop and ask.

5. Hand over. In a few lines, tell the user:

   - first, anything they asked for in ConfigDirector that was not created or changed, and why, ahead of what was done;
   - the config's `role`, `lifetime` and `state` as ConfigDirector returned them;
   - what follows from the role: a kill switch stays in the code for good, and a feature flag leaves it through `configdirector-clean-up-flag` once it has settled;
   - how to undo the update: ask for the other role, which this section updates the same way.
