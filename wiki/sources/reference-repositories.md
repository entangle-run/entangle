# Reference Repositories

This page summarizes the main repositories currently mirrored into `resources/`.

## Current local materialization status

The current local reference set under `resources/` intentionally includes:

- `nips`
- `nostr-tools`
- `opencode`
- `open-claude-code`
- `openclaw`
- `a2a`
- `mcp`
- `strfry`
- `khatru`
- `qmd`

The public Claude Code leak mirror was removed from the local corpus on purpose.

## Official Nostr NIPs

Repository: `nostr-protocol/nips`

Local path: `resources/nips`

Why it matters:

- official protocol base;
- relevant NIPs for messaging, transport, discovery, and DVM semantics.

## OpenCode

Repository: `anomalyco/opencode`

Local path: `resources/opencode`

Why it matters:

- strongest open-source coding-agent shell candidate;
- useful for client and engine reuse boundaries;
- explicit client/server architecture worth studying and abstracting away from.

## nostr-tools

Repository: `nbd-wtf/nostr-tools`

Local path: `resources/nostr-tools`

Why it matters:

- strongest default TypeScript library for direct Nostr protocol integration;
- good fit for signing, verification, relay pools, and low-level event control;
- aligned with a TypeScript-first Entangle runner and Studio stack.

## open-claude-code

Repository: `ruvnet/open-claude-code`

Local path: `resources/open-claude-code`

Why it matters:

- clean-room rebuild of Claude Code ideas;
- secondary reference for architectural comparison.

## OpenClaw

Repository: `openclaw/openclaw`

Local path: `resources/openclaw`

Why it matters:

- large, ambitious open agent runtime;
- relevant for runtime, memory, tooling, and session ideas.

## A2A

Repository: `a2aproject/A2A`

Local path: `resources/a2a`

Why it matters:

- strong external reference for agent-to-agent interoperability across opaque systems;
- useful for studying capability discovery, long-running task semantics, and ecosystem-facing interoperability;
- useful as a comparison point for what Entangle should keep protocol-native versus what it may expose through future gateways.

## MCP

Repository: `modelcontextprotocol/modelcontextprotocol`

Local path: `resources/mcp`

Why it matters:

- strong external reference for tool/runtime boundaries and schema-first protocol design;
- useful for understanding how Entangle may expose tools or integrate with broader tooling ecosystems;
- not a replacement for Entangle's internal graph protocol, but a relevant boundary-layer reference.

## strfry

Repository: `hoytech/strfry`

Local path: `resources/strfry`

Why it matters:

- best current relay candidate for the hackathon and first serious implementation;
- operationally simpler than writing a custom relay;
- fits local or containerized deployment well.

## khatru

Repository: `fiatjaf/khatru`

Local path: `resources/khatru`

Why it matters:

- useful relay-framework reference when future programmable relay behavior becomes necessary;
- secondary relay reference, not the first relay implementation choice.
- upstream is in maintenance mode, so it should remain a study target rather than the initial foundation.

## qmd

Repository: `tobi/qmd`

Local path: `resources/qmd`

Why it matters:

- local markdown-oriented search tooling relevant to the project wiki and later agent-local memory tooling;
- optional support infrastructure, not a core dependency of the Entangle runtime architecture.

## Excluded reference

### Claude Code leak mirror

Excluded remote: `yasasbanukaofficial/claude-code`

Why it was excluded:

- it introduces unnecessary legal and reputational risk;
- its architectural value is now sufficiently covered by safer references;
- Entangle should remain clearly grounded in clean-room and open-source references only.
