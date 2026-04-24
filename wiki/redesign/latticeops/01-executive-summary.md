# Executive Summary

## Original Project Overview

Entangle is a graph-native runtime for AI organizations. The repository defines a serious product direction rather than a shallow chatbot wrapper: users and agents are first-class graph nodes, edges define authority and communication relationships, messages coordinate work, artifacts carry durable work product, and runners execute per active node under host control.

Fact from the repository: the monorepo is organized around TypeScript packages and services. The central modules are `packages/types`, `packages/validator`, `packages/host-client`, `packages/agent-engine`, `packages/package-scaffold`, `services/host`, `services/runner`, `apps/cli`, `apps/studio`, and `deploy`.

Fact from the documentation: the intended runtime includes a host control-plane service, one runner per active node, Nostr-signed coordination messages, artifact backends, Studio as graph-aware visual control client, and a CLI-capable headless surface over the same host boundary.

## Identified Problem

The current project addresses a real problem: organizations need a governed way to compose, run, inspect, and audit teams of AI agents that work across tools and artifacts under human authority.

The deeper problem is not simply multi-agent orchestration. It is operational governance for AI workforces:

- Who or what is allowed to act.
- Which tools, models, memory, and artifacts each actor can access.
- How work is delegated and verified.
- How humans remain in the loop without becoming the bottleneck.
- How results, decisions, costs, and incidents remain auditable.

## Current Strengths

Entangle has strong conceptual architecture:

- Graph-native topology instead of a single orchestrator-centric workflow.
- Explicit separation between `AgentPackage`, `NodeInstance`, `Edge`, `GraphSpec`, runtime resources, and protocol contracts.
- Artifact-first work handoff rather than transient chat-only output.
- Typed shared schemas using Zod.
- A host and runner boundary that can mature into a production control plane.
- CLI and Studio surfaces that target the same host API.
- Tests for schema, validation, host, runner, and client behavior.

## Current Limitations

The current implementation is a credible early runtime baseline but not production-grade yet:

- The host API has no visible authentication or RBAC boundary.
- Runtime state is stored as local JSON files under `.entangle`, not a transactional database.
- Studio is a large single-page component with no authentication or route model.
- Production observability is not present: no OpenTelemetry, metrics, trace system, or centralized logs.
- Nostr is used for signed coordination, but edge-policy enforcement in the runner appears incomplete.
- Docker socket mounting is appropriate for local development but unsafe as a production default.
- Git artifacts are the first artifact backend, but artifact workflow coverage remains narrow.
- The system lacks multi-tenancy, organization management, billing, enterprise identity, and compliance features.

## Redesigned Product Vision

The redesigned product is named **LatticeOps**.

LatticeOps is an enterprise AI operations platform for designing, governing, executing, and auditing teams of human and AI workers. It keeps the best Entangle ideas: graph-native organizations, human-first control, artifact-based work, typed contracts, and one execution boundary per active worker. It rebuilds the rest as a production SaaS and self-hostable platform with security, observability, policy, multi-tenancy, and workflow durability from day one.

## Why The Redesign Is Superior

LatticeOps is superior because it turns Entangle's architectural promise into an operational product:

- It keeps graph-native agent topology but adds enterprise identity, roles, policy, approvals, audit, and tenancy.
- It moves from local JSON state to PostgreSQL-backed durable state with event logs and migrations.
- It moves from local-only host control to authenticated APIs with OpenAPI contracts and policy enforcement.
- It treats Nostr as an optional federation or signed-message adapter, not the only internal transport.
- It introduces durable execution using a workflow engine while preserving graph semantics.
- It introduces a model and tool gateway for provider routing, secrets, spend controls, and safety policy.
- It introduces full observability: traces, metrics, logs, live event replay, and cost telemetry.
- It turns Studio from a local visual client into a complete operations console.

## Decision Summary

| Area | Current Entangle | LatticeOps Redesign |
| --- | --- | --- |
| Product shape | Local-first AI organization runtime | Enterprise AI operations platform |
| Control plane | Fastify host with filesystem state | Authenticated multi-tenant API and control plane |
| Execution | Runner per node, Docker/memory backends | Sandboxed executor pods and durable session orchestration |
| Transport | Nostr relay-centric coordination | Internal event bus plus signed envelopes and optional Nostr adapter |
| Artifacts | Git-first artifact backend | Pluggable artifact workspaces over object storage, Git, code hosts, docs, and tickets |
| UI | Studio single-page visual client | Full operations console with graph, sessions, artifacts, approvals, traces, admin |
| Security | Local trusted boundary | Enterprise auth, RBAC/ABAC, secret vault, audit, sandboxing, compliance controls |
| Observability | Logs and host events | OpenTelemetry, metrics, traces, replay, cost, policy, and incident signals |
