import { createHash } from "node:crypto";
import type { EntangleA2AMessage } from "@entangle/types";

export type RunnerInboundEnvelope = {
  eventId: string;
  message: EntangleA2AMessage;
  receivedAt: string;
  signerPubkey?: string;
};

export type RunnerPublishedEnvelope = RunnerInboundEnvelope;

export interface RunnerTransportSubscription {
  close(): Promise<void>;
}

export interface RunnerTransport {
  close(): Promise<void>;
  publish(message: EntangleA2AMessage): Promise<RunnerPublishedEnvelope>;
  subscribe(input: {
    onMessage: (envelope: RunnerInboundEnvelope) => Promise<void> | void;
    recipientPubkey: string;
  }): Promise<RunnerTransportSubscription>;
}

type MemoryTransportListener = {
  onMessage: (envelope: RunnerInboundEnvelope) => Promise<void> | void;
  recipientPubkey: string;
};

function nowIsoString(): string {
  return new Date().toISOString();
}

function buildEventId(message: EntangleA2AMessage, receivedAt: string): string {
  return createHash("sha256")
    .update(JSON.stringify(message))
    .update("\n")
    .update(receivedAt)
    .digest("hex");
}

export class InMemoryRunnerTransport implements RunnerTransport {
  private readonly listeners = new Set<MemoryTransportListener>();
  private readonly publishedEnvelopes: RunnerPublishedEnvelope[] = [];

  close(): Promise<void> {
    this.listeners.clear();
    return Promise.resolve();
  }

  listPublishedEnvelopes(): RunnerPublishedEnvelope[] {
    return [...this.publishedEnvelopes];
  }

  async publish(message: EntangleA2AMessage): Promise<RunnerPublishedEnvelope> {
    const receivedAt = nowIsoString();
    const envelope: RunnerPublishedEnvelope = {
      eventId: buildEventId(message, receivedAt),
      message,
      receivedAt,
      signerPubkey: message.fromPubkey
    };

    this.publishedEnvelopes.push(envelope);

    await Promise.all(
      [...this.listeners]
        .filter((listener) => listener.recipientPubkey === message.toPubkey)
        .map((listener) => Promise.resolve(listener.onMessage(envelope)))
    );

    return envelope;
  }

  subscribe(input: {
    onMessage: (envelope: RunnerInboundEnvelope) => Promise<void> | void;
    recipientPubkey: string;
  }): Promise<RunnerTransportSubscription> {
    const listener: MemoryTransportListener = {
      onMessage: input.onMessage,
      recipientPubkey: input.recipientPubkey
    };
    this.listeners.add(listener);

    return Promise.resolve({
      close: () => {
        this.listeners.delete(listener);
        return Promise.resolve();
      }
    });
  }
}
