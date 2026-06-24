import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

async function removePath(path) {
  await rm(path, { force: true, recursive: true });
  console.log(`removed ${path}`);
}

async function removePackageTurboCaches(scope) {
  let entries = [];

  try {
    entries = await readdir(join(root, scope), { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => removePath(join(root, scope, entry.name, ".turbo"))),
  );
}

await Promise.all([
  removePath(join(root, "apps", "web", ".next", "dev", "cache")),
  removePath(join(root, "apps", "web", ".next", "cache")),
  removePath(join(root, ".turbo")),
  removePackageTurboCaches("apps"),
  removePackageTurboCaches("packages"),
]);
