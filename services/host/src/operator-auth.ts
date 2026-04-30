import { createHash } from "node:crypto";
import {
  identifierSchema,
  operatorRoleSchema,
  type HostOperatorSecurityStatus,
  type OperatorRole
} from "@entangle/types";

export type HostOperatorPrincipal = {
  operatorId: string;
  operatorRole: OperatorRole;
  tokenHash: string;
};

type HostOperatorTokenRecord = {
  operatorId?: unknown;
  operatorRole?: unknown;
  role?: unknown;
  token?: unknown;
  tokenSha256?: unknown;
};

function normalizeOperatorToken(token: string | undefined): string | undefined {
  const normalizedToken = token?.trim();
  return normalizedToken && normalizedToken.length > 0
    ? normalizedToken
    : undefined;
}

function hashOperatorToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function normalizeTokenSha256(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedHash = value.trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalizedHash) ? normalizedHash : undefined;
}

function resolveTokenHashFromRecord(input: {
  index: number;
  record: HostOperatorTokenRecord;
}): string {
  const hasConfiguredTokenHash = Object.prototype.hasOwnProperty.call(
    input.record,
    "tokenSha256"
  );
  const token =
    typeof input.record.token === "string"
      ? normalizeOperatorToken(input.record.token)
      : undefined;
  const tokenHash = token ? hashOperatorToken(token) : undefined;
  const configuredTokenHash = normalizeTokenSha256(input.record.tokenSha256);

  if (hasConfiguredTokenHash && !configuredTokenHash) {
    throw new Error(
      `ENTANGLE_HOST_OPERATOR_TOKENS_JSON record ${input.index} tokenSha256 must be a 64-character SHA-256 hex digest.`
    );
  }

  if (!tokenHash && !configuredTokenHash) {
    throw new Error(
      `ENTANGLE_HOST_OPERATOR_TOKENS_JSON record ${input.index} must include a non-empty token or a 64-character tokenSha256.`
    );
  }

  if (
    tokenHash &&
    configuredTokenHash &&
    tokenHash !== configuredTokenHash
  ) {
    throw new Error(
      `ENTANGLE_HOST_OPERATOR_TOKENS_JSON record ${input.index} token does not match tokenSha256.`
    );
  }

  return tokenHash ?? configuredTokenHash!;
}

function normalizeOperatorId(operatorId: unknown): string {
  const normalizedOperatorId =
    typeof operatorId === "string" ? operatorId.trim() : "";
  const parsedOperatorId = identifierSchema.safeParse(normalizedOperatorId);

  if (parsedOperatorId.success) {
    return parsedOperatorId.data;
  }

  return "bootstrap-operator";
}

function normalizeOperatorRole(operatorRole: unknown): OperatorRole {
  const candidate = typeof operatorRole === "string" ? operatorRole.trim() : "";
  const parsedOperatorRole = operatorRoleSchema.safeParse(
    candidate || "operator"
  );

  return parsedOperatorRole.success ? parsedOperatorRole.data : "operator";
}

function parseOperatorTokenRecords(
  rawRecords: string | undefined
): HostOperatorPrincipal[] {
  const normalizedRecords = rawRecords?.trim();

  if (!normalizedRecords) {
    return [];
  }

  let parsedRecords: unknown;

  try {
    parsedRecords = JSON.parse(normalizedRecords) as unknown;
  } catch (error) {
    throw new Error(
      "ENTANGLE_HOST_OPERATOR_TOKENS_JSON must be valid JSON.",
      { cause: error }
    );
  }

  if (!Array.isArray(parsedRecords)) {
    throw new Error(
      "ENTANGLE_HOST_OPERATOR_TOKENS_JSON must be a JSON array of operator token records."
    );
  }

  return parsedRecords.map((record, index) => {
    if (typeof record !== "object" || record === null) {
      throw new Error(
        `ENTANGLE_HOST_OPERATOR_TOKENS_JSON record ${index} must be an object.`
      );
    }

    const tokenRecord = record as HostOperatorTokenRecord;

    return {
      operatorId: normalizeOperatorId(tokenRecord.operatorId),
      operatorRole: normalizeOperatorRole(
        tokenRecord.operatorRole ?? tokenRecord.role
      ),
      tokenHash: resolveTokenHashFromRecord({
        index,
        record: tokenRecord
      })
    };
  });
}

function assertUniqueOperatorTokens(principals: HostOperatorPrincipal[]) {
  const seenTokens = new Set<string>();

  for (const principal of principals) {
    if (seenTokens.has(principal.tokenHash)) {
      throw new Error(
        "Host operator token configuration contains duplicate token values."
      );
    }

    seenTokens.add(principal.tokenHash);
  }
}

export function resolveHostOperatorPrincipalsFromEnv(
  env: NodeJS.ProcessEnv = process.env
): HostOperatorPrincipal[] {
  const principals: HostOperatorPrincipal[] = [];
  const singleToken = normalizeOperatorToken(env.ENTANGLE_HOST_OPERATOR_TOKEN);

  if (singleToken) {
    principals.push({
      operatorId: normalizeOperatorId(env.ENTANGLE_HOST_OPERATOR_ID),
      operatorRole: normalizeOperatorRole(env.ENTANGLE_HOST_OPERATOR_ROLE),
      tokenHash: hashOperatorToken(singleToken)
    });
  }

  principals.push(
    ...parseOperatorTokenRecords(env.ENTANGLE_HOST_OPERATOR_TOKENS_JSON)
  );

  assertUniqueOperatorTokens(principals);

  return principals;
}

export function buildHostOperatorSecurityStatusFromEnv(
  env: NodeJS.ProcessEnv = process.env
): HostOperatorSecurityStatus {
  const principals = resolveHostOperatorPrincipalsFromEnv(env);

  if (principals.length === 0) {
    return {
      operatorAuthMode: "none"
    };
  }

  if (principals.length === 1) {
    const principal = principals[0]!;

    return {
      operatorAuthMode: "bootstrap_operator_token",
      operatorId: principal.operatorId,
      operatorRole: principal.operatorRole
    };
  }

  return {
    operatorAuthMode: "bootstrap_operator_tokens",
    operatorCount: principals.length,
    operators: principals.map((principal) => ({
      operatorId: principal.operatorId,
      operatorRole: principal.operatorRole
    }))
  };
}

export function resolveHostOperatorPrincipalForRequest(input: {
  authorization: string | undefined;
  principals: HostOperatorPrincipal[];
  query: unknown;
  upgrade: string | undefined;
}): HostOperatorPrincipal | undefined {
  const bearerToken = extractBearerToken(input.authorization);

  if (bearerToken) {
    const bearerTokenHash = hashOperatorToken(bearerToken);
    return input.principals.find(
      (principal) => principal.tokenHash === bearerTokenHash
    );
  }

  if (!isWebSocketUpgrade(input.upgrade)) {
    return undefined;
  }

  const accessToken = extractWebSocketAccessToken(input.query);

  if (!accessToken) {
    return undefined;
  }

  const accessTokenHash = hashOperatorToken(accessToken);
  return input.principals.find(
    (principal) => principal.tokenHash === accessTokenHash
  );
}

export function resolveUnauthorizedOperatorAuditPrincipal(
  principals: HostOperatorPrincipal[]
): Omit<HostOperatorPrincipal, "tokenHash"> {
  if (principals.length === 1) {
    const principal = principals[0]!;

    return {
      operatorId: principal.operatorId,
      operatorRole: principal.operatorRole
    };
  }

  return {
    operatorId: "unauthorized-operator",
    operatorRole: "viewer"
  };
}

function extractBearerToken(authorization: string | undefined): string | undefined {
  const prefix = "Bearer ";

  if (!authorization?.startsWith(prefix)) {
    return undefined;
  }

  return normalizeOperatorToken(authorization.slice(prefix.length));
}

function extractWebSocketAccessToken(query: unknown): string | undefined {
  if (typeof query !== "object" || query === null || !("access_token" in query)) {
    return undefined;
  }

  const rawAccessToken = (query as { access_token?: unknown }).access_token;
  return typeof rawAccessToken === "string"
    ? normalizeOperatorToken(rawAccessToken)
    : undefined;
}

function isWebSocketUpgrade(upgrade: string | undefined): boolean {
  return upgrade?.toLowerCase() === "websocket";
}
