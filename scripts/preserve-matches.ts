import { access, cp, mkdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const sourceDir = resolve(rootDir, "docs", "matches");
const backupDir = resolve(rootDir, ".tmp", "matches-backup");

const exists = async (path: string) => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const backup = async () => {
  await rm(backupDir, { recursive: true, force: true });

  if (!(await exists(sourceDir))) {
    console.log("[preserve-matches] docs/matches not found, skipping backup.");
    return;
  }

  await mkdir(resolve(rootDir, ".tmp"), { recursive: true });
  await cp(sourceDir, backupDir, { recursive: true });
  console.log("[preserve-matches] Backed up docs/matches.");
};

const restore = async () => {
  if (!(await exists(backupDir))) {
    console.log("[preserve-matches] Backup not found, skipping restore.");
    return;
  }

  await mkdir(resolve(rootDir, "docs"), { recursive: true });
  await cp(backupDir, sourceDir, { recursive: true });
  await rm(backupDir, { recursive: true, force: true });
  console.log("[preserve-matches] Restored docs/matches.");
};

const mode = process.argv[2];

if (mode === "backup") {
  await backup();
} else if (mode === "restore") {
  await restore();
} else {
  console.error("Usage: bun scripts/preserve-matches.ts <backup|restore>");
  process.exit(1);
}
