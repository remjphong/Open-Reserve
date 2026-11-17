# D17-09 Economics

Baseline `0f3dadac5bef8814433843b4356af026181eb0b7`. Formula gate `BLOCKED_PENDING_DECISION_RECORD`.

The endpoint validates the frozen `scenarioRequest` schema. Invalid requests return HTTP 400 `INVALID_REQUEST`. Valid requests return HTTP 501 `NOT_IMPLEMENTED` with the Decision Record blocker in the response message. Health and readiness retain their existing behavior. The service has no PostgreSQL or RPC dependency.

The approved A/B/C/D formulas were not found in the fixed baseline, GitHub issues, or available project records consulted. The architecture and service contract record one manual reference case for model B.

| Illustrative VND per incremental customer | Amount |
| --- | ---: |
| Package price | 1,500,000 |
| Referral revenue at 4% | 60,000 |
| Platform CAC | −70,000 |
| Platform variable cost | −20,000 |
| Platform unit contribution before fixed costs | **−30,000** |

That case is recorded for comparison against the future API. The API does not emit financial estimates yet. To unblock the model, supply the approved rules for each model's gym incremental contribution, cash gap and platform margin, including the advance terms and composition rules.

| Command | Exit |
| --- | ---: |
| `npm ci` | 0 |
| `npm run typecheck` | 0 |
| `npm run build` | 0 |
| `npm test` | 0 |
| `npm run test:isolation` | 0 |
| `git diff --check` | 0 |
