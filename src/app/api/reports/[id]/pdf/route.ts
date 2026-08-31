import { getUserById, getScreeningById, screeningToDict } from "@/lib/db";
import { jsonError, requireAuth, isError } from "@/lib/http";
import fs from "node:fs";
import path from "node:path";
import { uploadRoot } from "@/lib/paths";
import { generatePdfReport } from "@/lib/pdf";

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

  let buf: Buffer | null = null;

  // Prefer the report stored at screening time, if present.
  if (screening.report_path) {
    const absPath = path.join(uploadRoot(), screening.report_path.replace(/\\/g, "/"));
    if (fs.existsSync(absPath)) buf = fs.readFileSync(absPath);
  }

  // Generate a fresh, complete PDF from the stored screening on demand.
  if (!buf) {
    try {
      buf = await generatePdfReport(
        { name: user?.name, age: user?.age, sex: user?.sex, email: user?.email },
        screeningToDict(screening)
      );
    } catch (e) {
      console.error("[report] pdf generation failed", e);
      return jsonError("The report could not be generated.", 500);
    }
  }

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dermai_screening_${screening.id}.pdf"`,
    },
  });
}