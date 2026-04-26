import {
  EntangleNostrFabric,
  type EntangleNostrFabricPool,
  type EntangleNostrFabricSubscription,
  type EntangleNostrPublishedEvent
} from "@entangle/nostr-fabric";
import type {
  EntangleControlEvent,
  EntangleControlEventPayload,
  EntangleObservationEvent
} from "@entangle/types";

export class HostFederatedNostrTransport {
  private readonly fabric: EntangleNostrFabric;

  constructor(input: {
    pool?: EntangleNostrFabricPool;
    secretKey: Uint8Array;
  }) {
    this.fabric = new EntangleNostrFabric(input);
  }

  close(): Promise<void> {
    return this.fabric.close();
  }

  publishControlEvent(input: {
    authRequired?: boolean;
    causationEventId?: string;
    correlationId?: string;
    payload: EntangleControlEventPayload;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleControlEvent>> {
    return this.fabric.publishControlEvent(input);
  }

  subscribeObservationEvents(input: {
    authRequired?: boolean;
    expectedRunnerPubkey?: string;
    hostAuthorityPubkey: string;
    onEvent: (event: EntangleObservationEvent) => Promise<void> | void;
    relayUrls: string[];
  }): Promise<EntangleNostrFabricSubscription> {
    return this.fabric.subscribeObservationEvents({
      authRequired: input.authRequired,
      expectedHostAuthorityPubkey: input.hostAuthorityPubkey,
      expectedRunnerPubkey: input.expectedRunnerPubkey,
      onEvent: input.onEvent,
      recipientPubkey: input.hostAuthorityPubkey,
      relayUrls: input.relayUrls
    });
  }
}
