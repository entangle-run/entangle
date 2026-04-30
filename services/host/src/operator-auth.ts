import {
  identifierSchema,
  operatorRoleSchema,
  type HostOperatorSecurityStatus,
  type OperatorRole
} from "@entangle/types";

export type HostOperatorPrincipal = {
  operatorId: string;
  operatorRole: OperatorRole;
  token: string;
};

type HostOperatorTokenRecord = {
  operatorId?: unknown;
  operatorRole?: unknown;
  role?: unknown;
  token?: unknown;
};

function normalizeOperatorToken(token: string | undefined): string | undefined {
  const normalizedToken = token?.trim();
  return normalizedToken && normalizedToken.length > 0
    ? normalizedToken
    : undefined;
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
    const token =
      typeof tokenRecord.token === "string"
        ? normalizeOperatorToken(tokenRecord.token)
        : undefined;

    if (!token) {
      throw new Error(
        `ENTANGLE_HOST_OPERATOR_TOKENS_JSON record ${index} must include a non-empty token.`
      );
    }

    return {
      operatorId: normalizeOperatorId(tokenRecord.operatorId),
      operatorRole: normalizeOperatorRole(
        tokenRecord.operatorRole ?? tokenRecord.role
      ),
      token
    };
  });
}

function assertUniqueOperatorTokens(principals: HostOperatorPrincipal[]) {
  const seenTokens = new Set<string>();

  for (const principal of principals) {
    if (seenTokens.has(principal.token)) {
      throw new Error(
        "Host operator token configuration contains duplicate token values."
      );
    }

    seenTokens.add(principal.token);
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
      token: singleToken
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
    return input.principals.find((principal) => principal.token === bearerToken);
  }

  if (!isWebSocketUpgrade(input.upgrade)) {
    return undefined;
  }

  const accessToken = extractWebSocketAccessToken(input.query);

  if (!accessToken) {
    return undefined;
  }

  return input.principals.find((principal) => principal.token === accessToken);
}

export function resolveUnauthorizedOperatorAuditPrincipal(
  principals: HostOperatorPrincipal[]
): Omit<HostOperatorPrincipal, "token"> {
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
