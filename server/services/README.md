# Services

Domain folders hold implementations. Root `*.js` files are **compatibility shims** (`module.exports = require('./<domain>/…')`) so existing `require('../../services/foo')` paths keep working.

| Domain | Focus |
|--------|--------|
| `search/` | Pipeline, bouquet, ranking, quality eval |
| `topic/` | Evolution, knowledge, readiness, seeds |
| `learning/` | Signals, learner state, quiz/MCQ, spaced rep |
| `ai/` | Providers, synthesis, synopsis, generation jobs |
| `pdf/` | PDF extract / preindex |
| `agent/` | Mentor turn + side effects |
| `guidelines/` | Guideline watchtower |
| `vector/` | Vector search / coverage |
| `bandit/` | Personalization policies (already modular) |
| `ops/` | Queue, schedulers, billing/usage, observability |

New code should import from the domain path when convenient; shims remain until call sites are migrated.
