# Local Deployment Topology and Compose Specification

This document defines the first serious local deployment topology for Entangle.

The goal is to make the hackathon and early-product runtime reproducible
without letting the deployment profile hardcode the long-term architecture.

The corresponding on-disk host-state contract is specified in
[42-host-state-layout-and-persistence-spec.md](42-host-state-layout-and-persistence-spec.md).

## Design rule

The local deployment should make the real architecture visible:

- stable shared services are booted explicitly;
- the host owns dynamic runtime creation;
- runner instances are not static compose entries;
- deployment defaults remain profiles, not architecture truth.

## 1. Stable shared services

The first serious local deployment should start these services through
`docker-compose` or an equivalent Compose implementation:

- `studio`
- `host`
- `strfry`
- `gitea`

These are stable enough to justify static service definitions.

## 2. Dynamic runtime services

Per-node runners should be created dynamically by `entangle-host`, not modeled
as a fixed list in the Compose file.

Reasons:

- nodes are admitted dynamically;
- graph shape changes during development;
- package sources and bindings vary per node;
- static runner service declarations create drift between graph truth and
  deployment truth.

## 3. Compose responsibilities

The Compose layer should own:

- shared networks;
- stable service containers;
- persistent service volumes;
- baseline environment wiring;
- local operator convenience.

The Compose layer should not own:

- graph truth;
- per-node runner truth;
- node binding logic;
- dynamic runtime lifecycle.

## 4. Recommended service roles

### `studio`

- visual operator and graph surface;
- talks to `host`;
- does not own runtime lifecycle.

### `host`

- local control plane;
- owns deployment resource catalog;
- owns graph apply and reconciliation;
- creates and removes runner containers;
- exposes HTTP and WebSocket control surfaces.

### `strfry`

- primary relay service for the local profile;
- referenced by the deployment resource catalog as a relay profile.

### `gitea`

- primary git service for the local profile;
- referenced by the deployment resource catalog as a git service profile.

## 4.1 Host runtime-backend access

For the local Docker-backed profile, `entangle-host` must be able to create and
inspect runner containers dynamically.

Recommended first serious stance:

- run `entangle-host` inside the Compose stack;
- grant it access to the local Docker Engine through an explicit operator-owned
  control path such as the Docker socket;
- treat this as acceptable because the host API is already a trusted local
  operator boundary, not a public multi-tenant surface.

This is a local deployment choice, not a universal product requirement.

## 5. Recommended Docker networking stance

Use one internal Docker network for the core deployment.

Stable services and host-managed runners should join that network so that:

- runners can reach relay and git services via service names or stable aliases;
- Studio can reach the host cleanly;
- the host can talk to runtime instances and infrastructure consistently.

External port exposure should be minimal and operator-oriented.

## 6. Recommended persistent volumes

The first serious deployment should use named persistent volumes for at least:

- `gitea` data;
- `strfry` data;
- host state;
- host-managed node workspaces when they should survive container restart.

Host state should include at least:

- desired-state and observed-state snapshots;
- structured session and control-plane trace logs;
- package-source and binding metadata;
- reconciliation metadata useful for recovery and inspection.

Node workspaces may also be materialized under host-managed bind mounts if that
improves inspectability during the hackathon.

The important rule is:

- package sources remain separate from mutable node workspaces.
- host-managed runner containers should see a stable shared-state mount instead
  of backend-specific path guesses.

## 7. Host-managed runner materialization

When the host creates a runner container, it should mount:

- a shared host-state root at a stable container-visible path;
- a materialized package snapshot inside that shared state;
- injected runtime context as writable host-managed materialization;
- node memory/wiki as writable persistent storage;
- node artifact workspace as writable persistent storage;
- secret mounts or env vars as separate secret surfaces.

This is the deployment counterpart to the package and effective-binding model.

## 8. Catalog bootstrap

The local deployment should bootstrap a default deployment resource catalog that
points to the local stable services.

Example conceptual defaults:

- relay profile `local-relay` -> `strfry`
- git service `local-gitea` -> `gitea`
- model profile `shared-claude` -> chosen hackathon endpoint

These are deployment defaults, not hardcoded runner constants.

## 9. Service startup and health

The local deployment should treat readiness explicitly.

The host should not assume that:

- relay is ready immediately;
- git service is ready immediately;
- Studio should accept mutations before the host is ready.

Recommended approach:

- stable service health checks in Compose where practical;
- host-level startup checks for catalog dependencies;
- clear degraded status when infrastructure is unavailable.

## 10. Secret delivery stance

Secrets should not be committed into Compose files.

Recommended first approach:

- local env files excluded from version control;
- host-level secret loading;
- runner-level secret injection through the host.

Compose may provide the host with the means to resolve secrets, but should not
be the final secret truth for every node.

## 11. Hackathon profile

The hackathon should use:

- one Compose stack;
- one relay profile backed by local `strfry`;
- one git service profile backed by local `gitea`;
- one shared model endpoint profile;
- host access to the local Docker runtime for dynamic runner management;
- dynamic runner containers created by the host;
- an explicit shared-state mount and explicit Docker network for host-managed
  runners;
- no remote-host federation.

This gives the cleanest demo while remaining faithful to the architecture.

## 12. What should stay outside the main product runtime

The following may exist as convenience tooling under `deploy/`, but should not
become hidden architecture:

- bootstrap scripts for local `gitea` setup;
- bootstrap scripts for creating demo repositories, orgs, users, SSH keys, or
  API tokens in the local git service;
- bootstrap scripts for default relay and git profiles;
- demo data seeding;
- local dev environment helpers.

These are deployment helpers, not replacements for host control-plane logic.

## 13. Rejected anti-patterns

Reject these directions:

- one static Compose service per potential node;
- Compose as the source of graph truth;
- hardcoded runtime endpoints inside runner code;
- using local infrastructure defaults as if they were permanent product
  contracts;
- hiding critical deployment logic in undocumented shell scripts.
