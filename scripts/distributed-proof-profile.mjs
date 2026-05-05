const identifierPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const runtimeKinds = new Set([
  "agent_runner",
  "human_interface",
  "service_runner",
  "external_gateway"
]);
const agentEngineKinds = new Set([
  "opencode_server",
  "external_process",
  "external_http"
]);

export function normalizeDistributedProofProfile(value, options = {}) {
  const sourceLabel = options.sourceLabel ?? "Distributed proof profile";

  if (!isObject(value)) {
    throw new Error(`${sourceLabel} must contain a JSON object.`);
  }

  const schemaVersion = value.schemaVersion;
  if (schemaVersion !== 1) {
    throw new Error(`${sourceLabel} must declare schemaVersion 1.`);
  }

  const profile = {
    schemaVersion
  };

  copyOptionalUrl(profile, value, "hostUrl", sourceLabel, ["http:", "https:"]);
  copyOptionalIdentifier(profile, value, "agentRunnerId", sourceLabel);
  copyOptionalIdentifier(profile, value, "userRunnerId", sourceLabel);
  copyOptionalIdentifier(profile, value, "reviewerUserRunnerId", sourceLabel);
  copyOptionalIdentifier(profile, value, "agentNodeId", sourceLabel);
  copyOptionalIdentifier(profile, value, "userNodeId", sourceLabel);
  copyOptionalIdentifier(profile, value, "reviewerUserNodeId", sourceLabel);
  copyOptionalEnum(profile, value, "agentEngineKind", sourceLabel, agentEngineKinds);
  copyOptionalBoolean(profile, value, "checkRelayHealth", sourceLabel);
  copyOptionalBoolean(profile, value, "checkGitBackendHealth", sourceLabel);
  copyOptionalBoolean(profile, value, "checkPublishedGitRef", sourceLabel);
  copyOptionalBoolean(profile, value, "checkUserClientHealth", sourceLabel);
  copyOptionalBoolean(
    profile,
    value,
    "requireExternalUserClientUrls",
    sourceLabel
  );
  copyOptionalBoolean(profile, value, "requireConversation", sourceLabel);
  copyOptionalBoolean(profile, value, "requireArtifactEvidence", sourceLabel);
  copyOptionalBoolean(profile, value, "requirePublishedGitArtifact", sourceLabel);

  profile.relayUrls = normalizeStringArray(value.relayUrls, {
    allowedProtocols: ["ws:", "wss:"],
    itemLabel: "relay URL",
    key: "relayUrls",
    sourceLabel,
    url: true
  });
  profile.gitServiceRefs = normalizeStringArray(value.gitServiceRefs, {
    identifier: true,
    itemLabel: "git service ref",
    key: "gitServiceRefs",
    sourceLabel
  });
  profile.agentEngineKinds = normalizeStringArray(value.agentEngineKinds, {
    allowedValues: agentEngineKinds,
    itemLabel: "agent engine kind",
    key: "agentEngineKinds",
    sourceLabel
  });
  profile.assignments = normalizeAssignments(value.assignments, sourceLabel);

  if (!profile.agentEngineKind && profile.agentEngineKinds.length > 0) {
    profile.agentEngineKind = profile.agentEngineKinds[0];
  }

  if (
    profile.agentEngineKind &&
    profile.agentEngineKinds.length > 0 &&
    !profile.agentEngineKinds.includes(profile.agentEngineKind)
  ) {
    throw new Error(
      `${sourceLabel} agentEngineKind must also appear in agentEngineKinds.`
    );
  }

  validateAssignmentConsistency(profile, sourceLabel);

  return profile;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function copyOptionalIdentifier(target, source, key, sourceLabel) {
  const value = source[key];

  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceLabel} ${key} must be a non-empty string.`);
  }

  const normalized = value.trim();
  if (!identifierPattern.test(normalized)) {
    throw new Error(`${sourceLabel} ${key} must be a valid Entangle identifier.`);
  }

  target[key] = normalized;
}

function copyOptionalUrl(target, source, key, sourceLabel, allowedProtocols) {
  const value = source[key];

  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceLabel} ${key} must be a non-empty URL string.`);
  }

  const normalized = value.trim();
  validateUrl(normalized, `${sourceLabel} ${key}`, allowedProtocols);
  target[key] = normalized;
}

function copyOptionalEnum(target, source, key, sourceLabel, allowedValues) {
  const value = source[key];

  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || !allowedValues.has(value.trim())) {
    throw new Error(`${sourceLabel} ${key} contains an unsupported value.`);
  }

  target[key] = value.trim();
}

function copyOptionalBoolean(target, source, key, sourceLabel) {
  const value = source[key];

  if (value === undefined) {
    return;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${sourceLabel} ${key} must be a boolean.`);
  }

  target[key] = value;
}

function normalizeStringArray(value, options) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${options.sourceLabel} ${options.key} must be an array.`);
  }

  const normalized = [];
  const seen = new Set();

  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new Error(
        `${options.sourceLabel} ${options.key} entries must be non-empty strings.`
      );
    }

    const item = entry.trim();
    if (options.identifier && !identifierPattern.test(item)) {
      throw new Error(
        `${options.sourceLabel} ${options.itemLabel} '${item}' must be a valid Entangle identifier.`
      );
    }

    if (options.allowedValues && !options.allowedValues.has(item)) {
      throw new Error(
        `${options.sourceLabel} ${options.itemLabel} '${item}' is not supported.`
      );
    }

    if (options.url) {
      validateUrl(item, `${options.sourceLabel} ${options.itemLabel}`, options.allowedProtocols);
    }

    if (!seen.has(item)) {
      seen.add(item);
      normalized.push(item);
    }
  }

  return normalized;
}

function normalizeAssignments(value, sourceLabel) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${sourceLabel} assignments must be an array.`);
  }

  const assignments = [];
  const assignmentIds = new Set();

  for (const [index, entry] of value.entries()) {
    if (!isObject(entry)) {
      throw new Error(`${sourceLabel} assignments[${index}] must be an object.`);
    }

    const assignment = {};
    for (const key of ["assignmentId", "nodeId", "runnerId"]) {
      copyOptionalIdentifier(
        assignment,
        entry,
        key,
        `${sourceLabel} assignments[${index}]`
      );
      if (!assignment[key]) {
        throw new Error(
          `${sourceLabel} assignments[${index}] must include ${key}.`
        );
      }
    }

    assignment.runtimeKinds = normalizeStringArray(entry.runtimeKinds, {
      allowedValues: runtimeKinds,
      itemLabel: "runtime kind",
      key: "runtimeKinds",
      sourceLabel: `${sourceLabel} assignments[${index}]`
    });

    if (assignment.runtimeKinds.length === 0) {
      throw new Error(
        `${sourceLabel} assignments[${index}] must include at least one runtime kind.`
      );
    }

    if (assignmentIds.has(assignment.assignmentId)) {
      throw new Error(
        `${sourceLabel} assignments must not contain duplicate assignment id '${assignment.assignmentId}'.`
      );
    }

    assignmentIds.add(assignment.assignmentId);
    assignments.push(assignment);
  }

  return assignments;
}

function validateUrl(value, label, allowedProtocols) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new Error(
      `${label} must use one of: ${allowedProtocols
        .map((protocol) => protocol.slice(0, -1))
        .join(", ")}.`
    );
  }
}

function validateAssignmentConsistency(profile, sourceLabel) {
  const expectedAssignments = [
    {
      label: "agent",
      nodeId: profile.agentNodeId,
      runnerId: profile.agentRunnerId,
      runtimeKind: "agent_runner"
    },
    {
      label: "primary user",
      nodeId: profile.userNodeId,
      runnerId: profile.userRunnerId,
      runtimeKind: "human_interface"
    },
    {
      label: "reviewer user",
      nodeId: profile.reviewerUserNodeId,
      runnerId: profile.reviewerUserRunnerId,
      runtimeKind: "human_interface"
    }
  ];

  for (const expected of expectedAssignments) {
    if (!expected.nodeId || !expected.runnerId) {
      continue;
    }

    const assignment = profile.assignments.find(
      (entry) =>
        entry.nodeId === expected.nodeId && entry.runnerId === expected.runnerId
    );

    if (!assignment) {
      continue;
    }

    if (!assignment.runtimeKinds.includes(expected.runtimeKind)) {
      throw new Error(
        `${sourceLabel} ${expected.label} assignment must include runtime kind '${expected.runtimeKind}'.`
      );
    }
  }
}
