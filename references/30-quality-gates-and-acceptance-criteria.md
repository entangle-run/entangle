# Quality Gates and Acceptance Criteria

This document defines the quality gates that Entangle should satisfy before moving from specification to architecture decisions, from architecture to implementation, and from implementation to a serious hackathon-ready runtime.

## Design rule

Entangle should not advance phases because "enough has been written". It should advance phases because the current layer is strong enough to support the next one without guesswork.

## 1. Specification-complete criteria

The specification layer can be considered strong enough to move into architecture decisions when all of the following are true:

- core types are defined;
- invariants are explicit;
- normalization and validation rules are explicit;
- lifecycle state machines are explicit;
- package filesystem and binding rules are explicit;
- edge semantics and policy defaults are explicit;
- artifact backend rules are explicit;
- control-plane and mutation rules are explicit;
- compatibility and migration rules are explicit;
- observability expectations are explicit;
- Studio responsibilities are explicit;
- hackathon runtime subset is explicit.

## 2. Architecture-decision gate

The project can move into hard architecture and infrastructure choices when:

- the specification corpus no longer leaves core behavioral meaning to interpretation;
- the remaining ambiguity is mostly about tradeoffs, not missing concepts;
- a validator boundary can be drawn cleanly;
- a runner boundary can be drawn cleanly;
- Studio responsibilities are bounded enough to avoid architecture leakage.

## 3. Implementation-readiness gate

Implementation can begin seriously when:

- package boundaries are decided;
- service topology is decided;
- deployment assumptions are explicit;
- schema ownership is explicit;
- validation responsibility is explicit;
- hackathon runtime profile is frozen enough to build against.

## 4. Hackathon-readiness gate

The hackathon build is ready for serious integration work when:

- the runtime subset is explicit;
- the demo-critical flows are explicit;
- out-of-scope features are explicit;
- the implementation order is dependency-aware;
- there is no hidden architectural workaround embedded in the build plan.

## 5. Validator acceptance criteria

The validator layer should eventually be able to reject or warn on:

- malformed packages;
- incompatible packages;
- invalid graphs;
- semantically suspicious edges;
- unrealizable transport policies;
- invalid artifact locators;
- graph-policy violations;
- runtime profile mismatches.

## 6. Runner acceptance criteria

The runner layer should eventually be able to:

- load a bound node workspace;
- enforce sender and edge policy;
- execute real agentic work;
- update artifacts and memory;
- emit valid signed messages;
- stop bounded conversations correctly;
- expose meaningful trace events.

## 7. Studio acceptance criteria

Studio should eventually be able to:

- render the graph truthfully;
- launch work through real entrypoints;
- display the runtime subgraph truthfully;
- show artifacts and session state;
- avoid fabricating backend state.

## 8. Corpus quality gate

The specification corpus itself should satisfy:

- stable reading order;
- cross-referenced documents;
- no stale state claims;
- no hidden contradictions between documents;
- audit-loop maintenance after each major batch.

## 9. What does not count as passing

The following do not count as quality:

- vague descriptions mistaken for specs;
- TODO-shaped architecture;
- client mock state presented as runtime truth;
- hackathon shortcuts hidden in canonical types;
- implementation proceeding despite unresolved core boundaries.

## 10. Practical use

This document should be used at the end of each major phase to decide whether the repository is actually ready to move forward, rather than moving because of time pressure alone.
