import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import path from "node:path";
import { uploadRoot } from "./paths";
import { imageToBytes } from "./images";

export const PDF_DISCLAIMER =
  "DermAI is an AI-assisted screening tool developed for educational and " +
  "preliminary assessment purposes only. It does not provide a medical " +
  "diagnosis and should not replace consultation with a qualified " +
  "dermatologist or healthcare professional.";

const BRAND = rgb(0.055, 0.455, 0.565);
const GREY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.878, 0.949, 0.969);
const GRID = rgb(0.796, 0.835, 0.882);
const BLACK = rgb(0, 0, 0);

const MARGIN = 48;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawText(
  doc: PDFDocument,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  opts: { color?: typeof BLACK; maxWidth?: number; lineHeight?: number } = {}
) {
  const page = doc.getPages()[doc.getPageCount() - 1];
  const lines = opts.maxWidth ? wrapText(font, text, size, opts.maxWidth) : [text];
  const color = opts.color || BLACK;
  const lh = opts.lineHeight || size * 1.4;
  let yy = y;
  for (const line of lines) {
    page.drawText(line, { x, y: yy, size, font, color });
    yy -= lh;
  }
}

function heading(doc: PDFDocument, bold: PDFFont, text: string, y: number): number {
  drawText(doc, bold, text, MARGIN, y, 13, { color: BRAND });
  return y + 13;
}

function table(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  rows: Array<[string, string]>,
  y: number,
  colWidths: [number, number]
): number {
  const page = doc.getPages()[doc.getPageCount() - 1];
  const lh = 14;
  const size = 9;
  let yy = y;
  rows.forEach((row, idx) => {
    const [k, v] = row;
    const cellH = Math.max(1, Math.ceil(v.length / 52));
    page.drawLine({
      start: { x: MARGIN, y: yy - 8 },
      end: { x: MARGIN + CONTENT_W, y: yy - 8 },
      thickness: 0.4,
      color: GRID,
    });
    page.drawRectangle({
      x: MARGIN,
      y: yy - 8 - (cellH - 1) * lh,
      width: colWidths[0],
      height: (cellH - 1) * lh + 16,
      color: idx % 2 === 0 ? LIGHT : rgb(1, 1, 1),
      opacity: 1,
    });
    drawText(doc, bold, k, MARGIN + 6, yy - 2, size, { maxWidth: colWidths[0] - 12 });
    drawText(doc, font, v, MARGIN + colWidths[0] + 6, yy - 2, size, {
      maxWidth: colWidths[1] - 12,
    });
    yy -= 16 + (cellH - 1) * lh;
  });
  return yy;
}

type AnyScreening = Record<string, unknown> & {
  predictions?: Record<string, unknown>;
};

export async function generatePdfReport(
  user: Record<string, unknown>,
  screening: AnyScreening
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const val = (a: Record<string, unknown>, k: string, dflt = "-") => {
    const v = a[k];
    return v === null || v === undefined || v === "" ? dflt : String(v);
  };
  const yesNo = (a: Record<string, unknown>, k: string) => {
    const v = a[k];
    if (v === true) return "Yes";
    if (v === false) return "No";
    return val(a, k);
  };

  drawText(doc, bold, "DermAI", MARGIN, y, 20, { color: BRAND });
  y -= 16;
  drawText(doc, font, "AI-Driven Multimodal Dermatological Screening System", MARGIN, y, 10, { color: GREY });
  y -= 24;

  // ---- user info
  heading(doc, bold, "User Information", y);
  y += 16;
  y = table(
    doc,
    font,
    bold,
    [
      ["Full name", val(user, "name")],
      ["Age", val(user, "age")],
      ["Sex", val(user, "sex")],
      ["Email", val(user, "email")],
    ],
    y,
    [150, 297]
  );
  y -= 16;
  if (y < 120) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }

  // ---- screening meta
  heading(doc, bold, "Screening", y);
  y += 16;
  y = table(
    doc,
    font,
    bold,
    [
      ["Screening ID", `#${screening.id}`],
      ["Date", val(screening, "created_at")],
      ["Screening type", val(screening, "screening_type")],
      ["Mode", screening.mode === "real" ? "Real CNN" : "Demo / prototype"],
      ["AI model version", val(screening, "model_version")],
    ],
    y,
    [150, 297]
  );
  y -= 16;
  if (y < 120) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }

  // ---- images
  for (const [label, rel] of [
    ["Scalp/hair image", screening.scalp_image_path as string | null],
    ["Nail image", screening.nail_image_path as string | null],
  ] as Array<[string, string | null]>) {
    if (!rel) continue;
    const bytes = await imageToBytes(path.join(uploadRoot(), rel), 600);
    if (!bytes) continue;
    if (y < 200) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }
    heading(doc, bold, label, y);
    y += 26;
    try {
      const img = await doc.embedJpg(bytes);
      const ratio = Math.min(190 / img.width, 240 / img.height, 1);
      page.drawImage(img, { x: MARGIN, y: y - img.height * ratio, width: img.width * ratio, height: img.height * ratio });
      y -= img.height * ratio + 16;
    } catch {
      drawText(doc, font, "(Image could not be embedded)", MARGIN, y, 9, { color: GREY });
      y -= 12;
    }
  }

  // ---- symptoms
  const symptoms = (screening.symptoms as Record<string, unknown>) || {};
  const answers = (symptoms.answers as Record<string, unknown>) || symptoms;
  if (y < 180) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }
  heading(doc, bold, "Symptoms", y);
  y += 14;
  y = table(
    doc,
    font,
    bold,
    [
      ["How long noticed", val(answers, "duration")],
      ["Trend", val(answers, "trend")],
      ["Severity level", val(answers, "severity_level")],
      ["Itching", yesNo(answers, "itching")],
      ["Itching severity (0-10)", val(answers, "itching_severity")],
      ["Scaling (0-10)", val(answers, "scaling")],
      ["Hair fall (0-10)", val(answers, "hair_fall")],
      ["Excessive dandruff", yesNo(answers, "dandruff_excess")],
      ["Scalp redness", yesNo(answers, "scalp_redness")],
      ["Hair thinning increased", val(answers, "thinning_increase")],
      ["Patchy hair loss", yesNo(answers, "patchy_hair_loss")],
      ["Nail brittle", yesNo(answers, "nail_brittle")],
      ["Nail discoloration", yesNo(answers, "nail_discoloration")],
      ["Nail thickening", yesNo(answers, "nail_thickening")],
      ["Nail separation", yesNo(answers, "nail_separation")],
      ["Nail pain", yesNo(answers, "nail_pain")],
      ["Affected nail type", val(answers, "nail_location")],
      ["Water intake", val(answers, "water_intake")],
      ["Sleep hours", val(answers, "sleep_hours")],
      ["Diet", val(answers, "diet_overall")],
    ],
    y,
    [170, 277]
  );
  y -= 14;
  if (y < 160) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }

  // ---- results
  const pred = (screening.predictions as Record<string, unknown>) || {};
  const findings = (pred.findings as Record<string, Record<string, unknown>>) || {};
  if (y < 180) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }
  heading(doc, bold, "AI Screening Result", y);
  y += 14;
  if (screening.mode !== "real") {
    drawText(doc, bold, "DEMO / PROTOTYPE AI RESULT - produced by the built-in prototype engine, not a trained medical model.", MARGIN, y, 9, { color: GREY, maxWidth: CONTENT_W });
    y -= 12;
  }
  const resultRows: Array<[string, string]> = [
    ["Overall condition", val(screening, "overall_condition")],
    ["Overall confidence", `${val(screening, "overall_confidence")}%`],
    ["Overall severity", val(screening, "overall_severity")],
    ["Summary", val(screening, "summary_text")],
  ];
  for (const [kind, f] of Object.entries(findings)) {
    resultRows.push([`${kind[0].toUpperCase() + kind.slice(1)} possible condition`, String(f.label || "-")]);
    resultRows.push([`${kind[0].toUpperCase() + kind.slice(1)} confidence`, `${String(f.confidence || "-")}%`]);
    resultRows.push([`${kind[0].toUpperCase() + kind.slice(1)} severity`, String(f.severity || "-")]);
    resultRows.push([`${kind[0].toUpperCase() + kind.slice(1)} explanation`, String(f.explanation || "-")]);
  }
  y = table(doc, font, bold, resultRows, y, [170, 277]);
  y -= 14;
  if (y < 160) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }

  // ---- recommendations
  const rec = (screening.recommendations as Record<string, unknown>) || {};
  if (y < 180) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }
  heading(doc, bold, "Recommendations", y);
  y += 14;
  const recRows: Array<[string, string]> = [["Severity guidance", String(rec.severity_guidance || "-")]];
  for (const [cat, label] of [
    ["general_precautions", "General precautions"],
    ["home_care_suggestions", "General home-care suggestions"],
    ["things_to_avoid", "Things to avoid"],
    ["when_to_consult", "When to consult a doctor"],
  ] as Array<[string, string]>) {
    const items = (rec[cat] as string[]) || [];
    recRows.push([label, items.map((i) => `• ${i}`).join("\n")]);
  }
  y = table(doc, font, bold, recRows, y, [170, 277]);
  y -= 14;
  if (y < 160) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }

  // ---- nutrition
  const nutr = (screening.nutrition_insights as Record<string, unknown>) || {};
  if (y < 200) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }
  heading(doc, bold, "Nutrition & Hydration", y);
  y += 14;
  const nutrRows: Array<[string, string]> = [];
  for (const insight of (nutr.insights as Array<Record<string, unknown>>) || []) {
    nutrRows.push([String(insight.nutrient || "-"), String(insight.insight || "-")]);
    nutrRows.push(["Food suggestions", ((insight.food_suggestions as string[]) || []).map((f) => `• ${f}`).join("\n")]);
  }
  const hydration = (nutr.hydration as Record<string, unknown>) || {};
  if (hydration.guidance) nutrRows.push(["Hydration", String(hydration.guidance)]);
  if (nutrRows.length) {
    y = table(doc, font, bold, nutrRows, y, [170, 277]);
  } else {
    drawText(doc, font, "No specific nutritional considerations were triggered.", MARGIN, y, 9);
  }
  y -= 14;
  if (y < 180) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }

  // ---- doctor consultation
  const docrec = (screening.doctor_recommendation as Record<string, unknown>) || {};
  if (y < 200) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }
  heading(doc, bold, "Doctor Consultation", y);
  y += 14;
  const docRows: Array<[string, string]> = [["Consultation advice", String(docrec.suggest_text || "-")]];
  for (const d of (docrec.matched as Array<Record<string, unknown>>) || []) {
    docRows.push(["Doctor", String(d.name || "-")]);
    docRows.push(["Specialization", String(d.specialization || "-")]);
    docRows.push(["Clinic", String(d.clinic || "-")]);
    docRows.push(["Location", String(d.location || "-")]);
    docRows.push(["Contact", String(d.contact || "-")]);
    if (d.is_sample) docRows.push(["Note", "Sample/placeholder doctor for the college prototype."]);
  }
  y = table(doc, font, bold, docRows, y, [170, 277]);
  y -= 20;

  if (y < 140) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }
  heading(doc, bold, "Medical Disclaimer", y);
  y += 12;
  drawText(doc, font, PDF_DISCLAIMER, MARGIN, y, 9, { color: GREY, maxWidth: CONTENT_W, lineHeight: 12 });
  y -= 16;
  drawText(
    doc,
    font,
    "Screening results are AI-estimated likelihoods for educational purposes. They do not establish a diagnosis, a confirmed deficiency or a treatment plan.",
    MARGIN,
    y,
    9,
    { color: GREY, maxWidth: CONTENT_W, lineHeight: 12 }
  );

  return Buffer.from(await doc.save());
}