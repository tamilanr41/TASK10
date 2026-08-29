export type DoctorRow = {
  id?: number;
  name?: string;
  specialization?: string;
  city?: string | null;
  location?: string | null;
  clinic?: string | null;
  contact?: string | null;
  is_sample?: number | boolean;
  is_active?: number | boolean;
};

export function filterDoctors(
  query: Record<string, unknown>,
  doctors: DoctorRow[]
): DoctorRow[] {
  const city = String(query.city || "").trim().toLowerCase();
  const area = String(query.screening_area || "").trim().toLowerCase();
  const severity = String(query.severity || "").trim().toLowerCase();

  const matched = doctors.filter((d) => {
    if (d.is_active !== undefined && !d.is_active) return false;
    const haystack = [d.city, d.location, d.clinic, d.specialization]
      .join(" ")
      .toLowerCase();
    if (city && !haystack.includes(city)) return false;
    return true;
  });

  const score = (d: DoctorRow): number => {
    const haystack = [d.city, d.location].join(" ").toLowerCase();
    let s = 0;
    if (city && haystack.includes(city)) {
      s += d.city && city === (d.city || "").toLowerCase() ? 100 : 40;
    }
    if (area === "nails") s += 5;
    if (severity === "high" || severity === "severe") s += 3;
    return s;
  };

  return matched.sort((a, b) => score(b) - score(a));
}

export function suggestConsultText(screeningType: string, severity: string): string {
  if (severity === "high") {
    return (
      "We clearly recommend that you schedule a consultation with a " +
      "qualified dermatologist or healthcare professional."
    );
  }
  if (severity === "moderate") {
    return (
      "Consider monitoring the condition and, if appropriate, discussing " +
      "it with a healthcare professional."
    );
  }
  return (
    "Most minor findings improve with general care; monitor the area and " +
    "consult a professional if it persists or worsens."
  );
}