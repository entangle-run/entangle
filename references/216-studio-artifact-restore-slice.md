# Studio Artifact Restore Slice

Date: 2026-04-26.

## Purpose

This slice completes the first visual operator surface for safe runtime artifact
restore in Entangle Local.

The host remains the source of truth. Studio does not inspect runner-local
files directly and does not invent client-owned artifact state.

## Implemented Scope

- Added shared restore status formatting to the Studio artifact inspection
  helper re-export.
- Added a selected-artifact restore panel in Studio.
- Added a safe restore action for selected git-backed artifacts through the
  shared host client.
- Displayed the latest restore id, status, restored path, or unavailable
  reason in the selected-artifact detail panel.
- Kept Studio restore non-destructive: the UI does not send overwrite, so
  existing restore targets remain protected by the host default.

## Boundaries

- Studio restore is currently action-only and shows the last response for the
  selected artifact. It does not yet list historical restore-attempt records.
- Non-git artifact backends stay disabled in the visual restore panel.
- Replay/promotion from a restore directory into source or wiki state remains a
  separate approval-gated workflow.
