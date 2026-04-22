import type { GraphSpec, NodeBinding } from "./graph-spec.js";
import type {
  DeploymentResourceCatalog,
  GitServiceProfile,
  ModelEndpointProfile,
  RelayProfile
} from "../resources/catalog.js";

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
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
