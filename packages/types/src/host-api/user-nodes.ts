import { z } from "zod";
import { nonEmptyStringSchema } from "../common/primitives.js";
import {
  userInteractionGatewayRecordSchema,
  userNodeIdentityRecordSchema
} from "../user-node/identity.js";

export const userNodeIdentityListResponseSchema = z.object({
  generatedAt: nonEmptyStringSchema,
  userNodes: z.array(userNodeIdentityRecordSchema)
});

export const userNodeIdentityInspectionResponseSchema = z.object({
  gateways: z.array(userInteractionGatewayRecordSchema).default([]),
  userNode: userNodeIdentityRecordSchema
});

export type UserNodeIdentityListResponse = z.infer<
  typeof userNodeIdentityListResponseSchema
>;
export type UserNodeIdentityInspectionResponse = z.infer<
  typeof userNodeIdentityInspectionResponseSchema
>;
