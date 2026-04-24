import type { RuntimeInspectionResponse } from "@entangle/types";

export type RuntimeLifecycleAction = "start" | "stop" | "restart";

export function canStartRuntime(
  runtime: RuntimeInspectionResponse | null | undefined
): boolean {
  return runtime?.desiredState === "stopped";
}

export function canStopRuntime(
  runtime: RuntimeInspectionResponse | null | undefined
): boolean {
  return runtime?.desiredState === "running";
}

export function canRestartRuntime(
  runtime: RuntimeInspectionResponse | null | undefined
): boolean {
  return runtime?.desiredState === "running";
}

export function formatRuntimeLifecycleActionLabel(
  action: RuntimeLifecycleAction,
  pendingAction: RuntimeLifecycleAction | null
): string {
  if (pendingAction === action) {
    switch (action) {
      case "start":
        return "Starting...";
      case "stop":
        return "Stopping...";
      case "restart":
        return "Restarting...";
    }
  }

  switch (action) {
    case "start":
      return "Start";
    case "stop":
      return "Stop";
    case "restart":
      return "Restart";
  }
}
