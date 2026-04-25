# AgentPackage Filesystem and Binding Specification

This document defines the on-disk contract for `AgentPackage`, the boundary between portable package content and graph-local runtime state, and the binding process that turns a package into a runnable node workspace.

The goal is to make the package model implementable, portable, inspectable, and safe to evolve.

## Design rule

Entangle must distinguish clearly between:

- package template content;
- graph-local node binding;
- runtime-injected state;
- mutable instance memory and artifacts.

These must not be collapsed into one undifferentiated folder.

## 1. Package classes

Entangle should treat package-like artifacts as belonging to one of three classes.

### 1. Template package

A portable, versionable, graph-agnostic directory tree.

Properties:

- safe to commit;
- safe to export/import;
- contains no live secrets;
- valid independently of any one graph.

### 2. Instantiated package workspace

A local copy derived from a template package and prepared for one node instance.

Properties:

- still based on package template content;
- may include graph-local overlays and runtime mounts;
- may include mutable memory and workspace content.

### 3. Runtime-bound node workspace

The live local filesystem surface seen by a running node.

Properties:

- contains injected configuration;
- contains mounted secrets by reference or secret mount;
- contains mutable wiki memory and artifact workspace;
- must be reproducible from template + binding + environment.

## 2. Canonical package root

The canonical package root should have a stable layout.

Recommended structure:

```text
agent/
  manifest.json
  identity/
    profile.md
    role.md
    skills.md
    duties.md
    obligations.md
  prompts/
    system.md
    interaction.md
    safety.md
  runtime/
    config.json
    capabilities.json
    tools.json
  memory/
    seed/
      wiki/
        index.md
        log.md
        entities/
        concepts/
        tasks/
        notes/
    schema/
      AGENTS.md
  assets/
  tools/
  docs/
```

Not every directory is required, but the layout should be stable enough that validators and tooling can reason about it.

## 3. Required package files

### `manifest.json`

This is the package entry point and must exist.

It should be the authoritative structured description of:

- package schema version;
- template identity;
- compatibility range;
- entry files;
- runtime tool-catalog path;
- package class;
- package metadata;
- declared mutable surfaces.

### `runtime/capabilities.json`

This should exist for any package that exposes structured capabilities to routing or validation.

It must not be replaced by prose-only prompt claims.

### `runtime/tools.json`

This should exist for any package that exposes structured tool definitions to
the internal agent engine.

Even when the catalog is empty, the file should still exist so scaffolding,
validation, and runtime loading can rely on an explicit package contract.

### `prompts/system.md`

This should exist for most packages intended to run as agentic nodes.

If a package intentionally omits it, the validator should require an explicit alternative entry point.

## 4. Optional but strongly recommended files

### Identity markdown

These files are optional individually, but strongly recommended:

- `identity/profile.md`
- `identity/role.md`
- `identity/skills.md`
- `identity/duties.md`
- `identity/obligations.md`

They give the runner clear, separable prompt material rather than forcing one giant system prompt file.

### `prompts/interaction.md`

Recommended for:

- communication style;
- structured output conventions;
- collaboration behavior.

### `prompts/safety.md`

Recommended for:

- local safety bounds;
- refusal or escalation rules;
- approval-sensitive behavior.

### `runtime/config.json`

Recommended for package-local runtime defaults such as:

- engine adapter hints;
- tool configuration defaults;
- memory policy defaults;
- sandbox expectations.

### `memory/schema/AGENTS.md`

Recommended as the schema and maintenance guide for package-local wiki behavior.

This should explain:

- wiki structure;
- update rules;
- logging rules;
- naming conventions.

## 5. Manifest contract

The manifest should be the first machine-read file.

Recommended fields:

| Field | Meaning |
| --- | --- |
| `agent_package_version` | Package schema version |
| `agent_template_id` | Stable template id |
| `name` | Human-readable package name |
| `description` | Short summary |
| `compatible_entangle_version` | Compatibility constraint |
| `package_kind` | `template`, later others if needed |
| `entry_files` | Canonical package entry points |
| `default_capabilities` | Declared capabilities |
| `mutable_surfaces` | Which directories are expected to mutate after instantiation |
| `seed_memory_policy` | How seed memory should be treated |
| `tooling_profile` | Optional runtime tooling metadata |

### Entry file rules

`entry_files` should use relative paths from the package root.

Recommended entries:

- `system_prompt`
- `interaction_prompt`
- `safety_prompt`
- `capabilities`
- `runtime_config`
- `memory_schema`

The validator should allow omissions only when explicitly justified by package kind.

## 6. Seed memory model

Package-local memory must distinguish between:

- seed memory shipped with the package;
- live instance memory;
- runtime caches.

### Seed memory

Seed memory is package content intended to be copied or initialized into a new node workspace.

Examples:

- starter wiki index;
- baseline concept pages;
- package-local maintenance instructions.

### Live instance memory

This is mutable instance state and must not be committed back into the package template by default.

Examples:

- node-specific wiki updates;
- interaction logs;
- task traces;
- local knowledge accumulation.

### Runtime caches

These are ephemeral and should be treated as disposable implementation state.

Examples:

- retrieval caches;
- temporary prompt assembly;
- transient execution scratch space.

## 7. Mutable surface declaration

The package should explicitly declare which paths are expected to mutate once instantiated.

Recommended mutable surfaces:

- `memory/instance/`
- `workspace/`
- `runtime/state/`

The template package should not rely on ad hoc mutation in arbitrary paths.

## 8. Runtime-bound workspace layout

A running node workspace should have a clear distinction between package content and runtime-injected state.

Recommended runtime workspace layout:

```text
workspaces/
  <node_id>/
    package/                 # package copy or read-only mount
    injected/
      node-instance.json
      effective-binding.json
      graph-context.json
      peers.json
      policies.json
      relay-context.json
      artifact-context.json
      model-context.json
      approval-context.json
    memory/
      wiki/
      logs/
    workspace/
      git/
      files/
    source/
      # coding-engine worktree
    engine-state/
      # node-scoped engine database, config, cache, and state
    retrieval/
      # runner-owned inbound artifact cache
    wiki-repository/
      # reserved for future memory-as-repository migration
    runtime/
      state.json
      sessions/
      conversations/
      cache/
```

This structure may be implemented differently later, but the logical boundaries should remain.

## 9. Binding model

Binding is the process that turns a package into a graph-local runnable node.

Binding should combine:

- one package source;
- one node instance;
- one graph context;
- one deployment profile;
- one secret set;
- one runtime environment profile.

### Inputs to binding

Minimum inputs:

- `AgentPackage`
- `NodeInstance`
- relevant `GraphSpec`
- relevant edge-derived runtime projection inputs
- deployment profile
- secret references

### Outputs of binding

Minimum outputs:

- runtime-bound workspace;
- derived runtime projection files;
- resolved tool and artifact backend mounts;
- effective relay configuration;
- effective model endpoint configuration;
- effective approval configuration.

## 10. Package source descriptor

The system should support multiple package origins conceptually, even if the hackathon implements only local paths.

Recommended source kinds:

- `local_path`
- `local_archive`
- `registry_ref`
- `remote_ref`

### Hackathon subset

Implement:

- `local_path`
- optionally `local_archive`

Do not distort the model by pretending those are the only valid source kinds.

## 11. Secret binding model

Secrets must not live inside the template package.

Secret binding should be expressed as:

- runtime secret references in deployment config;
- environment variables;
- mounted files;
- local secret-store references.

Examples:

- Nostr private key;
- git transport credentials;
- optional git signing credentials;
- model provider tokens;
- future storage credentials.

### Secret boundary rule

Secret binding must not assume that one secret is reused across unrelated
system boundaries.

In particular:

- the Nostr private key is for Entangle protocol identity and event signing;
- git transport credentials are separate secrets;
- git commit signing keys, if enabled, are separate signing material;
- git author or committer metadata is configuration, not secret auth material.

The system should reject "one keypair for everything" assumptions during
binding design.

## 12. Runtime-injected files

The runner should inject structured files into the runtime workspace instead of baking all graph-local knowledge into prompt prose.

Recommended injected files:

- `node-instance.json`
- `effective-binding.json`
- `graph-context.json`
- `peers.json`
- `policies.json`
- `relay-context.json`
- `artifact-context.json`
- `model-context.json`
- `approval-context.json`

These files should be considered derived, not hand-authored package truth.

## 13. Package import and export

Package portability matters only if import and export are disciplined.

### Export rules

Package export should include:

- portable template content;
- manifest;
- prompt and identity material;
- declared seed memory;
- capability declarations;
- optional docs and assets.

Package export should not include by default:

- live secrets;
- runtime-injected files;
- local graph bindings;
- mutable instance memory;
- execution caches.

### Import rules

Package import should:

- validate manifest and entry files;
- validate compatibility range;
- validate path safety;
- materialize a local package source record.

## 14. Package upgrade rules

Upgrading a package template must not silently destroy node-local memory or workspace state.

The system should distinguish:

- template upgrade;
- binding refresh;
- runtime state migration.

These are related but separate operations.

## 15. Validation expectations

Package validation should verify:

- manifest existence and correctness;
- required entry files;
- path safety;
- capability declaration coherence;
- seed-memory policy correctness;
- absence of embedded secrets;
- consistency between declared mutable surfaces and actual layout.

## 16. Rejected anti-patterns

The package model should explicitly reject:

- putting graph-canonical edges inside the package as source of truth;
- shipping live private keys in the package;
- mixing seed memory and live memory without declaration;
- using prompt prose as the only capability declaration;
- allowing runtime-injected files to masquerade as package template truth.

## 17. Hackathon profile

The hackathon implementation may keep the binding system simple:

- local package path only;
- one package workspace per active node;
- one injected runtime projection shape;
- one seed-memory policy;
- no remote fetch.

It must still preserve the boundaries above so later package registries, remote node attachment, and stronger migration behavior can be added without changing the conceptual model.
