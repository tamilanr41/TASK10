import path from "node:path";
import fs from "node:fs";

export const WEB_ROOT = process.cwd();

let storageRootCache: string | null = null;

/**
 * Resolve a writable storage directory. Honors `DATA_DIR` when it can be
 * created and written to, otherwise falls back to `<cwd>/data` (writable on
 * Render/Netlify). Prevents hard failures when DATA_DIR points at a
 * read-only location (e.g. EACCES on '/data').
 */
export function storageRoot(): string {
  if (storageRootCache) return storageRootCache;

  const candidates: string[] = [];
  if (process.env.DATA_DIR) candidates.push(path.resolve(String(process.env.DATA_DIR)));
  candidates.push(path.join(WEB_ROOT, "data"));

  for (const dir of candidates) {
    try {
      fs.mkdirSync(path.join(dir, "uploads"), { recursive: true });
      const probe = path.join(dir, ".write_probe");
      fs.writeFileSync(probe, "ok");
      fs.rmSync(probe, { force: true });
      storageRootCache = dir;
      console.log(`[storage] using ${dir}`);
      return dir;
    } catch {
      // try next candidate
    }
  }

  storageRootCache = candidates[candidates.length - 1] || path.join(WEB_ROOT, "data");
  return storageRootCache;
}

export function uploadRoot(): string {
  return path.join(storageRoot(), "uploads");
}

export function reportDir(): string {
  return path.join(storageRoot(), "uploads", "reports");
}

export function scalarImageDir(): string {
  return path.join(storageRoot(), "uploads", "scalp");
}

export function nailImageDir(): string {
  return path.join(storageRoot(), "uploads", "nails");
}

export const MODEL_VERSION = "demo-1.0";