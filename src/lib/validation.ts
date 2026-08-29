export function validateSignup(data: Record<string, unknown>): {
  errors: Record<string, string>;
  clean: Record<string, unknown> | null;
} {
  const errors: Record<string, string> = {};
  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  const confirm = String(data.confirm_password || "");
  const age = data.age;
  const sex = String(data.sex || "").trim();

  if (!name) errors.name = "Full name is required.";
  else if (name.length < 2) errors.name = "Full name must be at least 2 characters.";

  if (!email) errors.email = "Email is required.";
  else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))
    errors.email = "Please enter a valid email address.";

  if (!password) errors.password = "Password is required.";
  else {
    if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) errors.password = "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(password)) errors.password = "Password must contain at least one number.";
  }

  if (password !== confirm) errors.confirm_password = "Passwords do not match.";

  if (age !== undefined && age !== null && age !== "") {
    const n = Number(age);
    if (Number.isNaN(n) || !Number.isInteger(n) || n < 1 || n > 120)
      errors.age = "Age must be between 1 and 120.";
  }

  if (sex && !["male", "female", "other", "prefer not to say"].includes(sex.toLowerCase()))
    errors.sex = "Please select a valid option for sex.";

  if (Object.keys(errors).length) return { errors, clean: null };

  return {
    errors: {},
    clean: {
      name,
      email,
      password,
      age: age !== undefined && age !== null && age !== "" ? Number(age) : null,
      sex: sex || null,
    },
  };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateReminder(data: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = String(data.title || "").trim();
  const time = String(data.reminder_time || "").trim();
  const frequency = String(data.repeat_frequency || "none").trim();

  if (!title) errors.title = "Reminder title is required.";
  if (!time) errors.reminder_time = "Reminder time is required.";
  else if (!TIME_RE.test(time)) errors.reminder_time = "Reminder time must be in HH:MM (24h) format.";
  if (!["none", "daily", "weekly"].includes(frequency)) errors.repeat_frequency = "Invalid repeat frequency.";

  return errors;
}