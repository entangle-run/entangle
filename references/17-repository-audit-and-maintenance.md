# Repository Audit and Maintenance

This document defines how the Entangle repository should be maintained as a live engineering system during the design-heavy phase and through the hackathon build.

## Core principle

Entangle should not be treated as a pile of notes. It should be treated as a controlled design baseline.

That means:

- the repository must stay internally coherent;
- the wiki, references corpus, and resource manifests must agree on the project state;
- implementation work should begin from an audited state rather than from assumed memory.

## Why this matters

Entangle is intentionally front-loaded with architecture, protocol, runtime, and product-design work. That creates leverage, but it also creates a failure mode:

- state drifts across files;
- old assumptions remain written after the repository changes;
- future implementation decisions rely on stale text rather than current truth.

The cost of a lightweight audit at the start of each interaction is much lower than the cost of coding against an incoherent corpus.

The same principle applies to quality. It is cheaper to detect a broken
boundary, weak test surface, or shallow automation rule during the audit loop
than after several implementation batches have compounded around it.

## Repository layers that must stay aligned

### Root orientation

Files such as `README.md` describe the repository at a project-wide level.

### Canonical design corpus

The `references/` directory defines the architectural and implementation baseline.

### Operational memory

The `wiki/` directory captures decisions, source-oriented summaries, durable conclusions, and session-aware project memory.

### External research corpus

The `resources/` directory contains local clones of external repositories and the manifest that explains why they matter.

## Mandatory audit triggers

An audit pass is required:

- at the start of every substantial interaction;
- after cloning, removing, or reclassifying major resources;
- after introducing a new architectural decision that changes project framing;
- before beginning implementation work that depends on the current corpus;
- after discovering any contradiction between files.

## Mandatory audit procedure

### 1. Re-read core state

At minimum:

- `README.md`
- `resources/README.md`
- `wiki/overview.md`
- `wiki/index.md`
- `wiki/log.md`

Then read any concept, decision, source, or reference files directly touched by the current task.

### 2. Detect stale state

Search for:

- statements that no longer match the real repository state;
- outdated next steps;
- resource manifests that no longer match the filesystem;
- decisions that were superseded but never updated;
- code paths that are semantically weak even if they are locally consistent;
- missing quality automation for newly introduced behavior.

### 3. Reconcile before extending

If durable contradictions are found, correct them before layering new work on top.

### 4. Record durable changes

If project state changed in a way that future sessions should remember:

- update the relevant canonical files;
- update `wiki/index.md` if new wiki pages were introduced;
- append a log entry to `wiki/log.md`.
- when the change affects engineering process, record the new quality gate or automation baseline explicitly.

## Definition of “under control”

The repository is under control when:

- status statements reflect reality;
- tracked resources actually exist or are explicitly marked absent;
- the stack recommendation still matches current design intent;
- the wiki index covers the active decision and concept pages;
- the log captures meaningful state transitions;
- implementation can begin without first untangling contradictory documentation.

## Change-capture rules

### Update the root README when

- repository-wide status changes;
- the phase of the project changes;
- the top-level understanding of the project changes.

### Update the references corpus when

- a design choice becomes important enough to constrain implementation;
- the recommended stack changes;
- the product or runtime model is refined in a way future engineering must respect.

### Update the wiki when

- a new durable decision is made;
- a source changes the understanding of the project;
- a session produces a reusable conclusion;
- a previously recorded state becomes stale.

## Resource hygiene

### Include only what is justified

Resources should remain relevant to:

- protocol understanding;
- runtime design;
- agent-engine design;
- relay and infrastructure choices;
- wiki and memory tooling that is likely to matter.

### Exclude risky or low-value references

Do not keep local references that add legal, reputational, or maintenance risk without corresponding design value.

### Keep local cloned corpora out of root history by default

If upstream repositories are cloned into `resources/` as local research material, do not commit them into the root Entangle repository by accident as embedded repositories.

Track the manifest and policy files. Treat the cloned repositories themselves as local materialization unless the project explicitly decides to vendor or submodule them.

### Reclassify when needed

A resource can move between:

- primary implementation base;
- secondary reference;
- optional tooling;
- explicit exclusion.

## Hackathon implication

This maintenance model supports the hackathon goal directly.

The point is not to create documentation for its own sake. The point is to ensure that the hackathon build is based on a stable architectural core and that short-term execution pressure does not silently corrupt the project baseline.

## Practical rule

The working rule for Entangle should be:

> Every substantial interaction starts with an audit pass and should leave the repository in a more coherent state than it found it.

For implementation-heavy phases, "more coherent" also means:

- better tested;
- more strongly linted;
- more clearly automated;
- less dependent on manual vigilance.
