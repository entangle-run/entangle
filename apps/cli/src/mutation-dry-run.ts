export type CliMutationDryRun = {
  dryRun: true;
  mutation: string;
  request?: unknown;
  target?: Record<string, boolean | number | string>;
};

export function buildCliMutationDryRun(input: {
  mutation: string;
  request?: unknown;
  target?: Record<string, boolean | number | string>;
}): CliMutationDryRun {
  return {
    dryRun: true,
    mutation: input.mutation,
    ...(input.request === undefined ? {} : { request: input.request }),
    ...(input.target && Object.keys(input.target).length > 0
      ? { target: input.target }
      : {})
  };
}
