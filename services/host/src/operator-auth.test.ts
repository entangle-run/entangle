import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveHostOperatorPrincipalsFromEnv } from "./operator-auth.js";

describe("operator auth configuration", () => {
  it("defaults missing bootstrap operator id and role", () => {
    expect(
      resolveHostOperatorPrincipalsFromEnv({
        ENTANGLE_HOST_OPERATOR_TOKEN: "secret-token"
      })
    ).toMatchObject([
      {
        operatorId: "bootstrap-operator",
        operatorRole: "operator"
      }
    ]);
  });

  it("rejects invalid bootstrap operator ids", () => {
    expect(() =>
      resolveHostOperatorPrincipalsFromEnv({
        ENTANGLE_HOST_OPERATOR_ID: "Invalid Operator",
        ENTANGLE_HOST_OPERATOR_TOKEN: "secret-token"
      })
    ).toThrow("ENTANGLE_HOST_OPERATOR_ID must be a valid Entangle identifier.");
  });

  it("rejects invalid JSON operator token ids and roles", () => {
    expect(() =>
      resolveHostOperatorPrincipalsFromEnv({
        ENTANGLE_HOST_OPERATOR_TOKENS_JSON: JSON.stringify([
          {
            operatorId: "Invalid Operator",
            token: "secret-token"
          }
        ])
      })
    ).toThrow(
      "ENTANGLE_HOST_OPERATOR_TOKENS_JSON record 0 operatorId must be a valid Entangle identifier."
    );

    expect(() =>
      resolveHostOperatorPrincipalsFromEnv({
        ENTANGLE_HOST_OPERATOR_TOKENS_JSON: JSON.stringify([
          {
            operatorRole: "superuser",
            token: "secret-token"
          }
        ])
      })
    ).toThrow(
      "ENTANGLE_HOST_OPERATOR_TOKENS_JSON record 0 operatorRole must be a supported operator role."
    );
  });

  it("loads bootstrap operator token records from a JSON file", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "entangle-operator-auth-"));
    const tokenFile = path.join(tempRoot, "operator-tokens.json");

    try {
      writeFileSync(
        tokenFile,
        `${JSON.stringify([
          {
            operatorId: "ops-admin",
            operatorRole: "admin",
            permissions: ["host.read", "host.catalog.write"],
            token: "admin-secret"
          }
        ])}\n`,
        "utf8"
      );

      expect(
        resolveHostOperatorPrincipalsFromEnv({
          ENTANGLE_HOST_OPERATOR_TOKENS_FILE: tokenFile
        })
      ).toMatchObject([
        {
          operatorId: "ops-admin",
          operatorPermissions: ["host.catalog.write", "host.read"],
          operatorRole: "admin"
        }
      ]);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });
});
