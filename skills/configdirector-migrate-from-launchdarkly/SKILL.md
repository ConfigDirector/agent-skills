---
name: configdirector-migrate-from-launchdarkly
description: Move a LaunchDarkly project's feature flags to ConfigDirector by following the migration guide, recreating its segments and flags as ConfigDirector segments and configs with the targeting rules of each environment, through the ConfigDirector MCP server or CLI, from flag data the user exports in their own terminal, then switching one application's SDK calls over and checking them with configdirector validate. Use when the user asks to move or migrate from LaunchDarkly, to recreate or import their LaunchDarkly flags, or to replace the LaunchDarkly SDK in an application.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.11.0
---

# Migrate from LaunchDarkly

Work through the stages in order, each with the steps of its reference file. The result of stage 1 is the segments and flags of one LaunchDarkly project recreated in one ConfigDirector project, with the targeting rules of each environment; the result of stage 2 is one application reading them through a ConfigDirector SDK instead of the LaunchDarkly SDK. Run both, or the one the user asks for; a later run continues where the last one stopped, since stage 1 skips every segment and config key the project already has, and stage 2 starts from the LaunchDarkly reads still in the code.

- Stage 1, recreate the flags: [references/recreate-flags.md](references/recreate-flags.md).
- Stage 2, switch one application: [references/switch-an-application.md](references/switch-an-application.md).

Confirm with the user before every write to their ConfigDirector account and before editing any code. This skill changes nothing in LaunchDarkly, archives nothing there, and reads LaunchDarkly only through files the user exports, never through a LaunchDarkly token, SDK or MCP server. A segment or config key the ConfigDirector project already has is never changed.

Stage 1 needs an API token with these permissions, as the ConfigDirector dashboard names them under **API tokens**: `Projects: Read`, `Environments: Read`, `Configs: Read`, `Configs: Create`, `Configs: Update targeting rules`, `Segments: Read`, `Segments: Create`. Flags with tags also need `Tags: Read` and `Configs: Update settings`. Stage 2 needs the same `Projects: Read` and `Configs: Read` for `configdirector validate`.

## Fetch the migration guide

At the start of every run, fetch https://docs.configdirector.com/migration-guides/launchdarkly and keep it open. Its tables are the mapping this skill follows: how projects, environments, flags, variations, lifetimes, keys, SDK availability and tags map; how a fallthrough, the on and off switch, individual targets, rules, operators, rollouts, segments and prerequisites map, and what has no equivalent; how a context, its kind, key, name, custom attributes and anonymous flag map; which ConfigDirector SDK replaces which LaunchDarkly SDK; and what to check once an application has switched. Never map a flag, a rule or an SDK call from memory: take every mapping from the guide as it reads on that day, and every condition and operator from the targeting rules reference, which stage 1 reads before composing any rule.

## Reach the account

Use the ConfigDirector MCP tools when the ConfigDirector MCP server is connected, and the `configdirector` CLI otherwise; never both in one run, except `configdirector validate` in stage 2, which exists only on the CLI. With the CLI, always pass `--json` and read the output, never the human text. Each step names the MCP tool first and the CLI command second.

List the projects: `list_projects` / `configdirector projects list --json`. When the current repository has `configdirector.json`, the project is the one whose slug is its `project`, and every CLI command, `projects list` included, runs from the directory that holds the file. Otherwise it is the only project listed, or the one the user picks when there are several: ask which project the flags go to. Then pass `--project <slug>` to every CLI command below.

When a step fails, tell the user why, and go on only once it is fixed:

- No route answers: no ConfigDirector tool is available, and `configdirector` is not installed, or `projects list` exits 2 with `No API token found` or `No CLI sign-in is for the organization`, or with `The Admin API refused the request` and a code other than `INSUFFICIENT_PERMISSIONS`, such as `API_TOKEN_EXPIRED`. Send the user to `configdirector-connect` for a token with the permissions above.
- Exit 2 with `unknown command`: the installed CLI is older than the commands this skill uses. Tell the user to install `@configdirector/cli` again, which updates it, as the Install section of https://docs.configdirector.com/integrations/cli shows.
- Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
- The token belongs to another organization than the one `configdirector.json` names: the projects `list_projects` or `projects list` returns carry another `organizationId` than its `organization`, or a CLI command exits 2 with `The token from` and `belongs to the organization`. Tell the user so, and where the token came from: the MCP server's configuration, the source the CLI's message names, or else `CONFIGDIRECTOR_TOKEN` or `CONFIGDIRECTOR_ORGANIZATION` set where you run commands, which the CLI uses ahead of the repository's organization. Send them to `configdirector-connect`.
- A permission is missing: on MCP, a tool missing from the list, such as `create_config` without `Configs: Create`, `update_targeting_rules` without `Configs: Update targeting rules` or `create_segment` without `Segments: Create`, or a tool error naming the permission; on the CLI, exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`. Either message names the permission in its short form. Tell the user which one in the dashboard's wording (`projects:read` is `Projects: Read`, `environments:read` is `Environments: Read`, `configs:read` is `Configs: Read`, `configs:create` is `Configs: Create`, `config-targeting-rules:update` is `Configs: Update targeting rules`, `segments:read` is `Segments: Read`, `segments:create` is `Segments: Create`, `tags:read` is `Tags: Read`, `config-settings:update` is `Configs: Update settings`), and that they can add it to the token on the **API tokens** page.
- Exit 2 with any other message, such as a suspended service or an unreachable API: report the message, which says what to do, and stop.

## Read LaunchDarkly's data from the user's files

Never ask for, read or write a LaunchDarkly access token, and never call the LaunchDarkly API yourself. Stage 1 gives the user the requests to run in their own terminal, each writing a file in the operating system's temporary directory, never in the repository; you read those files and delete them at the end of the run. If the user pastes a LaunchDarkly or ConfigDirector token into the conversation, tell them it is now in the transcript, ask them to revoke it and create another, and go on without it.

## Stage 1: recreate the flags

Follow the six steps of [references/recreate-flags.md](references/recreate-flags.md): map the LaunchDarkly environments to the project's; have the user export the flags, their statuses and the segments of each environment; choose the flags, proposing to leave out the ones that are launched or inactive everywhere and listing what has no equivalent; create the segments first, through `configdirector-segments`; create the configs in batches of up to ten, each batch shown next to LaunchDarkly's settings and rules and confirmed once; then check one context per rule with an evaluation. Nothing reads a new config until stage 2 is deployed, so writing its rules into a live environment needs no separate yes.

## Stage 2: switch one application

Follow the four steps of [references/switch-an-application.md](references/switch-an-application.md): find the LaunchDarkly SDK in the application's dependency manifest and its replacement in the guide; show the plan, every read to replace, before editing; install and initialize the ConfigDirector SDK as `configdirector-setup` does and rewrite each read as the guide shows, following `configdirector-use-configs-in-code` and `configdirector-test-with-flags`; run `configdirector validate` and the project's checks; and remove the LaunchDarkly package and its key once no read remains, on the user's yes.

## Hand over

At the end of each stage, hand over as its reference file says, in a few lines, and delete the exported LaunchDarkly files.
