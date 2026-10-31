---
name: configdirector-test-with-flags
description: Rules for testing code that reads a ConfigDirector config or feature flag, using the SDK's test client or the OpenFeature in-memory provider as the SDK's docs page shows. Use when writing tests for code that reads a config, or when setting up test support around feature flags.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.14.0
---

# Test code that reads flags and configs

Apply these rules when writing tests for code that reads a config or feature flag through a ConfigDirector SDK or OpenFeature provider, and when setting up the fixtures or helpers such tests share. This skill touches no ConfigDirector account and needs no API token.

## 1. Find the SDK and its testing section

1. Read the project's dependency manifest (`package.json`, `pubspec.yaml`, `Package.swift`, the Gradle or Maven build, the `.csproj`, `pyproject.toml` or `requirements.txt`, `go.mod`). In a monorepo, read the manifest of the app whose code you are testing. The project uses ConfigDirector when a dependency's name contains `configdirector`, or when an OpenFeature SDK (a dependency whose name contains `openfeature` or `open-feature`) sits next to a ConfigDirector provider.
2. Open https://docs.configdirector.com/sdks/available-sdks and follow the link for that SDK; for an OpenFeature provider, the link under OpenFeature for its platform. Fetch that page and read its testing section, _Test your code_ or _Test your components_: it names the testing entry point or artifact to add in test scope, how to create the test client, how to put it where the code under test gets its client, and the controls the test client offers. Do not write any of this from memory.

If no dependency matches, the project does not use ConfigDirector yet; `configdirector-setup` adds it. Stop here.

## 2. The rules

**Use the SDK's test client, never a mock of the SDK's module.** The test client is the SDK's real client connected to an in-memory server the test controls, so the code under test runs the same code as in production and no connection is opened; a mock of the SDK's module replaces the evaluation itself, so it passes with a wrong key, a wrong type, or a read the SDK would never serve. The page names it: `createTestClient` for JavaScript, TypeScript, React Native, Flutter and Android, `create_test_client` for Python, `CreateTestClient` for .NET, `NewTestClient` for Go, `makeTestClient` for Swift, and for Java `createTestClient` or the JUnit `@*ConfigValue` annotations. Code that reads flags through OpenFeature swaps the provider for the in-memory provider the SDK's OpenFeature page names: `TypedInMemoryProvider` for the web and Node.js SDKs, `InMemoryProvider` for Python, Java, .NET and Flutter, `memprovider` for Go, and for Swift and Android the ConfigDirector provider given the SDK's test client.

**Never a real SDK key in a test.** A test client needs no key, opens no connection and sends no telemetry. A test that initializes the production client with an SDK key reads the live values of that environment, so it passes or fails with the targeting rules of the day, and a server SDK key in a test file is a leaked secret.

**Test both branches of a flag.** A flag is turned on and off in ConfigDirector without a deploy, so the code under each value ships together. Write one test with the flag on and one with it off; for a config with several values, one test per value the code distinguishes.

**Test values use the code's own keys, through the same constants.** `configdirector scan` lists a test client's calls as test references of the key, so a key the code reads through a constant is given to the test client through that constant, with the values written inline in the call; a values object held in its own constant is listed as a dynamic reference instead. A key typed again in the test drifts from the code on the next rename, and the test keeps passing with values the code never reads.

**A test value has the config's type.** `configdirector validate` checks a test client's keys for existence and renames only, since ConfigDirector never serves a test client, so a test value of the wrong type is not reported. Give each key a value of the type the config has in ConfigDirector, as the page describes the test client's values (a timespan as a number, a JSON config as an object or array, an enum as one of its allowed values), or the code under test reads its in-code default value and the test proves nothing about the flag.

## 3. Writing the tests

1. List the keys the code under test reads, the constants that hold them, and the type of each config, from the code and the project's configs.
2. Add the testing entry point or artifact in test scope, as the page shows. It ships with the SDK the project already depends on.
3. Find how the code under test gets its client (passed in, a provider, a module that creates it, a dependency injection container) and put the test client there the way the page shows for that case: an install function, the project's own setup module or getter, or the project's dependency injection, never the SDK's module. The test owns the client's lifecycle: initialize it when the code under test does not, and close or dispose it after each test.
4. Write one named test per branch: create the test client with the values for that branch, exercise the code, assert the behavior of that branch. Use the test client's controls from the page for the rest, such as changing a value while the code runs or holding initialization to see the in-code default value.
5. Run the tests. When the CLI is installed and the repository holds a `configdirector.json`, run `configdirector scan` from the directory that holds it and confirm the new references are listed as `test` under the keys the code reads; a test client call listed under _Dynamic references_ was given its keys in a way the scan cannot resolve. When `scan` exits with 2, the message says why, and two messages need more:
   - Exit 2 with `There are CLI sign-ins for`: the CLI is signed in to several organizations, and nothing names this repository's. Ask the user which organization, offering the names the message lists. When the directory holds a `configdirector.json`, it has no `organization` yet: run `configdirector init --organization <name>` from that directory, which adds it, and tell the user the file changed and belongs in their next commit. When it holds none, pass `--organization <name>` to every later CLI command. Then run the command again.
   - Exit 2 with `The token from` and `belongs to the organization`: the token the CLI used belongs to another organization than the one `configdirector.json` names. Tell the user so, and where the token came from, as the message names it, such as `CONFIGDIRECTOR_TOKEN`. Send them to `configdirector-connect`.
