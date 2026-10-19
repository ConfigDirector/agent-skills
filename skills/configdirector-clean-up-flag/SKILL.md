---
name: configdirector-clean-up-flag
description: Remove a settled temporary ConfigDirector feature flag from the code, keeping the branch it serves, after reading its lifecycle state, its recent evaluations and every code reference through the ConfigDirector MCP server or CLI and configdirector scan, and archive the config only once the user confirms the removal is deployed. Use when the user asks to remove, retire or clean up a flag, or to hardcode its value.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.6.0
---

# Remove a settled flag from the code

Work through the steps in order. The result is the code without the flag: the branch the flag serves stays, the other branch, the evaluation and their tests go, and the config is archived only once the user confirms the removal is deployed everywhere that read it. Confirm with the user before editing anything and before archiving.

This skill removes one temporary feature flag per run. A kill switch or a permanent config stops at step 2, and why a flag is still read is not answered here.

Cleaning up a flag needs an API token with these permissions, as the ConfigDirector dashboard names them under **API tokens**: `Projects: Read`, `Environments: Read`, `Configs: Read`, `Configs: Archive`.

## 1. Reach the account and find the project

Use the ConfigDirector MCP tools when the ConfigDirector MCP server is connected, and the `configdirector` CLI otherwise; never both in one run, except `scan` in step 3, which exists only on the CLI. With the CLI, always pass `--json` and read the output, never the human text. Each step names the MCP tool first and the CLI command second.

List the projects: `list_projects` / `configdirector projects list --json`. When the current repository has `configdirector.json`, the project is the one whose slug is its `project`, and the CLI commands below run from the directory that holds the file. Otherwise it is the only project listed, or the one the user picks when there are several: ask which one the flag belongs to. Then pass `--project <slug>` to every CLI command below.

When a step fails, tell the user why, and go on only once it is fixed:

- No route answers: no ConfigDirector tool is available, and `configdirector` is not installed, or `projects list` exits 2 with `No API token found`, or with `The Admin API refused the request` and a code other than `INSUFFICIENT_PERMISSIONS`, such as `API_TOKEN_EXPIRED`. Send the user to `configdirector-connect` for a token with the permissions above.
- Exit 2 with `unknown command`: the installed CLI is older than the commands this skill uses. Tell the user to install `@configdirector/cli@beta` again, which updates it, as the Install section of https://docs.configdirector.com/integrations/cli shows.
- A permission is missing: on MCP, a tool missing from the list, such as `archive_config` without `Configs: Archive` or `list_environments` without `Environments: Read`, or a tool error naming the permission; on the CLI, exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`. Either message names the permission in its short form. Tell the user which one in the dashboard's wording (`projects:read` is `Projects: Read`, `environments:read` is `Environments: Read`, `configs:read` is `Configs: Read`, `configs:archive` is `Configs: Archive`), and that they can add it to the token on the **API tokens** page.
- Exit 2 with any other message, such as a suspended service or an unreachable API: report the message, which says what to do, and stop.

## 2. Read the facts and decide from the lifecycle state

Read all three before deciding anything:

1. The config: `get_config` / `configdirector configs get <key> --json`. Note its current `key`, which the user may have named by an old one, its old keys in `deprecatedKeys[].key`, its `role`, `lifetime` and `state`, and its `targets`, one entry per environment with `targets[].environment.slug` and `targets[].environment.live`, its `rules` and its `defaultValue`, the default targeting rule value. Write each environment's rules in one line per rule, as `configs get` writes them, with the default targeting rule value last, for example `production (live): 1. plan is one of pro, team: true; default targeting rule: true`. When no config has the key (on MCP, an error saying so; on the CLI, exit 2 with `No config in <project> has the key`), list the configs with `list_configs` / `configdirector configs list --json` and ask which one the user means.
2. The recent evaluations: `get_config_activity` / `configdirector configs activity <key> --json`. Each entry of `latestEvaluations` is the most recent evaluation from one environment, SDK key kind (`source`), SDK name and SDK version, with its `time`. An SDK listed here can belong to another application than the repository you are in.
3. The environments: `list_environments` / `configdirector environments list --json`, for which ones are `live`. A live environment serves real traffic, and only live environments decide what the flag serves.

Then decide from the config, in this order, and stop where a line says so:

- `role` is `kill-switch`, or `lifetime` is `permanent`: stop. Cleanup is for temporary feature flags, which ConfigDirector tracks until they are removed; a kill switch stays in the code, and a permanent config is read for good. Tell the user that the dashboard archives any config from its Configs page when they really mean to remove it.
- `state` is `new` or `in-use`: stop, and show the facts: which environments evaluated the flag and whether each is live, when, from which SDKs, and the rules in each environment, in the sentences of item 1. The flag is still read, so removing it now would change what those applications do.
- `state` is `settled`, `archive-ready` or `stale`: go on. A settled flag has served one value in every live environment for its role's horizon; an archive-ready one was in use or settled and has since gone quiet; a stale one was created more than 15 days ago and never evaluated.

## 3. Find every reference

Run `configdirector scan --json` from the directory that holds `configdirector.json`, or with `--project <slug>` when the repository has none. The scan has no MCP form: when the CLI is not installed, send the user to the Install section of https://docs.configdirector.com/integrations/cli, and when it reports `No API token found`, have them sign in with `configdirector login` in their own terminal, never by pasting the token into the chat. The CLI signs in on its own, apart from the MCP server, and `scan` needs `Projects: Read` and `Configs: Read`, so a token with the permissions of step 1 serves it as well.

Collect every entry of `references` whose `key` is the config's current key or one of its old keys:

- `kind` `direct`: an SDK call that evaluates the flag, with `call`, and `argument` naming the constant when the key came from one. The constant's own definition is not listed again.
- `kind` `indirect`: the key written as a quoted string outside an SDK call, such as a list of keys, a wrapper's argument or a fixture.

Either kind has `test` `true` when it is a test client call or sits in a test file.

The scan covers this repository only. When `dynamicReferences` is not empty, stop: list each one with its `file`, `line`, `call` and `argument`, and tell the user that an SDK call whose key the scan cannot know may read this flag, so it has to pass its key as a string or a constant before the cleanup can be trusted. When no reference to the key is listed, the code no longer reads it: say so and go to step 6.

## 4. Decide which branch stays

For a settled flag, the branch that stays is the single value the live environments serve, read from the rules of each live environment's `targets` entry: its `defaultValue` when it has no rules, otherwise the value that every rule and the `defaultValue` serve. A percentage rule serves every value it splits over. ConfigDirector also reports the value as `settledValue`; when the two differ, or the live environments disagree, show the rules and ask. For an archive-ready flag, read it the same way, and when the live environments do not serve one value, the user picks. For a stale flag, the user picks. When the project has no live environment, read every environment.

Show each environment's rules in the sentences of step 2, then propose the branch, such as "Keep the `true` branch: production and staging both serve `true`", and wait for the user's yes.

## 5. Show the change, then edit

Before editing, list every reference from step 3 and what happens to it:

- The evaluation is replaced by the kept branch: the SDK call, its in-code default value and the other branch go, and the kept branch's code stays as it was, without the condition.
- The constant that holds the key is removed when nothing else reads it; a list of keys loses its entry; a wrapper or fixture loses its argument.
- The test client entries for the key and the tests of the removed branch are removed, and the tests of the kept branch stay without the flag, following `configdirector-test-with-flags`.
- The SDK client and its setup stay, whatever else reads them.

Wait for the user's yes. Then make the edits, run the project's build, typecheck and tests, and fix anything the change broke. Run `configdirector scan --json` again and confirm that no reference to the key or its old keys is listed.

## 6. The archive gate

Ask whether the removal is deployed everywhere that read the flag; the SDKs and environments of step 2 say where that is. Advise waiting a day or two after that deploy before archiving, in case an application is rolled back to the version that still reads the key: that version would get its in-code default value instead of the value the flag served, which can be the other branch.

On a yes, show the archive before doing it: the config's current key and project, that SDKs stop receiving the config and an application that still reads it gets its in-code default value and raises a Config not found alert, and that the dashboard restores it for 30 days with its targeting rules intact. Wait for the user's yes, then archive it by its current key: `archive_config` / `configdirector configs archive <key> --json`. On the CLI, exit 2 with `No config in <project> has the key` means the config is already archived or belongs to another project; on MCP, an error saying no config has the key means the same.

On a no, or when the user wants to wait, end without archiving and tell them how to archive later: run this skill again, which finds no reference and goes straight to this step, or run `configdirector configs archive <key>`, call `archive_config`, or archive it from the dashboard's Configs page.

## 7. Hand over

In a few lines, tell the user:

- the branch kept, and the files changed, with the tests removed or kept;
- whether the config was archived, or is left to archive later and how;
- that the dashboard restores an archived config for 30 days, after which it is deleted for good.
