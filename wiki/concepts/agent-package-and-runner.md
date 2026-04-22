# Agent Package and Runner

An Entangle node should never be treated as just a prompt plus a model.

The architecture depends on a strong distinction:

- `AgentPackage` = portable storage unit;
- `NodeInstance` = graph-local binding of that package;
- `AgentRunner` = execution runtime for the node.

This distinction allows:

- package portability;
- graph reuse;
- clean secret boundaries;
- isolated runtime state;
- later support for remote node attachment.

The runner is the system boundary that matters most for implementation.
