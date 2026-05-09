import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  identifierSchema,
  operatorPermissionSchema,
  operatorRoleSchema,
  type HostOperatorSecurityStatus,
  type OperatorPermission,
  type OperatorRole
} from "@entangle/types";

export type HostOperatorPrincipal = {
  operatorExpiresAt?: string;
  operatorId: string;
  operatorPermissions?: OperatorPermission[];
  operatorRole: OperatorRole;
  tokenHash: string;
};

type HostOperatorTokenRecord = {
  expiresAt?: unknown;
  operatorId?: unknown;
  operatorRole?: unknown;
  permissions?: unknown;
  role?: unknown;
  scopes?: unknown;
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

function normalizeOperatorExpiresAt(input: {
  source: string;
  value: unknown;
}): string | undefined {
  if (input.value === undefined || input.value === null) {
    return undefined;
  }

  if (typeof input.value !== "string" || input.value.trim().length === 0) {
    throw new Error(`${input.source} must be a valid ISO timestamp.`);
  }

  const timestamp = Date.parse(input.value.trim());

  if (Number.isNaN(timestamp)) {
    throw new Error(`${input.source} must be a valid ISO timestamp.`);
  }

  return new Date(timestamp).toISOString();
}

function resolveTokenHashFromRecord(input: {
  index: number;
  record: HostOperatorTokenRecord;
  source: string;
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
      `${input.source} record ${input.index} tokenSha256 must be a 64-character SHA-256 hex digest.`
    );
  }

  if (!tokenHash && !configuredTokenHash) {
    throw new Error(
      `${input.source} record ${input.index} must include a non-empty token or a 64-character tokenSha256.`
    );
  }

  if (
    tokenHash &&
    configuredTokenHash &&
    tokenHash !== configuredTokenHash
  ) {
    throw new Error(
      `${input.source} record ${input.index} token does not match tokenSha256.`
    );
  }

  return tokenHash ?? configuredTokenHash!;
}

function normalizeOperatorId(input: {
  defaultOperatorId: string;
  operatorId: unknown;
  source: string;
}): string {
  const normalizedOperatorId =
    typeof input.operatorId === "string" ? input.operatorId.trim() : "";

  if (!normalizedOperatorId) {
    return input.defaultOperatorId;
  }

  const parsedOperatorId = identifierSchema.safeParse(normalizedOperatorId);

  if (parsedOperatorId.success) {
    return parsedOperatorId.data;
  }

  throw new Error(`${input.source} must be a valid Entangle identifier.`);
}

function normalizeOperatorRole(input: {
  operatorRole: unknown;
  source: string;
}): OperatorRole {
  const candidate =
    typeof input.operatorRole === "string" ? input.operatorRole.trim() : "";

  if (!candidate) {
    return "operator";
  }

  const parsedOperatorRole = operatorRoleSchema.safeParse(candidate);

  if (parsedOperatorRole.success) {
    return parsedOperatorRole.data;
  }

  throw new Error(`${input.source} must be a supported operator role.`);
}

function normalizeOperatorPermissions(input: {
  permissions: unknown;
  source: string;
}): OperatorPermission[] | undefined {
  if (input.permissions === undefined || input.permissions === null) {
    return undefined;
  }

  const candidates =
    typeof input.permissions === "string"
      ? input.permissions
          .split(/[,\s]+/u)
          .map((permission) => permission.trim())
          .filter((permission) => permission.length > 0)
      : Array.isArray(input.permissions)
        ? input.permissions
        : undefined;

  if (!candidates || candidates.length === 0) {
    throw new Error(`${input.source} must include at least one permission.`);
  }

  const permissions = new Set<OperatorPermission>();

  for (const [index, candidate] of candidates.entries()) {
    const parsedPermission = operatorPermissionSchema.safeParse(candidate);

    if (!parsedPermission.success) {
      throw new Error(
        `${input.source} permission ${index} must be a supported operator permission.`
      );
    }

    permissions.add(parsedPermission.data);
  }

  return Array.from(permissions).sort();
}

function buildHostOperatorPrincipal(input: {
  operatorExpiresAt?: string;
  operatorId: string;
  operatorPermissions?: OperatorPermission[];
  operatorRole: OperatorRole;
  tokenHash: string;
}): HostOperatorPrincipal {
  return {
    ...(input.operatorExpiresAt
      ? { operatorExpiresAt: input.operatorExpiresAt }
      : {}),
    operatorId: input.operatorId,
    ...(input.operatorPermissions
      ? { operatorPermissions: input.operatorPermissions }
      : {}),
    operatorRole: input.operatorRole,
    tokenHash: input.tokenHash
  };
}

function parseOperatorTokenRecords(
  rawRecords: string | undefined,
  source = "ENTANGLE_HOST_OPERATOR_TOKENS_JSON"
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
      `${source} must be valid JSON.`,
      { cause: error }
    );
  }

  if (!Array.isArray(parsedRecords)) {
    throw new Error(
      `${source} must be a JSON array of operator token records.`
    );
  }

  return parsedRecords.map((record, index) => {
    if (typeof record !== "object" || record === null) {
      throw new Error(
        `${source} record ${index} must be an object.`
      );
    }

    const tokenRecord = record as HostOperatorTokenRecord;
    const operatorPermissions = normalizeOperatorPermissions({
      permissions: tokenRecord.permissions ?? tokenRecord.scopes,
      source: `${source} record ${index}`
    });
    const operatorExpiresAt =
      tokenRecord.expiresAt !== undefined && tokenRecord.expiresAt !== null
        ? normalizeOperatorExpiresAt({
            source: `${source} record ${index} expiresAt`,
            value: tokenRecord.expiresAt
          })
        : undefined;

    return buildHostOperatorPrincipal({
      ...(operatorExpiresAt ? { operatorExpiresAt } : {}),
      operatorId: normalizeOperatorId({
        defaultOperatorId: "bootstrap-operator",
        operatorId: tokenRecord.operatorId,
        source: `${source} record ${index} operatorId`
      }),
      ...(operatorPermissions ? { operatorPermissions } : {}),
      operatorRole: normalizeOperatorRole({
        operatorRole: tokenRecord.operatorRole ?? tokenRecord.role,
        source: `${source} record ${index} operatorRole`
      }),
      tokenHash: resolveTokenHashFromRecord({
        index,
        record: tokenRecord,
        source
      })
    });
  });
}

function readOperatorTokenRecordsFile(pathValue: string | undefined): string | undefined {
  const normalizedPath = pathValue?.trim();

  if (!normalizedPath) {
    return undefined;
  }

  try {
    return readFileSync(normalizedPath, "utf8");
  } catch (error) {
    throw new Error(
      `ENTANGLE_HOST_OPERATOR_TOKENS_FILE could not be read: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    );
  }
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
    const operatorPermissions = normalizeOperatorPermissions({
      permissions: env.ENTANGLE_HOST_OPERATOR_PERMISSIONS,
      source: "ENTANGLE_HOST_OPERATOR_PERMISSIONS"
    });
    const operatorExpiresAt = normalizeOperatorExpiresAt({
      source: "ENTANGLE_HOST_OPERATOR_TOKEN_EXPIRES_AT",
      value: env.ENTANGLE_HOST_OPERATOR_TOKEN_EXPIRES_AT
    });

    principals.push(
      buildHostOperatorPrincipal({
        ...(operatorExpiresAt ? { operatorExpiresAt } : {}),
        operatorId: normalizeOperatorId({
          defaultOperatorId: "bootstrap-operator",
          operatorId: env.ENTANGLE_HOST_OPERATOR_ID,
          source: "ENTANGLE_HOST_OPERATOR_ID"
        }),
        ...(operatorPermissions ? { operatorPermissions } : {}),
        operatorRole: normalizeOperatorRole({
          operatorRole: env.ENTANGLE_HOST_OPERATOR_ROLE,
          source: "ENTANGLE_HOST_OPERATOR_ROLE"
        }),
        tokenHash: hashOperatorToken(singleToken)
      })
    );
  }

  principals.push(
    ...parseOperatorTokenRecords(env.ENTANGLE_HOST_OPERATOR_TOKENS_JSON)
  );
  principals.push(
    ...parseOperatorTokenRecords(
      readOperatorTokenRecordsFile(env.ENTANGLE_HOST_OPERATOR_TOKENS_FILE),
      "ENTANGLE_HOST_OPERATOR_TOKENS_FILE"
    )
  );

  assertUniqueOperatorTokens(principals);

  return principals;
}

function resolveHostOperatorTokenStatus(
  principal: HostOperatorPrincipal,
  now = new Date()
): "active" | "expired" | undefined {
  if (!principal.operatorExpiresAt) {
    return undefined;
  }

  return Date.parse(principal.operatorExpiresAt) <= now.getTime()
    ? "expired"
    : "active";
}

function buildHostOperatorStatusPrincipal(principal: HostOperatorPrincipal) {
  const operatorTokenStatus = resolveHostOperatorTokenStatus(principal);

  return {
    ...(principal.operatorExpiresAt
      ? { operatorExpiresAt: principal.operatorExpiresAt }
      : {}),
    operatorId: principal.operatorId,
    ...(principal.operatorPermissions
      ? { operatorPermissions: principal.operatorPermissions }
      : {}),
    operatorRole: principal.operatorRole,
    ...(operatorTokenStatus ? { operatorTokenStatus } : {})
  };
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
      ...buildHostOperatorStatusPrincipal(principal)
    };
  }

  return {
    operatorAuthMode: "bootstrap_operator_tokens",
    operatorCount: principals.length,
    operators: principals.map(buildHostOperatorStatusPrincipal)
  };
}

export function resolveHostOperatorPrincipalForRequest(input: {
  authorization: string | undefined;
  now?: Date;
  principals: HostOperatorPrincipal[];
  query: unknown;
  upgrade: string | undefined;
}): HostOperatorPrincipal | undefined {
  const now = input.now ?? new Date();
  const bearerToken = extractBearerToken(input.authorization);

  if (bearerToken) {
    const bearerTokenHash = hashOperatorToken(bearerToken);
    return input.principals.find(
      (principal) =>
        principal.tokenHash === bearerTokenHash &&
        resolveHostOperatorTokenStatus(principal, now) !== "expired"
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
    (principal) =>
      principal.tokenHash === accessTokenHash &&
      resolveHostOperatorTokenStatus(principal, now) !== "expired"
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
