---
name: setup
description: Add ConfigDirector feature flags and remote config to the current project. Detects the framework, installs the matching ConfigDirector SDK or OpenFeature provider, wires it up with the SDK key from an environment variable, and evaluates a first feature flag. Use when the user asks to add ConfigDirector, feature flags, or remote config to their app.
---

# Add ConfigDirector to this project

Work through the steps in order. Confirm with the user before installing packages, before creating anything in their ConfigDirector account, and whenever the project gives more than one plausible answer.

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
| OpenFeature web app                                                          | OpenFeature Web     | https://docs.configdirector.com/sdks/openfeature/web         |
| OpenFeature Node.js server                                                   | OpenFeature Node.js | https://docs.configdirector.com/sdks/openfeature/node-js     |
| OpenFeature Swift app                                                        | OpenFeature Swift   | https://docs.configdirector.com/sdks/openfeature/swift       |
| OpenFeature Android app                                                      | OpenFeature Android | https://docs.configdirector.com/sdks/openfeature/android     |
| OpenFeature Flutter app                                                      | OpenFeature Flutter | https://docs.configdirector.com/sdks/openfeature/flutter     |
| OpenFeature Python server                                                    | OpenFeature Python  | https://docs.configdirector.com/sdks/openfeature/python      |
| OpenFeature Java server                                                      | OpenFeature Java    | https://docs.configdirector.com/sdks/openfeature/java        |
| OpenFeature .NET server                                                      | OpenFeature .NET    | https://docs.configdirector.com/sdks/openfeature/dotnet      |

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

## 4. Create the first flag

This step uses the ConfigDirector MCP tools from this plugin (`list_projects`, `list_configs`, `create_config`). If none of them are available, the plugin's API token is probably not set: tell the user to run `/plugin`, open **Installed**, select **ConfigDirector**, choose **Configure options**, and enter an API token from **API Tokens** in the ConfigDirector dashboard, then run `/reload-plugins`. If the tools are available but `create_config` is not among them, the token lacks the `Configs: Create` permission. In either case, continue with the fallback at the end of this step.

1. Call `list_projects`. If there is more than one project, ask which one this app belongs to.
2. Ask what the first flag should control, and propose a key in kebab case, for example `new-checkout-page`. Call `list_configs` to make sure the key is not already used.
3. Propose these settings and ask the user to confirm or change them before creating anything:
   - role: feature flag
   - lifetime: temporary
   - type: boolean
   - default targeting rule value: `false`, so nothing changes for users until the flag is turned on
   - delivered to client SDKs, server SDKs, or both, matching the SDK from step 1
4. After the user confirms, call `create_config` with those settings.

Fallback without the MCP tools: tell the user to create a boolean feature flag with the proposed key in the dashboard, then continue with step 5 using that key.

## 5. Evaluate the flag in code

Ask where the flag should take effect, then add the evaluation call from the docs page there. Pass `false` as the in-code default value, which the SDK returns only when it cannot evaluate the flag. Keep the change small: one branch on the flag value.

## 6. Check and hand over

- Run the project's build, typecheck, or tests if it has them, and fix anything the change broke.
- Summarize for the user: the SDK installed, the files changed, the environment variable to set and where to get its value, the flag created, and where the code evaluates it.
- Tell them how to see it work: set the SDK key, start the app, then turn the flag on in the dashboard for their environment (edit the default targeting rule value to `true`), or ask to have its targeting rules updated through the MCP tools.
