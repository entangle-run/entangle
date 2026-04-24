import {
  runtimeTraceEventTypePrefixes,
  runtimeRecoveryEventTypePrefixes,
  type HostEventFilter
} from "@entangle/host-client";
import type { HostEventRecord } from "@entangle/types";

export interface HostEventInspectionOptions {
  category?: HostEventRecord["category"];
  nodeId?: string;
  recoveryOnly?: boolean;
  runtimeTraceOnly?: boolean;
  typePrefixes?: string[];
}

function deduplicateStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

export function buildHostEventFilter(
  options: HostEventInspectionOptions
): HostEventFilter {
  const typePrefixes = deduplicateStrings([
    ...(options.typePrefixes ?? []),
    ...(options.recoveryOnly ? runtimeRecoveryEventTypePrefixes : []),
    ...(options.runtimeTraceOnly ? runtimeTraceEventTypePrefixes : [])
  ]);

  return {
    ...(options.category ? { categories: [options.category] } : {}),
    ...(options.nodeId ? { nodeId: options.nodeId } : {}),
    ...(typePrefixes.length > 0 ? { typePrefixes } : {})
  };
}
