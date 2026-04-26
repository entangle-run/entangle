import {
  EntangleNostrFabric,
  type EntangleNostrFabricPool,
  type EntangleNostrFabricSubscription,
  type EntangleNostrPublishedEvent
} from "@entangle/nostr-fabric";
import type {
  EntangleControlEvent,
  EntangleObservationEvent,
  EntangleObservationEventPayload
} from "@entangle/types";

export class RunnerFederatedNostrTransport {
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

  publishObservationEvent(input: {
    authRequired?: boolean;
    causationEventId?: string;
    correlationId?: string;
    payload: EntangleObservationEventPayload;
    relayUrls: string[];
  }): Promise<EntangleNostrPublishedEvent<EntangleObservationEvent>> {
    return this.fabric.publishObservationEvent(input);
  }

  subscribeControlEvents(input: {
    authRequired?: boolean;
    expectedHostAuthorityPubkey: string;
    onEvent: (event: EntangleControlEvent) => Promise<void> | void;
    relayUrls: string[];
    runnerPubkey: string;
  }): Promise<EntangleNostrFabricSubscription> {
    return this.fabric.subscribeControlEvents({
      authRequired: input.authRequired,
      expectedHostAuthorityPubkey: input.expectedHostAuthorityPubkey,
      expectedRunnerPubkey: input.runnerPubkey,
      onEvent: input.onEvent,
      recipientPubkey: input.runnerPubkey,
      relayUrls: input.relayUrls
    });
  }
}
