import { getUserById, getScreeningById } from "@/lib/db";
import { jsonError, requireAuth, isError } from "@/lib/http";
import fs from "node:fs";
import path from "node:path";
import { UPLOAD_ROOT } from "@/lib/paths";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = await getUserById(session.userId);
  const screening = await getScreeningById(Number(ctx.params.id));

  if (!screening) return jsonError("Screening not found.", 404);
  if (screening.user_id !== user?.id && user?.role !== "admin") {
    return jsonError("You can only access your own reports.", 403);
  }
  if (!screening.report_path) return jsonError("No report found for this screening.", 404);

  const absPath = path.join(UPLOAD_ROOT, screening.report_path.replace(/\\/g, "/"));
  if (!fs.existsSync(absPath)) return jsonError("Report file is missing.", 404);

  const buf = fs.readFileSync(absPath);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dermai_screening_${screening.id}.pdf"`,
    },
  });
}