import { describe, expect, it } from "vitest";
import {
  projectHostAuthorityExportSummary,
  projectHostAuthorityImportSummary,
  projectHostAuthoritySummary
} from "./authority-output.js";

const authority = {
  authorityId: "authority-main",
  createdAt: "2026-04-26T10:00:00.000Z",
  displayName: "Main Authority",
  keyRef: "secret://host-authority/main",
  publicKey: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  schemaVersion: "1" as const,
  status: "active" as const,
  updatedAt: "2026-04-26T10:00:00.000Z"
};

describe("authority CLI projection", () => {
  it("projects inspect, export, and import responses without exposing secrets", () => {
    expect(
      projectHostAuthoritySummary({
        authority,
        checkedAt: "2026-04-26T10:00:00.000Z",
        secret: {
          keyRef: "secret://host-authority/main",
          status: "available"
        }
      })
    ).toMatchObject({
      authorityId: "authority-main",
      secretStatus: "available"
    });

    expect(
      projectHostAuthorityExportSummary({
        authority,
        exportedAt: "2026-04-26T10:01:00.000Z",
        secretKey:
          "1111111111111111111111111111111111111111111111111111111111111111"
      })
    ).toMatchObject({
      exportedAt: "2026-04-26T10:01:00.000Z",
      secretKeyIncluded: true
    });

    expect(
      projectHostAuthorityImportSummary({
        authority,
        importedAt: "2026-04-26T10:02:00.000Z"
      })
    ).toMatchObject({
      importedAt: "2026-04-26T10:02:00.000Z",
      secretStatus: "available"
    });
  });
});
