import { z } from "zod";

export const builtinToolIds = [
  "inspect_artifact_input",
  "inspect_memory_ref",
  "inspect_session_state"
] as const;

export const builtinToolIdSchema = z.enum(builtinToolIds);

export type BuiltinToolId = z.infer<typeof builtinToolIdSchema>;
