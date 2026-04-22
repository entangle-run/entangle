# Schema Ownership and Contract Generation Specification

This document freezes how Entangle should own machine-readable contracts across
packages, validators, host APIs, runner inputs, and future generated schema
artifacts.

The goal is to prevent one of the most common early-product failures:

- duplicate contract definitions;
- drift between TypeScript interfaces, runtime validators, and HTTP DTOs;
- host, CLI, Studio, and validator each inventing their own shapes;
- JSON Schema export becoming a second source of truth.

## Design rule

Entangle should maintain one primary machine-readable contract source for each
canonical object family.

For the first serious implementation, that primary source should be:

- `zod` schemas owned in `packages/types`

Everything else should derive from or be validated against those schemas.

## 1. Ownership model

### `packages/types`

Owns:

- primary `zod` schemas;
- inferred TypeScript types from those schemas;
- canonical object families for:
  - package manifests and package-source records;
  - graph objects and revisions;
  - node bindings and effective bindings;
  - deployment resource catalog objects;
  - artifact references;
  - protocol payloads;
  - host API DTOs;
  - normalized agent-engine turn contracts where shared across packages.

Must not own:

- semantic validation policies that depend on cross-object checks;
- host business logic;
- runner business logic;
- CLI formatting logic;
- Studio view models.

### `packages/validator`

Owns:

- semantic validation built on top of schemas from `packages/types`;
- cross-object and profile-aware checks;
- warnings, errors, and explainers for invalid or suspicious configurations.

Must not re-declare primary schemas.

### `packages/host-client`

Owns:

- client-side transport wrappers for the host API;
- convenience methods around host routes;
- shared request execution behavior for Studio, CLI, and tests.

Must not invent parallel DTO shapes. It must consume host request/response
contracts from `packages/types`.

### `services/host`

Owns:

- route handlers;
- request parsing through shared schemas;
- semantic validation through `packages/validator`;
- resource reconciliation and state mutation.

It may define internal persistence or service-layer types, but canonical API
contracts must still originate in `packages/types`.

### `services/runner`

Owns:

- runtime-only local types when they are purely internal implementation detail;
- adaptation from canonical injected runtime context into local execution state.

It must not redefine canonical binding, protocol, or artifact shapes.

## 2. Canonical one-way flow

The first serious contract flow should be:

1. define `zod` schema in `packages/types`;
2. infer TypeScript type from that schema;
3. consume that schema directly in runtime validation;
4. optionally export JSON Schema from the same source later;
5. consume generated or inferred contract material in CLI, Studio, host, and
   tests.

The reverse direction is not allowed.

Do not:

- hand-author TypeScript interfaces first and later try to mirror them in
  validators;
- hand-author JSON Schema first and then separately mirror it in runtime code;
- let DTO shapes exist only in route handlers or frontend fetch wrappers.

## 3. Host API DTO ownership

The host API should use explicit DTO schemas owned in `packages/types`.

Recommended DTO families:

- catalog request/response DTOs;
- package-source admission and inspection DTOs;
- graph inspection and validation DTOs;
- node binding create/update DTOs;
- edge create/update DTOs;
- runtime lifecycle DTOs;
- session launch DTOs;
- trace subscription and event DTOs;
- validation result DTOs.

This gives Studio, CLI, host, tests, and future automation one contract set.

## 4. Semantic validation layering

Schema validity and semantic validity must stay distinct.

`packages/types` answers:

- is the shape structurally valid?
- are primitive enums, unions, and required fields valid?

`packages/validator` answers:

- does this edge make sense for these nodes?
- is the transport realizable?
- does the graph violate profile constraints?
- is this package compatible with the chosen runtime profile?
- are external resource bindings coherent?

This layering must remain explicit in code organization.

## 5. Generated contract artifacts

The first serious implementation may later generate:

- JSON Schema;
- OpenAPI fragments for host routes;
- markdown contract tables for docs;
- fixture skeletons for tests.

But those generated artifacts must remain derivative.

They should be:

- reproducible;
- disposable and regenerable;
- clearly marked as generated.

They must not become the place where canonical meaning evolves first.

## 6. File-organization recommendation inside `packages/types`

Recommended first structure:

```text
packages/types/
  src/
    package/
    graph/
    bindings/
    resources/
    artifacts/
    protocol/
    host-api/
    engine/
    common/
```

With an index surface that exports:

- schemas;
- inferred types;
- stable validation helpers for structural parsing.

This structure should mirror conceptual ownership rather than route files or UI
screens.

## 7. Parse and normalization stance

Normalization should happen in a disciplined order:

1. parse untrusted input with the relevant canonical schema;
2. normalize into canonical structural form where allowed;
3. run semantic validators;
4. only then admit into host desired state or runner execution.

Do not let host routes or CLI commands perform ad hoc normalization before the
canonical parsing layer sees the input.

## 8. Test strategy implications

Because contracts live in `packages/types`, the first test pyramid should use:

- schema parse tests in `packages/types`;
- semantic validator tests in `packages/validator`;
- DTO round-trip tests in `packages/host-client` and `services/host`;
- runner fixture tests consuming generated effective runtime context.

This keeps test ownership aligned with contract ownership.

## 9. Hackathon profile

For the hackathon, do not try to machine-generate every downstream artifact.

Required:

- canonical `zod` schemas in `packages/types`;
- inferred TypeScript types;
- host/CLI/validator reuse of those schemas.

Optional later:

- JSON Schema export;
- OpenAPI generation;
- code-generated API clients.

The hackathon goal is one contract source, not maximal code generation.

## 10. Final recommendation

Freeze this as the implementation rule:

> `packages/types` owns the primary `zod` schemas and inferred canonical
> contracts. `packages/validator`, `packages/host-client`, `services/host`,
> `services/runner`, `apps/studio`, and `apps/cli` must consume those
> contracts rather than redefining them.
