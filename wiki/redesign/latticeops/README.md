# LatticeOps Redesign Wiki

This folder contains a complete analysis of the Entangle repository and a production-grade redesign proposal for a new product inspired by it.

The work is split into two explicit bodies of knowledge:

- Analysis of the existing repository and product intent: documents 01 through 04 and the appendices.
- Redesign proposal for a new product: documents 05 through 18 and the diagrams.

This corpus was first generated outside the Entangle repository under `/tmp`
to satisfy the original no-modification constraint. It has since been imported
into `wiki/redesign/latticeops/` as a durable strategic redesign program while
remaining separate from the current Entangle implementation baseline.

## Index

| File | Purpose |
| --- | --- |
| [01-executive-summary.md](01-executive-summary.md) | Original overview, core problem, redesign summary, and superiority argument. |
| [02-repository-analysis.md](02-repository-analysis.md) | Evidence-based technical analysis of the current repository. |
| [03-product-understanding.md](03-product-understanding.md) | Product users, jobs, workflows, assumptions, competitors, and opportunities. |
| [04-problem-abstraction.md](04-problem-abstraction.md) | Solution-independent framing of the problem and success criteria. |
| [05-product-vision.md](05-product-vision.md) | New product vision, positioning, target market, MVP, and long-term direction. |
| [06-features.md](06-features.md) | Complete feature specification for the redesigned product. |
| [07-ux-ui.md](07-ux-ui.md) | Information architecture, navigation, screens, flows, states, and design system. |
| [08-architecture.md](08-architecture.md) | Production system architecture for the redesigned product. |
| [09-tech-stack.md](09-tech-stack.md) | Technology choices, alternatives, trade-offs, and revisit triggers. |
| [10-data-model.md](10-data-model.md) | Entities, relationships, schemas, indexes, tenancy, audit, migration, backup. |
| [11-api.md](11-api.md) | API style, endpoints, examples, auth, authorization, errors, pagination, versioning. |
| [12-implementation.md](12-implementation.md) | Phases, milestones, team structure, sprint plan, dependencies, risks, acceptance. |
| [13-quality.md](13-quality.md) | QA strategy across unit, integration, end-to-end, performance, security, and CI. |
| [14-security.md](14-security.md) | Threat model, protection strategy, auth risks, API controls, compliance. |
| [15-devops.md](15-devops.md) | Local setup, environments, pipelines, deployment, monitoring, cost, recovery. |
| [16-business.md](16-business.md) | Market positioning, growth, pricing, KPIs, retention, support. |
| [17-roadmap.md](17-roadmap.md) | MVP, 3 month, 6 month, 12 month, and expansion roadmap. |
| [18-final.md](18-final.md) | Final recommendation: keep, discard, rebuild, add, and ideal end state. |
| [appendices/evidence-map.md](appendices/evidence-map.md) | Repository evidence map used for analysis claims. |
| [appendices/current-api-routes.md](appendices/current-api-routes.md) | Current Entangle API surface reconstructed from code. |
| [appendices/research-sources.md](appendices/research-sources.md) | External market and technology sources reviewed. |
| [diagrams/latticeops-system.mmd](diagrams/latticeops-system.mmd) | Mermaid system architecture diagram. |
| [diagrams/latticeops-session-flow.mmd](diagrams/latticeops-session-flow.mmd) | Mermaid session execution flow. |
| [diagrams/latticeops-data-model.mmd](diagrams/latticeops-data-model.mmd) | Mermaid data model diagram. |

## Reading Order

1. Start with [01-executive-summary.md](01-executive-summary.md).
2. Read [02-repository-analysis.md](02-repository-analysis.md) before evaluating redesign decisions.
3. Read [05-product-vision.md](05-product-vision.md), [06-features.md](06-features.md), and [08-architecture.md](08-architecture.md) together.
4. Use [12-implementation.md](12-implementation.md), [13-quality.md](13-quality.md), [14-security.md](14-security.md), and [15-devops.md](15-devops.md) as execution plans.

## Analysis Method

The analysis used repository evidence first: source files, package manifests, tests, deployment files, documented references, wiki files, and current local runtime state. External sources were used only to understand adjacent market and platform context.

Claims are separated as follows:

- Fact: directly visible in repository code, tests, configuration, documentation, or current Entangle state.
- Interpretation: inferred from repository structure and documented direction.
- Recommendation: proposed for the redesigned product, not a statement about the current implementation.
