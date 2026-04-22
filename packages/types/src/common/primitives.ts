import { z } from "zod";

export const identifierSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, {
    message:
      "Identifiers must be lowercase and may contain dot, underscore, or dash separators."
  });

export const nonEmptyStringSchema = z.string().trim().min(1);

export const filesystemPathSchema = nonEmptyStringSchema;

export const httpUrlSchema = z.string().url().regex(/^https?:\/\//, {
  message: "Expected an HTTP or HTTPS URL."
});

export const websocketUrlSchema = z.string().url().regex(/^wss?:\/\//, {
  message: "Expected a WS or WSS URL."
});

export const semverishVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/, {
    message: "Expected a semver-like version string."
  });

export type Identifier = z.infer<typeof identifierSchema>;
