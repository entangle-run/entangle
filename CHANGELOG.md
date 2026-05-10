# Changelog

All notable public release changes for Entangle are tracked here.

Entangle is pre-release. Changelog entries distinguish deterministic proof
coverage from manual live-provider and physical deployment validation.

## v0.1.0-alpha.1 - 2026-05-10

Pre-production alpha for the federated Entangle runtime baseline.

### Highlights

- Established Entangle product identity and MIT licensing across the runtime,
  website, and organization profile repositories.
- Preserved the federated architecture baseline: Host, runners, User Nodes,
  Nostr-signed coordination, git-backed artifact references, Studio, CLI, and
  deterministic test paths.
- Added deterministic/mock execution support for no-credential local validation
  when real LLM API credentials are not configured.
- Aligned the public website and documentation around Entangle rather than a
  local-only product identity.

### Validation

- Runtime CI passed on the release commit.
- Website CI passed on the aligned public documentation commit.
- Local deterministic verification passed for the runtime and website before
  publishing this alpha release.

### Known Limits

- Real-provider OpenCode/LLM task validation still requires manual API-backed
  testing.
- Real git push and pull request workflows still require manual provider-backed
  validation.
- Physical multi-machine federation should be validated in the next alpha
  milestone.
- This is not a production-ready release.
