# Runtime Identity Materialization and Secret Boundaries

This document records the first serious implementation of stable per-node
runtime identity ownership in Entangle.

## Problem solved

Before this refinement:

- the runner could derive a public key from an env var if one happened to be
  present;
- otherwise it generated an ephemeral keypair at startup;
- the injected runtime context did not carry an explicit non-secret identity
  contract;
- the host did not own per-node Nostr identity persistence.

That was no longer acceptable once Entangle had machine-readable A2A contracts,
because protocol authorship must be stable and attributable.

## New ownership rule

`entangle-host` is now the owner of local per-node Nostr runtime identities.

That means the host is responsible for:

- generating a Nostr secp256k1 secret when a node first needs one;
- persisting that secret in a host-managed secret store;
- persisting the non-secret identity record separately from the secret itself;
- injecting non-secret identity context into the runner runtime context;
- delivering the secret to the runner through an explicit delivery channel.

The runner is no longer allowed to silently invent protocol identity on its own.

## Implemented local profile

The current local operator profile now uses:

- a host-managed runtime identity record per `(graphId, nodeId)`;
- a separate secret root under `ENTANGLE_SECRETS_HOME`;
- non-secret `identityContext` embedded in `effective-runtime-context.json`;
- env-var secret delivery to the runner through
  `ENTANGLE_NOSTR_SECRET_KEY`.

## Important boundary

The runtime context now includes:

- `identityContext.algorithm`
- `identityContext.publicKey`
- `identityContext.secretDelivery`

It does not include:

- raw secret key material

That preserves the rule that injected JSON is operational metadata, not a
secret transport.

## Storage separation

The local Compose profile now mounts:

- one shared runtime-state volume for host state and runner workspaces;
- one separate host-only secret volume for runtime identities.

This matters because the runner still needs access to shared runtime state,
while host-owned secrets should not live in the same mounted state volume by
default.

## Current runner rule

The runner now:

- loads `identityContext` from the effective runtime context;
- resolves the declared secret delivery mode;
- derives the public key from the delivered secret;
- rejects startup if the derived public key does not match the injected
  `identityContext.publicKey`.

This turns identity mismatches into hard runtime errors instead of silent drift.

## Remaining limitation

The current first serious local profile still uses env-var delivery for the
Nostr secret inside the runner container.

That is acceptable for the current local boundary because:

- the host, not the package, owns the secret lifecycle;
- the runtime context remains non-secret;
- the shared runtime state volume does not need to contain the raw secret.

Future refinement may move this to:

- mounted secret files;
- external secret managers;
- stronger backend-specific secret adapters.
