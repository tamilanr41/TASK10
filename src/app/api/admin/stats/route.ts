import db, { screeningToDict, ScreeningRow } from "@/lib/db";
import { json, requireAdmin, isError } from "@/lib/http";

export async function GET() {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const users = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  const screenings = (db.prepare("SELECT COUNT(*) AS n FROM screenings").get() as { n: number }).n;
  const scalp = (
    db
      .prepare("SELECT COUNT(*) AS n FROM screenings WHERE screening_type IN ('scalp','combined')")
      .get() as { n: number }
  ).n;
  const nails = (
    db
      .prepare("SELECT COUNT(*) AS n FROM screenings WHERE screening_type IN ('nails','combined')")
      .get() as { n: number }
  ).n;
  const combined = (
    db.prepare("SELECT COUNT(*) AS n FROM screenings WHERE screening_type = 'combined'").get() as {
      n: number;
    }
  ).n;

  const severityDist: Record<string, number> = {};
  for (const row of db.prepare("SELECT overall_severity FROM screenings").all() as Array<{
    overall_severity: string | null;
  }>) {
    const k = row.overall_severity || "unknown";
    severityDist[k] = (severityDist[k] || 0) + 1;
  }

  const mostCommon: Record<string, number> = {};
  for (const row of db.prepare("SELECT overall_condition FROM screenings").all() as Array<{
    overall_condition: string | null;
  }>) {
    const k = row.overall_condition || "unknown";
    mostCommon[k] = (mostCommon[k] || 0) + 1;
  }
  const topConditions = Object.entries(mostCommon)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([condition, count]) => ({ condition, count }));

  const recentRows = db
    .prepare("SELECT * FROM screenings ORDER BY created_at DESC LIMIT 10")
    .all() as ScreeningRow[];

  return json({
    total_users: users,
    total_screenings: screenings,
    scalp_screenings: scalp,
    nail_screenings: nails,
    combined_screenings: combined,
    severity_distribution: severityDist,
    most_common_predictions: topConditions,
    recent_activity: recentRows.map(screeningToDict),
    demo_mode: true,
  });
}