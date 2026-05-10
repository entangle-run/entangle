# Security Policy

Entangle is pre-release software. The architecture is identity-first, but the
production security program is still maturing.

## Reporting Vulnerabilities

Report vulnerabilities privately to:

```text
security@entangle.run
```

Include:

- affected repository and commit;
- reproduction steps;
- expected and actual behavior;
- impact assessment;
- relevant runtime evidence such as Host events, signed messages, traces, or
  logs with secrets removed.

Please allow reasonable time for investigation before public disclosure.

## Current Security Posture

Implemented or partially implemented:

- Host Authority key material and signed control events;
- runner identities, signed hello/heartbeat/observation events, and trust state;
- stable User Node identities for signed user intent;
- NIP-59 wrapped A2A messaging with signer checks;
- bootstrap operator-token support with scoped records, hashed tokens, expiry,
  and read-only viewer enforcement;
- Host event integrity reports and audit-bundle export;
- bounded secret delivery and external principal records for backend
  credentials;
- projection-backed runtime inspection instead of trusting shared runner files
  as public truth.

Still maturing:

- production-grade operator identity;
- policy-backed permission sources;
- long-term audit retention;
- multi-tenant isolation;
- external security review and compliance workflows;
- infrastructure-backed multi-machine proof under realistic operating
  conditions.

## Secret Handling

Do not commit:

- model API keys;
- git tokens;
- Nostr private keys;
- Host Authority secrets;
- generated runtime state;
- `.env` files;
- logs containing bearer tokens or private key material.

Use mounted files or environment-specific secret stores for local testing.

## Public Claims

Do not describe Entangle as production-ready unless the release packet includes
the required verification, identity, audit, upgrade, and recovery evidence.
