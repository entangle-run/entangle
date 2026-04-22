# Normalization and Validation Rules

This document defines how Entangle data should be normalized, validated, and rejected.

The goal is not only to catch malformed objects. The goal is to ensure that different tools, runners, editors, and future services converge on the same meaning when they interpret the same graph and agent corpus.

## Design rule

Entangle should distinguish between:

- authoring format;
- canonical stored format;
- normalized runtime format.

These are related but not identical.

## Validation layers

Validation should happen in layers. A single "is this JSON valid?" check is not sufficient.

### 1. Shape validation

Checks:

- required fields exist;
- field types are correct;
- enum values are valid;
- obvious nullability rules are respected.

This layer answers:

> Does the object have the right shape?

### 2. Referential validation

Checks:

- referenced nodes exist;
- referenced packages exist when required;
- referenced edges belong to the same graph;
- referenced approvers exist;
- referenced artifact backends are known.

This layer answers:

> Do the references resolve?

### 3. Semantic validation

Checks:

- relation type matches endpoint roles and capabilities;
- approval rules are coherent;
- visibility settings are meaningful;
- entrypoints are legitimate;
- node kinds and roles do not contradict each other.

This layer answers:

> Does the model make sense?

### 4. Environment validation

Checks:

- required secrets can be resolved;
- relay endpoints are syntactically valid;
- configured transports are realizable;
- artifact mounts or git remotes exist in the chosen deployment profile.
- referenced model endpoint profiles exist and are usable in the chosen
  deployment profile.

This layer answers:

> Can this model run in the chosen environment?

### 5. Runtime validation

Checks:

- active runtime projection matches current graph and policy state;
- messages conform to the active session and conversation state;
- artifact references can actually be emitted or retrieved at the point of use.

This layer answers:

> Is this operation valid right now?

## Validation outputs

Validators should emit structured findings with severity:

- `error` — invalid, must not proceed;
- `warning` — allowed but risky or suspicious;
- `info` — helpful but not blocking.

Each finding should include:

- stable code;
- subject kind;
- subject id;
- human-readable explanation;
- suggested remediation when possible.

## Canonical normalization rules

### 1. Identifiers

The following ids should be normalized to lower-case canonical strings:

- `graph_id`
- `node_id`
- `edge_id`
- `session_id`
- `trace_id`
- `agent_template_id`
- capability ids

Recommended conventions:

- lowercase;
- `-` as the primary word separator for entity ids;
- `.` as the separator for hierarchical capability names.

Examples:

- `graph_id = team-alpha`
- `node_id = reviewer-1`
- `agent_template_id = reviewer.v1`
- capability = `code.review`

### 2. Public keys

Internally, public keys should be normalized to 64-character lowercase hex strings representing 32-byte public keys.

Display-oriented encodings such as `npub` may be derived for UI use.

Canonical stored form should not alternate between:

- hex;
- `npub`;
- ad hoc aliases.

### 3. Relay URLs

Relay URLs should be normalized by:

- trimming whitespace;
- lowercasing scheme and host;
- preserving path when meaningful;
- removing duplicate entries;
- sorting deterministically when order is not semantically meaningful.

The validator should reject obviously invalid relay URLs.

### 3b. External resource references

Resource references should normalize to stable ids rather than ad hoc inline URL
duplicates whenever the system is operating against a deployment catalog.

Recommended canonical stored form:

- node or graph references named relay profile ids;
- node or graph references named git service ids;
- node or graph references named model endpoint profile ids.

### 4. Relative file paths

All package-relative file paths must:

- use `/` separators in canonical form;
- be relative;
- not contain `..` traversal outside the package root;
- point to files expected by the package schema.

### 5. Capability declarations

Capability lists should be:

- deduplicated;
- normalized to lower-case dot-separated identifiers;
- sorted deterministically for stored canonical form unless authorial ordering has semantic value.

## Authoring forms versus canonical forms

Human authoring should be ergonomic, but internal evaluation should be strict.

### Graph authoring

A graph may be authored in a document that embeds:

- nodes;
- edges;
- policy blocks.

The normalized graph model should resolve to explicit indexed objects with stable ids.

### Package authoring

A package may be authored as a directory tree plus markdown and JSON/TOML/YAML files.

The normalized package model should resolve to:

- one canonical manifest object;
- one canonical capability list;
- validated entry file references;
- declared seed-memory semantics.

### Transport policy authoring

Humans may author a short symmetric form.

The runtime should normalize it to a directional internal representation.

For example, this authoring form:

```json
{
  "mode": "bidirectional_shared_set",
  "shared_relays": ["wss://relay.example.org"],
  "channel": "default"
}
```

should normalize internally to something like:

```json
{
  "mode": "directional",
  "source_to_target": {
    "publish_relays": ["wss://relay.example.org"],
    "subscribe_relays": ["wss://relay.example.org"]
  },
  "target_to_source": {
    "publish_relays": ["wss://relay.example.org"],
    "subscribe_relays": ["wss://relay.example.org"]
  },
  "channel": "default"
}
```

The exact internal field names may change, but the directional semantics should not.

## Type-specific normalization rules

### AgentPackage

Normalize:

- package schema version;
- template id;
- declared default capabilities;
- entry file paths;
- compatible Entangle version string.

Validate:

- manifest completeness;
- path safety;
- seed-memory policy;
- capability declaration consistency.

Warn when:

- prompt files imply capabilities not declared structurally;
- mutable runtime state appears committed as template truth.

### NodeInstance

Normalize:

- `graph_id`;
- `node_id`;
- `pubkey`;
- `node_kind`;
- `visibility_mode`;
- `autonomy_level`;
- backend profiles.

Validate:

- one active pubkey per node instance;
- compatibility with referenced package/template;
- meaningful role/kind combinations;
- local bindings that do not exceed graph policy.

Warn when:

- graph-local prompt addenda appear to redefine template identity;
- local policy labels imply capabilities not declared structurally.

### Edge

Normalize:

- relation type;
- initiator policy;
- transport policy to canonical directional form;
- message classes to canonical ids;
- approval policy booleans and defaults.

Validate:

- endpoint existence;
- endpoint distinctness;
- relation compatibility;
- transport realizability;
- approval coherence;
- enabled state semantics.

Warn when:

- the edge is valid structurally but semantically suspicious;
- the edge has no useful reverse status path despite requiring acknowledgments or approvals.

### GraphSpec

Normalize:

- graph id;
- entrypoint list;
- node and edge membership lists;
- default backend profiles.

Validate:

- closed membership;
- entrypoint legitimacy;
- owner presence;
- compatibility between graph defaults and member reality.

Warn when:

- the graph is technically valid but unusable because no serious execution path can reach a worker capable of producing artifacts.

### RuntimeProjection

Normalize:

- node-local peer views;
- reachable-node hints;
- active edge policy expansions;
- relay context;
- artifact context.

Validate:

- visibility compliance;
- consistency with graph truth;
- reproducibility from the current graph and deployment state.

Reject if:

- the projection contains peers or policies not derivable from the active graph and bindings.

### Session

Normalize:

- ids;
- entrypoint identity;
- originating user identity;
- status;
- intent summary.

Validate:

- graph existence;
- user-node legitimacy;
- entrypoint legitimacy;
- trace consistency.

Warn when:

- the session is valid but requires paths or capabilities not available under current runtime profile.

### ArtifactRef

Normalize:

- backend enum;
- backend-specific locator fields;
- creator identity;
- session association;
- optional task or conversation association.

Validate:

- backend support;
- locator sufficiency;
- provenance completeness.

Reject if:

- the locator is underspecified for independent retrieval;
- the backend is unsupported by current runtime policy.

## Cross-object validation rules

### 1. Package-to-node validation

If a node binds a package source, the validator must check:

- template identity match;
- compatible Entangle version;
- declared capability compatibility;
- expected runtime files.

### 2. Graph-to-edge validation

Every edge must be validated in the context of the graph, not in isolation.

This includes:

- endpoint existence;
- control constraints;
- transport feasibility in context;
- approval authority resolution.

### 3. Session-to-graph validation

A session is valid only in relation to a concrete graph version or graph snapshot.

The runtime should not evaluate session validity against an unspecified moving topology.

### 4. Artifact-to-runtime validation

Artifact emission and retrieval should validate against:

- active node permissions;
- active backend mounts;
- active repository or workspace availability.

## Derived objects

Some objects should be treated as derived and therefore never hand-maintained as canonical truth.

These include:

- runtime projections;
- normalized directional transport forms produced from simpler authoring forms;
- cached reachability hints;
- expanded policy closures;
- runtime session traces.

## Versioning rule

Normalization and validation behavior must be versioned alongside the schema.

The system should not silently reinterpret old graphs or packages under new validator behavior without an explicit migration path or compatibility policy.

## Hackathon profile

The hackathon build may enforce a stricter subset than the full product.

For example:

- only one relay profile;
- only `git`, `wiki`, and local file artifact backends;
- only a subset of relation types;
- only local package sources.

That is acceptable as long as:

- canonical normalization still understands the larger model; or
- unsupported values fail explicitly and cleanly rather than being normalized into the wrong meaning.
