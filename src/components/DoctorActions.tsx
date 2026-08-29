"use client";

import { useState } from "react";

const FALLBACK_DIGITS = "919014509499";

export function phoneDigits(contact?: string | null): string {
  if (!contact) return FALLBACK_DIGITS;
  const d = contact.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  return d || FALLBACK_DIGITS;
}

function self(digits: string) {
  const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(
    "Hello, I came across your profile on DermAI and I would like to discuss a skin, scalp or nail concern."
  )}`;
  return { waUrl, telUrl: `tel:+${digits}` };
}

function BookAppointmentForm({ doctorName, digits, onClose }: { doctorName: string; digits: string; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = encodeURIComponent(
      `Hello, I would like to book an appointment.\n\nDoctor: ${doctorName}\nPreferred date: ${date}\nPreferred time: ${time}${
        note ? `\nConcern / note: ${note}` : ""
      }\n\n(generated via DermAI)`
    );
    window.open(`https://wa.me/${digits}?text=${text}`, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  if (sent) {
    return (
      <div className="booking-form">
        <div className="alert alert-teal mb-2">Request sent via WhatsApp. Keep the message — the clinic will confirm your slot.</div>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Done</button>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={submit}>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="appt-date">Preferred date</label>
          <input id="appt-date" className="input" type="date" required min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="appt-time">Preferred time</label>
          <input id="appt-time" className="input" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="appt-note">Concern (optional)</label>
        <input id="appt-note" className="input" placeholder="e.g. scalp flaking for 2 weeks" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex-center">
        <button className="btn btn-primary btn-sm" type="submit">Book via WhatsApp</button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Cancel</button>
      </div>
      <p className="small muted" style={{ marginTop: "0.5rem" }}>
        The request opens in WhatsApp with the clinic number; the clinic confirms via reply.
      </p>
    </form>
  );
}

export function DoctorActions({ name, contact }: { name: string; contact?: string | null }) {
  const [booking, setBooking] = useState(false);
  const digits = phoneDigits(contact);
  const { waUrl, telUrl } = self(digits);

  return (
    <div className="doctor-actions">
      <div className="flex-center doctor-actions-row">
        <a className="btn btn-whatsapp btn-sm" href={waUrl} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <a className="btn btn-call btn-sm" href={telUrl} rel="noopener noreferrer">
          Call +{digits}
        </a>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => setBooking((b) => !b)}>
          {booking ? "Close booking" : "Book appointment"}
        </button>
      </div>
      {booking && <BookAppointmentForm doctorName={name} digits={digits} onClose={() => setBooking(false)} />}
    </div>
  );
}