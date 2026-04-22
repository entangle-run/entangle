# Client Surfaces and Headless Operation

This document defines how Entangle should be used across multiple client
surfaces without creating multiple competing control planes.

The goal is to keep the architecture clean enough that:

- the system can be operated with a rich frontend;
- the system can be operated without a frontend;
- the same underlying rules and control-plane behavior apply in both cases.

## Design rule

Entangle should be headless-capable by architecture, not by afterthought.

That means:

- the control plane must exist independently of Studio;
- Studio must be one client of that control plane, not its hidden implementation;
- CLI and future automation clients should use the same bounded host surfaces.

## 1. Surface taxonomy

The first serious product should recognize at least these surfaces.

### Studio

The visual graph-aware operator and user interface.

Best for:

- graph comprehension;
- runtime trace inspection;
- visual node and edge inspection;
- convenient admission, mutation, and lifecycle operations;
- demo quality and operational clarity.

### CLI

A headless operator and developer surface.

Best for:

- scripted workflows;
- automation;
- remote SSH usage;
- CI and local development;
- environments where no browser UI is desired.

### File workflow

A direct authoring surface over package and graph files.

Best for:

- package creation and editing;
- prompt and memory schema authoring;
- review in git;
- low-level inspection and bulk editing.

### Future automation clients

Examples:

- test harnesses;
- orchestration scripts;
- remote operator tools;
- future web or desktop surfaces other than Studio.

## 2. Core boundary rule

No client surface should become a privileged bypass around the host control
plane for runtime-affecting operations.

That means:

- Studio should not own runtime orchestration directly;
- CLI should not use secret internal shortcuts for graph mutation or runtime lifecycle;
- automation should not silently mutate applied graph truth outside the same bounded rules.

Runtime-affecting operations should flow through the host.

## 3. What may bypass the host

Not every action needs the host.

Safe direct operations include:

- editing package files;
- editing graph source files before apply;
- running pure validators against files;
- generating scaffolding or package templates;
- linting or formatting repository content.

Unsafe direct operations include:

- mutating the applied graph revision behind the host's back;
- starting or stopping live node runtimes outside the host's knowledge;
- changing active node bindings without control-plane traceability.

## 4. Recommended client model

The preferred architecture is:

- `entangle-host` owns applied local state;
- `entangle-studio` talks to the host for runtime-affecting operations;
- `entangle-cli` talks to the host for runtime-affecting operations;
- `entangle-validator` remains usable directly on files without the host;
- file workflows remain first-class for package authoring and review.

## 5. CLI role

The CLI should be treated as a first-class product surface, not as a debug
afterthought.

Recommended conceptual scope:

- inspect applied graph state;
- list nodes, edges, revisions, and runtime health;
- admit local packages as nodes;
- create, update, enable, disable, or remove edges through bounded flows;
- start, stop, restart, or remove node runtimes;
- launch sessions from a user node;
- tail trace and runtime events;
- run validators on source files or applied configs.

## 6. Offline versus online CLI behavior

The CLI should support two modes conceptually.

### Offline mode

Operates on files and schemas only.

Examples:

- validate a package folder;
- validate a graph file;
- generate a package template;
- inspect a manifest.

### Online mode

Operates against a running host.

Examples:

- admit a node into the active graph;
- apply an edge mutation;
- start or stop a node runtime;
- watch live runtime events.

These should be visibly different modes so the operator understands whether they
are editing source or operating the live system.

## 7. Host API implications

Because both Studio and CLI should be first-class, the host API should be:

- explicit;
- stable enough to build against;
- not tightly coupled to one UI;
- suitable for both interactive and scripted use.

The API should expose at least:

- graph inspection;
- node admission and removal;
- edge mutation;
- revision apply or selection;
- runtime lifecycle control;
- validation results;
- trace and health subscription.

## 8. Recommended package and executable split

The first serious implementation should likely separate:

- `entangle-host`
- `entangle-studio`
- `entangle-cli`
- `entangle-runner`
- `entangle-types`
- `entangle-validator`
- optionally a shared `entangle-host-client` package for host API bindings

This keeps:

- runtime logic out of the frontend;
- control-plane logic out of the CLI shell layer;
- schema logic shareable across all surfaces.

## 9. Product stance

The visual frontend should be the best experience for comprehension and
operability.

But the product should never require the frontend to be the only serious way to
use Entangle.

That would make:

- automation weaker;
- remote operator workflows worse;
- testing harder;
- architecture more coupled to one presentation layer.

## 10. Hackathon profile

The hackathon implementation does not need a full CLI if that would dilute
delivery.

But the architecture should already preserve the possibility cleanly.

Recommended hackathon stance:

- implement `entangle-host` first as the real control-plane boundary;
- let Studio talk to the host;
- optionally provide a very small CLI or admin script for host inspection;
- avoid building anything in Studio that would later have to be extracted into the host.

## 11. Rejected anti-patterns

Reject these directions:

- frontend-only control plane;
- CLI-only hidden powers that Studio cannot express;
- separate mutation logic duplicated in Studio and CLI;
- runtime lifecycle managed by ad hoc shell scripts outside the host model;
- treating headless operation as a future patch instead of a present architectural constraint.
