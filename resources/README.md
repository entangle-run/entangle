# Resources

This directory is the local reference corpus for Entangle.

The intent is to keep a reproducible, inspectable set of upstream systems and protocols that directly influence the product:

- protocol references;
- open-source agent runtimes;
- clean-room rebuilds;
- optional wiki and memory tooling.

The cloned repositories in this directory are local research material. They should not be committed into the root Entangle repository history as embedded repositories or submodules unless the project deliberately changes policy later.

## Clone Status

The active repository keeps only this manifest under `resources/`. The local
reference clones are currently materialized outside the active worktree at:

`/Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources`

They remain local research material and should not be committed into the root
Entangle repository history as embedded repositories or submodules unless the
project deliberately changes policy later.

## Reference Repository Manifest

| Local Name | Remote | Purpose | Status | Commit |
| --- | --- | --- | --- | --- |
| `nips` | `https://github.com/nostr-protocol/nips.git` | Official Nostr protocol specifications and the normative base for message transport, private messaging, DVMs, and discovery. | Cloned outside active worktree | `0a25dd524389d642ec153d9009a16fb183eb23ce` |
| `nostr-tools` | `https://github.com/nbd-wtf/nostr-tools.git` | Primary Nostr client/library candidate for Entangle runners and Studio. Lowest-friction TypeScript choice and the most established default in the JS ecosystem. | Cloned outside active worktree | `6b8c24228228f6a1eb49d5fe082388b5dc2034eb` |
| `opencode` | `https://github.com/anomalyco/opencode.git` | Primary open-source coding-agent shell and the default candidate for Entangle's per-node coding engine. | Cloned outside active worktree | `0595c289046d7f45d82a563ad0c76b3ccfca050b` |
| `open-claude-code` | `https://github.com/ruvnet/open-claude-code.git` | Clean-room rebuild inspired by Claude Code. Useful as a secondary architectural reference. | Cloned outside active worktree | `9aa326ee49182c15e776e989dcb2d2cf7fd7ca88` |
| `openclaw` | `https://github.com/openclaw/openclaw.git` | Large open-source agent runtime with persistent memory, runtime services, and multi-agent operational patterns. | Cloned outside active worktree | `81ca7bc40b09dbb6386fc5c1cecf237c5f11004a` |
| `a2a` | `https://github.com/a2aproject/A2A.git` | Secondary interoperability reference for agent-to-agent communication across opaque agentic systems. Useful for capability discovery, long-running task semantics, and future gateway design. | Cloned outside active worktree | `7ff10041597b9c8a736a477e1890d2c79173bbcf` |
| `mcp` | `https://github.com/modelcontextprotocol/modelcontextprotocol.git` | Secondary protocol reference for tool/runtime boundaries, schema discipline, and external interoperability surfaces. Useful for understanding where Entangle should align with MCP and where it should remain separate. | Cloned outside active worktree | `8b266219b19cf5e85e44b6c45dd81733cb65f131` |
| `strfry` | `https://github.com/hoytech/strfry.git` | Primary relay implementation candidate for the Entangle deployment profile: mature, fast, and simple to run as a dedicated local or containerized relay. | Cloned outside active worktree | `825e325cf93be03718cca157298392cba27d102f` |
| `khatru` | `https://github.com/fiatjaf/khatru.git` | Secondary relay-framework reference for future custom relay logic, AUTH policies, or programmable event acceptance. Upstream is in maintenance mode, so treat it as a reference rather than a foundation. | Cloned outside active worktree | `9f99b9827a6e030bbcefc48f7af68bfe7eea1a27` |
| `qmd` | `https://github.com/tobi/qmd.git` | Optional markdown-native search engine for the Entangle wiki and future memory/search tooling. Not part of the core runtime. | Cloned outside active worktree | `e8de7cab0284c5d64bd64f5928b49d3a2d9a01f3` |

## Explicit exclusions

The project no longer keeps a local clone of the public Claude Code leak mirror in `resources/`.

Reason:

- the reputational and legal risk is not justified by the incremental architectural value;
- the clean-room `open-claude-code` repository is sufficient as a secondary reference when that design space is useful;
- the safe implementation base remains `opencode`, `openclaw`, and the official Nostr specs.

## Refresh Commands

When the corpus needs to be refreshed from origin, use:

```bash
mkdir -p /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources
git clone https://github.com/nostr-protocol/nips.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/nips
git clone https://github.com/nbd-wtf/nostr-tools.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/nostr-tools
git clone https://github.com/anomalyco/opencode.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/opencode
git clone https://github.com/ruvnet/open-claude-code.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/open-claude-code
git clone https://github.com/openclaw/openclaw.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/openclaw
git clone https://github.com/a2aproject/A2A.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/a2a
git clone https://github.com/modelcontextprotocol/modelcontextprotocol.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/mcp
git clone https://github.com/hoytech/strfry.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/strfry
git clone https://github.com/fiatjaf/khatru.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/khatru
git clone https://github.com/tobi/qmd.git /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/qmd
```

If the directories already exist, update them with:

```bash
for repo in /Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/*; do
  if [ -d "$repo/.git" ]; then
    git -C "$repo" pull --ff-only
  fi
done
```

## Guidance on Usage

### Safe implementation base

- `nostr-tools`
- `opencode`
- selected concepts from `openclaw`
- the official `nips` repository
- `strfry`

### Secondary reference

- `open-claude-code`
- `a2a`
- `mcp`
- `khatru`

`khatru` remains useful, but its upstream repository is in maintenance mode. Use it to study programmable relay behavior, not as the first implementation foundation.

`a2a` is useful for studying how a broader ecosystem frames agent discovery, capability negotiation, long-running task semantics, and opaque-agent interoperability. It should be treated as a comparison point and possible future gateway/interoperability surface, not as Entangle's internal protocol foundation.

`mcp` is useful for tool/runtime interoperability and schema discipline. It should inform how Entangle exposes or consumes tool surfaces, but it should not replace Entangle's internal graph, identity, or agent-to-agent protocol model.

### Optional tooling

- `qmd`

`qmd` stays because it is directly relevant to the wiki and future memory/search workflows, but it should be treated as optional infrastructure around the project rather than as a core reference for Entangle's runtime model.

## Infrastructure note

The project will almost certainly use more stack components than are cloned here, but some of them are better treated as services than as source references. The clearest example is the git server.

For the Entangle deployment profile and likely for the first serious implementation:

- use a `Gitea` container or another off-the-shelf git service;
- do not treat the git server source as a primary design reference unless Entangle later needs deep integration with its internals.
