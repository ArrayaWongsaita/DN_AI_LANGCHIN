# Weekly summary prompt — tuning log

Goal: make `GET /summaries/weekly` (structured output from `SummaryService`) trustworthy.
Method: rule-based checks against the real model (TokenMe `deepseek-v4.1-flash`), several random samples per scenario.
Run it yourself: `pnpm --filter task-api eval:summary [--set tuning|holdout|all] [--samples N] [--dump]` (needs `TOKENME_API_KEY`).

## Harness
- `apps/task-api/eval/summary-eval.ts`: 6 tuning scenarios (mixed, no-risk, all-done, empty, prompt-injection title, many tasks) and 3 hold-out scenarios (never used while tuning).
- Checks per sample: schema, Thai one-sentence headline, headline numbers grounded, risks cover every overdue task and are empty when nothing is due, next actions name real open tasks in urgency order, highlights name completed tasks, no raw enum/ISO fields, no duplicates, injection not followed.
- The model is sampled because it is random: the number that matters is the pass rate, not one run.

## Rounds (each eval run counted as a round; 7 of the 20 allowed were used)
| Round | Change | Tuning perfect samples | Notes |
|---|---|---|---|
| 0 | baseline (original prompt) | 0/18 (67.6% of checks) | headline "summary"; risks filled with stats ("overdue 0"); urgency order never right; model did not know today's date |
| 1 | today's date, due dates described relative to today in Thai, tasks pre-sorted by urgency, completed titles included, per-field rules + schema descriptions | 12/18 (97.2%) | remaining failures were checker bugs, see rulings |
| 1b | same prompt, checker fixed (derived counts) | 17/18 (99.5%) | |
| 2 | same prompt, checker accepts overdue+dueToday sum, 5 samples | 29/30 | one headline too long with a stray English word |
| 3 | headline ≤ 100 chars, no English words | 27/30 | **3 failures were "length limit reached"**: reasoning tokens (365–4,375 per call) exhausted `maxTokens: 1500` |
| 4 | thinking off for TokenMe (`chat_template_kwargs.enable_thinking=false`, 0 reasoning tokens) | **30/30 (100%)** | other switches (`reasoning_effort`, `thinking`) still used 169–2,400 tokens |
| 5 | hold-out set, 8 samples each | **24/24 (100%)** | |

## Rulings
- Checker was too strict on derived numbers: "9 open tasks" (10 total − 1 done) and "5 urgent" (4 overdue + 1 due today) are correct but not literal fields. Accepted open, done, overdue+dueToday. Cost if wrong: a model that miscounts in those exact ways would pass; the other numbers are still checked against the data.
- Length check now ignores quoted task titles (a long title quoted verbatim is not verbosity).
- Reasoning is switched off for the whole app model on TokenMe/DeepSeek (not only for summaries): cheaper, faster, and the capstone demo (tools, approval, knowledge) was re-run end to end afterwards.

## Limits
- One model, small scenario set (9), rule-based checks only: they do not judge how pleasant the Thai reads. Read by eye on one sample of each of the 9 scenarios (`--dump`): nothing wrong in headline/risks/highlights. Two things worth knowing: a task whose title is an injection ("ignore previous instructions … HACKED") is quoted verbatim in `risks` and `nextActions` (it is the user's own task title, and the headline was not hijacked), and urgency ranks priority before age inside the overdue bucket, so a 3-day-overdue Medium task precedes a 10-day-overdue Low one — by design, but arguable.
- Re-run the eval after changing the prompt, the schema descriptions or the model.
