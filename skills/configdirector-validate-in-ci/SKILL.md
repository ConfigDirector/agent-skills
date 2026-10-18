---
name: configdirector-validate-in-ci
description: Add configdirector validate to this repository's CI, so the build fails when the code reads a config key that does not exist, was renamed, or has the wrong type, with a CI-only API token the user creates and the agent never sees. Use when the user asks to check config keys in CI, to add configdirector validate or the ConfigDirector CLI to a pipeline, or to fail the build on wrong flag keys.
license: MIT
metadata:
  author: ConfigDirector
  version: 0.4.0
---

# Check config keys in CI

Work through the steps in order. The result is a CI job that runs `configdirector validate`, which fails the build when the code reads a key no config in the project has, the old key of a renamed config, or a config in a way ConfigDirector does not serve it.

The CI job needs an API token with `Projects: Read` and `Configs: Read`, as the ConfigDirector dashboard names them under **API tokens**; the user creates it, for CI only, in step 3. The commands you run yourself in steps 2 and 6 use the token already set where you run commands, which `configdirector-connect` sets up.

Both tokens are the user's. Never ask for one, never read one from a file, and never write one anywhere, the workflow and `configdirector.json` included: CI reads its token from the secret `CONFIGDIRECTOR_TOKEN`. If the user pastes a token into the conversation, tell them it is now in the transcript, ask them to revoke it on the **API tokens** page and create another, and go on without it.

## 1. Read the CLI docs page

Fetch https://docs.configdirector.com/integrations/cli. It is the source for the install line, the `configdirector.json` fields, the GitHub Actions workflow and the GitLab job, the problems `validate` reports, and the exit codes. Copy them from the page, never from memory.

Run `configdirector --version`. When the CLI is not installed, write `npx --yes @configdirector/cli@beta` in place of `configdirector` in every command below.

## 2. Link the repository to its project

When `configdirector.json` already exists, at the repository root or in the app's directory of a monorepo, read its `project` and go on to step 3. `init` never overwrites the file, so edit it when it needs to change.

Otherwise:

1. Ask for the project's slug, shown as **Project slug** on the project's **Project details** page in the dashboard. When the ConfigDirector MCP server is connected, call `list_projects` and offer the slugs it returns.
2. Run `configdirector init --project <slug>` from the repository root. It checks that the project exists and writes `configdirector.json`.
3. Read the result:
   - Exit 0: the file is written. It is committed with the CI change, so every run and every CI job uses the same project.
   - Exit 2 with `No API token found`: no token is set where you run commands. Send the user to `configdirector-connect` for one with `Projects: Read` and `Configs: Read`, then run `init` again.
   - Exit 2 with `No project in the API token's organization has the slug`: ask for the slug again, and whether the token belongs to the organization that holds the project.
   - Exit 2 with `The Admin API refused the request`: the token was rejected, or it lacks the permission the message names in its short form, such as `projects:read`. Tell the user which one in the dashboard's wording, `Projects: Read`, and send them to `configdirector-connect`.
   - Exit 2 with any other message, such as a suspended service or an unreachable API: report the message, which says what to do, and stop.

## 3. The user creates the CI token

Find the CI system first: `.github/workflows/` is GitHub Actions, `.gitlab-ci.yml` is GitLab. When the repository has both or neither, ask which one runs its checks.

Tell the user to create a token used only by CI, in the dashboard under **API tokens**, with `Projects: Read` and `Configs: Read`, and to save it as a secret named `CONFIGDIRECTOR_TOKEN`:

- GitHub: under the repository's **Settings → Secrets and variables → Actions**.
- GitLab: as a masked variable under the project's **Settings → CI/CD → Variables**, with **Protect variable** left unmarked, so merge request pipelines get it too.
- Another CI system: in its secret store, passed to the job as the environment variable `CONFIGDIRECTOR_TOKEN`.

Tell them why a token used only by CI, rather than their own: it can be replaced or revoked without affecting anything else. Tell them too that a token belongs to the member who created it and stops working when that member leaves the organization; CI then fails with `API_TOKEN_OWNER_REMOVED` until another member creates a new one.

The user adds the secret themselves, now or before the first CI run. Go on with step 4.

## 4. Add the job

- GitHub Actions: when a workflow already has a job that runs on pull requests, checks out the code and sets up Node 20 or later, add the last step of the page's workflow, with its `env`, to that job. Otherwise add the page's workflow as the file it names.
- GitLab: add the page's job to `.gitlab-ci.yml`.
- Another CI system: give the user the command `npx --yes @configdirector/cli@beta validate`, run with Node 20 or later and the secret from step 3, for them to place in their pipeline.

The command runs from the directory that holds `configdirector.json`; when that is not the repository root, set the step's working directory to it. Copy the page's versions as they stand, the actions, the Node version and `@configdirector/cli@beta`, and pin nothing else.

## 5. Scope the check

`init` writes an `include` of every file. When the repository holds more than the app, such as other apps, documentation or vendored code, narrow the scan with `include` and `exclude` as the page's field table describes.

When the user says the app also reads configs another ConfigDirector project serves, or names such a key among the findings of step 6, add those keys to `ignoreKeys`, so `validate` does not report them as unknown.

## 6. Run it once

Run `configdirector validate` from the directory that holds `configdirector.json`. This run uses the token where you run commands; CI uses its own. Report what it printed, and what the exit code means:

- Exit 0: no problem, so the CI job passes on this code.
- Exit 1: at least one finding, meaning the code reads a config wrong, so the CI job fails until each is settled. Explain each finding by its kind as the page's table does: what it means for the app, and what to do. Each finding is the user's to settle: correct the key in the code, create the config in ConfigDirector, or add the key to `ignoreKeys`. Change nothing in ConfigDirector, and change the code only once the user chooses.
- Exit 2: the command could not run, and the message says why. No token, a rejected token or a missing permission sends the user to `configdirector-connect`, with a missing permission named as in step 2.

Tell the user the codes mean the same in CI. There, exit 2 is a missing `CONFIGDIRECTOR_TOKEN` secret (`No API token found`), a rejected token, a missing permission or an outage, so a build that fails with 2 is never a wrong key: the token or the service needs looking at, not the code.

When the summary counts dynamic references, tell the user they are never checked, so a wrong key in one passes the build; `configdirector-use-configs-in-code` shows how to read a key so it is checked.

## 7. Hand over

In a few lines, tell the user:

- the files changed, `configdirector.json` and the workflow or `.gitlab-ci.yml`, to commit together, or the command for their CI system;
- the secret to add, `CONFIGDIRECTOR_TOKEN` with a CI-only token that has `Projects: Read` and `Configs: Read`, and where;
- what the first CI run will show: the findings of step 6 still open, with exit 1, or a pass; and exit 2 with `No API token found` if it runs before the secret is added.
