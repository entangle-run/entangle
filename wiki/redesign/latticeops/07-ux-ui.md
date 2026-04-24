# UX UI Design Specification

## UX Goal

LatticeOps should feel like an operations console for serious AI work: dense, readable, calm, and fast. It should not feel like a landing page, a chatbot skin, or a decorative graph toy. The interface must help users understand state, authority, risk, and next action.

## Information Architecture

Primary navigation:

- Overview
- Sessions
- Graphs
- Packages
- Artifacts
- Approvals
- Observability
- Integrations
- Analytics
- Admin

Secondary context controls:

- Workspace switcher.
- Environment switcher: development, staging, production.
- Global search.
- Notification center.
- User and role menu.

## Navigation Model

Use a persistent left navigation for major areas and a top bar for workspace, environment, search, and notifications. Detail pages use tabbed subnavigation for related views.

Example graph detail tabs:

- Canvas
- Nodes
- Edges
- Resources
- Policies
- Revisions
- Runs
- Validation

Example session detail tabs:

- Timeline
- Graph Path
- Artifacts
- Messages
- Approvals
- Trace
- Cost
- Logs

## Main Screens

### Overview

Purpose: show the operational health of the workspace.

Content:

- Active sessions.
- Failed or degraded runtimes.
- Pending approvals.
- Cost burn against budget.
- Recent artifacts.
- Incidents and policy violations.

### Sessions

Purpose: manage work in flight and completed runs.

Content:

- Filterable session table.
- Status, graph, initiator, cost, risk, approvals, runtime state, and output count.
- Launch session action.
- Saved views for operators, reviewers, and auditors.

### Session Detail

Purpose: provide complete evidence for a single work execution.

Content:

- Header with status, graph revision, initiator, target, budget, and timestamps.
- Timeline of model calls, tool calls, messages, approvals, artifacts, and errors.
- Artifact panel.
- Trace and log tabs.
- Cancel, retry, replay, approve, reject, export actions based on permission.

### Graphs

Purpose: design and govern AI organizations.

Content:

- Graph list with environment and publish status.
- Graph canvas for topology.
- Side inspector for selected node or edge.
- Validation drawer.
- Revision diff view.

### Packages

Purpose: manage reusable worker definitions.

Content:

- Registry table.
- Package detail with versions, manifest, required resources, scans, tests, and changelog.
- Promotion workflow between environments.

### Artifacts

Purpose: review durable outputs and lineage.

Content:

- Artifact library.
- Preview and diff panels.
- Version history.
- Lineage graph.
- Publication records.

### Approvals

Purpose: keep human decision work efficient.

Content:

- Approval inbox.
- Risk reason and required evidence.
- Inline artifact preview.
- Decision actions with comment requirement.

### Observability

Purpose: diagnose runtime and quality issues.

Content:

- Runtime health.
- Event stream.
- Distributed traces.
- Logs.
- Model/tool gateway status.
- Replay tools.

### Admin

Purpose: configure identity, policy, secrets, billing, integrations, and retention.

Content:

- Members and roles.
- SSO and SCIM.
- Security policies.
- Secrets and providers.
- Audit exports.
- Billing and usage.

## User Flows

### Onboarding To First Run

1. Create workspace.
2. Connect identity provider or invite team members.
3. Add model provider secret.
4. Install starter agent package.
5. Create graph from template.
6. Bind required resources.
7. Validate graph.
8. Launch sample session.
9. Review artifact and trace.
10. Publish graph to staging.

### Builder Publishes Package

1. Create package from template or import Git repo.
2. Define tools, resources, memory scope, input schema, output schema, and tests.
3. Run validation and package tests.
4. Submit for approval.
5. Admin approves source and version.
6. Package appears as instantiable graph node.

### Reviewer Handles Approval

1. Receive notification.
2. Open approval detail.
3. Inspect reason, requested action, artifacts, trace, and risk context.
4. Approve, reject, request changes, or escalate.
5. Decision is recorded in session timeline and audit log.

### Auditor Investigates Incident

1. Search by artifact, user, graph, model, or date.
2. Open session trace.
3. Review graph revision and effective policies.
4. Inspect model/tool calls and approval decisions.
5. Export evidence package.

## Empty States

- No sessions: show a launch action and link to graph templates.
- No graphs: offer template gallery and import option.
- No packages: offer starter package and package import.
- No integrations: show recommended setup by use case.
- No approvals: show filters and recent completed decisions.

Empty states should be operationally useful, not marketing copy.

## Loading States

- Use skeleton rows for tables.
- Preserve layout dimensions while graph and trace data load.
- Show background refresh indicators without blocking read access to stale data.
- Clearly label stale data when refresh fails.

## Error States

- Validation errors must identify the exact package, graph, node, edge, binding, or policy field.
- Runtime errors should include cause, impact, retry policy, and recommended next action.
- Permission errors should identify the missing permission without exposing restricted data.
- Provider errors should distinguish user configuration, provider outage, rate limit, and policy denial.

## Accessibility

Requirements:

- WCAG 2.2 AA target.
- Keyboard accessible graph navigation and node inspector.
- Non-color-only status indicators.
- Proper focus management in modals and drawers.
- Reduced motion support.
- Screen-reader labels for icons and controls.
- Sufficient contrast in all themes.

## Responsive Design

Desktop is primary for graph and operations work, but mobile should support review and monitoring workflows.

Desktop:

- Full navigation, graph canvas, side panels, trace timeline.

Tablet:

- Collapsible navigation, single side panel, simplified graph controls.

Mobile:

- Approval inbox, session status, artifact review, notifications, and incident triage.
- Graph editing is read-only or simplified.

## Design System

Core components:

- App shell.
- Data table with saved views.
- Graph canvas and node/edge inspector.
- Timeline.
- Trace span viewer.
- Artifact preview and diff.
- Approval panel.
- Policy editor.
- Status badges.
- Resource binding selector.
- Environment switcher.
- Command search.
- Notification center.

Visual style:

- Neutral professional palette with restrained accent colors for status and selection.
- Compact spacing for operations screens.
- 8px or smaller card radius unless component semantics require otherwise.
- Icons for tool buttons with tooltips.
- Tables and split panes for dense operational data.

Design tokens:

- Color tokens for background, surface, border, text, accent, success, warning, danger, info, muted.
- Type scale optimized for dashboard readability.
- Spacing scale based on 4px increments.
- Component states for hover, focus, selected, disabled, loading, error.

## UX Metrics

- Time to first successful session.
- Time to diagnose failed runtime.
- Approval decision latency.
- Artifact acceptance rate.
- Session completion rate.
- Search success rate.
- Graph validation error resolution time.
