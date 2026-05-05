import { describe, expect, it } from "vitest";
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
});
