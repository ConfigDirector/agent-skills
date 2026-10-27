---
name: configdirector-use-configs-in-code
description: Rules for code that reads a ConfigDirector config or feature flag through an SDK or OpenFeature provider, with the exact calls fetched from the SDK's docs page. Use when writing or reviewing code that reads a config, or when asked to check how a project uses its configs.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.11.0
---

# Use configs in code

Apply these rules whenever code reads a config or feature flag through a ConfigDirector SDK or OpenFeature provider: when writing such code, when reviewing it, and when asked to check how a project uses its configs. This skill needs no API token of its own and changes nothing in a ConfigDirector account; when the agent already reaches the account, it reads the project's configs with that access, to check a key before writing a read.

## 1. Find the SDK and its docs page

1. Read the project's dependency manifest (`package.json`, `pubspec.yaml`, `Package.swift`, the Gradle or Maven build, the `.csproj`, `pyproject.toml` or `requirements.txt`, `go.mod`). In a monorepo, read the manifest of the app whose code you are working on. The project uses ConfigDirector when a dependency's name contains `configdirector`, or when an OpenFeature SDK (a dependency whose name contains `openfeature` or `open-feature`) sits next to a ConfigDirector provider.
2. Open https://docs.configdirector.com/sdks/available-sdks and follow the link for that SDK; for an OpenFeature provider, the link under OpenFeature for its platform. Fetch that page and take the evaluation calls, the context shape, and where the client is created from it. Do not write any call from memory: SDKs differ, and the page is the source of truth.
3. The page says whether the SDK is a client SDK (browsers and mobile apps) or a server SDK (backend services). Keep that in mind for the rules below.

If no dependency matches, the project does not use ConfigDirector yet; `configdirector-setup` adds it. Stop here.

## 2. The rules

**The in-code default value is not the default targeting rule value.** The SDK returns the in-code default value only when it cannot evaluate: no values received yet, an unknown key, a value of another type, or a config not delivered to this kind of SDK. The value users get when no targeting rule matches is the default targeting rule value, which lives in ConfigDirector, per environment, and is edited there. So pass the safe value as the in-code default value, usually the behavior the code had before the flag, and never change it to release a feature.

**Read a config as the type the SDKs serve it as.** A boolean as a boolean, an integer as an integer, a float as a decimal number, a timespan as a number in the unit the dashboard shows and never as a string such as `"30s"`, an enum as a string or as a number when its values are numbers, a URL as a string, and a JSON config as an object or array its schema accepts; the in-code default value or a typed getter such as `getBoolean` sets the type. A read of the wrong type returns the in-code default value every time, and `configdirector validate` fails the build on it.

**Read a config where it is delivered.** Each config is available to client SDKs, server SDKs, or both, and an SDK never receives a config not delivered to its kind, so such a read returns the in-code default value every time. A server SDK key is a secret that comes from an environment variable on the server and never reaches a browser, a mobile app, or a tracked file.

**Set the evaluation context where the user is known.** Targeting rules test the context (its context kind, identifier, name and traits), and a rule that tests an attribute the context does not carry never matches. A client SDK sends one context and receives values evaluated for it, so set it and update it when the user signs in or out; a server SDK evaluates locally for the context passed to each read, so pass the request's user or tenant; both as the SDK page shows.

**Keys are string literals or constants assigned once.** `configdirector scan` and `configdirector validate` find a read by its key: a string literal in the call, or a constant that holds one and is assigned nowhere else. A key built at runtime, read from a variable, or chosen from a list is a dynamic reference, listed but never checked, so a typo, a rename or a wrong type in it reaches production. When several reads share a key, give it one constant and read it through that constant everywhere.

**One client per application.** Create the client once, where the application starts, and share it, as the SDK page shows. An initialized client holds the values in memory and receives updates, so every read is a local lookup; a client created per request or per call opens a new connection each time and returns the in-code default value until it is ready.

## 3. Writing code that reads a config

1. Find where the project creates its client and how the code gets it (a module, a provider, a dependency injection container). Read the config through that, never through a new client.
2. Before writing the read, check that the project has the config, whenever the agent already reaches the account: the ConfigDirector MCP tools are listed, or the repository holds a `configdirector.json`. The check reads with that access, which needs `Projects: Read` and `Configs: Read`: `list_projects`, for the project whose slug is `configdirector.json`'s `project`, or the only one listed, or the one the user picks, then `list_configs` / `configdirector configs list --json`, from the directory that holds `configdirector.json`. A config has the key when it is its `key` or among its `deprecatedKeys[].key`. A key another skill settled earlier in this task, created or left to create, is checked already.
   - A config has it: read it by its current `key`.
   - No config has it: tell the user before writing the read, name a config whose key is close to it if one is, and offer to create it, through `configdirector-flag-a-change` for a temporary boolean flag that wraps a change, and through `configdirector-create-config` otherwise. Those skills check the token's permissions first, and stop and ask when the config cannot be created. When the user would rather not create it, write the read.
   - The check cannot run, because no route answers or the lookup fails, such as `configs list` exiting 2: write the read.
3. Take the evaluation call from the SDK page: the hook, composable, getter or method for the config's type, with the key as a literal or an existing constant and the safe value as the in-code default value.
4. Run the project's typecheck or build, and `configdirector validate` when the CLI is installed and the repository holds a `configdirector.json` (the file `configdirector init` writes), from the directory that holds it. It checks every key and type against the project's configs and exits with 1 on a finding, or with 2 when it could not run, with a message that says why. A finding on a read you just wrote, such as an unknown key, is a problem, which item 5 reports first. Two of the exit 2 messages need more:
   - Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
   - Exit 2 with `The token from` and `belongs to the organization`: the token the CLI used belongs to another organization than the one `configdirector.json` names. Tell the user so, and where the token came from, as the message names it, such as `CONFIGDIRECTOR_TOKEN`. Send them to `configdirector-connect`.
5. Open the hand-over with what is not in place, ahead of what was done: anything the user asked for in ConfigDirector that was not created or changed, and why; a config the read needs that the project does not have; "I couldn't check that this config exists", naming its key, when item 2's check could not run; and a finding of item 4 on a read you just wrote.

## 4. Reviewing code that reads configs

Read every file that imports the SDK or the project's own module around it, and report the findings per file and line, each naming the rule it breaks and the change that fixes it. Look for:

- an in-code default value treated as the value users get, or changed to release a feature;
- a type the config is not served as, in the in-code default value or the getter;
- a server-only config read from a client SDK, or a client-only one from a server SDK, and a server SDK key in client code or a tracked file;
- a read without a context where the user is known;
- a key built at runtime, read from a variable, or assigned in more than one place;
- a client created per request, per call, or inside a component or handler.

When the CLI is installed and `configdirector.json` exists, run `configdirector validate` and add its findings to the review; `configdirector scan` lists the dynamic references `validate` cannot check. The CLI docs page, https://docs.configdirector.com/integrations/cli, explains each finding and what to do about it. When `validate` exits with 2, read the two messages step 3 names as it says; for any other, report what it said and that the keys were not checked against the project, and go on with the review.
