import path from "node:path";
import type { GitArtifactLocator } from "../artifacts/artifact-ref.js";
import {
  buildGitRepositoryTarget,
  type GitRepositoryTarget
} from "../artifacts/git-repository-target.js";
import type { ArtifactRuntimeContext } from "./runtime-context.js";

export type RuntimeGitPrincipalBinding =
  ArtifactRuntimeContext["gitPrincipalBindings"][number];

export type GitPrincipalBindingResolution =
  | {
      binding: RuntimeGitPrincipalBinding;
      status: "resolved";
    }
  | {
      candidatePrincipalIds: string[];
      status: "ambiguous";
    }
  | {
      status: "missing";
    };

function deriveSiblingRemoteUrlFromPrimaryTarget(input: {
  namespace: string;
  primaryTarget: GitRepositoryTarget;
  repositoryName: string;
}): string | undefined {
  if (input.namespace !== input.primaryTarget.namespace) {
    return undefined;
  }

  if (input.repositoryName === input.primaryTarget.repositoryName) {
    return input.primaryTarget.remoteUrl;
  }

  const expectedBasename = `${input.primaryTarget.repositoryName}.git`;

  if (!input.primaryTarget.remoteUrl.includes("://")) {
    if (path.basename(input.primaryTarget.remoteUrl) !== expectedBasename) {
      return undefined;
    }

    return path.join(
      path.dirname(input.primaryTarget.remoteUrl),
      `${input.repositoryName}.git`
    );
  }

  const parsed = new URL(input.primaryTarget.remoteUrl);

  if (path.posix.basename(parsed.pathname) !== expectedBasename) {
    return undefined;
  }

  parsed.pathname = path.posix.join(
    path.posix.dirname(parsed.pathname),
    `${input.repositoryName}.git`
  );
  return parsed.toString();
}

export function resolveGitPrincipalBindingForService(input: {
  artifactContext: ArtifactRuntimeContext;
  gitServiceRef: string;
}): GitPrincipalBindingResolution {
  const candidateBindings = input.artifactContext.gitPrincipalBindings.filter(
    (binding) => binding.principal.gitServiceRef === input.gitServiceRef
  );

  if (candidateBindings.length === 0) {
    return {
      status: "missing"
    };
  }

  if (input.artifactContext.primaryGitPrincipalRef) {
    const primaryBinding = candidateBindings.find(
      (binding) =>
        binding.principal.principalId ===
        input.artifactContext.primaryGitPrincipalRef
    );

    if (primaryBinding) {
      return {
        binding: primaryBinding,
        status: "resolved"
      };
    }
  }

  if (candidateBindings.length === 1) {
    const binding = candidateBindings[0]!;

    return {
      binding,
      status: "resolved"
    };
  }

  return {
    candidatePrincipalIds: candidateBindings.map(
      (binding) => binding.principal.principalId
    ),
    status: "ambiguous"
  };
}

export function resolveGitRepositoryTargetForArtifactLocator(input: {
  artifactContext: ArtifactRuntimeContext;
  locator: GitArtifactLocator;
}): GitRepositoryTarget | undefined {
  if (
    !input.locator.gitServiceRef ||
    !input.locator.namespace ||
    !input.locator.repositoryName
  ) {
    return undefined;
  }

  const service = input.artifactContext.gitServices.find(
    (candidate) => candidate.id === input.locator.gitServiceRef
  );

  if (!service) {
    return undefined;
  }

  const primaryTarget = input.artifactContext.primaryGitRepositoryTarget;

  if (
    primaryTarget &&
    primaryTarget.gitServiceRef === input.locator.gitServiceRef &&
    primaryTarget.namespace === input.locator.namespace
  ) {
    const derivedRemoteUrl = deriveSiblingRemoteUrlFromPrimaryTarget({
      namespace: input.locator.namespace,
      primaryTarget,
      repositoryName: input.locator.repositoryName
    });

    if (derivedRemoteUrl) {
      return {
        gitServiceRef: service.id,
        namespace: input.locator.namespace,
        provisioningMode: service.provisioning.mode,
        remoteUrl: derivedRemoteUrl,
        repositoryName: input.locator.repositoryName,
        transportKind: service.transportKind
      };
    }
  }

  return buildGitRepositoryTarget({
    namespace: input.locator.namespace,
    repositoryName: input.locator.repositoryName,
    service
  });
}
