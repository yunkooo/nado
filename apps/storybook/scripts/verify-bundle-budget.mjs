import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const STORY_ENTRY_BUDGET_BYTES = 100_000;
const PRODUCT_SHARED_CHUNK_BUDGET_BYTES = 150_000;
const PREVIEW_FRAMEWORK_CHUNK_BUDGET_BYTES = 1_200_000;
const MANAGER_RUNTIME_CHUNK_BUDGET_BYTES = 3_300_000;
const ADDON_MANAGER_CHUNK_BUDGET_BYTES = 600_000;
const outputDirectory = resolve("storybook-static");
const manifest = JSON.parse(
  readFileSync(resolve(outputDirectory, ".vite/manifest.json"), "utf8"),
);

const javascriptChunks = collectJavaScriptFiles(outputDirectory);
const chunkByRelativePath = new Map(
  javascriptChunks.map((chunk) => [chunk.relativePath, chunk]),
);
const storyEntries = Object.values(manifest).filter(
  (entry) => entry.src?.endsWith(".stories.tsx") && entry.file,
);
const storyEntryPaths = new Set(storyEntries.map((entry) => entry.file));
const productSharedPaths = new Set(
  storyEntries.flatMap((entry) =>
    (entry.imports ?? []).flatMap((importKey) => {
      const importedEntry = manifest[importKey];

      if (!importedEntry?.file || isFrameworkStoryImport(importedEntry)) {
        return [];
      }

      return [importedEntry.file];
    }),
  ),
);

const storyEntryChunks = readManifestChunks(storyEntryPaths);
const productSharedChunks = readManifestChunks(productSharedPaths);
const managerRuntimeChunks = javascriptChunks.filter(({ relativePath }) =>
  relativePath.startsWith("sb-manager/"),
);
const addonManagerChunks = javascriptChunks.filter(({ relativePath }) =>
  relativePath.startsWith("sb-addons/"),
);
const productPaths = new Set([...storyEntryPaths, ...productSharedPaths]);
const previewFrameworkChunks = javascriptChunks.filter(
  ({ relativePath }) =>
    !productPaths.has(relativePath) &&
    !relativePath.startsWith("sb-manager/") &&
    !relativePath.startsWith("sb-addons/"),
);

assertBudget(storyEntryChunks, STORY_ENTRY_BUDGET_BYTES, "Product story entry");
assertBudget(
  productSharedChunks,
  PRODUCT_SHARED_CHUNK_BUDGET_BYTES,
  "Product shared chunk",
);
assertBudget(
  previewFrameworkChunks,
  PREVIEW_FRAMEWORK_CHUNK_BUDGET_BYTES,
  "Storybook preview framework chunk",
);
assertBudget(
  managerRuntimeChunks,
  MANAGER_RUNTIME_CHUNK_BUDGET_BYTES,
  "Storybook manager runtime chunk",
);
assertBudget(
  addonManagerChunks,
  ADDON_MANAGER_CHUNK_BUDGET_BYTES,
  "Storybook addon manager chunk",
);

console.log("Storybook bundle budgets passed.");
for (const [label, chunks] of [
  ["Largest product story entry", storyEntryChunks],
  ["Largest product shared chunk", productSharedChunks],
  ["Largest preview framework chunk", previewFrameworkChunks],
  ["Largest manager runtime chunk", managerRuntimeChunks],
  ["Largest addon manager chunk", addonManagerChunks],
]) {
  const largestChunk = chunks.toSorted((a, b) => b.size - a.size)[0];

  console.log(
    largestChunk
      ? `${label}: ${largestChunk.relativePath} (${formatKilobytes(largestChunk.size)})`
      : `${label}: none`,
  );
}

function collectJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return collectJavaScriptFiles(absolutePath);
    }

    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      return [];
    }

    return [
      {
        relativePath: relative(outputDirectory, absolutePath),
        size: statSync(absolutePath).size,
      },
    ];
  });
}

function isFrameworkStoryImport(entry) {
  return (
    entry.src === "iframe.html" ||
    ["iframe", "jsx-runtime", "preload-helper", "react-dom", "react"].includes(
      entry.name,
    )
  );
}

function readManifestChunks(paths) {
  return [...paths].flatMap((path) => {
    const chunk = chunkByRelativePath.get(path);

    if (!chunk) {
      throw new Error(
        `Missing Storybook bundle chunk declared in manifest: ${path}`,
      );
    }

    return [chunk];
  });
}

function formatKilobytes(bytes) {
  return `${(bytes / 1_000).toFixed(1)}KB`;
}

function assertBudget(chunks, budget, label) {
  const oversizedChunks = chunks.filter(({ size }) => size > budget);

  if (oversizedChunks.length === 0) {
    return;
  }

  const details = oversizedChunks
    .map(
      ({ relativePath, size }) => `- ${relativePath}: ${formatKilobytes(size)}`,
    )
    .join("\n");

  throw new Error(
    `${label} budget ${formatKilobytes(budget)} exceeded:\n${details}`,
  );
}
