import type { GraphSpec, NodeBinding } from "./graph-spec.js";
import type {
  DeploymentResourceCatalog,
  GitServiceProfile,
  ModelEndpointProfile,
  RelayProfile
} from "../resources/catalog.js";
import type { ExternalPrincipalRecord } from "../resources/external-principal.js";
import type { GitRepositoryTarget } from "../artifacts/git-repository-target.js";

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function joinRemoteBasePath(
  remoteBase: string,
  namespace: string,
  repositoryName: string
): string {
  const parsed = new URL(remoteBase);
  const basePath = parsed.pathname.replace(/\/+$/, "");
  parsed.pathname = `${basePath}/${namespace}/${repositoryName}.git`;
  return parsed.toString();
}

export function intersectIdentifiers(
  values: string[],
  otherValues: string[]
): string[] {
  const lookup = new Set(otherValues);
  return values.filter((value) => lookup.has(value));
}

export function resolveEffectiveRelayProfileRefs(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string[] {
  if (node.resourceBindings.relayProfileRefs.length > 0) {
    return unique(node.resourceBindings.relayProfileRefs);
  }

  if (graph.defaults.resourceBindings.relayProfileRefs.length > 0) {
    return unique(graph.defaults.resourceBindings.relayProfileRefs);
  }

  return unique(catalog?.defaults.relayProfileRefs ?? []);
}

export function resolveEffectivePrimaryRelayProfileRef(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string | undefined {
  return (
    node.resourceBindings.primaryRelayProfileRef ??
    graph.defaults.resourceBindings.primaryRelayProfileRef ??
    catalog?.defaults.relayProfileRefs[0]
  );
}

export function resolveEffectiveGitServiceRefs(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string[] {
  if (node.resourceBindings.gitServiceRefs.length > 0) {
    return unique(node.resourceBindings.gitServiceRefs);
  }

  if (graph.defaults.resourceBindings.gitServiceRefs.length > 0) {
    return unique(graph.defaults.resourceBindings.gitServiceRefs);
  }

  return catalog?.defaults.gitServiceRef ? [catalog.defaults.gitServiceRef] : [];
}

export function resolveEffectivePrimaryGitServiceRef(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string | undefined {
  return (
    node.resourceBindings.primaryGitServiceRef ??
    graph.defaults.resourceBindings.primaryGitServiceRef ??
    catalog?.defaults.gitServiceRef
  );
}

export function resolveEffectiveModelEndpointProfileRef(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): string | undefined {
  return (
    node.resourceBindings.modelEndpointProfileRef ??
    graph.defaults.resourceBindings.modelEndpointProfileRef ??
    catalog?.defaults.modelEndpointRef
  );
}

export function resolveEffectiveExternalPrincipalRefs(
  node: NodeBinding,
  graph: GraphSpec
): string[] {
  if (node.resourceBindings.externalPrincipalRefs.length > 0) {
    return unique(node.resourceBindings.externalPrincipalRefs);
  }

  if (graph.defaults.resourceBindings.externalPrincipalRefs.length > 0) {
    return unique(graph.defaults.resourceBindings.externalPrincipalRefs);
  }

  return [];
}

export function resolveEffectiveExternalPrincipals(
  node: NodeBinding,
  graph: GraphSpec,
  principals: ExternalPrincipalRecord[] = []
): ExternalPrincipalRecord[] {
  const refs = resolveEffectiveExternalPrincipalRefs(node, graph);
  return refs.flatMap((ref) =>
    principals.filter((principal) => principal.principalId === ref)
  );
}

export function resolveEffectivePrimaryGitPrincipalRef(
  principals: ExternalPrincipalRecord[],
  primaryGitServiceRef?: string
): string | undefined {
  if (primaryGitServiceRef) {
    const matchingPrincipals = principals.filter(
      (principal) => principal.gitServiceRef === primaryGitServiceRef
    );

    return matchingPrincipals.length === 1
      ? matchingPrincipals[0]?.principalId
      : undefined;
  }

  return principals.length === 1 ? principals[0]?.principalId : undefined;
}

export function resolveEffectiveGitDefaultNamespace(
  gitServices: GitServiceProfile[],
  principals: ExternalPrincipalRecord[],
  primaryGitServiceRef?: string
): string | undefined {
  if (primaryGitServiceRef) {
    return gitServices.find((service) => service.id === primaryGitServiceRef)
      ?.defaultNamespace;
  }

  if (gitServices.length === 1) {
    return gitServices[0]?.defaultNamespace;
  }

  if (principals.length === 1) {
    return gitServices.find((service) => service.id === principals[0]?.gitServiceRef)
      ?.defaultNamespace;
  }

  return undefined;
}

export function resolvePrimaryGitRepositoryTarget(input: {
  defaultNamespace: string | undefined;
  gitServices: GitServiceProfile[];
  graphId: string;
  primaryGitServiceRef: string | undefined;
}): GitRepositoryTarget | undefined {
  if (!input.primaryGitServiceRef || !input.defaultNamespace) {
    return undefined;
  }

  const service = input.gitServices.find(
    (candidate) => candidate.id === input.primaryGitServiceRef
  );

  if (!service) {
    return undefined;
  }

  return {
    gitServiceRef: service.id,
    namespace: input.defaultNamespace,
    provisioningMode: service.provisioning.mode,
    remoteUrl: joinRemoteBasePath(
      service.remoteBase,
      input.defaultNamespace,
      input.graphId
    ),
    repositoryName: input.graphId,
    transportKind: service.transportKind
  };
}

export function resolveEffectiveRelayProfiles(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): RelayProfile[] {
  const refs = resolveEffectiveRelayProfileRefs(node, graph, catalog);
  const profiles = catalog?.relays ?? [];
  return refs.flatMap((ref) => profiles.filter((profile) => profile.id === ref));
}

export function resolveEffectiveGitServices(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): GitServiceProfile[] {
  const refs = resolveEffectiveGitServiceRefs(node, graph, catalog);
  const services = catalog?.gitServices ?? [];
  return refs.flatMap((ref) => services.filter((service) => service.id === ref));
}

export function resolveEffectiveModelEndpointProfile(
  node: NodeBinding,
  graph: GraphSpec,
  catalog?: DeploymentResourceCatalog
): ModelEndpointProfile | undefined {
  const ref = resolveEffectiveModelEndpointProfileRef(node, graph, catalog);
  return catalog?.modelEndpoints.find((endpoint) => endpoint.id === ref);
}
