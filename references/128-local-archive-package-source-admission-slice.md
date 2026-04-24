# Local Archive Package-Source Admission Slice

## Status

Implemented.

## Context

The host API, CLI, and Studio already exposed `local_archive` as a canonical
package-source admission kind, but the host implementation still returned an
`archive_admission_not_implemented` validation error. That created a durable
contract contradiction: clients could build correct archive admission requests,
but no archive-backed package could become a usable runtime source.

## Decision

`entangle-host` now admits `local_archive` package sources through a host-owned
materialization path.

The implementation deliberately keeps archive handling inside the host
control-plane boundary:

- clients submit a host-visible archive path;
- the host extracts only tar/tar.gz package archives into a temporary root;
- archive entries are rejected if they are absolute paths, path traversal
  attempts, hard links, symlinks, unsupported entry types, or checksum-invalid
  entries;
- archives may contain package files at archive root or inside one top-level
  package directory;
- the extracted package is validated with the same package-directory validator
  used for `local_path`;
- valid packages are copied under
  `.entangle/host/imports/packages/<package_source_id>/package/`;
- the imported package is then copied into the immutable host package store and
  recorded on `PackageSourceRecord.materialization`;
- invalid archives return a typed validation error and are not persisted.

## Implementation Notes

The first implementation intentionally supports tar-compatible archives only.
That is enough for the local operator profile while avoiding a new runtime
dependency or reliance on a shell `tar` binary inside service images.

Package-source listing and detail inspection now validate archive-backed
records against the host-managed materialized package root instead of returning
the old not-implemented warning.

## Test Coverage

Host service coverage now includes:

- successful `.tar.gz` archive admission with a single top-level package
  directory;
- persisted package-source listing over the materialized archive source;
- invalid archive rejection with `archive_package_extract_failed`;
- confirmation that invalid archive admission is not persisted.

## Follow-Up

Future package-source work can add signed archives, registry-backed sources,
remote refs, richer archive metadata, and supply-chain verification without
changing the existing `PackageSourceRecord` boundary.
