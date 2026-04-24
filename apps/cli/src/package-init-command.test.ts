import { describe, expect, it } from "vitest";

import { buildPackageInitOptions } from "./package-init-command.js";

describe("buildPackageInitOptions", () => {
  it("maps CLI options into scaffold options", () => {
    expect(
      buildPackageInitOptions({
        defaultNodeKind: "supervisor",
        force: true,
        name: "Marketing Lead",
        packageId: "marketing-lead"
      })
    ).toEqual({
      defaultNodeKind: "supervisor",
      name: "Marketing Lead",
      overwrite: true,
      packageId: "marketing-lead"
    });
  });

  it("rejects invalid package ids and node kinds", () => {
    expect(() =>
      buildPackageInitOptions({
        packageId: "Not Valid"
      })
    ).toThrow();
    expect(() =>
      buildPackageInitOptions({
        defaultNodeKind: "manager"
      })
    ).toThrow();
  });
});

