import type { CreateAgentPackageOptions } from "@entangle/package-scaffold";
import { identifierSchema, nodeKindSchema } from "@entangle/types";

export type PackageInitCliOptions = {
  defaultNodeKind?: string;
  force?: boolean;
  name?: string;
  packageId?: string;
};

function normalizeOptionalText(input: string | undefined): string | undefined {
  const normalized = input?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function buildPackageInitOptions(
  options: PackageInitCliOptions
): CreateAgentPackageOptions {
  const name = normalizeOptionalText(options.name);
  const packageId = normalizeOptionalText(options.packageId);
  const defaultNodeKind = normalizeOptionalText(options.defaultNodeKind);

  return {
    ...(defaultNodeKind
      ? { defaultNodeKind: nodeKindSchema.parse(defaultNodeKind) }
      : {}),
    ...(name ? { name } : {}),
    overwrite: options.force ?? false,
    ...(packageId ? { packageId: identifierSchema.parse(packageId) } : {})
  };
}

