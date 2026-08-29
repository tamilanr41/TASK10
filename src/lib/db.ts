import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const SCALP_DIR = path.join(UPLOAD_DIR, "scalp");
export const NAIL_DIR = path.join(UPLOAD_DIR, "nails");
export const REPORT_DIR = path.join(UPLOAD_DIR, "reports");

for (const dir of [DATA_DIR, UPLOAD_DIR, SCALP_DIR, NAIL_DIR, REPORT_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, "dermai.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  age INTEGER,
  sex TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS screenings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  screening_type TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'demo',
  model_version TEXT NOT NULL DEFAULT 'demo-1.0',
  scalp_image_path TEXT,
  nail_image_path TEXT,
  symptoms TEXT,
  diet_info TEXT,
  predictions TEXT,
  overall_condition TEXT,
  overall_confidence REAL,
  overall_severity TEXT,
  summary_text TEXT,
  nutrition_insights TEXT,
  hydration_insight TEXT,
  recommendations TEXT,
  doctor_recommendation TEXT,
  report_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_screenings_user ON screenings(user_id);
CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL DEFAULT 'Dermatology',
  clinic TEXT,
  location TEXT,
  contact TEXT,
  availability TEXT,
  consultation_info TEXT,
  city TEXT,
  is_sample INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  severity_guidance TEXT,
  general_recommendations TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS nutrition (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nutrient TEXT NOT NULL,
  insight TEXT,
  food_suggestions TEXT,
  caution_text TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  severity TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  reminder_date TEXT,
  reminder_time TEXT,
  repeat_frequency TEXT NOT NULL DEFAULT 'none',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

export function loadJson<T = unknown>(value: unknown): T | null {
  if (!value) return null;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

export type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  age: number | null;
  sex: string | null;
  role: string;
  is_active: number;
  created_at: string;
};

export function userToDict(u: UserRow, privateInfo = false): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: u.id,
    name: u.name,
    email: u.email,
    age: u.age,
    sex: u.sex,
    role: u.role,
    is_active: !!u.is_active,
    created_at: u.created_at,
  };
  if (privateInfo) {
    const row = db
      .prepare("SELECT COUNT(*) AS n FROM screenings WHERE user_id = ?")
      .get(u.id) as { n: number };
    out["screening_count"] = row.n;
  }
  return out;
}

export type ScreeningRow = {
  id: number;
  user_id: number;
  screening_type: string;
  mode: string;
  model_version: string;
  scalp_image_path: string | null;
  nail_image_path: string | null;
  symptoms: string | null;
  diet_info: string | null;
  predictions: string | null;
  overall_condition: string | null;
  overall_confidence: number | null;
  overall_severity: string | null;
  summary_text: string | null;
  nutrition_insights: string | null;
  hydration_insight: string | null;
  recommendations: string | null;
  doctor_recommendation: string | null;
  report_path: string | null;
  created_at: string;
};

export function screeningToDict(s: ScreeningRow): Record<string, unknown> {
  return {
    id: s.id,
    user_id: s.user_id,
    screening_type: s.screening_type,
    mode: s.mode,
    model_version: s.model_version,
    scalp_image_path: s.scalp_image_path,
    nail_image_path: s.nail_image_path,
    symptoms: loadJson(s.symptoms),
    diet_info: loadJson(s.diet_info),
    predictions: loadJson(s.predictions),
    overall_condition: s.overall_condition,
    overall_confidence: s.overall_confidence,
    overall_severity: s.overall_severity,
    summary_text: s.summary_text,
    nutrition_insights: loadJson(s.nutrition_insights),
    hydration_insight: s.hydration_insight,
    recommendations: loadJson(s.recommendations),
    doctor_recommendation: loadJson(s.doctor_recommendation),
    report_path: s.report_path,
    created_at: s.created_at,
  };
}

export type DoctorRow = {
  id: number;
  name: string;
  specialization: string;
  clinic: string | null;
  location: string | null;
  contact: string | null;
  availability: string | null;
  consultation_info: string | null;
  city: string | null;
  is_sample: number;
  created_at: string;
};

export function doctorToDict(d: DoctorRow): Record<string, unknown> {
  return {
    id: d.id,
    name: d.name,
    specialization: d.specialization,
    clinic: d.clinic,
    location: d.location,
    contact: d.contact,
    availability: d.availability,
    consultation_info: d.consultation_info,
    city: d.city,
    is_sample: !!d.is_sample,
  };
}

export type ConditionRow = {
  id: number;
  name: string;
  category: string;
  description: string | null;
  severity_guidance: string | null;
  general_recommendations: string | null;
};

export type NutritionRow = {
  id: number;
  nutrient: string;
  insight: string | null;
  food_suggestions: string | null;
  caution_text: string | null;
  is_active: number;
};

export type RecommendationRow = {
  id: number;
  title: string;
  category: string;
  description: string | null;
  severity: string | null;
  is_active: number;
};

export type ReminderRow = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  reminder_date: string | null;
  reminder_time: string | null;
  repeat_frequency: string;
  is_enabled: number;
  created_at: string;
};

export function reminderToDict(r: ReminderRow): Record<string, unknown> {
  return {
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    description: r.description,
    reminder_date: r.reminder_date,
    reminder_time: r.reminder_time,
    repeat_frequency: r.repeat_frequency,
    is_enabled: !!r.is_enabled,
    created_at: r.created_at,
  };
}

export type ChatRow = {
  id: number;
  user_id: number;
  role: string;
  content: string;
  created_at: string;
};

export function chatToDict(c: ChatRow): Record<string, unknown> {
  return { id: c.id, user_id: c.user_id, role: c.role, content: c.content, created_at: c.created_at };
}

export function seedIfEmpty(): void {
  const seededMarker = db
    .prepare("INSERT OR IGNORE INTO app_meta (key, value) VALUES ('seeded', '1')")
    .run();
  if (seededMarker.changes === 0) return;

  const userCount = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  if (userCount === 0) {
    const adminHash = bcrypt.hashSync("Admin@1234", 10);
    const demoHash = bcrypt.hashSync("Demo@1234", 10);
    db.prepare(
      "INSERT INTO users (name, email, password_hash, age, sex, role) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("DermAI Administrator", "admin@dermai.app", adminHash, 35, "Prefer not to say", "admin");
    db.prepare(
      "INSERT INTO users (name, email, password_hash, age, sex, role) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("Demo User", "demo@dermai.app", demoHash, 24, "Prefer not to say", "user");
  }

  const doctorCount = (db.prepare("SELECT COUNT(*) AS n FROM doctors").get() as { n: number }).n;
  if (doctorCount === 0) {
    const insert = db.prepare(
      `INSERT INTO doctors (name, specialization, clinic, location, contact, availability, consultation_info, city, is_sample)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    );
    const doctors = [
      ["Dr. A. Kavitha, MD", "Dermatology", "City Skin & Hair Clinic", "Anna Nagar, Chennai", "+91 90145 09499", "Mon\u2013Sat 10:00\u201318:00", "In-person & video consultation", "Chennai"],
      ["Dr. R. Prakash, MD", "Dermatology & Trichology", "Prakash Dermatology Centre", "T. Nagar, Chennai", "+91 90145 09499", "Mon\u2013Fri 09:00\u201317:00", "Appointment preferred", "Chennai"],
      ["Dr. S. Meenakshi, MD", "Dermatology", "Meenakshi Skin Speciality", "Koramangala, Bengaluru", "+91 90145 09499", "Tue\u2013Sun 11:00\u201319:00", "Walk-ins welcome 11:00\u201314:00", "Bengaluru"],
      ["Dr. V. Ramesh, MD", "Dermatology, Hair & Nail Disorders", "Ramesh Derma Care", "Banjara Hills, Hyderabad", "+91 90145 09499", "Mon\u2013Sat 10:00\u201320:00", "In-person & teleconsult", "Hyderabad"],
    ] as const;
    for (const d of doctors) insert.run(...d);
  }

  const condCount = (db.prepare("SELECT COUNT(*) AS n FROM conditions").get() as { n: number }).n;
  if (condCount === 0) {
    const insert = db.prepare(
      "INSERT INTO conditions (name, category, description, severity_guidance, general_recommendations) VALUES (?, ?, ?, ?, ?)"
    );
    const rows = [
      ["Dandruff", "scalp", "Visible flaking and scaling with possible itching.", "Mild: general care. Moderate/high: professional review.", "Mild cleansing routine; monitor."],
      ["Dry scalp", "scalp", "Dry, tight scalp with fine dry flakes.", "Usually mild; monitor hydration and products.", "Gentle moisture and mild products."],
      ["Scalp irritation", "scalp", "Redness, itching, irritation.", "Mild: reduce triggers. Moderate/high: consult.", "Avoid triggers; mild cleansing."],
      ["Possible fungal scalp condition", "scalp", "Flakes, itching, affected areas possibly associated with a fungal pattern.", "Moderate/high - professional evaluation recommended.", "Follow professional advice."],
      ["Hair thinning", "hair", "Reduced hair density.", "Moderate: consider professional and nutrition review.", "Balanced nutrition; gentle care."],
      ["Excessive hair fall", "hair", "Higher-than-usual shedding.", "Moderate: consult if persistent.", "Monitor; balanced diet; gentle handling."],
      ["Circular/patchy hair loss", "hair", "Circular or patchy hair loss pattern.", "Moderate/high - professional evaluation recommended.", "Consult a professional."],
      ["Brittle nails", "nails", "Nails chip, split or break easily.", "Mild: general care. Moderate: review products.", "Keep nails clean and dry; moisturize."],
      ["Nail discoloration", "nails", "Changes in nail color.", "Moderate: professional review advisable.", "Observe; gentle care."],
      ["Possible fungal nail condition", "nails", "Thickening, discoloration, texture change possibly fungal-pattern.", "Moderate/high - professional evaluation recommended.", "Keep nails dry; consult professional."],
      ["Nail separation", "nails", "Nail separates from nail bed.", "Moderate - professional evaluation recommended.", "Protect the nail; consult."],
    ];
    for (const r of rows) insert.run(...r);
  }

  const nutrCount = (db.prepare("SELECT COUNT(*) AS n FROM nutrition").get() as { n: number }).n;
  if (nutrCount === 0) {
    const insert = db.prepare(
      "INSERT INTO nutrition (nutrient, insight, food_suggestions, caution_text) VALUES (?, ?, ?, ?)"
    );
    const entries: Array<[string, string, string[], string]> = [
      ["Iron", "Some symptoms can sometimes be associated with nutritional factors such as iron status. Consider discussing testing with a qualified healthcare professional if appropriate.", ["Leafy green vegetables", "Lentils and beans", "Fortified foods"], ""],
      ["Vitamin B12", "Some symptoms can sometimes be associated with nutritional factors such as Vitamin B12 status. Consider discussing testing with a qualified healthcare professional if appropriate.", ["Eggs", "Dairy", "Fortified foods"], ""],
      ["Vitamin D", "Some symptoms can sometimes be associated with nutritional factors such as Vitamin D status. Consider discussing testing with a qualified healthcare professional if appropriate.", ["Fortified foods", "Safe sunlight guidance where appropriate"], ""],
      ["Biotin", "Some symptoms can sometimes be associated with nutritional factors such as biotin status. Consider discussing testing with a qualified healthcare professional if appropriate.", ["Eggs", "Nuts", "Seeds", "Legumes"], ""],
      ["Protein", "Adequate protein is part of a generally balanced diet. Consider reviewing your intake with a qualified professional if consistently low.", ["Eggs", "Milk and yogurt", "Lentils", "Beans", "Soy", "Nuts and seeds"], ""],
      ["General balanced nutrition", "A variety of whole foods supports general wellness.", ["Vegetables and fruits", "Whole grains", "Adequate hydration"], ""],
    ];
    for (const [nutrient, insight, foods, caution] of entries) {
      insert.run(nutrient, insight, JSON.stringify(foods), caution);
    }
  }

  const recCount = (db.prepare("SELECT COUNT(*) AS n FROM recommendations").get() as { n: number }).n;
  if (recCount === 0) {
    const insert = db.prepare(
      "INSERT INTO recommendations (title, category, description, severity) VALUES (?, ?, ?, ?)"
    );
    const recs = [
      ["Maintain appropriate scalp hygiene", "precaution", "Keep the scalp clean with a gentle, non-irritating routine.", "all"],
      ["Avoid excessive scratching", "precaution", "Scratching can irritate and worsen flaking or itching.", "all"],
      ["Avoid sharing combs and grooming tools", "precaution", "Shared tools can transfer irritants and potential infections.", "all"],
      ["Keep nails clean and dry", "homecare", "Dampness and dirt can make nail issues worse.", "all"],
      ["Avoid aggressive nail products", "avoid", "Harsh nail products can weaken the nail over time.", "all"],
      ["Avoid unnecessary chemical products", "avoid", "Give scalp, hair and nails breaks from chemical treatments.", "all"],
      ["Monitor whether symptoms are worsening", "consult", "If symptoms worsen, spread or cause pain, consult a professional.", "all"],
      ["Consult a qualified dermatologist", "consult", "Clearly recommended for high-severity findings.", "high"],
    ];
    for (const r of recs) insert.run(...r);
  }
}

seedIfEmpty();

export default db;