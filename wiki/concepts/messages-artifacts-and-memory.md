# Messages, Artifacts, and Memory

Entangle separates three kinds of state:

## Messages

Messages coordinate work:

- requests;
- updates;
- approvals;
- closures;
- handoffs;
- notifications.

They should be signed and transported over Nostr.

## Artifacts

Artifacts carry durable work products:

- git commits and branches;
- wiki pages;
- local files;
- structured reports.

## Memory

Memory is the durable local understanding of a node.

The preferred first representation is a markdown wiki maintained by the runner after meaningful work or communication.

This separation is essential. If messages become artifacts or if memory becomes just raw chat history, the system becomes much weaker and harder to govern.
