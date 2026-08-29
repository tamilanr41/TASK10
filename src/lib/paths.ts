import path from "node:path";

export const WEB_ROOT = process.cwd();
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(WEB_ROOT, "data");
export const UPLOAD_ROOT = path.join(DATA_DIR, "uploads");
export const SCALP_UPLOAD_DIR = path.join(UPLOAD_ROOT, "scalp");
export const NAIL_UPLOAD_DIR = path.join(UPLOAD_ROOT, "nails");
export const REPORT_DIR = path.join(UPLOAD_ROOT, "reports");
export const DB_PATH = path.join(DATA_DIR, "dermai.db");
export const MODEL_VERSION = "demo-1.0";