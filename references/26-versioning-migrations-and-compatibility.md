# Versioning, Migrations, and Compatibility

This document defines how Entangle should version its schemas and behaviors, how compatibility should be evaluated, and how migrations should be handled without silently corrupting meaning.

## Design rule

The system must not silently reinterpret old data under new rules.

If a package, graph, protocol payload, or validator behavior changes meaning, that change must be visible through versioning and, when necessary, explicit migration.

## 1. Objects that require versioning

At minimum, versioning must apply to:

- `AgentPackage` schema;
- package template identity;
- `GraphSpec` schema;
- control-plane graph revisions;
- `entangle.a2a.v1` protocol version;
- validator behavior tied to schema versions;
- runtime projection format;
- future deployment profile schemas.

## 2. Schema version versus content version

Entangle must distinguish between:

### Schema version

The version of the structure or semantic contract.

Examples:

- `agent_package_version`
- `graph_schema_version`
- `protocol = entangle.a2a.v1`

### Content version

The revision of a particular package, graph, or runtime artifact.

Examples:

- package release tag;
- graph revision id;
- artifact revision;
- runtime projection build id.

These are related but not the same.

## 3. Compatibility dimensions

Compatibility should be evaluated across several dimensions.

### Structural compatibility

Can the object be parsed and validated by this runtime?

### Semantic compatibility

Does this runtime interpret the object with the same meaning intended by its version?

### Operational compatibility

Can this object actually run in the active deployment profile?

### Policy compatibility

Is the object allowed under the graph and control-plane rules currently in force?

## 4. Recommended versioning stance

The product should use explicit schema versions plus compatibility constraints rather than relying on implicit "latest" behavior.

Recommended examples:

- package manifest includes `agent_package_version`
- package manifest includes `compatible_entangle_version`
- graph file includes `graph_schema_version`
- runtime projection includes its own format version
- protocol payload includes `protocol = entangle.a2a.v1`

## 5. Package compatibility

Package compatibility should be evaluated against:

- package schema version;
- declared Entangle compatibility range;
- required runtime capabilities;
- binding expectations;
- optional engine/tooling profile.

### Runner behavior

The runner should:

- accept compatible packages;
- reject incompatible packages;
- warn on partially supported but structurally valid packages;
- never silently "best effort" a clearly incompatible package into execution.

## 6. Graph compatibility

Graph compatibility should be evaluated against:

- graph schema version;
- available relation types;
- available transport modes;
- available policy features;
- deployment profile support.

### Validator behavior

The validator should distinguish:

- valid and supported;
- valid but unsupported in the current runtime profile;
- invalid.

This distinction matters especially for hackathon-limited implementations.

## 7. Protocol compatibility

Protocol versioning should be explicit and stable.

### Recommended rule

If the protocol semantic contract changes incompatibly, the protocol identifier should change.

Examples:

- `entangle.a2a.v1`
- future `entangle.a2a.v2`

### Runtime behavior

On unsupported protocol versions, the runner should reject safely rather than infer compatibility.

## 8. Runtime projection compatibility

`RuntimeProjection` is derived state, but it still needs versioning because:

- different runners may generate it;
- Studio or validators may inspect it;
- changes in format affect local tooling and execution.

Recommended field:

- `runtime_projection_version`

## 9. Graph revision model

Graph revisions are not the same as graph schema versions.

### Schema version

Describes the format and semantic rules of the graph object type.

### Graph revision

Describes one concrete state of a specific graph over time.

Recommended fields:

- `graph_schema_version`
- `graph_revision_id`
- `parent_graph_revision_id` when meaningful

## 10. Migration classes

Entangle should recognize at least four migration classes.

### Class A: purely additive, backward-compatible

Examples:

- new optional metadata field;
- new optional docs path;
- new non-required artifact summary field.

Often no migration required, only tolerance.

### Class B: normalization-affecting but recoverable

Examples:

- changed canonical id casing rule;
- changed default field inference;
- new explicit field replacing a formerly implicit rule.

Requires explicit migration or compatibility shim.

### Class C: semantic contract change

Examples:

- relation type meaning changes;
- approval defaults change materially;
- protocol stop-condition semantics change.

Requires version bump and likely migration tooling.

### Class D: breaking runtime/environment change

Examples:

- package binding model changes;
- artifact locator format changes incompatibly;
- runner requires a new deployment invariant.

Requires explicit migration path and likely rollout planning.

## 11. Migration responsibilities

Migration is not just a parser concern.

Different layers own different parts:

- schema tooling migrates document shapes;
- validators detect incompatibility;
- control plane decides rollout timing for graph changes;
- runners enforce supported versions at execution time.

## 12. Migration workflow

Recommended workflow:

1. detect current version and content revision;
2. validate under current rules;
3. determine target schema version;
4. apply explicit migration transform;
5. validate again under target rules;
6. record migration provenance;
7. only then allow the migrated object into normal execution.

## 13. Backward compatibility policy

The project should define a policy for how many old versions remain supported.

Recommended early stance:

- current major version fully supported;
- previous compatible minor forms may be tolerated when structurally safe;
- incompatible older major versions should fail explicitly.

This can be tightened or relaxed later, but the policy should be explicit.

## 14. Forward compatibility policy

The runtime may encounter newer objects than it understands.

Recommended behavior:

- tolerate unknown optional fields when schema rules allow;
- reject unknown required semantics;
- warn when objects are structurally parseable but semantically newer than the runtime supports.

## 15. Content provenance for migrations

When an object is migrated, the system should preserve:

- original version;
- target version;
- migration tool or process identity;
- time of migration;
- source content revision.

This is especially important for:

- graph revisions;
- package templates;
- future registry-published packages.

## 16. Hackathon profile

The hackathon build may implement a very narrow compatibility surface:

- one package schema version;
- one graph schema version;
- one protocol version;
- one runtime projection version.

That is acceptable.

The architecture must still keep version fields explicit now so later product growth does not require a type-system rewrite.

## 17. Rejected anti-patterns

The compatibility model should reject:

- silently interpreting old packages under new semantics;
- hiding semantic changes behind unchanged version labels;
- using graph revision as a substitute for schema version;
- assuming "if it parses, it is safe to run";
- treating unsupported values as if they were normalized into supported ones.
