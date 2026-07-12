import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const DESKTOP_JAVASCRIPT_CHUNK_BUDGET_BYTES = 500_000;
const assetsDirectory = resolve("dist/assets");
const javascriptChunks = readdirSync(assetsDirectory)
  .filter((fileName) => fileName.endsWith(".js"))
  .map((fileName) => ({
    fileName,
    size: statSync(resolve(assetsDirectory, fileName)).size,
  }));
const oversizedChunks = javascriptChunks.filter(
  ({ size }) => size > DESKTOP_JAVASCRIPT_CHUNK_BUDGET_BYTES,
);

if (oversizedChunks.length > 0) {
  const details = oversizedChunks
    .map(({ fileName, size }) => `- ${fileName}: ${formatKilobytes(size)}`)
    .join("\n");

  throw new Error(
    `Desktop JavaScript chunk budget ${formatKilobytes(DESKTOP_JAVASCRIPT_CHUNK_BUDGET_BYTES)} exceeded:\n${details}`,
  );
}

const largestChunk = javascriptChunks.toSorted((a, b) => b.size - a.size)[0];

console.log(
  largestChunk
    ? `Desktop bundle budget passed. Largest chunk: ${largestChunk.fileName} (${formatKilobytes(largestChunk.size)})`
    : "Desktop bundle budget passed. No JavaScript chunks found.",
);

function formatKilobytes(bytes) {
  return `${(bytes / 1_000).toFixed(1)}KB`;
}
