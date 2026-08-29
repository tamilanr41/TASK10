import {
  countUsers,
  countScreenings,
  countScreeningsInTypes,
  allScreeningsSeverityValues,
  allScreeningsConditionValues,
  listRecentScreenings,
  screeningToDict,
} from "@/lib/db";
import { json, requireAdmin, isError } from "@/lib/http";

export async function GET() {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const [users, screenings, scalp, nails, combined] = await Promise.all([
    countUsers(),
    countScreenings(),
    countScreeningsInTypes(["scalp", "combined"]),
    countScreeningsInTypes(["nails", "combined"]),
    countScreeningsInTypes(["combined"]),
  ]);

  const severityDist: Record<string, number> = {};
  for (const row of await allScreeningsSeverityValues()) {
    const k = row.overall_severity || "unknown";
    severityDist[k] = (severityDist[k] || 0) + 1;
  }

  const mostCommon: Record<string, number> = {};
  for (const row of await allScreeningsConditionValues()) {
    const k = row.overall_condition || "unknown";
    mostCommon[k] = (mostCommon[k] || 0) + 1;
  }
  const topConditions = Object.entries(mostCommon)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([condition, count]) => ({ condition, count }));

  const recentRows = await listRecentScreenings(10);

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