import { NextRequest } from "next/server";
import { json, jsonError, requireAuth, isError } from "@/lib/http";
import { validateImageBuffer, saveImageBuffer, ImageValidationError } from "@/lib/images";
import { predictDemo } from "@/lib/ai/demoPredictor";
import { MODEL_VERSION } from "@/lib/paths";

const MODE = "demo";
const MODE_LABEL = "demo / prototype";

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isError(session)) return session;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError("Unable to read the uploaded form data.", 400);
  }

  const screeningType = String(formData.get("screening_type") || "")
    .trim()
    .toLowerCase();
  if (!["scalp", "nails", "combined"].includes(screeningType)) {
    return jsonError("Please select a valid screening area.", 400);
  }

  const needScalp = screeningType === "scalp" || screeningType === "combined";
  const needNail = screeningType === "nails" || screeningType === "combined";

  const scalpFile = formData.get("scalp_image");
  const nailFile = formData.get("nail_image");

  const result: Record<string, unknown> = { screening_type: screeningType, mode: MODE };
  let scalpInfo: Record<string, unknown> | null = null;
  let nailInfo: Record<string, unknown> | null = null;

  try {
    if (needScalp) {
      if (!(scalpFile instanceof File)) return jsonError("A scalp/hair image is required.", 400);
      const buf = Buffer.from(await scalpFile.arrayBuffer());
      scalpInfo = await validateImageBuffer(buf, scalpFile.name);
      scalpInfo.original_name = scalpFile.name;
    }
    if (needNail) {
      if (!(nailFile instanceof File)) return jsonError("A nail image is required.", 400);
      const buf = Buffer.from(await nailFile.arrayBuffer());
      nailInfo = await validateImageBuffer(buf, nailFile.name);
      nailInfo.original_name = nailFile.name;
    }
  } catch (e) {
    if (e instanceof ImageValidationError) {
      return jsonError(e.message, 400, { code: e.code });
    }
    return jsonError("The uploaded image could not be processed.", 400);
  }

  result["mode"] = MODE;
  result["model_version"] = MODEL_VERSION;

  const predictions: Record<string, unknown> = {};
  const paths: Record<string, string> = {};

  if (needScalp && scalpInfo && scalpFile instanceof File) {
    const buf = Buffer.from(await scalpFile.arrayBuffer());
    const rel = await saveImageBuffer(buf, "scalp");
    paths.scalp_image_path = rel;
    const pred = predictDemo(buf, Number(scalpInfo.width), Number(scalpInfo.height), "scalp");
    pred.image_path = rel;
    pred.server_url = `/api/uploads/${rel}`;
    predictions.scalp = pred;
  }

  if (needNail && nailInfo && nailFile instanceof File) {
    const buf = Buffer.from(await nailFile.arrayBuffer());
    const rel = await saveImageBuffer(buf, "nails");
    paths.nail_image_path = rel;
    const pred = predictDemo(buf, Number(nailInfo.width), Number(nailInfo.height), "nails");
    pred.image_path = rel;
    pred.server_url = `/api/uploads/${rel}`;
    predictions.nails = pred;
  }

  result.predictions = predictions;
  result.paths = paths;
  result.note =
    `Image analysis completed using the ${MODE_LABEL} engine. Individual image ` +
    "results are preliminary and will be combined with your symptom answers " +
    "to produce the final screening summary.";

  return json(result);
}