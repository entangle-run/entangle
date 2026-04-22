import { z } from "zod";

export const nodeKindSchema = z.enum([
  "user",
  "supervisor",
  "worker",
  "reviewer",
  "service"
]);

export const edgeRelationSchema = z.enum([
  "delegates_to",
  "reviews",
  "consults",
  "reports_to",
  "peer_collaborates_with",
  "routes_to",
  "escalates_to"
]);

export const runtimeProfileSchema = z.enum(["hackathon_local"]);

export type NodeKind = z.infer<typeof nodeKindSchema>;
export type EdgeRelation = z.infer<typeof edgeRelationSchema>;
export type RuntimeProfile = z.infer<typeof runtimeProfileSchema>;
