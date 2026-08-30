"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getAuthToken, API_BASE } from "@/lib/api";
import { Disclosure } from "@/components/ui";
import { motion, AnimatePresence, PageFade } from "@/components/motion";

const STAGES = [
  { key: "general", label: "General" },
  { key: "area", label: "Area symptoms" },
  { key: "health", label: "Health & lifestyle" },
];

const MAX_BYTES = 5 * 1024 * 1024;

type Answers = Record<string, string | number | boolean>;

type QuestionOption = { value: string; label: string };

type Question = {
  id: string;
  label?: string;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  min_label?: string;
  max_label?: string;
  options?: QuestionOption[];
};

type QuestionnaireResponse = {
  stage: string;
  questions: Question[];
};

type Prediction = {
  label: string;
  severity: string;
  confidence: number;
  explanation?: string;
  image_path?: string;
  server_url?: string;
  is_demo?: boolean;
};

type AnalyzeResponse = {
  screening_type?: string;
  mode?: string;
  model_version?: string;
  predictions?: { scalp?: Prediction; nails?: Prediction };
  paths?: { scalp_image_path?: string; nail_image_path?: string };
  note?: string;
};

type CompleteResponse = {
  message?: string;
  screening: { id: string | number };
  is_demo?: boolean;
};

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { label: "Area" },
    { label: "Images" },
    { label: "AI analysis" },
    { label: "Questions" },
    { label: "Complete" },
  ];
  return (
    <div className="steps">
      {steps.map((s, i) => {
        const n = i + 1;
        const cls = n === current ? "active" : n < current ? "done" : "";
        return (
          <motion.span
            key={s.label}
            className="flex-center"
            animate={{ opacity: 1 }}
            initial={{ opacity: 0, y: 8 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={`step-chip ${cls}`}>
              {n}. {s.label}
            </span>
            {n < steps.length && <span className="step-arrow">→</span>}
          </motion.span>
        );
      })}
    </div>
  );
}

function QControl({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  if (q.type === "slider") {
    return (
      <div>
        <div className="flex-between small muted mb-1">
          <span>{q.min_label}</span>
          <span>{q.max_label}</span>
        </div>
        <input
          type="range"
          min={q.min}
          max={q.max}
          value={Number(value ?? Math.floor((q.min! + q.max!) / 2))}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div className="small" style={{ color: "var(--teal-700)", fontWeight: 700 }}>
          Selected: {value ?? Math.floor((q.min! + q.max!) / 2)}
        </div>
      </div>
    );
  }
  if (q.type === "select") {
    return (
      <select className="select" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select an option…</option>
        {(q.options || []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (q.type === "radio") {
    return (
      <div className="radio-group">
        {(q.options || []).map((o) => (
          <label key={o.value} className="radio-row">
            <input
              type="radio"
              name={q.id}
              checked={String(value) === String(o.value)}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "checkbox") {
    return (
      <label className="check-row">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        Yes
      </label>
    );
  }
  return (
    <input
      type="text"
      className="input"
      placeholder={q.placeholder}
      value={(value as string) || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function UploadBox({
  label,
  hint,
  file,
  dataUrl,
  error,
  onFile,
}: {
  label: string;
  hint: string;
  file: File | null;
  dataUrl: string;
  error: string;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={file ? "upload-zone has-file" : "upload-zone"} onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={onFile}
      />
      {dataUrl ? (
        <>
          <img src={dataUrl} alt={label} className="preview-img" />
          <div className="flex-center" style={{ justifyContent: "center" }}>
            <span className="badge badge-teal">✓ {label} ready</span>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: "1.8rem" }}>{hint}</div>
          <p className="small muted">Click to upload or drop a {label.toLowerCase()} image</p>
          <p className="small muted">JPG / JPEG / PNG · max 5 MB · min 64×64 px</p>
        </>
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export default function ScreeningPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [area, setArea] = useState(searchParams.get("type") || "");
  const [scalpFile, setScalpFile] = useState<File | null>(null);
  const [scalpUrl, setScalpUrl] = useState("");
  const [scalpErr, setScalpErr] = useState("");
  const [nailFile, setNailFile] = useState<File | null>(null);
  const [nailUrl, setNailUrl] = useState("");
  const [nailErr, setNailErr] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analysisErr, setAnalysisErr] = useState("");

  const [stageIdx, setStageIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [qIndex, setQIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [city, setCity] = useState("");
  const [stageErr, setStageErr] = useState("");
  const [currentNextErr, setCurrentNextErr] = useState("");

  const needScalp = area && area !== "nails";
  const needNail = area && area !== "scalp";

  const validate = (file?: File) => {
    if (!file) return { ok: false, err: "" };
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["jpg", "jpeg", "png"].includes(ext))
      return { ok: false, err: "Only JPG, JPEG or PNG files are accepted." };
    if (file.size > MAX_BYTES)
      return { ok: false, err: "File is larger than 5 MB. Please choose a smaller image." };
    return { ok: true, err: "" };
  };

  const onScalp = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const v = validate(f);
    if (!v.ok) {
      setScalpErr(v.err);
      setScalpFile(null);
      setScalpUrl("");
      e.target.value = "";
      return;
    }
    setScalpErr("");
    setScalpFile(f);
    setScalpUrl(URL.createObjectURL(f));
  };

  const onNail = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const v = validate(f);
    if (!v.ok) {
      setNailErr(v.err);
      setNailFile(null);
      setNailUrl("");
      e.target.value = "";
      return;
    }
    setNailErr("");
    setNailFile(f);
    setNailUrl(URL.createObjectURL(f));
  };

  const removeScalp = () => {
    setScalpFile(null);
    setScalpUrl("");
    setScalpErr("");
  };

  const removeNail = () => {
    setNailFile(null);
    setNailUrl("");
    setNailErr("");
  };

  const imagesReady =
    (needScalp ? scalpFile : true) && (needNail ? nailFile : true);

  const pickArea = (a: string) => {
    setArea(a);
    setAnalysis(null);
    setAnswers({});
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisErr("");
    try {
      const fd = new FormData();
      fd.append("screening_type", area);
      if (needScalp && scalpFile) fd.append("scalp_image", scalpFile);
      if (needNail && nailFile) fd.append("nail_image", nailFile);
      const res = await fetch(`${API_BASE}/api/screening/analyze-images`, {
        method: "POST",
        body: fd,
        headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : undefined,
      });
      const data = (await res.json()) as AnalyzeResponse & { error?: string; code?: string };
      if (!res.ok) throw Object.assign(new Error(data.error || "Analysis failed"), { code: data.code });
      setAnalysis(data);
      setStageIdx(0);
      setAnswers({});
      setStep(4);
    } catch (err) {
      setAnalysisErr(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const loadStage = useCallback(
    async (stageKey: string, withAnswers: Answers) => {
      setStageErr("");
      const qs = await api<QuestionnaireResponse>(
        `/api/questionnaire?type=${area}&stage=${stageKey}` +
          (Object.keys(withAnswers).length ? `&answers=${encodeURIComponent(JSON.stringify(withAnswers))}` : "")
      );
      const unanswered = qs.questions.filter((q) => !(q.id in withAnswers));
      setQuestions(unanswered);
      setQIndex(0);
    },
    [area]
  );

  useEffect(() => {
    if (step === 4) {
      loadStage(STAGES[stageIdx].key, answers).catch((err) =>
        setStageErr(err instanceof Error ? err.message : String(err))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stageIdx]);

  const recordAnswer = (q: Question, value: string | number | boolean) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    setStageErr("");
  };

  const goNext = async () => {
    if (!currentAnswered) return;
    setStageErr("");
    const idxInStage = STAGES[stageIdx].key;
    try {
      const qs = await api<QuestionnaireResponse>(
        `/api/questionnaire?type=${area}&stage=${idxInStage}&answers=${encodeURIComponent(JSON.stringify(answers))}`
      );
      const unanswered = qs.questions.filter((qq) => !(qq.id in answers));
      if (!unanswered.length) {
        // move to next stage or finish
        if (stageIdx < STAGES.length - 1) {
          setStageIdx(stageIdx + 1);
          setQuestions([]);
          setQIndex(0);
        } else {
          await submitScreening(answers);
        }
        return;
      }
      // If the refined question order inserted new questions earlier than the
      // current position, simply replace the queue and reset pointer.
      setQuestions(unanswered);
      setQIndex(0);
    } catch (err) {
      setCurrentNextErr(err instanceof Error ? err.message : String(err));
    }
  };

  const currentQuestion = questions[qIndex] || null;
  const currentAnswered = currentQuestion ? currentQuestion.id in answers : false;
  const isLastQuestion = currentQuestion ? questions.length === 1 : false;
  const isLastStage = stageIdx === STAGES.length - 1;
  const nextLabel = isLastStage && isLastQuestion ? "Finish & get result →" : "Next question →";

  const submitScreening = async (finalAnswers: Answers) => {
    setSubmitting(true);
    try {
      const body = {
        screening_type: area,
        scalp_image_path: analysis?.paths?.scalp_image_path,
        nail_image_path: analysis?.paths?.nail_image_path,
        scalp_prediction: analysis?.predictions?.scalp,
        nail_prediction: analysis?.predictions?.nails,
        symptoms: finalAnswers,
        city: city || undefined,
      };
      const data = await api<CompleteResponse>("/api/screening/complete", { method: "POST", body });
      router.push(`/screening/result/${data.screening.id}`);
    } catch (err) {
      setAnalysisErr(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <PageFade>
      <div className="container page">
        <h1 className="page-title">New Screening</h1>
        <p className="page-sub">Guided AI-assisted preliminary assessment</p>
        <StepIndicator current={step} />

        <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
          <div className="card">
            <h3>Select the screening area</h3>
            <p className="small muted mb-3">
              Some people have symptoms in both scalp/hair and nails — the combined
              option handles those together.
            </p>
            <div className="grid grid-3">
              {[
                { v: "scalp", t: "Scalp / Hair", d: "Dandruff, dry scalp, irritation, hair fall, thinning…", art: "/images/scalp-area.jpg" },
                { v: "nails", t: "Nails", d: "Brittleness, discoloration, fungal possibility…", art: "/images/nails-area.jpg" },
                { v: "combined", t: "Scalp / Hair + Nails", d: "Both areas in one multimodal screening", art: "/images/skin-texture.jpg" },
              ].map((o, i) => (
                <motion.div
                  key={o.v}
                  className="feature-card card-hover"
                  style={{ cursor: "pointer", borderColor: area === o.v ? "var(--mint-strong)" : undefined }}
                  onClick={() => pickArea(o.v)}
                  whileHover={{ y: -6 }}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.09, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <img src={o.art} alt={o.t} className="area-art" />
                  <h3>{o.t}</h3>
                  <p className="small">{o.d}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-3 flex" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-primary" disabled={!area} onClick={() => setStep(2)}>
                Continue →
              </button>
            </div>
          </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
          <div className="card">
            <div className="flex-between mb-2">
              <h3>Upload images</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Change area</button>
            </div>
            <div className="grid grid-2">
              {needScalp && (
                <div>
                  <h4>Scalp / Hair image</h4>
                  <UploadBox label="Scalp" hint="Scalp / hair image" file={scalpFile} dataUrl={scalpUrl} error={scalpErr} onFile={onScalp} />
                  {scalpFile && (
                    <div className="mt-1 flex-center">
                      <button className="btn btn-outline btn-sm" onClick={removeScalp}>Remove image</button>
                    </div>
                  )}
                </div>
              )}
              {needNail && (
                <div>
                  <h4>Nail image</h4>
                  <UploadBox label="Nail" hint="Nail image" file={nailFile} dataUrl={nailUrl} error={nailErr} onFile={onNail} />
                  {nailFile && (
                    <div className="mt-1 flex-center">
                      <button className="btn btn-outline btn-sm" onClick={removeNail}>Remove image</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="question-actions">
              <span className="small muted">JPG · JPEG · PNG · max 5 MB</span>
              <div className="flex-center">
                <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" disabled={!imagesReady} onClick={() => setStep(3)}>
                  Analyze images →
                </button>
              </div>
            </div>
          </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
          <div className="card mb-3">
            <h3>Run initial AI image analysis</h3>
            <p className="small muted mb-3">
              The engine validates and preprocesses your image, then produces an
              initial image-only result. It will be combined with your answers next.
            </p>
            {analysisErr && <div className="alert alert-danger mb-2">{analysisErr}</div>}

            <AnimatePresence>
            {analyzing && (
              <motion.div
                key="scanner"
                className="scanner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="scanner-box">
                  <div className="scanner-beam" />
                  <div className="scanner-text">
                    <span className="dot-live" style={{ color: "#34d399" }}>●</span>{" "}
                    Analyzing images… running image-only model
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {analysis && (
            <div className="mb-3">
              <div className="demo-banner">
                DEMO / PROTOTYPE AI RESULT — image analysis is generated by the
                built-in prototype engine, not a trained medical CNN.
              </div>
              <div className="grid grid-2">
                {analysis.predictions?.scalp && (
                  <div className="card">
                    <b>Scalp finding</b>
                    <div className="mt-1">{analysis.predictions.scalp.label}</div>
                    <div className="small muted">
                      Confidence {(analysis.predictions.scalp.confidence * 100).toFixed(0)}% ·{" "}
                      {analysis.predictions.scalp.severity}
                    </div>
                  </div>
                )}
                {analysis.predictions?.nails && (
                  <div className="card">
                    <b>Nail finding</b>
                    <div className="mt-1">{analysis.predictions.nails.label}</div>
                    <div className="small muted">
                      Confidence {(analysis.predictions.nails.confidence * 100).toFixed(0)}% ·{" "}
                      {analysis.predictions.nails.severity}
                    </div>
                  </div>
                )}
              </div>
              {analysis.predictions?.scalp?.explanation && (
                <p className="small muted mt-2">{analysis.predictions.scalp.explanation}</p>
              )}
            </div>
          )}
          <div className="flex-center" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>Back</button>
            {!analysis ? (
              <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? "Analyzing…" : "Run analysis"}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => { setStageIdx(0); setStep(4); }}>
                Continue to questions →
              </button>
            )}
          </div>
        </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div
          key="step4"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
        <div>
          <div className="tabs">
            {STAGES.map((s, i) => (
              <button key={s.key} className={`tab ${i === stageIdx ? "active" : ""}`}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="question-actions card mb-3">
            <h3>
              {questions.length > 0
                ? `${Math.min(qIndex + 1, questions.length)} of ${questions.length} to answer`
                : submitting
                  ? "Finalizing your screening result…"
                  : "Almost done"}
              {questions.length > 0 && ` · ${STAGES[stageIdx].label} stage`}
            </h3>
            {submitting && <span className="badge badge-teal">Saving & generating report…</span>}
          </div>

          {stageErr && (
            <div className="alert alert-danger mb-2">
              {stageErr}
              <div className="mt-1">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={async () => {
                    setStageErr("");
                    setCurrentNextErr("");
                    loadStage(STAGES[stageIdx].key, answers).catch((err) =>
                      setStageErr(err instanceof Error ? err.message : String(err))
                    );
                  }}
                >
                  ✓ Retry
                </button>
              </div>
            </div>
          )}

          {currentQuestion && !submitting ? (
            <div className="card question-card">
              <h4 className="mb-2">{currentQuestion.label}</h4>
              <QControl
                q={currentQuestion}
                value={answers[currentQuestion.id]}
                onChange={(v) => recordAnswer(currentQuestion, v)}
              />
              {currentNextErr && <div className="alert alert-danger mt-2">{currentNextErr}</div>}
              <div className="flex-center mt-3" style={{ justifyContent: "flex-end" }}>
                <button
                  className="btn btn-primary"
                  disabled={!currentAnswered || submitting}
                  onClick={() => goNext()}
                >
                  {nextLabel}
                </button>
              </div>
            </div>
          ) : (
            !stageErr && (
              <div className="center">
                <p className="muted mb-2">{submitting ? "Saving your answers and generating the report profile…" : "Loading questions…"}</p>
              </div>
            )
          )}

          {submitting && (
            <div className="alert alert-info mb-2">
              Finalizing your screening result… you will be redirected automatically.
            </div>
          )}

          <div className="card mb-3">
            <label className="small muted">City where you would look for a dermatologist (optional)</label>
            <input className="input mt-1" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Chennai, Bengaluru" />
          </div>

          {analysisErr && !stageErr && <div className="alert alert-danger mb-2">{analysisErr}</div>}
          <Disclosure />
        </div>
        </motion.div>
      )}
      </AnimatePresence>
      </div>
    </PageFade>
  );
}