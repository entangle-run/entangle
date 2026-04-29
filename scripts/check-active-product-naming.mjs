#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const roots = [
  "README.md",
  "apps",
  "deploy",
  "examples",
  "package.json",
  "packages",
  "scripts",
  "services"
];

const ignoredDirectoryNames = new Set([
  ".turbo",
  "coverage",
  "dist",
  "node_modules"
]);

const checkedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yml"
]);

const forbiddenPatterns = [
  {
    label: "old product slug",
    pattern: new RegExp("entangle" + "-local", "iu")
  },
  {
    label: "old product name",
    pattern: new RegExp("Entangle " + "Local", "u")
  },
  {
    label: "old runtime profile",
    pattern: new RegExp("hackathon" + "_local", "u")
  },
  {
    label: "old release milestone",
    pattern: new RegExp("Local " + "GA", "u")
  }
];

const findings = [];

for (const root of roots) {
  await scanPath(path.resolve(root));
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line}: forbidden ${finding.label}: ${finding.match}`
    );
  }
  process.exit(1);
}

console.log("active product naming check passed");

async function scanPath(filePath) {
  const fileStat = await stat(filePath);

  if (fileStat.isDirectory()) {
    if (ignoredDirectoryNames.has(path.basename(filePath))) {
      return;
    }

    const entries = await readdir(filePath, { withFileTypes: true });
    await Promise.all(
      entries.map((entry) => scanPath(path.join(filePath, entry.name)))
    );
    return;
  }

  if (!fileStat.isFile() || !shouldCheckFile(filePath)) {
    return;
  }

  const content = await readFile(filePath, "utf8");
  const lines = content.split("\n");

  for (const [index, line] of lines.entries()) {
    for (const forbidden of forbiddenPatterns) {
      const match = forbidden.pattern.exec(line);
      if (match) {
        findings.push({
          file: path.relative(process.cwd(), filePath),
          label: forbidden.label,
          line: index + 1,
          match: match[0]
        });
      }
    }
  }
}

function shouldCheckFile(filePath) {
  if (path.basename(filePath).startsWith(".")) {
    return false;
  }

  return checkedExtensions.has(path.extname(filePath));
}
