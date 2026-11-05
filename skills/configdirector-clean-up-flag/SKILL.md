---
name: configdirector-clean-up-flag
description: Remove a settled temporary ConfigDirector feature flag from the code on the user's request, keeping the branch it serves, after reading its lifecycle state, its recent evaluations and every code reference through the ConfigDirector MCP server or CLI and configdirector scan, asking only when those facts leave the user a decision. Use when the user asks to remove, retire or clean up a flag, or to hardcode its value.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.17.0
---

# Remove a settled flag from the code

Work through the steps in order. The result is the code without the flag: the branch the flag serves stays, and the other branch, the evaluation and their tests go. The user's request is the yes to edit the code: they review the diff, and nothing reaches production until they deploy. So edit without asking, and ask a question only where a step names one.

This skill removes one temporary feature flag per run. A kill switch or a permanent config stops at step 2, and why a flag is still read is not answered here.

Cleaning up a flag only reads the user's ConfigDirector account, with an API token that has these permissions, as the ConfigDirector dashboard names them under **API tokens**: `Projects: Read`, `Environments: Read`, `Configs: Read`.

## 1. Reach the account, find the project and check the permissions

Use the ConfigDirector MCP tools when the ConfigDirector MCP server is connected, and the `configdirector` CLI otherwise; never both in one run, except `scan` in step 3, which exists only on the CLI. With the CLI, always pass `--json` and read the output, never the human text. Each step names the MCP tool first and the CLI command second.

List the projects: `list_projects` / `configdirector projects list --json`. When the current repository has `configdirector.json`, the project is the one whose slug is its `project`, and every CLI command, `projects list` included, runs from the directory that holds the file. Otherwise it is the only project listed, or the one the user picks when there are several: ask which one the flag belongs to. Then pass `--project <slug>` to every CLI command below.

Then read the token's permissions. On MCP, they are the ConfigDirector tools you can see by name, loaded or not, since the server offers only the tools the token allows; on the CLI, `configdirector api-token get --json` lists them in short form in `permissions`. The table gives each permission in the dashboard's wording, its short form and the MCP tool that needs it:

| Permission           | Short form          | MCP tool            |
| -------------------- | ------------------- | ------------------- |
| `Projects: Read`     | `projects:read`     | `list_projects`     |
| `Environments: Read` | `environments:read` | `list_environments` |
| `Configs: Read`      | `configs:read`      | `get_config`        |

When one is missing, stop and ask before reading anything else.

When a step fails, tell the user why. The CLI sign-ins case runs the command again; every other case means the run cannot read what it decides from, so stop and ask, with the case's fix:

- No route answers: no ConfigDirector tool is available, and `configdirector` is not installed, or `projects list` exits 2 with `No API token found` or `No CLI sign-in is for the organization`, or with `The Admin API refused the request` and a code other than `INSUFFICIENT_PERMISSIONS`, such as `API_TOKEN_EXPIRED`. Send the user to `configdirector-connect` for a token with the permissions above.
- Exit 2 with `unknown command`: the installed CLI is older than the commands this skill uses. Tell the user to install `@configdirector/cli` again, which updates it, as the Install section of https://docs.configdirector.com/integrations/cli shows.
- Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
- The token belongs to another organization than the one `configdirector.json` names: the projects `list_projects` or `projects list` returns carry another `organizationId` than its `organization`, or a CLI command exits 2 with `The token from` and `belongs to the organization`. Tell the user so, and where the token came from: the MCP server's configuration, the source the CLI's message names, or else `CONFIGDIRECTOR_TOKEN` or `CONFIGDIRECTOR_ORGANIZATION` set where you run commands, which the CLI uses ahead of the repository's organization. Send them to `configdirector-connect`.
- A permission is missing: on MCP, a tool of the table that you cannot see, or a tool error naming the permission; on the CLI, one the table lists that `permissions` lacks, or exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`. A refusal names the permission in its short form. Tell the user which one in the dashboard's wording, from the table, and that they can add it to the token on the **API tokens** page.
- Exit 2 with any other message, or any other tool error, such as a suspended service or an unreachable API: report the message, which says what to do.

Stop and ask means: stop at once, before any other work, including work the user asked for outside this skill, and edit nothing. Tell the user what could not be read and why, with a missing permission in the dashboard's wording, and ask them to fix it, as the case says. Wait for their answer, then try again: the run needs every read to decide whether the flag can go.

## 2. Read the facts and decide from the lifecycle state

Read all three before deciding anything:

1. The config: `get_config` / `configdirector configs get <key> --json`. Note its current `key`, which the user may have named by an old one, its old keys in `deprecatedKeys[].key`, its `role`, `lifetime` and `state`, its `settledValue`, whether server SDKs and client SDKs receive it in `server` and `client`, and its `targets`, one entry per environment with `targets[].environment.slug` and `targets[].environment.live`, its `rules` and its `defaultValue`, the default targeting rule value. Where a step shows an environment's rules, write them in one line per rule, as `configs get` writes them, with the default targeting rule value last, for example `production (live): 1. plan is one of pro, team: true; default targeting rule: true`. When no config has the key (on MCP, an error saying so; on the CLI, exit 2 with `No config in <project> has the key`), list the configs with `list_configs` / `configdirector configs list --json` and ask which one the user means.
2. The recent evaluations: `get_config_activity` / `configdirector configs activity <key> --json`. Each entry of `latestEvaluations` is the most recent evaluation from one environment, SDK key kind (`source`), SDK name and SDK version, with its `time`. An SDK listed here can belong to another application than the repository you are in.
3. The environments: `list_environments` / `configdirector environments list --json`, for which ones are `live`. A live environment serves real traffic, and only live environments decide what the flag serves.

Then decide from the config, in this order, and stop where a line says so:

- `role` is `kill-switch`: stop. Cleanup is for temporary feature flags, which ConfigDirector tracks until they are removed, and a kill switch is permanent by its role: it stays in the code. When the team now means to remove it, `configdirector-create-config` updates its role to feature flag, and ConfigDirector tracks it from then on. The dashboard also archives any config from its Configs page when they really mean to remove it now.
- `lifetime` is `permanent`: stop. Cleanup is for temporary configs, and a config's lifetime is the team's choice: this one is meant to be read for good. When the team now means to remove it, they update its lifetime to temporary with the **Edit lifetime** pencil on its **Settings** tab in the dashboard, and ConfigDirector tracks it from then on. The dashboard also archives any config from its Configs page when they really mean to remove it now.
- `state` is `new` or `in-use`: stop, and show the facts: which environments evaluated the flag and whether each is live, when, from which SDKs, and the rules in each environment, in the sentences of item 1. The flag is still read, so removing it now would change what those applications do.
- `state` is `settled`, `archive-ready` or `stale`: go on. A settled flag has served one value in every live environment for its role's horizon; an archive-ready one was in use or settled and has since gone quiet; a stale one was created more than 15 days ago and never evaluated.

## 3. Find every reference

Run `configdirector scan --json` from the directory that holds `configdirector.json`, or with `--project <slug>` when the repository has none. The scan has no MCP form: when the CLI is not installed, send the user to the Install section of https://docs.configdirector.com/integrations/cli, and when it reports `No API token found` or `No CLI sign-in is for the organization`, have them sign in to the repository's organization with `configdirector login` in their own terminal, never by pasting the token into the chat. The CLI signs in on its own, apart from the MCP server, and `scan` needs `Projects: Read` and `Configs: Read`, so a token with the permissions of step 1 serves it as well.

Collect every entry of `references` whose `key` is the config's current key or one of its old keys:

- `kind` `direct`: an SDK call that evaluates the flag, with `call`, and `argument` naming the constant when the key came from one. The constant's own definition is not listed again.
- `kind` `indirect`: the key written as a quoted string outside an SDK call, such as a list of keys, a wrapper's argument or a fixture.

Either kind has `test` `true` when it is a test client call or sits in a test file.

The scan covers this repository only.

`dynamicReferences` lists the SDK calls whose key the scan could not read, each with its `file`, `line`, `sdk`, `call` and `argument`. Rule each one out, in this order:

1. The calling SDK does not receive the config: `sdk` is a server SDK (`js-server`, `nuxt-server`, `nextjs-server`, `openfeature-node`, `java`, `openfeature-java`, `python`, `openfeature-python`, `dotnet`, `openfeature-dotnet`, `go` or `openfeature-go`) and the config's `server` is `false`, or `sdk` is a client SDK (`js-client`, `react`, `react-native`, `vue`, `nuxt-client`, `nextjs-client`, `openfeature-web`, `flutter`, `openfeature-flutter`, `swift`, `openfeature-swift`, `android` or `openfeature-android`) and the config's `client` is `false`. An `sdk` in neither list goes to rule 2.
2. The code fixes the keys the call can read, and this flag's are not among them: read the call and follow `argument` to where the key comes from, through the callers when it is a parameter. The call is ruled out when every value the key can hold is written in the code, as a type union, a record or a list, and none is the config's current key or an old key.

A call ruled out stays as it is. For the calls neither rule settles, ask once, naming only those calls, each with its `file`, `line`, `call` and `argument` and where its key comes from: whether it can read this flag, and when it can, what it should do once the flag is gone. Edit nothing before the answer.

When no reference to the key is listed, the code no longer reads it: say so, and the run ends there.

## 4. Decide which branch stays

The branch that stays is the single value the live environments serve, read from the rules of each live environment's `targets` entry: its `defaultValue` when it has no rules, otherwise the value that every rule and the `defaultValue` serve. A percentage rule serves every value it splits over. When the project has no live environment, read every environment.

- A settled flag whose live environments serve one value, equal to the `settledValue` ConfigDirector reports: that branch stays. Go on without asking.
- An archive-ready flag, which has no `settledValue`, whose live environments serve one value: that branch stays. Go on without asking.
- Any other case, which is live environments that do not serve one value, a value that differs from `settledValue`, or a stale flag: ask one question, which branch stays, with the value each environment serves, such as `production (live): true`, or its rules in the sentences of step 2 when it serves several. Edit nothing before the answer.

## 5. Edit the code

Edit every reference from step 3:

- The evaluation is replaced by the kept branch: the SDK call, its in-code default value and the other branch go, and the kept branch's code stays as it was, without the condition.
- The constant that holds the key is removed when nothing else reads it; a list of keys loses its entry; a wrapper or fixture loses its argument.
- The test client entries for the key and the tests of the removed branch are removed, and the tests of the kept branch stay without the flag, following `configdirector-test-with-flags`.
- The SDK client and its setup stay, whatever else reads them.
- A call the user said in step 3 can read the flag changes as they answered.

Then run the project's build, typecheck and tests, and fix anything the change broke. Run `configdirector scan --json` again and confirm that no reference to the key or its old keys is listed.

## 6. Hand over

In a few lines, tell the user:

- the branch kept, the files changed, with the tests removed or kept, and the checks run;
- in one line at most, the SDK calls step 3 ruled out.
