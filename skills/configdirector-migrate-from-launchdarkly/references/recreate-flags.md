# Stage 1: recreate the flags

The steps of stage 1 of `configdirector-migrate-from-launchdarkly`. Work through them in order, with the migration guide and the account route from `SKILL.md`. The result is the segments and flags of one LaunchDarkly project recreated in the ConfigDirector project, with the targeting rules of each environment, while the LaunchDarkly flags keep serving the applications: nothing changes for users until stage 2 is deployed.

## 1. Map the environments

Ask for the LaunchDarkly project key. List the ConfigDirector environments: `list_environments` / `configdirector environments list --json`, for each environment's `id`, `slug` and `live`. Propose a ConfigDirector environment for each LaunchDarkly environment the user wants to move, matched by name, and ask the user to confirm the mapping; one LaunchDarkly environment per ConfigDirector environment. Ask which LaunchDarkly environment is the production one, the one whose values step 5 uses as the default targeting rule value, when the names leave it open.

A LaunchDarkly environment with no ConfigDirector environment stops the stage: the user creates it in the dashboard, under the project's **Environments**, marked live when it is critical in LaunchDarkly, as the guide's concept table maps it. Then list the environments again.

## 2. The user exports LaunchDarkly's data

Give the user these requests to run in their own terminal, once per mapped LaunchDarkly environment, with a LaunchDarkly personal or service access token that can read the project, set in their shell as `LD_ACCESS_TOKEN` and never pasted into the conversation. The files go in the operating system's temporary directory; write the directory out in the commands, such as `$TMPDIR` on macOS, `/tmp` on Linux or `%TEMP%` on Windows, so no file lands in the repository. For an account on another host, replace `app.launchdarkly.com` with `app.eu.launchdarkly.com` or `app.launchdarkly.us`.

```sh
curl -sS -H "Authorization: $LD_ACCESS_TOKEN" \
  "https://app.launchdarkly.com/api/v2/flags/<projectKey>?env=<environmentKey>&summary=0&limit=100" \
  -o "<temporary directory>/ld-flags-<environmentKey>.json"
curl -sS -H "Authorization: $LD_ACCESS_TOKEN" \
  "https://app.launchdarkly.com/api/v2/flag-statuses/<projectKey>/<environmentKey>" \
  -o "<temporary directory>/ld-statuses-<environmentKey>.json"
curl -sS -H "Authorization: $LD_ACCESS_TOKEN" \
  "https://app.launchdarkly.com/api/v2/segments/<projectKey>/<environmentKey>?limit=100" \
  -o "<temporary directory>/ld-segments-<environmentKey>.json"
```

The first request is the guide's flag list, repeated for each environment with `summary=0`, which includes each flag's targets, rules and prerequisites for that environment. Once the user says the files are there, read them:

- `ld-flags-<environmentKey>.json`: `items`, one entry per flag, with `key`, `name`, `description`, `kind` (`boolean` or `multivariate`), `variations` (each with `value` and `name`), `temporary`, `tags`, `clientSideAvailability` (`usingEnvironmentId`, `usingMobileKey`), `experiments.items`, `archived`, and `environments.<environmentKey>` with that environment's `on`, `offVariation`, `fallthrough` (`variation` or `rollout`), `targets` and `contextTargets` (each `values`, `variation`, `contextKind`), `rules` (each `clauses`, `variation` or `rollout`, `disabled`) and `prerequisites`. A clause has `attribute`, `op`, `values`, `negate` and `contextKind`; a rollout has `variations` (each `variation` and `weight`, out of 100000), `contextKind` and sometimes `bucketBy`. A `variation` is an index into the flag's `variations`.
- `ld-statuses-<environmentKey>.json`: `items`, each with `name` (`new`, `active`, `inactive` or `launched`) and `_links.parent.href`, which ends in the flag's key.
- `ld-segments-<environmentKey>.json`: `items`, one entry per segment as defined in that environment, with `key`, `name`, `rules` (each `clauses` and sometimes `weight`, `bucketBy` or `rolloutContextKind`), `included`, `excluded`, `includedContexts`, `excludedContexts` (each `values` and `contextKind`), `unbounded` and `_external`.

When a file's `totalCount` is above the number of its `items`, give the user the same request again with `&offset=<number of items read so far>`, until every item is read. A file that is not JSON, or holds `message` and `code` instead of `items`, is a failed request: show the message, which names the problem, such as an unauthorized token or an unknown project key, and ask the user to run the request again.

Delete every exported file at the end of the run, whatever its outcome.

## 3. Choose the flags

List the flags from the files, with each flag's status in each environment. Propose two lists and wait for the user to confirm them:

- Flags to leave out: every flag whose status is `launched` or `inactive` in every mapped environment, with the one value each environment serves it, read as step 5 reads a fallthrough. The guide says to hardcode that value in the code instead of recreating the flag, which stage 2 does. Say that a permanent flag the team still relies on, such as a kill switch that stays on, is theirs to keep in the list of flags to move.
- Flags to move: the rest, each with what it uses that the guide's targeting and contexts tables say has no equivalent, and the alternative those tables give for it. In the files, that is: `prerequisites` that are not empty; a rule whose clauses test more than one `contextKind`, which needs a multi-context evaluation; a clause with `op` `matches`, a regular expression, or `contains` on a text attribute, since the reference's text operators only test the start and the end of a value; a clause on the built-in `anonymous` attribute, which no condition tests; a rollout with `bucketBy`, bucketing by another attribute; a segment that is list-based, `unbounded` or synced (`_external`), or a segment rule with `weight`, which step 4 says what becomes. Scheduled changes, approvals and guarded rollouts are not in the files: say that pending ones are not carried over.

A flag ConfigDirector cannot serve as LaunchDarkly does is still moved when the user keeps it in the list, with the guide's alternative applied and named in step 5's preview.

## 4. Create the segments first

Collect the segment keys the chosen flags' rules use: the `values` of every clause whose `op` is `segmentMatch`. For each, read its entry in every environment's segments file and compose that environment's ConfigDirector definition, as condition groups: each entry of `rules` is one condition group with one attribute condition per clause, written as step 5 writes a clause; `included` and `includedContexts` are one more condition group, `context identifier is one of` the keys, with `context kind equals <kind>` beside it for a kind other than `user`; `excluded` and `excludedContexts` add `context identifier is NOT one of` the keys to every condition group that came from a rule, since LaunchDarkly never lets a rule include an excluded key. A rule with `weight` keeps only its clauses, and the segment is listed in the preview as serving its whole rule rather than a share of it. A segment that is `unbounded` or `_external` has no definition in the file: tell the user it is a big or synced segment, which the guide says is not available, and propose a condition group with `context identifier is one of` the keys they give you.

The project definition is the definition most environments share; on a tie, the one of a live environment; every environment whose definition differs gets an environment override. Then follow `configdirector-segments` to create each segment, with LaunchDarkly's `key` and `name`: it reads the targeting rules reference, composes the conditions in the reference's shape, shows the project definition and each override side by side and writes the segment after the user's yes. A segment key the project already has is skipped, reported and used as it is, never changed; a later run continues this way.

## 5. Create the configs, in batches of up to ten

Read once, before the first batch: the targeting rules reference, `get_targeting_rules_reference` / `configdirector targeting-rules reference --json`; the project's segments, now that they exist, `list_segments` / `configdirector segments list --json`, for each segment's `id`; and the project's configs, `list_configs` / `configdirector configs list --json`. A flag whose key a config already has, as its `key` or among its `deprecatedKeys`, is skipped and reported here, with that config and its rules left as they are: this is how a later run continues. Then take the remaining flags in batches of up to ten and, for each flag of a batch, compose its settings and the rules of each environment.

Settings, each from the guide's concept table, decided by these fields of the flag's entry:

- `key`: LaunchDarkly's, kept, so the code change in stage 2 is only the SDK call.
- role and lifetime: from `kind` and `temporary`, as the table maps a temporary or permanent boolean flag; a `multivariate` flag is an experiment when `experiments.items` is not empty and its values are strings or numbers, with LaunchDarkly's variations as its variations, named after their `name`, and otherwise a config, temporary or permanent as `temporary` says.
- type: from the values of `variations`, as the table maps each flag type; the table's usual answer for a fixed set of strings, with the variations as the allowed values, unless the user prefers `string`; `integer` when every number is whole and `float` otherwise.
- availability: from `clientSideAvailability`, as the table maps it: client and server SDKs when `usingEnvironmentId` or `usingMobileKey` is true, server SDKs only otherwise.
- description: LaunchDarkly's `description`; tags: LaunchDarkly's `tags`, only those the project already has. On MCP, `find_tag_by_name` finds each one; on the CLI, a create with a missing tag exits 2 with `No tag in <project> has the name`, so run it again without that tag. A tag the project lacks is left off and reported; this skill never creates a tag.
- default targeting rule value: what LaunchDarkly serves most users in the production environment: the value of `offVariation` when `on` is false; otherwise the value of the fallthrough's `variation`, or, for a fallthrough rollout, of the variation with the largest `weight`.

Rules of each environment, from `environments.<environmentKey>`, as the guide's targeting table maps a fallthrough, the on and off switch, individual targets, rules and rollouts, in this order, with values as the reference's notes say to write them:

- `on` false: no rules, and the default targeting rule value is the value of `offVariation`.
- `on` true: each entry of `targets` and `contextTargets` whose `values` are not empty is a conditional rule, `context identifier is one of` its `values`, serving its `variation`'s value, with `context kind equals <contextKind>` beside it for a kind other than `user`. Then each entry of `rules` that is not `disabled`, in order, as a conditional rule with one condition per clause, serving its `variation`'s value or a percentage rollout with each `weight` divided by 1000 as its percentage. Then the fallthrough: a `variation` is the default targeting rule value; a `rollout` is a percentage rule last, with the default targeting rule value set to its largest share. A prerequisite is not written; step 3 named the alternative.

A clause becomes an attribute condition from the reference, with the attribute `identifier` for `key`, `name` for `name`, `kind` for `kind`, and otherwise `traits` with the trait `/<attribute>`, or the attribute itself when it already starts with `/`. The operator comes from the reference's operators for the values' target type: `in` is `is one of` for text, `=` for a number, `equals` for a boolean; `startsWith` and `endsWith` are `starts with any of` and `ends with any of`; `lessThan`, `lessThanOrEqual`, `greaterThan` and `greaterThanOrEqual` are `<`, `<=`, `>` and `>=`; `before` and `after` are `is before` and `is after`; `semVerEqual`, `semVerLessThan` and `semVerGreaterThan` are the semver `is one of`, `<` and `>`; `segmentMatch` is a segment condition, `in` the segment with that key's `id`. A `negate` clause takes the operator's opposite from the reference (`is NOT one of`, `does NOT start with any of`, `>=` for `lessThan`, `not in` for a segment, and `equals` the other value for a boolean); an operator with no opposite in the reference, or an `op` step 3 listed, is shown to the user with the guide's alternative. A clause whose `contextKind` is not `user` adds `context kind equals <contextKind>` to its rule. When a clause's values cannot go in one condition, as the reference's notes say for the operator, write one rule per value serving the same value.

Show the batch before creating anything: for each flag, its settings in the block `configdirector-create-config` shows, and for each environment, LaunchDarkly's rules in words next to the resulting rules in the sentences `configdirector-roll-out` writes, with the default targeting rule value last, and the alternatives applied named. Then wait for one yes for the whole batch. When the user changes a flag, compose it again and show the batch again.

After the yes, for each flag of the batch, create the config, then write every environment's rules:

- Create: `create_config` / `configdirector configs create --key <key> --type <type> --role <role> --lifetime <lifetime> --default-value <value> --json`, with the constraint, availability, description, tag and variation options as `configdirector-create-config` composes them. When the create still reports the key taken, because a config was created since the list was read, skip the flag and report it as above: on the CLI the create exits 1 with the config that has it; on MCP, an error that the key is in use.
- Rules, for each mapped environment, with every rule, condition and percentage given a new random UUID as its `id` on MCP and no `id` on the CLI: `update_targeting_rules` with `configKey`, the environment's `id` as `environmentId`, `defaultValue` and `rules` / `configdirector targeting-rules set <key> --environment <slug> --rules <file> --json`, with the entry written to a new file in the operating system's temporary directory and deleted once the command ends. No separate yes is asked for a live environment: no application reads the new key until stage 2 is deployed.

When ConfigDirector refuses a config or an environment's targeting rules, nothing is written for it: on MCP, a tool error listing the reasons; on the CLI, exit 2 with `The Admin API rejected the request:` and the reasons. Show the reasons, fix the config or the rules against the reference, show that flag again and go on after the user's yes. Read any other failure, such as a missing permission, as `SKILL.md`'s access section does, and stop and ask.

## 6. Check the rules

For each created config, in a live environment among the mapped ones, or in any mapped environment when none is live, evaluate one context per rule: a context the rule's conditions match, composed from its values, such as `plan` set to `enterprise` for `plan is one of enterprise`, and one that no rule matches for the default targeting rule. `evaluate_config` with `configKey`, the environment's `id` as `environmentId` and `context` with the `kind`, `identifier`, `name` and `traits` / `configdirector evaluate <key> --environment <slug> --json` with `--context-id`, `--context-kind`, `--context-name` and `--context-trait <name>=<text>`, or `--context-trait <name>:=<json>` for a number, boolean, array or object. An evaluation records nothing.

Show, per config and environment, each context, the value served and the rule that served it, next to the value LaunchDarkly's rule serves that context: for a percentage rollout, one of the values it splits over. Mark each mismatch. Fix a mismatch only when the user asks: compose that environment's rules again, show LaunchDarkly's rules next to the resulting rules as step 5 does, and write them after the user's yes.

## Hand over

In a few lines, tell the user:

- first, the segments and configs not created and the rules not written because a write could not happen, and why, ahead of what was done;
- the segments and configs created, with their keys, and the ones skipped because the project already had them;
- the flags left out for hardcoding and the value each keeps, which stage 2 writes into the code;
- the check's mismatches, if any, and the alternatives applied;
- that nothing reads the new configs until an application switches in stage 2, and that the dashboard's **Targeting rules** tab of each config shows what was written;
- that the exported files are deleted.
