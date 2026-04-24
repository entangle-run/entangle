# Product Understanding

## Product Perspective Extracted From The Repository

Entangle is aimed at users who need to define, run, inspect, and control teams of AI agents as a persistent organization rather than invoke a single chatbot. The repository embeds a product assumption that AI work should be modeled as a graph of accountable actors, relationships, resources, and artifacts.

## Target Users And Personas

### AI Operations Lead

Owns the deployment and reliability of AI agent teams. Needs visibility into graph topology, runtime state, failures, costs, and safety events.

### Engineering Lead

Defines agent packages, resource bindings, artifact backends, and execution boundaries. Needs reproducible configuration, validation, CI workflows, and rollback.

### Product Or Business Operator

Delegates real work to AI agents and reviews outputs. Needs a visual interface, approval gates, artifact visibility, and confidence in what happened.

### Security And Compliance Reviewer

Needs to understand who acted, which data was accessed, which models were called, what tools ran, and whether policy was followed.

### Platform Administrator

Configures resources, model endpoints, secrets, runners, graph revisions, package sources, and deployment settings.

## User Problems And Needs

The repository addresses these user needs:

- Compose AI teams as durable structures instead of ad hoc prompts.
- Delegate work with explicit authority relationships.
- Inspect and manage runtime state.
- Separate portable agent packages from environment-specific runtime bindings.
- Track artifacts as the durable work product.
- Run locally and headlessly through CLI as well as visually through Studio.
- Preserve a record of sessions, turns, memory, and artifact activity.

## Jobs To Be Done

1. When I design an AI team, I want to define members, roles, permissions, and relationships so that work follows a known operating model.
2. When I deploy an agent, I want its model, tools, transport, memory, and artifact access bound explicitly so that behavior is reproducible and auditable.
3. When an agent performs work, I want to see messages, artifacts, decisions, and failures so that I can trust and debug the outcome.
4. When a system changes, I want validation to catch invalid graph, resource, or package state before production work is affected.
5. When a human delegates work, I want the agent's outputs to be captured as artifacts that can be reviewed, reused, or handed to another worker.

## Core Use Cases

- Create an agent package.
- Admit a package into the host catalog.
- Define a graph with user and agent nodes.
- Bind node instances to model, transport, memory, and artifact resources.
- Start and stop runtimes.
- Launch or inspect sessions.
- Observe runtime events and failures.
- Exchange signed coordination messages.
- Produce and retrieve git-backed artifacts.
- Inspect focused memory and session state.

## User Journeys

### Journey 1: Define And Run A Worker

1. Engineer scaffolds an agent package with the CLI.
2. Engineer defines required resources and validates the package.
3. Operator admits the package into the host.
4. Operator creates a node from the package in Studio.
5. Operator binds model, transport, memory, and artifact resources.
6. Operator starts runtime.
7. Host reconciles desired state and launches runner.
8. Studio shows observed state and events.

### Journey 2: Delegate Work And Review Artifacts

1. User submits a task to a graph node.
2. Runner receives a validated message.
3. Runner uses model and tools to produce work.
4. Artifact backend materializes output.
5. Session records store turn, artifact, and memory changes.
6. User reviews result through Studio or CLI.

### Journey 3: Diagnose Runtime Failure

1. Studio shows a runtime in degraded state.
2. Operator inspects reconciliation findings.
3. Operator finds missing resource binding or credential.
4. Operator updates catalog or node binding.
5. Operator retries runtime start.
6. Host records state transition and event history.

## Product Assumptions Embedded In The System

Fact-backed assumptions:

- Graph topology is a better primitive than a linear workflow for AI organizations.
- Users should be represented as graph nodes, not only as external requesters.
- Messages coordinate work; artifacts are the real work substrate.
- Agent packages should be portable and environment bindings should remain host-local.
- Runtime identity should be provisioned by the host, not shipped inside packages.
- CLI and visual surfaces should operate over the same host boundary.

Interpretations:

- The product is optimized for technically sophisticated early users.
- The initial market is likely AI infrastructure builders, internal platform teams, and agentic workflow developers.
- The intended long-term direction is closer to an AI operations platform than a developer library.

## Implicit Product Decisions

- Nostr is selected as the coordination transport foundation, likely for signed, decentralized message semantics.
- Git is selected as the first artifact backend, implying code and document workflows are important.
- Studio is graph-aware, implying topology visualization is core product value.
- Runtime reconciliation is explicit, implying operational reliability matters.
- Resource catalogs are separate from packages, implying deployment portability and environment separation are core.

## Competitors And Alternatives

The product space overlaps with several categories:

- Agent orchestration frameworks such as LangGraph and Microsoft Agent Framework.
- Agent workforce and automation platforms such as CrewAI AMP.
- General automation and AI workflow tools such as n8n and Zapier agents.
- Model provider agent SDKs such as OpenAI Agents SDK.
- Internal platform engineering solutions built on Kubernetes, Temporal, queues, and custom policy systems.

Entangle's differentiator is graph-native organizational modeling plus artifact-first execution. Most alternatives emphasize workflows, chains, crews, or developer SDKs rather than a persistent graph of accountable human and AI nodes.

## Gaps And Missed Opportunities

### Product Gaps

- No organization, workspace, or tenant concept.
- No user account, role, team, or permission model.
- No approval gates for sensitive actions.
- No operational dashboards or SLOs.
- No cost visibility.
- No first-class task intake UX despite runtime/session primitives.
- No marketplace or package governance workflow.
- No integration catalog beyond core local services.

### UX Gaps

- Studio is an operations prototype, not a complete product console.
- Complex concepts are visible but not organized around user workflows.
- There is no guided onboarding from empty workspace to first successful graph run.
- There are no role-specific views for operator, builder, reviewer, and admin.

### Commercial Gaps

- No packaging around business value, pricing, retention, support, or enterprise compliance.
- No clear path from local development to production deployment.
- No managed cloud offering or self-host enterprise story.

## Opportunity

The strongest opportunity is to reposition the idea as an AI operations platform for governed agent teams. The product should help enterprises move from experiments to production by combining graph composition, runtime execution, artifact governance, human approvals, observability, and compliance.
