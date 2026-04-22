# 2026-04-22 Bootstrap Session

This session consolidated the working concept of Entangle into a stable project direction.

## Main conclusions

- Entangle is no longer framed as "Claude over Nostr."
- It is framed as a graph-native runtime for modular AI organizations.
- The user is a node.
- Every active node should be a real agent runtime.
- Nostr is for signed communication and routing.
- Git should be the first real collaboration substrate.
- Each node should maintain local wiki memory.
- A shared runner is the right execution boundary; not a full standalone OpenCode product per node.

## Architectural consequences

- package, node instance, edge, graph, and runner must be separate types;
- edge remains the canonical source of relation truth;
- runner must own stop conditions and response control;
- hackathon scope should reduce active features, not the core model.
