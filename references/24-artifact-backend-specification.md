# Artifact Backend Specification

This document defines the artifact backend model for Entangle, with `git` as the first serious implementation backend and `wiki` plus local files as supporting backends.

The goal is to make artifact production, retrieval, handoff, and provenance concrete.

## Design rule

Artifacts are first-class durable work products.

They must not be treated as:

- incidental side effects;
- vague references in free text;
- transient runner internals.

Every serious work handoff should be representable as an `ArtifactRef`.

## 1. Backend abstraction

Entangle should treat artifact storage through a backend abstraction.

Initial canonical backends:

- `git`
- `wiki`
- `local_file`

Future backends may include:

- object stores;
- issue trackers;
- structured data stores;
- package registries.

## 2. Common artifact requirements

Every artifact backend must support, either directly or through adapter logic:

- creation;
- reference publication;
- retrieval by authorized participants;
- provenance attribution;
- session linkage;
- optional task or conversation linkage;
- lifecycle state transitions.

## 3. Canonical ArtifactRef semantics

`ArtifactRef` should be understood as:

- backend type;
- locator sufficient for retrieval;
- provenance metadata;
- lifecycle-relevant metadata.

Recommended expanded fields:

| Field | Meaning |
| --- | --- |
| `artifact_id` | Stable artifact id |
| `backend` | Backend kind |
| `locator` | Backend-specific retrieval address |
| `created_by_node_id` | Creating node |
| `session_id` | Session association |
| `task_id` | Optional task association |
| `conversation_id` | Optional conversation association |
| `artifact_kind` | Semantic category such as `patch`, `report`, `wiki_page`, `commit`, `workspace_snapshot` |
| `status` | Artifact lifecycle state |
| `content_summary` | Short human-readable summary |

## 4. Git backend

`git` should be the first fully implemented backend because it is the best immediate substrate for shared coding work.

### Git artifact kinds

Recommended initial git artifact kinds:

- `commit`
- `branch`
- `patch`
- `worktree_state`
- `report_file`

### Minimum git locator

A git locator should contain enough information for independent retrieval by an authorized node.

Recommended fields:

| Field | Meaning |
| --- | --- |
| `remote` | Remote identity or URL alias |
| `repo` | Repository identity |
| `branch` | Branch name when relevant |
| `commit` | Commit hash when relevant |
| `path` | Optional file path |
| `base_commit` | Optional merge/review base |

### Git handoff patterns

The first serious version should support at least these patterns.

#### Branch handoff

Node A creates or updates a branch and sends a reference to node B.

Useful for:

- implementation work;
- follow-up edits;
- review requests.

#### Commit handoff

Node A publishes a specific commit as the work product.

Useful for:

- deterministic review;
- small bounded units of work.

#### Patch handoff

Node A publishes a patch file or diff artifact rather than a pushed branch.

Useful for:

- narrow review;
- constrained environments;
- partial portability.

### Git ownership expectations

The node that created the branch or commit is the artifact creator.

Subsequent nodes may:

- build on top of it;
- supersede it;
- annotate it through other artifacts;
- reject or review it.

They must not silently erase provenance.

### Git branch naming

The naming convention should be deterministic enough for tooling, but not overly rigid.

Recommended pattern:

- `<node-id>/<session-id>/<task-scope>`

Examples:

- `worker-a/session-123/parser-fix`
- `reviewer-1/session-123/review-notes`

### Git backend restrictions

The first serious implementation should not depend on:

- GitHub-specific APIs;
- pull-request semantics as a core primitive;
- proprietary merge workflows.

Use a generic git server profile first.

### Git identity and credential rule

The git backend must distinguish between:

- git transport authentication;
- git API authentication when needed;
- git author/committer attribution;
- optional commit signing.

These are related, but they are not the same surface.

Entangle should keep the node's Nostr identity as the canonical internal actor
identity while binding separate git principals and secrets for the git backend.

The same raw Nostr private key should not be reused as the git transport
credential.

## 5. Wiki backend

The `wiki` backend is for durable local knowledge, structured summaries, and memory surfaces.

### Wiki artifact kinds

Recommended kinds:

- `wiki_page`
- `wiki_index_update`
- `wiki_log_entry`
- `knowledge_summary`
- `task_memory_page`

### Wiki locator

A wiki locator should identify:

- node-local memory surface;
- path or page id;
- optional revision marker.

Example:

```json
{
  "backend": "wiki",
  "locator": {
    "node_id": "reviewer-1",
    "path": "memory/wiki/tasks/session-123-review.md"
  }
}
```

### Wiki usage

The wiki backend should be used for:

- durable memory updates;
- knowledge accumulation;
- references that future prompts may consume;
- structured local notes.

It should not be treated as the main collaborative coding substrate between nodes.

## 6. Local file backend

The `local_file` backend is for bounded local artifacts not yet promoted into git or wiki surfaces.

Examples:

- generated reports;
- temporary analysis outputs;
- local execution logs;
- exported structured JSON results.

### Local file locator

The locator should identify:

- node-local workspace;
- path;
- optional content hash.

The first implementation may constrain `local_file` artifacts to the local deployment boundary.

## 7. Artifact lifecycle interpretation

Artifact lifecycle states should be interpreted as follows.

### `declared`

The runtime intends an artifact but it is not yet durably materialized.

### `materializing`

The backend operation is in progress.

### `available`

The artifact is retrievable and safe to reference in follow-up work.

### `superseded`

The artifact remains valid historically, but another artifact is now the preferred live reference.

### `unreachable`

The artifact locator no longer resolves or the backend cannot currently serve it.

## 8. Publication rules

Artifact publication should be explicit.

The runner should not assume that because a file changed locally, an artifact was published.

Publication should include:

- artifact creation or update;
- provenance capture;
- lifecycle state transition;
- emission of an `artifact.ref` or inclusion inside another protocol message when appropriate.

## 9. Retrieval rules

Artifact retrieval should depend on:

- backend support;
- node permissions;
- environment reachability;
- current runtime profile.

The system should distinguish:

- locator is valid but access is denied;
- locator is malformed;
- backend is unsupported;
- backend is unavailable;
- artifact has been superseded but still exists;
- artifact is unreachable.

## 10. Supersession rules

Supersession should be explicit, not guessed.

An artifact may supersede another when:

- a later branch or commit replaces the preferred work product;
- a later wiki page revision replaces an earlier preferred summary;
- a later report replaces an earlier draft.

The system should preserve historical provenance rather than overwriting artifact identity.

## 11. Artifact publication policy

Not every artifact should be publishable on every path.

Policy may restrict:

- backend kind;
- artifact kind;
- publication target;
- external visibility;
- whether approval is required before publication.

Examples:

- a worker may create a local file artifact but need approval before publishing a branch to the shared remote;
- a reviewer may publish a review report but not mutate the implementation branch directly.

## 12. Cross-backend relationships

Artifacts may reference each other across backends.

Examples:

- a `task.result` may contain both a git commit artifact and a wiki report artifact;
- a wiki memory page may summarize a git branch outcome;
- a local execution log may justify a git change.

The system should support multiple artifact refs per work outcome.

## 13. Git service assumptions

The canonical model should support one or more named git services in the active
deployment resource catalog.

The first serious implementation may run against:

- one shared git service for the active graph happy path;
- per-node git principals with separate credentials or host-managed service identities;
- repositories created and managed by an operator or future control-plane tooling;
- generic git operations over a service like `Gitea`.

It should not assume:

- platform-specific SaaS workflows;
- PR semantics as a hard dependency;
- internet-wide repository access.

### Retrieval compatibility rule

A git artifact handoff is valid only if the receiving node can reach the
referenced git service or another explicit replication path exists.

The system should not assume that every node can retrieve every git artifact
from every git service.

### Preferred git auth profile

Preferred first profile:

- SSH auth per node principal for normal git transport;
- separate API token only when the control plane needs git-service API access;
- optional SSH signing key for commit signing, treated as a separate signing
  surface.

Fallback profile:

- HTTPS token for constrained environments where SSH is unavailable.

## 14. Backend capability declaration

Nodes should declare which artifact backends they can:

- read;
- write;
- publish;
- reference in messages.

This is stronger than a simple list of backend names.

Future capability shape may look like:

- `git.read`
- `git.write`
- `git.publish`
- `wiki.read`
- `wiki.write`
- `local_file.write`

## 15. Validation expectations

Artifact validation should check:

- backend is supported;
- locator is sufficient;
- node is allowed to use the backend;
- graph policy allows the backend on the relevant path;
- lifecycle transition is legal.

## 16. Rejected anti-patterns

The artifact model should reject:

- treating a chat message as the durable work product when a backend artifact exists;
- emitting git references with insufficient locator data;
- overwriting provenance when an artifact is superseded;
- assuming all durable work belongs in git;
- treating node-local memory as if it were a shared git artifact.

## 17. Hackathon profile

The hackathon build should implement:

- `git` as the primary collaborative work backend;
- `wiki` as node-local durable memory;
- `local_file` for bounded local outputs when useful.

It may omit:

- cross-backend synchronization tooling;
- advanced artifact publication policies;
- remote-node artifact federation.

It should still preserve the canonical artifact abstraction so later backends can slot in cleanly.
