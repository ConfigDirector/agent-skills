# Stage 2: switch one application

The steps of stage 2 of `configdirector-migrate-from-launchdarkly`. Work through them in order, with the migration guide from `SKILL.md`. The result is one application reading its flags through a ConfigDirector SDK, with the LaunchDarkly SDK and its key removed once no read remains. One application per run; in a monorepo, ask which one.

## 1. Find the LaunchDarkly SDK and its replacement

Read the application's dependency manifest (`package.json`, `pubspec.yaml`, `Package.swift`, the Gradle or Maven build, the `.csproj`, `pyproject.toml` or `requirements.txt`, `go.mod`). The LaunchDarkly SDK is the dependency whose name contains `launchdarkly`; its name says whether it is the client, React, Vue, React Native, Flutter, iOS, Android, Node.js server, Python, Java, .NET server or Go SDK, or an OpenFeature provider. When the application uses OpenFeature with a LaunchDarkly provider, the application stays on OpenFeature and only the provider changes.

Find its row in the guide's **Which SDK replaces which** table, and fetch the ConfigDirector SDK's docs page the row links, as `configdirector-setup` does: it gives the package, the initialization code, the context shape, the evaluation calls, `watch` or its hook, composable, stream or flow, and the test client. Never write any of them from memory. An SDK with no row, such as Ruby, PHP, Rust or an edge SDK, stops the stage: tell the user what the guide says below its table, that ConfigDirector has no SDK for it and where to write for a projected date.

Read the project's `configdirector.json` when it has one; otherwise the project is the one stage 1 used, or the one `SKILL.md`'s access section finds.

## 2. Show the plan, then switch

List every read of a LaunchDarkly flag in the application before editing anything: each call on the LaunchDarkly client, by file and line, with its flag key, the fallback value it passes, which becomes the in-code default value, and the type it reads, the places that build a context, the change listeners, the `identify` calls, and the client's initialization and shutdown. Match each key against stage 1's result: a key recreated in ConfigDirector is rewritten; a key left out for hardcoding is replaced by the value LaunchDarkly serves it, which stage 1 named; a key neither recreated nor left out is shown to the user, who decides. Show the files to change and wait for the user's yes.

Then, following `configdirector-use-configs-in-code` for every read:

1. Install the ConfigDirector SDK with the package manager the project already uses, and initialize it once, where the application starts, with the SDK key from an environment variable named after ConfigDirector, as `configdirector-setup` does: a server SDK key is a secret and never reaches a tracked file or a browser; a client SDK key uses the prefix the framework needs to expose a value. Add the variable to `.env.example` or the project's template with an empty value, and tell the user where to find the key, under **SDK Keys** in the dashboard, for the environment each deployment runs in.
2. Rewrite each read as the guide's before and after examples and its contexts table show: the context's `key` becomes `id` and its custom attributes move under `traits`, keeping the attribute names the targeting rules use; the read becomes the docs page's call for the config's type, with the value LaunchDarkly serves today as the in-code default value, which the SDK returns only when it cannot evaluate; a change listener becomes `watch` or what the docs page gives in its place; `identify` becomes `updateContext`. A read of every flag at once, LaunchDarkly's all-flags call, becomes one read per key the code uses. A `track` call has no equivalent, as the guide's delivery table says: leave the analytics it fed in place, without the LaunchDarkly client.
3. On OpenFeature, register the ConfigDirector provider from its docs page in place of the LaunchDarkly provider, and move the custom attributes the rules use into a `traits` attribute, as the guide's OpenFeature section says; the evaluation calls stay as they are.
4. Keep both SDKs running side by side only until every read is rewritten, never a read through each for the same flag.
5. Update the tests that read flags, following `configdirector-test-with-flags`: the ConfigDirector test client or the in-memory provider in place of LaunchDarkly's test data source, with one test per branch, through the keys the code reads.

## 3. Check

Run `configdirector validate --json` from the directory that holds `configdirector.json`, or with `--project <slug>` when the repository has none. It has no MCP form: when the CLI is not installed, send the user to the Install section of https://docs.configdirector.com/integrations/cli, and when it reports `No API token found` or `No CLI sign-in is for the organization`, have them sign in to the repository's organization with `configdirector login` in their own terminal, never by pasting a token into the chat. The CLI signs in on its own, apart from the MCP server, and `validate` needs `Projects: Read` and `Configs: Read`.

Show every finding, each by its kind as the CLI docs page explains it: an unknown key is a flag not recreated or a key typed wrong; a renamed key points at a config's current key; a type mismatch is a read with an in-code default value or getter of another type than the config's, such as a string flag recreated as an enum, read as a number; an availability mismatch is a config not delivered to this SDK's kind. Fix what is in the code; a config to change is the user's to change, through `configdirector-roll-out` for rules or the dashboard for settings. Exit 1 is at least one finding, exit 2 means the command could not run and its message says why, read as `SKILL.md`'s access section does.

Then run the project's build, typecheck and tests, and fix anything the change broke. Search the application again for `launchdarkly` and the LaunchDarkly client: once no read remains, show the user the package, the import lines and the environment variables or configuration that hold the LaunchDarkly key, and remove them on their yes. A read that remains, such as one the user chose to keep for now, leaves the package in place; say which reads keep it.

## 4. Hand over

In a few lines, tell the user:

- first, anything they asked for in ConfigDirector that was not created or changed, such as a config stage 1 did not create that a rewritten read uses, and why, ahead of what was done;
- the files changed, the reads rewritten, by file and line, the keys hardcoded and the tests updated;
- the environment variable to set and where to get its value, for each environment the application is deployed to;
- the findings of `validate` and the project's checks still open, if any;
- to deploy one application at a time, and to check it as the guide's **Verify, then remove LaunchDarkly** section says: **Evaluation Activity** on each config shows the values served in each environment, and **Alerts** catch a key the application asks for that does not exist, a read of the wrong type and an in-code default value that drifts from the value served;
- the guide's note that a percentage rollout assigns contexts afresh, so a user in LaunchDarkly's share is not necessarily in ConfigDirector's: switch at a point in the rollout where that is acceptable, or at 0% or 100%;
- that once every application has switched, the flags are archived in LaunchDarkly by them, which this skill never does, and that from then on the config lifecycle in ConfigDirector tells them when each temporary config has settled and `configdirector-clean-up-flag` removes it from the code.
