import { MongoClient, Db, Filter, Document } from "mongodb";
import bcrypt from "bcryptjs";
import path from "node:path";

let client: MongoClient | null = null;
let dbi: Db | null = null;

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const SCALP_DIR = path.join(UPLOAD_DIR, "scalp");
export const NAIL_DIR = path.join(UPLOAD_DIR, "nails");
export const REPORT_DIR = path.join(UPLOAD_DIR, "reports");

function requireDb(): Db {
  if (!dbi) throw new Error("Database is not connected. Call connectDb() first.");
  return dbi;
}

export function isDbConnected(): boolean {
  return !!dbi;
}

export async function connectDb(): Promise<void> {
  if (dbi) return;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI environment variable is not set.");
  }
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const dbName = process.env.MONGO_DB || "dermai";
  dbi = client.db(dbName);

  const colls = ["users", "screenings", "doctors", "conditions", "nutrition", "recommendations", "reminders", "chat_messages"];
  for (const c of colls) {
    await dbi.collection(c).createIndex({ id: 1 }, { unique: true });
  }
  await dbi.collection("users").createIndex({ email: 1 }, { unique: true });
  await dbi.collection("screenings").createIndex({ user_id: 1 });
  await dbi.collection("reminders").createIndex({ user_id: 1 });
  await dbi.collection("chat_messages").createIndex({ user_id: 1 });
}

export async function disconnectDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    dbi = null;
  }
}

async function nextIdFor(collection: string): Promise<number> {
  const res = await requireDb()
    .collection<any>("counters")
    .findOneAndUpdate({ _id: collection }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return res?.seq ?? 1;
}

function toRow<T>(doc: Document | null | undefined): T | undefined {
  if (!doc) return undefined;
  const { _id: _ignored, ...rest } = doc;
  return rest as T;
}

export function loadJson<T = unknown>(value: unknown): T | null {
  if (!value) return null;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- types

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

export type ChatRow = {
  id: number;
  user_id: number;
  role: string;
  content: string;
  created_at: string;
};

// ---------------------------------------------------------------- dicts

export async function userToDict(u: UserRow, privateInfo = false): Promise<Record<string, unknown>> {
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
    out["screening_count"] = await countUserScreenings(u.id);
  }
  return out;
}

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

export function chatToDict(c: ChatRow): Record<string, unknown> {
  return { id: c.id, user_id: c.user_id, role: c.role, content: c.content, created_at: c.created_at };
}

// ---------------------------------------------------------------- users

export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  return toRow<UserRow>(await requireDb().collection("users").findOne({ email }));
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  return toRow<UserRow>(await requireDb().collection("users").findOne({ id }));
}

export async function listUsers(search?: string): Promise<UserRow[]> {
  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};
  const docs = await requireDb()
    .collection("users")
    .find(query as Filter<Document>)
    .sort({ created_at: -1 })
    .limit(200)
    .toArray();
  return docs.map((d) => toRow<UserRow>(d) as UserRow);
}

export async function insertUser(data: {
  name: string;
  email: string;
  password_hash: string;
  age: number | null;
  sex: string | null;
  role: string;
}): Promise<UserRow> {
  const id = await nextIdFor("users");
  const doc = { id, is_active: 1, created_at: new Date().toISOString(), ...data };
  await requireDb().collection("users").insertOne(doc);
  return toRow<UserRow>(doc) as UserRow;
}

export async function updateUserActive(id: number, active: boolean): Promise<void> {
  await requireDb().collection("users").updateOne({ id }, { $set: { is_active: active ? 1 : 0 } });
}

export async function updateUser(
  id: number,
  fields: Partial<{
    name: string;
    email: string;
    password_hash: string;
    age: number | null;
    sex: string | null;
    role: string;
    is_active: number;
  }>
): Promise<void> {
  const set: Record<string, unknown> = {};
  const WHITELIST = ["name", "email", "password_hash", "age", "sex", "role", "is_active"] as const;
  for (const k of WHITELIST) if (fields[k] !== undefined) set[k] = fields[k];
  if (!Object.keys(set).length) return;
  await requireDb().collection("users").updateOne({ id }, { $set: set });
}

export async function deleteUserAndData(id: number): Promise<void> {
  const db = requireDb();
  await db.collection("users").deleteOne({ id });
  await db.collection("screenings").deleteMany({ user_id: id });
  await db.collection("reminders").deleteMany({ user_id: id });
  await db.collection("chat").deleteMany({ user_id: id });
}

export async function listScreeningsWithUser(
  search?: string,
  limit = 200
): Promise<Array<ScreeningRow & { user_name?: string; user_email?: string }>> {
  const db = requireDb();
  const q = search || "";
  let query: Document = {};
  if (q) {
    const ids = (
      await db
        .collection("users")
        .find(
          { $or: [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }] },
          { projection: { _id: 0, id: 1 } }
        )
        .toArray()
    ).map((d) => d.id);
    const clauses = ids.length
      ? [{ user_id: { $in: ids } }, { overall_condition: { $regex: q, $options: "i" } }, { screening_type: { $regex: q, $options: "i" } }]
      : [{ overall_condition: { $regex: q, $options: "i" } }, { screening_type: { $regex: q, $options: "i" } }];
    query = { $or: clauses };
  }
  const docs = await db
    .collection("screenings")
    .find(query as Filter<Document>)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  const users = await db
    .collection("users")
    .find({}, { projection: { _id: 0, id: 1, name: 1, email: 1 } })
    .toArray();
  const byId = new Map(users.map((d: Document) => [d.id, d]));
  return docs.map((d) => {
    const r = toRow<ScreeningRow>(d) as ScreeningRow;
    const u = byId.get(r.user_id) as { name?: string; email?: string } | undefined;
    return { ...r, user_name: u?.name, user_email: u?.email };
  });
}

export async function getUserWithScreening(
  id: number
): Promise<(ScreeningRow & { user_name?: string; user_email?: string }) | undefined> {
  const s = await getScreeningById(id);
  if (!s) return undefined;
  const user = await getUserById(s.user_id);
  return { ...s, user_name: user?.name, user_email: user?.email };
}

export async function countUsers(): Promise<number> {
  return await requireDb().collection("users").countDocuments({});
}

export async function countUserScreenings(userId: number): Promise<number> {
  return await requireDb().collection("screenings").countDocuments({ user_id: userId });
}

// ---------------------------------------------------------------- screenings

export async function listScreeningsByUser(userId: number): Promise<ScreeningRow[]> {
  const docs = await requireDb()
    .collection("screenings")
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray();
  return docs.map((d) => toRow<ScreeningRow>(d) as ScreeningRow);
}

export async function listRecentScreenings(limit: number): Promise<ScreeningRow[]> {
  const docs = await requireDb()
    .collection("screenings")
    .find({})
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => toRow<ScreeningRow>(d) as ScreeningRow);
}

export async function listLatestScreening(userId: number): Promise<ScreeningRow | undefined> {
  const doc = await requireDb()
    .collection("screenings")
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(1)
    .next();
  return toRow<ScreeningRow>(doc);
}

export async function getScreeningById(id: number): Promise<ScreeningRow | undefined> {
  return toRow<ScreeningRow>(await requireDb().collection("screenings").findOne({ id }));
}

export async function insertScreening(data: Record<string, unknown>): Promise<ScreeningRow> {
  const id = await nextIdFor("screenings");
  const doc = { id, created_at: new Date().toISOString(), ...data };
  await requireDb().collection("screenings").insertOne(doc);
  return toRow<ScreeningRow>(doc) as ScreeningRow;
}

export async function updateScreeningReportPath(id: number, reportPath: string): Promise<void> {
  await requireDb().collection("screenings").updateOne({ id }, { $set: { report_path: reportPath } });
}

export async function deleteScreeningById(id: number): Promise<void> {
  await requireDb().collection("screenings").deleteOne({ id });
}

export async function countScreenings(): Promise<number> {
  return await requireDb().collection("screenings").countDocuments({});
}

export async function countScreeningsInTypes(types: string[]): Promise<number> {
  return await requireDb()
    .collection("screenings")
    .countDocuments({ screening_type: { $in: types } });
}

export async function allScreeningsSeverityValues(): Promise<Array<{ overall_severity: string | null }>> {
  const docs = await requireDb()
    .collection("screenings")
    .find({}, { projection: { _id: 0, overall_severity: 1 } })
    .toArray();
  return docs as unknown as Array<{ overall_severity: string | null }>;
}

export async function allScreeningsConditionValues(): Promise<Array<{ overall_condition: string | null }>> {
  const docs = await requireDb()
    .collection("screenings")
    .find({}, { projection: { _id: 0, overall_condition: 1 } })
    .toArray();
  return docs as unknown as Array<{ overall_condition: string | null }>;
}

// ---------------------------------------------------------------- doctors

export async function listDoctors(): Promise<DoctorRow[]> {
  const docs = await requireDb()
    .collection("doctors")
    .find({})
    .sort({ created_at: 1 })
    .toArray();
  return docs.map((d) => toRow<DoctorRow>(d) as DoctorRow);
}

export async function listSampleDoctors(): Promise<DoctorRow[]> {
  const docs = await requireDb()
    .collection("doctors")
    .find({ is_sample: 1 })
    .toArray();
  return docs.map((d) => toRow<DoctorRow>(d) as DoctorRow);
}

export async function getDoctorById(id: number): Promise<DoctorRow | undefined> {
  return toRow<DoctorRow>(await requireDb().collection("doctors").findOne({ id }));
}

export async function insertDoctor(data: Record<string, unknown>): Promise<DoctorRow> {
  const id = await nextIdFor("doctors");
  const doc = { id, is_sample: 1, created_at: new Date().toISOString(), ...data };
  await requireDb().collection("doctors").insertOne(doc);
  return toRow<DoctorRow>(doc) as DoctorRow;
}

export async function updateDoctorById(id: number, fields: Record<string, unknown>): Promise<void> {
  await requireDb().collection("doctors").updateOne({ id }, { $set: fields });
}

export async function deleteDoctorById(id: number): Promise<void> {
  await requireDb().collection("doctors").deleteOne({ id });
}

// ---------------------------------------------------------------- conditions

export async function listConditions(): Promise<ConditionRow[]> {
  const docs = await requireDb()
    .collection("conditions")
    .find({})
    .sort({ created_at: 1 })
    .toArray();
  return docs.map((d) => toRow<ConditionRow>(d) as ConditionRow);
}

export async function getConditionById(id: number): Promise<ConditionRow | undefined> {
  return toRow<ConditionRow>(await requireDb().collection("conditions").findOne({ id }));
}

export async function insertCondition(data: Record<string, unknown>): Promise<ConditionRow> {
  const id = await nextIdFor("conditions");
  const doc = { id, created_at: new Date().toISOString(), ...data };
  await requireDb().collection("conditions").insertOne(doc);
  return toRow<ConditionRow>(doc) as ConditionRow;
}

export async function updateConditionById(id: number, fields: Record<string, unknown>): Promise<void> {
  await requireDb().collection("conditions").updateOne({ id }, { $set: fields });
}

export async function deleteConditionById(id: number): Promise<void> {
  await requireDb().collection("conditions").deleteOne({ id });
}

// ---------------------------------------------------------------- nutrition

export async function listNutrition(): Promise<NutritionRow[]> {
  const docs = await requireDb()
    .collection("nutrition")
    .find({})
    .sort({ created_at: 1 })
    .toArray();
  return docs.map((d) => toRow<NutritionRow>(d) as NutritionRow);
}

export async function getNutritionById(id: number): Promise<NutritionRow | undefined> {
  return toRow<NutritionRow>(await requireDb().collection("nutrition").findOne({ id }));
}

export async function insertNutrition(data: Record<string, unknown>): Promise<NutritionRow> {
  const id = await nextIdFor("nutrition");
  const doc = { id, is_active: 1, created_at: new Date().toISOString(), ...data };
  await requireDb().collection("nutrition").insertOne(doc);
  return toRow<NutritionRow>(doc) as NutritionRow;
}

export async function updateNutritionById(id: number, fields: Record<string, unknown>): Promise<void> {
  await requireDb().collection("nutrition").updateOne({ id }, { $set: fields });
}

export async function deleteNutritionById(id: number): Promise<void> {
  await requireDb().collection("nutrition").deleteOne({ id });
}

// ---------------------------------------------------------------- recommendations

export async function listRecommendations(): Promise<RecommendationRow[]> {
  const docs = await requireDb()
    .collection("recommendations")
    .find({})
    .sort({ created_at: 1 })
    .toArray();
  return docs.map((d) => toRow<RecommendationRow>(d) as RecommendationRow);
}

export async function getRecommendationById(id: number): Promise<RecommendationRow | undefined> {
  return toRow<RecommendationRow>(await requireDb().collection("recommendations").findOne({ id }));
}

export async function insertRecommendation(data: Record<string, unknown>): Promise<RecommendationRow> {
  const id = await nextIdFor("recommendations");
  const doc = { id, is_active: 1, created_at: new Date().toISOString(), ...data };
  await requireDb().collection("recommendations").insertOne(doc);
  return toRow<RecommendationRow>(doc) as RecommendationRow;
}

export async function updateRecommendationById(id: number, fields: Record<string, unknown>): Promise<void> {
  await requireDb().collection("recommendations").updateOne({ id }, { $set: fields });
}

export async function deleteRecommendationById(id: number): Promise<void> {
  await requireDb().collection("recommendations").deleteOne({ id });
}

// ---------------------------------------------------------------- reminders

export async function listRemindersByUser(userId: number): Promise<ReminderRow[]> {
  const docs = await requireDb()
    .collection("reminders")
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray();
  return docs.map((d) => toRow<ReminderRow>(d) as ReminderRow);
}

export async function getReminderById(id: number): Promise<ReminderRow | undefined> {
  return toRow<ReminderRow>(await requireDb().collection("reminders").findOne({ id }));
}

export async function insertReminder(data: Record<string, unknown>): Promise<ReminderRow> {
  const id = await nextIdFor("reminders");
  const doc = { id, created_at: new Date().toISOString(), ...data };
  await requireDb().collection("reminders").insertOne(doc);
  return toRow<ReminderRow>(doc) as ReminderRow;
}

export async function updateReminderById(id: number, fields: Record<string, unknown>): Promise<void> {
  await requireDb().collection("reminders").updateOne({ id }, { $set: fields });
}

export async function deleteReminderById(id: number): Promise<void> {
  await requireDb().collection("reminders").deleteOne({ id });
}

// ---------------------------------------------------------------- chat

export async function listChatByUser(userId: number): Promise<ChatRow[]> {
  const docs = await requireDb()
    .collection("chat_messages")
    .find({ user_id: userId })
    .sort({ created_at: 1 })
    .limit(100)
    .toArray();
  return docs.map((d) => toRow<ChatRow>(d) as ChatRow);
}

export async function insertChatMessage(userId: number, role: string, content: string): Promise<void> {
  const id = await nextIdFor("chat_messages");
  await requireDb()
    .collection("chat_messages")
    .insertOne({ id, user_id: userId, role, content, created_at: new Date().toISOString() });
}

// ---------------------------------------------------------------- seed

export async function seedIfEmpty(): Promise<void> {
  const dbc = requireDb();
  try {
    await dbc.collection<any>("app_meta").insertOne({ _id: "seeded", value: "1" });
  } catch {
    // marker already exists; seeding is driven by existence checks below
  }

  const samples = [
    { name: "DermAI Administrator", email: "admin@dermai.app", password_hash: bcrypt.hashSync("Admin@1234", 10), age: 35, sex: "Prefer not to say", role: "admin" },
    { name: "Demo User", email: "demo@dermai.app", password_hash: bcrypt.hashSync("Demo@1234", 10), age: 24, sex: "Prefer not to say", role: "user" },
  ] as const;
  for (const s of samples) {
    if (!(await getUserByEmail(s.email))) {
      await insertUser({
        name: s.name,
        email: s.email,
        password_hash: s.password_hash,
        age: s.age,
        sex: s.sex,
        role: s.role,
      });
    }
  }

  if ((await dbc.collection("doctors").countDocuments({})) === 0) {
    const doctors = [
      ["Dr. A. Kavitha, MD", "Dermatology", "City Skin & Hair Clinic", "Anna Nagar, Chennai", "+91 90145 09499", "Mon\u2013Sat 10:00\u201318:00", "In-person & video consultation", "Chennai"],
      ["Dr. R. Prakash, MD", "Dermatology & Trichology", "Prakash Dermatology Centre", "T. Nagar, Chennai", "+91 90145 09499", "Mon\u2013Fri 09:00\u201317:00", "Appointment preferred", "Chennai"],
      ["Dr. S. Meenakshi, MD", "Dermatology", "Meenakshi Skin Speciality", "Koramangala, Bengaluru", "+91 90145 09499", "Tue\u2013Sun 11:00\u201319:00", "Walk-ins welcome 11:00\u201314:00", "Bengaluru"],
      ["Dr. V. Ramesh, MD", "Dermatology, Hair & Nail Disorders", "Ramesh Derma Care", "Banjara Hills, Hyderabad", "+91 90145 09499", "Mon\u2013Sat 10:00\u201320:00", "In-person & teleconsult", "Hyderabad"],
    ] as const;
    for (const d of doctors) {
      await insertDoctor({
        name: d[0],
        specialization: d[1],
        clinic: d[2],
        location: d[3],
        contact: d[4],
        availability: d[5],
        consultation_info: d[6],
        city: d[7],
        is_sample: 1,
      });
    }
  }

  if ((await dbc.collection("conditions").countDocuments({})) === 0) {
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
    for (const r of rows) {
      await insertCondition({
        name: r[0],
        category: r[1],
        description: r[2],
        severity_guidance: r[3],
        general_recommendations: r[4],
      });
    }
  }

  if ((await dbc.collection("nutrition").countDocuments({})) === 0) {
    const entries: Array<[string, string, string[], string]> = [
      ["Iron", "Some symptoms can sometimes be associated with nutritional factors such as iron status. Consider discussing testing with a qualified healthcare professional if appropriate.", ["Leafy green vegetables", "Lentils and beans", "Fortified foods"], ""],
      ["Vitamin B12", "Some symptoms can sometimes be associated with nutritional factors such as Vitamin B12 status. Consider discussing testing with a qualified healthcare professional if appropriate.", ["Eggs", "Dairy", "Fortified foods"], ""],
      ["Vitamin D", "Some symptoms can sometimes be associated with nutritional factors such as Vitamin D status. Consider discussing testing with a qualified healthcare professional if appropriate.", ["Fortified foods", "Safe sunlight guidance where appropriate"], ""],
      ["Biotin", "Some symptoms can sometimes be associated with nutritional factors such as biotin status. Consider discussing testing with a qualified healthcare professional if appropriate.", ["Eggs", "Nuts", "Seeds", "Legumes"], ""],
      ["Protein", "Adequate protein is part of a generally balanced diet. Consider reviewing your intake with a qualified professional if consistently low.", ["Eggs", "Milk and yogurt", "Lentils", "Beans", "Soy", "Nuts and seeds"], ""],
      ["General balanced nutrition", "A variety of whole foods supports general wellness.", ["Vegetables and fruits", "Whole grains", "Adequate hydration"], ""],
    ];
    for (const [nutrient, insight, foods, caution] of entries) {
      await insertNutrition({
        nutrient,
        insight,
        food_suggestions: JSON.stringify(foods),
        caution_text: caution,
        is_active: 1,
      });
    }
  }

  if ((await dbc.collection("recommendations").countDocuments({})) === 0) {
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
    for (const r of recs) {
      await insertRecommendation({
        title: r[0],
        category: r[1],
        description: r[2],
        severity: r[3],
        is_active: 1,
      });
    }
  }
}