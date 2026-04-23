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

export const secretRefSchema = z.string().superRefine((value, context) => {
  if (/(^|\/)\.\.?(\/|$)/.test(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Secret references must not contain '.' or '..' path segments."
    });
    return;
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expected a valid secret:// reference."
    });
    return;
  }

  if (parsed.protocol !== "secret:") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Secret references must use the secret:// scheme."
    });
  }

  if (parsed.search || parsed.hash || parsed.username || parsed.password) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Secret references must not include query, fragment, username, or password components."
    });
  }

  const segments = [parsed.hostname, ...parsed.pathname.split("/").filter(Boolean)];

  if (segments.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Secret references must contain at least one path segment."
    });
    return;
  }

  for (const segment of segments) {
    if (!/^[A-Za-z0-9._-]+$/.test(segment)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Secret reference segments may only contain letters, numbers, dot, underscore, or dash."
      });
      return;
    }
  }
});

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
