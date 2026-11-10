# Read an experiment's results

How `configdirector-roll-out` reads and words a run's `results`, from `list_runs` / `configdirector configs runs --json`: for step 6, when the user asks how an experiment is going, and for step 3, before a ship. The results compare each variation against the control on the metrics attached to the experiment.

## No metrics

When `results.primary`, `results.secondary` and `results.guardrail` are all empty, the experiment measures no metric: say there are no results until metrics are attached on the experiment's **Settings** tab in the dashboard.

## The fields

Per rollout, the entry of `results.rollouts` with the rollout's `ruleId` gives:

- `controlVariationId`: the control, the variation every other one is compared against;
- `state`: `ready`, or `needs-more-exposures`, which means the variations cannot be compared yet; say so, and give each variation's value alone;
- `crossovers`: above 0, that many contexts were exposed to more than one variation and are left out of every metric.

Each metric in `results.primary`, `results.guardrail` and `results.secondary` has its `eventName`, its `direction`, and per kind in `kinds`, for each rollout, its variations with the control first. The primary metric's `primaryKind` is the kind that decides the experiment. Name each variation as step 3 of `SKILL.md` names it. Each variation has `exposures` and a `value`:

- `conversion`: the share of its exposed contexts that sent the event at least once, as a percentage with one decimal, with `converters`, how many did;
- `count-per-context`: how many times each exposed context sent the event, on average, with two decimals;
- `value-per-context`: the value sent with the event per exposed context, on average, with two decimals.

Once the rollout is `ready`, every other variation also has:

- `lift`, the change against the control's value, with `interval`, the range the lift is likely in, as whole percentages, as in `+55%, likely between +12% and +98%`. Without `lift`, the control's value is zero or below, so there is no relative change to give; without `interval`, give the lift alone;
- `chanceToBeatControl`, the chance its value is better than the control's in the metric's direction, so the chance it is lower on a `lower-is-better` metric, as a whole percentage, written `<1%` and `>99%` at the ends;
- with three or more variations, `chanceToBeBest`, the control's included, written the same way;
- `verdict`, which already follows the metric's direction, in these words:
  - `likely-better`: likely better;
  - `likely-worse`: likely worse;
  - `no-clear-difference`: no clear difference.

A verdict is a reading of the data so far: report it in the words above, and leave what to ship to the user.

## How fresh the results are

- On a running run, they can be up to 25 minutes behind.
- On an ended run with `results.asOf`, they are its final results, as of that time, when the run ended.
- On an ended run without `results.asOf`, the results shown can still change: the final results come up to 25 minutes after the run ended. A run that ended with no exposures gets none.

## The ship reading

The ship reading of a variation is what the user reads before shipping it, per rollout:

1. Every guardrail whose verdict is `likely-worse` for the variation, with its values and lift, as in "A guardrail is likely worse for treatment-a (Try it free for 14 days): support_ticket_opened, count per context, is 0.12 against the control's 0.05, +140%, likely between +66% and +269%." A guardrail is a metric that must not get worse. When none is likely worse, say so.
2. The primary metric on its `primaryKind`: the variation's value against the control's, its lift with the range it is likely in, its chance to beat control and its verdict. Without a primary metric, say no metric decides the experiment; while the rollout `needs-more-exposures`, say the variations cannot be compared yet.
3. How fresh the results are.

## How the experiment is going

Give the ship reading of every variation but the control, then any other guardrails and secondary metrics, in a line each. When the user asks which variation won or what to ship, this is the answer, and the choice stays theirs. Then name the events in `trackedEvents.events` that no metric attached to the experiment measures, with their `contexts`, since a metric attached for one would show its results.

When the user asks how a number is computed, point them to https://docs.configdirector.com/getting-started/experiments/how-results-are-computed.
