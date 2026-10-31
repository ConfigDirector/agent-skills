---
name: configdirector-roll-out
description: Change a ConfigDirector config's targeting rules in one environment through the ConfigDirector MCP server or CLI, such as turning a flag on or off, a percentage rollout, rules for specific users, contexts with certain attributes or a segment, an experiment split or a new value, after showing the current and resulting rules side by side and, in a live environment, getting an explicit yes. Use when the user asks to turn a flag on or off, roll a change out, target users or a segment, split an experiment, or change what a config serves in an environment.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.14.0
---

# Change targeting rules in one environment

Work through the steps in order. The result is a new set of targeting rules for one config in one environment: the rules the environment has now, with the user's change applied, written once the user has seen the current and resulting rules side by side and said yes. For several environments, work through the steps once per environment.

This skill changes targeting rules only, never a config's settings or a segment. To create a config, or to update a feature flag's role to kill switch or back, use `configdirector-create-config`; to create or change a segment, `configdirector-segments`.

Changing targeting rules needs an API token with these permissions, as the ConfigDirector dashboard names them under **API tokens**: `Projects: Read`, `Environments: Read`, `Configs: Read`, `Configs: Update targeting rules`. Rules with a segment also need `Segments: Read`, and evaluating a saved context needs `Contexts: Read`.

## 1. Reach the account, find the project, check the permissions and find the environment

Use the ConfigDirector MCP tools when the ConfigDirector MCP server is connected, and the `configdirector` CLI otherwise; never both in one run. With the CLI, always pass `--json` and read the output, never the human text. Each step names the MCP tool first and the CLI command second.

List the projects: `list_projects` / `configdirector projects list --json`. When the current repository has `configdirector.json`, the project is the one whose slug is its `project`, and every CLI command, `projects list` included, runs from the directory that holds the file. Otherwise it is the only project listed, or the one the user picks when there are several: ask which one the config belongs to. Then pass `--project <slug>` to every CLI command below.

Then read the token's permissions, before proposing anything. On MCP, they are the ConfigDirector tools you can see by name, loaded or not, since the server offers only the tools the token allows; on the CLI, `configdirector api-token get --json` lists them in short form in `permissions`. The table gives each permission in the dashboard's wording, its short form and the MCP tool that needs it:

| Permission                        | Short form                      | MCP tool                                                |
| --------------------------------- | ------------------------------- | ------------------------------------------------------- |
| `Projects: Read`                  | `projects:read`                 | `list_projects`                                         |
| `Environments: Read`              | `environments:read`             | `list_environments`                                     |
| `Configs: Read`                   | `configs:read`                  | `get_config`                                            |
| `Configs: Update targeting rules` | `config-targeting-rules:update` | `update_targeting_rules`                                |
| `Segments: Read`                  | `segments:read`                 | `list_segments`                                         |
| `Contexts: Read`                  | `contexts:read`                 | none: only an evaluation of a saved context reports it |

When `Projects: Read`, `Environments: Read`, `Configs: Read` or `Configs: Update targeting rules` is missing, stop and ask before proposing anything. When `Segments: Read` is missing, tell the user that a change naming a segment needs it, and go on; once the change names a segment, stop and ask before composing it. When the CLI lists no `Contexts: Read`, tell the user that evaluating a saved context needs it, and go on.

List the environments: `list_environments` / `configdirector environments list --json`. The environment is the one the user named, by slug or name; when they named none, or the name fits none or several, ask, listing the slugs. Note whether its `live` is `true`: a live environment serves real traffic, and step 3 asks for an explicit yes before changing it.

When a step fails, tell the user why. The CLI sign-ins case runs the command again; every other case means nothing can be created or changed, so stop and ask, with the case's fix as the first choice:

- No route answers: no ConfigDirector tool is available, and `configdirector` is not installed, or `projects list` exits 2 with `No API token found` or `No CLI sign-in is for the organization`, or with `The Admin API refused the request` and a code other than `INSUFFICIENT_PERMISSIONS`, such as `API_TOKEN_EXPIRED`. Send the user to `configdirector-connect` for a token with the permissions above.
- Exit 2 with `unknown command`: the installed CLI is older than the commands this skill uses. Tell the user to install `@configdirector/cli` again, which updates it, as the Install section of https://docs.configdirector.com/integrations/cli shows.
- Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
- The token belongs to another organization than the one `configdirector.json` names: the projects `list_projects` or `projects list` returns carry another `organizationId` than its `organization`, or a CLI command exits 2 with `The token from` and `belongs to the organization`. Tell the user so, and where the token came from: the MCP server's configuration, the source the CLI's message names, or else `CONFIGDIRECTOR_TOKEN` or `CONFIGDIRECTOR_ORGANIZATION` set where you run commands, which the CLI uses ahead of the repository's organization. Send them to `configdirector-connect`.
- A permission is missing: on MCP, a tool of the table that you cannot see, or a tool error naming the permission; on the CLI, one the table lists that `permissions` lacks, or exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`. A refusal names the permission in its short form. Tell the user which one in the dashboard's wording, from the table, and that they can add it to the token on the **API tokens** page.
- Exit 2 with any other message, or any other tool error, such as a suspended service or an unreachable API: report the message, which says what to do.

Stop and ask means: stop at once, before any other work, including work the user asked for outside this skill. Tell the user what was not created or changed and why, with a missing permission in the dashboard's wording, and ask how to go on:

1. They fix it, as the case says, and you try again.
2. They make the change in the dashboard, with the resulting rules you show them, and you go on.
3. Only when the user's task has work left that does not need the change: you go on with that work without it, and the environment keeps its current rules. Run on its own, this skill offers the first two.

Wait for their answer. On choice 2 before the rules are composed, compose them and show them as steps 2 and 3 do, skipping any read that fails, and write nothing.

## 2. Read the current rules and their format

Read all of this before composing a change. Never write a rule from memory.

1. The config: `get_config` / `configdirector configs get <key> --json`. Its `targets` hold one entry per environment, and the entry whose `environment` is the one from step 1 is the current set: `defaultValue`, the default targeting rule value, and `rules`, in evaluation order. Note the config's current `key`, which the user may have named by an old one, its type and constraints, and an experiment's variations. When no config has the key (on MCP, an error saying so; on the CLI, exit 2 with `No config in <project> has the key`), list the configs with `list_configs` / `configdirector configs list --json` and ask which one the user means.
2. The targeting rules reference, once per run: `get_targeting_rules_reference` / `configdirector targeting-rules reference --json`. It holds the JSON Schema of the rules, the condition kinds, the attributes a condition can test, the operators of each target type, of context kind conditions and of segment conditions, and notes on how values are written and rules are evaluated. Every condition, operator and value you write comes from it.
3. The segments, when the change names one or a current rule uses one: `list_segments` / `configdirector segments list --json`, for each segment's `id` and name. When no segment has the name the user gave, say so and ask; this skill never creates a segment, `configdirector-segments` does. Without `Segments: Read`, show a current segment condition by its segment ID and tell the user why; a segment the change names needs the permission to find its ID.

## 3. Compose the change and confirm it

Start from the current set and change only what the user asked for:

- Turning a flag on in an environment without rules: the default targeting rule value becomes `true`. Turning it off: `false`.
- A percentage rollout: a percentage rule, which every context matches, or, for the contexts a condition picks, a conditional rule that serves a percentage rollout. The percentages add up to 100, so a 20% rollout of a flag gives 20% `true` and 80% `false`. Changing a rollout's size edits that rule's percentages in place.
- Specific users, contexts with certain attributes, or a segment: a conditional rule with attribute conditions, such as on the context identifier or a trait, or a segment condition with the segment's ID. All of a rule's conditions must match.
- An experiment split: percentages over the experiment's variations.
- A different value: the default targeting rule value, or the value of the rule the user means.

Rules are evaluated in order, and the first match wins. Put a new rule where it reaches the contexts the user means; when an earlier rule would catch some of them first, such as a percentage rule, which every context matches, say so and ask where the new rule goes. When the request leaves a current rule's fate open, such as a rule serving `true` when the user asks to turn the flag off, ask; never guess.

Write each value in the config's type and within its constraints, as the reference's notes say, and only the variations' values for an experiment. Every rule, condition and percentage you keep keeps its `id` and its other fields, and each rule's `order` is its position, counting from 0. Give a new rule, condition or percentage a new random UUID as its `id` on MCP, and no `id` on the CLI, which gives it one.

Show the current and the resulting rules side by side, one line per rule in the sentences `configs get` writes in its text output, which you compose from the JSON, with the default targeting rule value last and a kept rule on the same row in both columns. A condition reads as its trait without the leading `/`, or as `context identifier`, `context kind`, `context name`, `app name` or `app version`, then its operator and its target values separated by commas; a segment condition as `in segment` or `not in segment` and the segment's name. A conditional rule's conditions are joined by `and`, followed by a colon and the value it serves, or its shares written as `20% get true, 80% get false`; a percentage rule reads as its shares alone. For example:

| staging, now                      | staging, after the change                               |
| --------------------------------- | ------------------------------------------------------- |
| 1. plan is one of pro, team: true | 1. plan is one of pro, team: true                       |
|                                   | 2. in segment Beta testers: 20% get true, 80% get false |
| Default targeting rule: false     | Default targeting rule: false                           |

Then say in words what changes, such as "Adds rule 2: 20% of the contexts in the Beta testers segment who are not on the pro or team plan get `true`. Every other context gets what it gets now." Wait for the user's yes before writing anything. When the user changes the request, compose it again and show both columns again.

In a live environment, once the user says yes, tell them the environment is live and serving real traffic, show both columns again, and ask for an explicit yes to this change in this environment. Anything other than a clear yes, such as a question or a change, is not one.

## 4. Write the rules

After the yes, write the whole resulting set, `defaultValue` and every rule in order; a rule left out is removed:

- MCP: `update_targeting_rules` with the project's ID, the config's current `key` as `configKey`, the environment's `id` as `environmentId`, `defaultValue` and `rules`.
- CLI: write the resulting entry, `{"defaultValue": ..., "rules": [...]}`, to a new file in the operating system's temporary directory, never in the repository, run `configdirector targeting-rules set <key> --environment <slug> --rules <file> --json`, and delete the file once the command ends, whatever its outcome.

When ConfigDirector refuses the rules, nothing changes: on MCP, a tool error listing the reasons; on the CLI, exit 2 with `The Admin API rejected the request:` and the reasons. Show the reasons, fix the rules against the reference, and return to step 3 to show them and confirm again. Read any other failure, such as a missing permission, as step 1 does, and stop and ask.

## 5. Show what a context gets

When the user asks what a context now gets, evaluate the config in that environment for the context they describe, and never work the answer out from the rules yourself:

- MCP: `evaluate_config` with the project's ID, the config's `key` as `configKey`, the environment's `id` as `environmentId`, and `context` with the `kind`, `identifier`, `name` and `traits` they give, or `savedContext` with a `kind` and an `identifier`.
- CLI: `configdirector evaluate <key> --environment <slug> --json`, with `--context-id <identifier>`, `--context-kind <kind>`, `--context-name <name>` and, once per trait, `--context-trait <name>=<text>`, or `--context-trait <name>:=<json>` for a number, boolean, array or object; or `--context-json '<json>'`; or `--saved-context <kind>:<identifier>`.

A saved context is one ConfigDirector stored from SDK evaluations in that environment, and needs `Contexts: Read`. When the token lacks it, as step 1 found on the CLI, or the evaluation reports on MCP, say so before evaluating anything else, and ask whether they add it on the **API tokens** page for you to try again, or describe the context's kind, identifier and traits for you to evaluate instead, which needs no `Contexts: Read`. Show the value served and the rule that served it, or the default targeting rule, as the evaluation reports them.

## 6. Hand over

In a few lines, tell the user:

- first, anything they asked for in ConfigDirector that was not created or changed, and why, ahead of what was done;
- what was written: the resulting rules, in the sentences of step 3, and the config, environment and project;
- that SDKs connected to that environment receive the new rules now, and the config's other environments are unchanged;
- how to revert: run this skill again with the previous set. Print it as a JSON block of the `defaultValue` and `rules` step 2 read, so a later run can write it back as it was.
