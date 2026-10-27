---
name: configdirector-setup
description: Add ConfigDirector feature flags and remote config to the current project. Detects the framework, installs the matching ConfigDirector SDK or OpenFeature provider, wires it up with the SDK key from an environment variable, and evaluates a new first feature flag or one the user names. Use when the user asks to add ConfigDirector, feature flags, or remote config to their app.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.13.0
---

# Add ConfigDirector to this project

Work through the steps in order. Confirm with the user before installing packages, before creating anything in their ConfigDirector account, and whenever the project gives more than one plausible answer.

Creating the first flag needs an API token with these permissions, as the ConfigDirector dashboard names them under **API tokens**: `Projects: Read`, `Configs: Read`, `Configs: Create`.

## 1. Find the app and its SDK

Look at the manifest files in the project (and in each app of a monorepo) and pick the row that matches. If the project already uses OpenFeature (a dependency whose name contains `openfeature` or `open-feature`), use the OpenFeature provider for that platform instead of the native SDK.

| Signal                                                                       | SDK                 | Docs page                                                    |
| ---------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------ |
| `next` in `package.json`                                                     | Next.js             | https://docs.configdirector.com/sdks/meta/nextjs             |
| `nuxt` in `package.json`                                                     | Nuxt                | https://docs.configdirector.com/sdks/meta/nuxt               |
| `react-native` or `expo` in `package.json`                                   | React Native        | https://docs.configdirector.com/sdks/mobile/react-native     |
| `react` in `package.json`, browser app                                       | React               | https://docs.configdirector.com/sdks/browser/react           |
| `vue` in `package.json`, browser app                                         | Vue                 | https://docs.configdirector.com/sdks/browser/vue             |
| Other browser JavaScript or TypeScript app                                   | JavaScript          | https://docs.configdirector.com/sdks/browser/javascript      |
| Node.js server (Express, Fastify, Hono, NestJS, Koa, or plain Node)          | Node.js             | https://docs.configdirector.com/sdks/server/node-js          |
| `pubspec.yaml` with a Flutter dependency                                     | Flutter             | https://docs.configdirector.com/sdks/mobile/flutter          |
| `Package.swift` or an Xcode project for an iOS or macOS app                  | Swift               | https://docs.configdirector.com/sdks/mobile/swift            |
| Gradle build applying an Android plugin                                      | Android             | https://docs.configdirector.com/sdks/mobile/android          |
| JVM server (Gradle or Maven, Java or Kotlin, no Android plugin)              | Java                | https://docs.configdirector.com/sdks/server/java             |
| `.csproj` or `.sln`                                                          | .NET                | https://docs.configdirector.com/sdks/server/dotnet           |
| `pyproject.toml`, `requirements.txt`, or `setup.py`                          | Python              | https://docs.configdirector.com/sdks/server/python           |
| `go.mod`                                                                     | Go                  | https://docs.configdirector.com/sdks/server/go               |
| OpenFeature web app                                                          | OpenFeature Web     | https://docs.configdirector.com/sdks/openfeature/web         |
| OpenFeature Node.js server                                                   | OpenFeature Node.js | https://docs.configdirector.com/sdks/openfeature/node-js     |
| OpenFeature Swift app                                                        | OpenFeature Swift   | https://docs.configdirector.com/sdks/openfeature/swift       |
| OpenFeature Android app                                                      | OpenFeature Android | https://docs.configdirector.com/sdks/openfeature/android     |
| OpenFeature Flutter app                                                      | OpenFeature Flutter | https://docs.configdirector.com/sdks/openfeature/flutter     |
| OpenFeature Python server                                                    | OpenFeature Python  | https://docs.configdirector.com/sdks/openfeature/python      |
| OpenFeature Java server                                                      | OpenFeature Java    | https://docs.configdirector.com/sdks/openfeature/java        |
| OpenFeature .NET server                                                      | OpenFeature .NET    | https://docs.configdirector.com/sdks/openfeature/dotnet      |
| OpenFeature Go server                                                        | OpenFeature Go      | https://docs.configdirector.com/sdks/openfeature/go          |

The more specific row wins: a Next.js app also depends on `react`, and it gets the Next.js SDK. If the project has several apps, ask which one to set up. If nothing matches, tell the user which SDKs exist (https://docs.configdirector.com/sdks/available-sdks) and stop.

Tell the user which SDK you picked and why before going on.

## 2. Read the SDK's docs page

Fetch the docs page from the table and follow it for the install command, the initialization code, and the evaluation call. Do not rely on memory for package names or APIs; the page is the source of truth. The page also says whether the SDK uses a **client** or a **server** SDK key.

## 3. Install and initialize the SDK

- Install with the package manager the project already uses (look for its lockfile or build files).
- Initialize the SDK where the app starts, following the docs page, so it is created once for the whole app.
- Read the SDK key from an environment variable, using the project's existing convention for environment variables and the prefix the framework needs to expose a value to the browser when it is a client SDK (for example `VITE_`, `NEXT_PUBLIC_`, or `NUXT_PUBLIC_`). Name it after ConfigDirector, for example `CONFIGDIRECTOR_SDK_KEY`.
- If the project has an `.env.example` or similar template, add the variable to it with an empty value.
- Never write an SDK key into a tracked file. Server SDK keys are secrets.
- Tell the user where to find the key: in the ConfigDirector dashboard, **SDK Keys**, pick the environment, and copy the client or server key the docs page calls for. SDK keys belong to one environment, so each deployment needs the key of its own environment.

## 4. Find or create the first flag

Use the ConfigDirector MCP tools when the ConfigDirector MCP server is connected, and the `configdirector` CLI otherwise; never both in one run. With the CLI, always pass `--json` and read the output, never the human text. Each item below names the MCP tool first and the CLI command second.

When an item fails, tell the user why. The CLI sign-ins case runs the command again; every other case means nothing can be created or changed, so stop and ask, as the end of this step says, with the case's fix as the first choice:

- No route answers: no ConfigDirector tool is available, and `configdirector` is not installed, or `projects list` exits 2 with `No API token found` or `No CLI sign-in is for the organization`, or with `The Admin API refused the request` and a code other than `INSUFFICIENT_PERMISSIONS`, such as `API_TOKEN_EXPIRED`. Tell the user to run the `configdirector-connect` skill to set up the agent's access with an API token that has the permissions above.
- Exit 2 with `unknown command`: the installed CLI is older than the commands this step uses. Tell the user to install `@configdirector/cli` again, which updates it, as the Install section of https://docs.configdirector.com/integrations/cli shows.
- Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
- The token belongs to another organization than the one `configdirector.json` names: the projects `list_projects` or `projects list` returns carry another `organizationId` than its `organization`, or a CLI command exits 2 with `The token from` and `belongs to the organization`. Tell the user so, and where the token came from: the MCP server's configuration, the source the CLI's message names, or else `CONFIGDIRECTOR_TOKEN` or `CONFIGDIRECTOR_ORGANIZATION` set where you run commands, which the CLI uses ahead of the repository's organization. Send them to `configdirector-connect`.
- A permission is missing: on MCP, a tool of item 2's table that you cannot see, or a tool error naming the permission; on the CLI, one the table lists that `permissions` lacks, or exit 2 with `The Admin API refused the request` and the code `INSUFFICIENT_PERMISSIONS`. A refusal names the permission in its short form. Tell the user which one in the dashboard's wording, from the table, and that they can add it to the token on the **API tokens** page.
- Exit 2 with any other message, or any other tool error, such as a suspended service or an unreachable API: report the message, which says what to do.

1. List the projects: `list_projects` / `configdirector projects list --json`. When the repository has `configdirector.json`, run `projects list` from the directory that holds it, and the project is the one whose slug is its `project`. Otherwise it is the only project listed, or the one the user picks when there are several: ask which one this app belongs to. On the CLI route, then run `configdirector init --project <slug>` from the repository root, which writes `configdirector.json` so later CLI runs, such as `configdirector validate`, find the project. The MCP route writes no file. Run the CLI commands below from the directory that holds `configdirector.json`.
2. Read the token's permissions, before proposing anything. On MCP, they are the ConfigDirector tools you can see by name, loaded or not, since the server offers only the tools the token allows; on the CLI, `configdirector api-token get --json` lists them in short form in `permissions`. The table gives each permission in the dashboard's wording, its short form and the MCP tool that needs it:

   | Permission        | Short form       | MCP tool        |
   | ----------------- | ---------------- | --------------- |
   | `Projects: Read`  | `projects:read`  | `list_projects` |
   | `Configs: Read`   | `configs:read`   | `list_configs`  |
   | `Configs: Create` | `configs:create` | `create_config` |

   When `Projects: Read` or `Configs: Read` is missing, stop and ask before proposing anything. When `Configs: Create` is missing, stop and ask before proposing a key when the request names no flag, and otherwise once item 3 settles that a flag is to be created.
3. Settle the key with `list_configs` / `configdirector configs list --json`, matching a key the user named against each config's `key` and its `deprecatedKeys[].key`; a match on an old key means that config under its current `key`. One of four cases applies:
   - The request names no flag key: ask what the first flag should control, propose a key in kebab case, for example `new-checkout-page`, and make sure no config has it.
   - It names a key no config has: the key is that one.
   - It names a key a config has, and its `type` is `boolean`: tell the user the flag exists. When its `client` is `false` and the SDK from step 1 uses a client SDK key, or its `server` is `false` and that SDK uses a server SDK key, the flag is not delivered to that kind of SDK: say so, name the config's **Settings** tab in the dashboard, where the user can change which SDKs receive it, and stop. Otherwise skip items 4 and 5 and continue with step 5, Evaluate the flag in code, using its current key.
   - It names a key a config has with another `type`: say so, with the type, and ask whether to create a new boolean flag, with a key you propose in kebab case that no config has, or to stop.
4. Propose these settings and ask the user to confirm or change them before creating anything:
   - role: feature flag
   - lifetime: temporary
   - type: boolean
   - default targeting rule value: `false`, so nothing changes for users until the flag is turned on
   - delivered to client SDKs, server SDKs, or both, matching the SDK from step 1
5. After the user confirms, create it with those settings: `create_config` / `configdirector configs create --key <key> --type boolean --role flag --lifetime temporary --default-value false --json`, adding `--client-only` or `--server-only` when only one kind of SDK receives it. When the create reports the key taken (on the CLI, exit 1 with the config that has it), propose another key and confirm again. Read any other failure, such as a missing permission, as the cases above do, and stop and ask.

Stop and ask means: stop at once, before any other work, including the code of step 5 and work the user asked for outside this skill. Tell the user what was not created or changed and why, with a missing permission in the dashboard's wording, and ask how to go on:

1. They fix it, as the case says, and you try again.
2. They make the change in the dashboard, with the settings you show them, and you go on with step 5. When item 3 could not look up a flag they named, they check there that it exists as a boolean flag whose **Settings** tab delivers it to the kind of SDK from step 1, and create it otherwise.
3. You go on with step 5 without the flag: the code reads its key, and the in-code default value `false` keeps the current behavior until the flag exists.

Wait for their answer. On choice 2 or 3 before the key and settings are settled, settle them with the user as items 3 and 4 do, skipping any read that fails, and create nothing.

## 5. Evaluate the flag in code

Ask where the flag should take effect, then add the evaluation call from the docs page there. Pass `false` as the in-code default value, which the SDK returns only when it cannot evaluate the flag. Keep the change small: one branch on the flag value.

## 6. Check and hand over

- Run the project's build, typecheck, or tests if it has them, and fix anything the change broke.
- Summarize for the user, first, anything they asked for in ConfigDirector that was not created or changed, and why, ahead of what was done; then the SDK installed, the files changed, the environment variable to set and where to get its value, the flag created or the existing flag it reads, and where the code evaluates it.
- Tell them how to see it work: set the SDK key, start the app, then, once the flag exists, turn it on for their environment, in the dashboard on the flag's **Targeting rules** tab (set the default targeting rule value to `true`), or by asking you to turn it on, which `configdirector-roll-out` does through the MCP server or the CLI.
