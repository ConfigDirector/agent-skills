---
name: configdirector-segments
description: Create a ConfigDirector segment or change one through the ConfigDirector MCP server or CLI, such as its condition groups, its name or key, or an environment override added or removed, after showing the current and resulting definition side by side with the configs that use the segment and, when the change reaches a live environment where a config uses it, getting an explicit yes. Use when the user asks to create a segment, change who is in one, rename it, give an environment its own definition or return it to the project definition, see which configs use a segment, or delete one, which is handed over.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.10.0
---

# Create or change a segment

Work through the steps in order. The result is one segment, created or changed: its project definition, its name or key, or an environment override added, changed or removed, written once the user has seen the current and resulting definition side by side, with the configs that use the segment, and said yes. One segment per run; for several, work through the steps once per segment.

This skill changes segments only, never a config's targeting rules: to use a segment in a config's rules, use `configdirector-roll-out`. It never deletes a segment; step 6 hands a delete over to the user.

Creating a segment needs an API token with these permissions, as the ConfigDirector dashboard names them under **API tokens**: `Projects: Read`, `Environments: Read`, `Segments: Read`, `Segments: Create`. Changing one needs `Segments: Update` in place of `Segments: Create`.

## 1. Reach the account, and find the project and the environments

Use the ConfigDirector MCP tools when the ConfigDirector MCP server is connected, and the `configdirector` CLI otherwise; never both in one run. With the CLI, always pass `--json` and read the output, never the human text. Each step names the MCP tool first and the CLI command second.

List the projects: `list_projects` / `configdirector projects list --json`. When the current repository has `configdirector.json`, the project is the one whose slug is its `project`, and every CLI command, `projects list` included, runs from the directory that holds the file. Otherwise it is the only project listed, or the one the user picks when there are several: ask which one the segment belongs to. Then pass `--project <slug>` to every CLI command below.

List the environments: `list_environments` / `configdirector environments list --json`, for each environment's `id`, which keys its override, its `slug`, which names it to the user, and `live`: a live environment serves real traffic, and step 4 asks for an explicit yes before a change reaches one where a config uses the segment.

When a step fails, tell the user why, and go on only once it is fixed:

- No route answers: no ConfigDirector tool is available, and `configdirector` is not installed, or `projects list` exits 2 with `No API token found` or `No CLI sign-in is for the organization`, or with `The Admin API refused the request` and a code other than `INSUFFICIENT_PERMISSIONS`, such as `API_TOKEN_EXPIRED`. Send the user to `configdirector-connect` for a token with the permissions above.
- Exit 2 with `unknown command`: the installed CLI is older than the commands this skill uses. Tell the user to install `@configdirector/cli` again, which updates it, as the Install section of https://docs.configdirector.com/integrations/cli shows.
- Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
- The token belongs to another organization than the one `configdirector.json` names: the projects `list_projects` or `projects list` returns carry another `organizationId` than its `organization`, or a CLI command exits 2 with `The token from` and `belongs to the organization`. Tell the user so, and where the token came from: the MCP server's configuration, the source the CLI's message names, or else `CONFIGDIRECTOR_TOKEN` or `CONFIGDIRECTOR_ORGANIZATION` set where you run commands, which the CLI uses ahead of the repository's organization. Send them to `configdirector-connect`.
- A permission is missing: on MCP, a tool missing from the list, such as `create_segment` without `Segments: Create` or `update_segment` without `Segments: Update`, or a tool error naming the permission; on the CLI, exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`. Either message names the permission in its short form. Tell the user which one in the dashboard's wording (`projects:read` is `Projects: Read`, `environments:read` is `Environments: Read`, `segments:read` is `Segments: Read`, `segments:create` is `Segments: Create`, `segments:update` is `Segments: Update`), and that they can add it to the token on the **API tokens** page.
- Exit 2 with any other message, such as a suspended service or an unreachable API: report the message, which says what to do, and stop.

## 2. Read the segment and its format

Read all of this before composing anything. Never write a condition from memory.

1. The segments: `list_segments` / `configdirector segments list --json`, each with its `key`, `name` and `usages`. For a new segment, make sure no segment has the key: when one does, say so and propose another. For an existing one, the segment is the one whose key or name the user gave; when none fits or several do, ask, listing the keys.
2. An existing segment: `get_segment` / `configdirector segments get <key> --json`. Its `groups` are the project definition, its `overrides` map an environment's `id` to that environment's own groups, and its `usages` list each config whose targeting rules use the segment, by `configKey`, with the `environmentIds` where they do. When no segment has the key (on MCP, an error saying so; on the CLI, exit 2 with `No segment in <project> has the key`), return to item 1 and ask. When the user only asks which configs use the segment, show the usages, one line per config with its environments by slug, and stop.
3. The targeting rules reference, once per run: `get_targeting_rules_reference` / `configdirector targeting-rules reference --json`. A segment's conditions are attribute conditions in the shape the reference gives for a rule's attribute conditions, `{ id, kind: "attribute", attribute, trait, operator, targetType, targetValues }`: the attributes a condition can test, the operators of each target type and of the context kind attribute, and the notes on how values are written all come from it. A segment condition is never allowed inside a segment.

The limits are not in the reference: the descriptions of `create_segment` and `update_segment` state them, a project holds at most 200 segments, a project definition or an override at most 10 condition groups, and a condition group at most 20 conditions, and on the CLI the refusal step 5 reads names the one exceeded.

## 3. Compose the resulting segment

A context is in the segment when every condition of any one group matches: the conditions of a group are combined by AND, and the groups by OR. So "enterprise customers in Europe" is one condition group with two conditions, and "staff, or anyone on the beta plan" is two condition groups of one condition each. When the request leaves open which group a condition belongs to, or whether a change is to the project definition or to one environment's override, ask; never guess.

Start from the current segment and change only what the user asked for:

- A new segment: the name as the user said it, and a key in kebab case named after it, such as `enterprise-europe`, unless the user gave one. A key is 4 to 150 letters, digits, periods, underscores and hyphens, starting with a letter or digit, and unique in the project.
- Who is in the segment: the groups of the project definition, which every environment without an override uses.
- A rename: the `name`, the `key`, or both. Targeting rules reference the segment by its `id`, so a new key breaks nothing.
- An environment's own definition: an override, that environment's complete set of groups, keyed by its `id`; nothing is merged with the project definition. Changing an override replaces its groups. Returning an environment to the project definition removes its override. Every other override stays as it is.

Write each condition in the reference's shape and each value in the operator's target type, as the reference's notes say. Every condition you keep keeps its `id` and its other fields. Give a new condition a new random UUID as its `id` on MCP, and no `id` on the CLI, which gives it one.

## 4. Show the change and confirm it

Show the current and the resulting definition side by side, one line per condition group in the sentences `segments get` writes in its text output, which you compose from the JSON: a condition reads as its trait without the leading `/`, or as `context identifier`, `context kind`, `context name`, `app name` or `app version`, then its operator and its target values separated by commas, and a condition group's conditions are joined by `and`. Show one table for the project definition and one for each override the change touches, with a kept condition group on the same row in both columns. A new segment has an empty left column. For example:

| Project definition, now      | Project definition, after the change                          |
| ---------------------------- | ------------------------------------------------------------- |
| 1. plan is one of enterprise | 1. plan is one of enterprise and country is one of DE, FR, ES |
|                              | 2. email ends with any of @example.com                        |

Then say in words what changes and in which environments, by slug: a change to the project definition reaches every environment without an override; an override added, changed or removed reaches its environment only; a rename reaches none. Then list the configs that use the segment in those environments, from `usages`, such as "Used there by new-checkout in production and dark-mode in test, production", or say that no config uses it there. Wait for the user's yes before writing anything. When the user changes the request, compose it again and show both columns again.

When an environment the change reaches is live and a config uses the segment there, once the user says yes, tell them that environment is live and serving real traffic, name the configs that use the segment there, show both columns again, and ask for an explicit yes to this change. Anything other than a clear yes, such as a question or a change, is not one.

## 5. Write the segment

After the yes, write the segment once. Send `overrides` only when the change adds, changes or removes one, and then the whole map of the environments that stay overridden, keyed by environment `id`; left out, the overrides stay as they are, and `{}` removes them all.

- MCP: `create_segment` with the project's ID, `key`, `name`, `groups` and, for a new segment with one, `overrides`; or `update_segment` with the project's ID, the segment's current key as `segmentKey`, `key`, `name` and `groups`, the current values for the ones you keep, and `overrides` as above.
- CLI: write the segment, `{"key": ..., "name": ..., "groups": [...]}` with `overrides` as above, to a new file in the operating system's temporary directory, never in the repository, run `configdirector segments create --segment <file> --json` or `configdirector segments update <key> --segment <file> --json`, and delete the file once the command ends, whatever its outcome.

When ConfigDirector refuses the segment, nothing changes: on MCP, a tool error listing the reasons; on the CLI, exit 2 with `The Admin API rejected the request:` and the reasons, such as a key another segment has or a limit from step 2. Show the reasons, fix the segment against the reference, and return to step 4 to show it and confirm again. Read any other failure, such as a missing permission, as step 1 does.

## 6. Hand a delete over

When the user asks to delete a segment, never delete it. Read it as step 2 does and show the configs and environments whose targeting rules use it, from `usages`: ConfigDirector refuses the delete while any config's rules use the segment, in any environment. Name `configdirector-roll-out` as the way to remove those segment conditions first, one environment at a time. Then give the user the command to run themselves, `configdirector segments delete <key>`, from the directory that holds `configdirector.json` or with `--project <slug>`, which needs `Segments: Delete` and asks for no confirmation, or the segment's page in the dashboard, under **Segments** in the project's sidebar, where **Delete segment** is at the bottom. Say that a deleted segment cannot be restored.

## 7. Hand over

In a few lines, tell the user:

- what was written: the segment's key and name, its project definition and each override, in the sentences of step 4, and the project;
- that SDKs connected to the environments the change reaches use the new definition now, in every config whose rules use the segment, with those configs and the other environments unchanged;
- that `configdirector-roll-out` uses the segment in a config's targeting rules, by name, in one environment at a time;
- for a changed segment, how to put it back: run this skill again with the previous definition. Print the `key`, `name`, `groups` and `overrides` step 2 read as a JSON block, so a later run can write them back as they were.
