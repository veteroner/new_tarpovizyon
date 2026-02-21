import { promises as fs } from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const rasyonDist = path.join(workspaceRoot, 'teknova rasyon mobil', 'dist');
const targetDir = path.join(workspaceRoot, 'public', 'rasyon');

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(rasyonDist))) {
    throw new Error(`Rasyon dist not found: ${rasyonDist}. Run rasyon build first.`);
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  // Node 18+ supports fs.cp
  await fs.cp(rasyonDist, targetDir, { recursive: true });

  console.log(`[sync-rasyon] Copied ${rasyonDist} -> ${targetDir}`);
}

main().catch((err) => {
  console.error('[sync-rasyon] Failed:', err);
  process.exitCode = 1;
});
