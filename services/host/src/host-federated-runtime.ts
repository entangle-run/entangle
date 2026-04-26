import type { EntangleNostrFabricSubscription } from "@entangle/nostr-fabric";
import type { CatalogInspectionResponse } from "@entangle/types";
import {
  HostFederatedControlPlane,
  type HostFederatedControlPlaneTransport
} from "./federated-control-plane.js";
import { HostFederatedNostrTransport } from "./federated-nostr-transport.js";
import {
  exportHostAuthority,
  getCatalogInspection,
  initializeHostState
} from "./state.js";

export type HostFederatedRuntime = {
  close(): Promise<void>;
  controlPlane: HostFederatedControlPlane;
  relayUrls: string[];
  subscription: EntangleNostrFabricSubscription;
};

export function resolveHostFederatedRelayUrls(input: {
  catalog?: CatalogInspectionResponse["catalog"];
}): string[] {
  const catalog = input.catalog;

  if (!catalog) {
    return [];
  }

  const defaultRelayRefs = new Set(catalog.defaults.relayProfileRefs);
  const selectedRelays =
    defaultRelayRefs.size > 0
      ? catalog.relays.filter((relay) => defaultRelayRefs.has(relay.id))
      : catalog.relays;

  return [
    ...new Set(
      selectedRelays.flatMap((relay) => [
        ...relay.readUrls,
        ...relay.writeUrls
      ])
    )
  ].sort((left, right) => left.localeCompare(right));
}

export async function startHostFederatedControlPlane(input: {
  authRequired?: boolean;
  relayUrls?: string[];
  transport?: HostFederatedControlPlaneTransport;
} = {}): Promise<HostFederatedRuntime | undefined> {
  await initializeHostState();
  const [authorityExport, catalogInspection] = await Promise.all([
    exportHostAuthority(),
    getCatalogInspection()
  ]);
  const relayUrls =
    input.relayUrls ?? resolveHostFederatedRelayUrls(catalogInspection);

  if (relayUrls.length === 0) {
    return undefined;
  }

  const secretKey = Uint8Array.from(Buffer.from(authorityExport.secretKey, "hex"));
  const transport =
    input.transport ??
    new HostFederatedNostrTransport({
      secretKey
    });
  const controlPlane = new HostFederatedControlPlane({
    transport
  });

  try {
    const subscription = await controlPlane.subscribeObservationEvents({
      ...(input.authRequired !== undefined
        ? { authRequired: input.authRequired }
        : {}),
      hostAuthorityPubkey: authorityExport.authority.publicKey,
      relayUrls
    });

    return {
      close: async () => {
        await subscription.close();
        await controlPlane.close();
      },
      controlPlane,
      relayUrls,
      subscription
    };
  } catch (error) {
    await controlPlane.close();
    throw error;
  }
}
