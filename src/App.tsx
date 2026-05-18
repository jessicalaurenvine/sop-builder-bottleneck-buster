// @ts-nocheck
import { useState, useRef, useEffect } from "react";

const COLORS = {
  bg: "#0f0e0d",
  surface: "#1a1917",
  border: "#2e2c29",
  accent: "#c084fc",
  accentDim: "#7c3aed",
  blue: "#0071e3",
  blueDim: "#0055b3",
  text: "#f5f0eb",
  muted: "#8a8480",
  success: "#4ade80",
  warning: "#fb923c",
  error: "#fca5a5",
};

// Token tracking
const TOKEN_CAP = 250000;
const getMonthKey = () => {
  const d = new Date();
  return `bb_tokens_${d.getFullYear()}_${d.getMonth()}`;
};
const getTokensUsed = () => parseInt(localStorage.getItem(getMonthKey()) || "0");
const addTokens = (n) => {
  const key = getMonthKey();
  const current = parseInt(localStorage.getItem(key) || "0");
  localStorage.setItem(key, String(current + n));
};
const estimateTokens = (text) => Math.ceil(text.length / 4);

// Access code validation
const ACCESS_CODES_KEY = "bb_valid_codes";
const SESSION_KEY = "bb_access_granted";
const validateCode = (code) => {
  const clean = code.trim().toUpperCase();
  // Codes follow pattern BB-XXXXXX (6 alphanumeric chars)
  if (/^BB-[A-Z0-9]{6}$/.test(clean)) return true;
  // Also accept any stored valid codes from env
  const envCodes = (import.meta.env.VITE_ACCESS_CODES || "").split(",").map(c => c.trim().toUpperCase());
  return envCodes.includes(clean);
};
const isAccessGranted = () => sessionStorage.getItem(SESSION_KEY) === "true";
const grantAccess = (code) => sessionStorage.setItem(SESSION_KEY, "true");

// Prompts
function buildBriefFromUrl(url) {
  return ["You are a business operations analyst. Research and extract every piece of information about this business from their website.",
    "Visit the homepage, services pages, about page, FAQ, and any blog or review sections. Document the following sections:",
    "SERVICES: Every service offered, pricing details visible, and service-specific conditions or triggers.",
    "OPERATIONAL MODEL: How they deliver services — scheduling, pricing model, service windows, technology, staffing, and policies.",
    "CUSTOMER PROFILE: Who they serve, pain points addressed, outcomes promised, and testimonial language.",
    "COMMUNICATION AND BRAND: Brand voice, key promises, differentiators, FAQs, and guarantees.",
    "SERVICE AREA AND SCALE: Geography, business size, team size, growth stage.",
    "Format as a clean business brief a consultant would hand to a colleague before a client meeting.",
    "End with GAPS — everything the website could not tell you about internal operations, team, what is documented, what is breaking down, or growth plans.",
    "Website URL: " + url].join("\n\n");
}

function buildBriefFromManual(rawText) {
  return ["You are a business operations analyst. Below is raw information about a business. It may be messy notes, an intake form, or a transcript. Extract everything relevant and build a structured business brief.",
    "RAW INFORMATION:", rawText,
    "Format as a clean business brief with sections: SERVICES, OPERATIONAL MODEL, CUSTOMER PROFILE, COMMUNICATION AND BRAND, SERVICE AREA AND SCALE, and GAPS. For GAPS list what is still unknown that you would need before building their SOP system."].join("\n\n");
}

function discoveryQuestions(brief) {
  return ["You are an SOP development specialist helping a business owner get what is in their head onto paper.",
    "Below is a research brief. Generate targeted questions asking only what the brief could not answer.",
    brief,
    "Surface: what lives in the owner's head vs written down, team size and hiring plans, where things break down, what onboarding has looked like, seasonal pressures, where the owner's time goes, and near-term events that change urgency.",
    "Format as numbered questions grouped by topic. Add an italicized note after each question on what you are trying to surface.",
    "End with LISTEN FOR — 6 to 8 signals indicating emergency triage vs structured phased build."].join("\n\n");
}

function sopPlan(brief, answers) {
  return ["You are an SOP development specialist. Build a prioritized SOP development plan.",
    "BUSINESS BRIEF:", brief,
    "DISCOVERY ANSWERS:", answers,
    "Include:",
    "BUSINESS STAGE ASSESSMENT — 3 to 4 sentences on operational state and biggest risk if they hire tomorrow with nothing documented.",
    "PRIORITIZED SOP LIST in three phases: Phase 1 Must Have Now (with SOP title, what it covers, what breaks without it), Phase 2 Scaling Support (makes adding team members possible), Phase 3 Protection and Professionalism (quality control, HR, accountability).",
    "QUICK WIN DOCUMENTS — 3 to 5 one-page checklists buildable immediately and usable this week.",
    "FIRST WEEK ONBOARDING SEQUENCE — exact documents a new hire needs in order, flagging which do not exist yet.",
    "GOOGLE DRIVE FOLDER STRUCTURE — provide TWO folder structure options: Option A organized BY ROLE (e.g. Owner / Operations Manager / Crew Member folders) and Option B organized BY WORKFLOW (e.g. Client Onboarding / Service Delivery / Invoicing / HR folders). For each option show the full folder tree with example document names inside each folder. Recommend which fits their business better based on their stage and team size.",
    "TIMELINE RECOMMENDATION — realistic phased build schedule.",
    "Write in a direct confident voice referencing specifics from their business throughout."].join("\n\n");
}

function writeSop(brief, sopTitle, updatedBy, updatedDate) {
  const meta = updatedBy ? `\n\nDocument metadata to include at top: Last Updated: ${updatedDate || new Date().toLocaleDateString()} | Updated By: ${updatedBy}` : "";
  return ["You are an SOP writer for a service business. Write a complete field-ready Standard Operating Procedure.",
    "BUSINESS BRIEF:", brief,
    "SOP TITLE: " + sopTitle + meta,
    "Format with these sections:",
    "DOCUMENT INFO: SOP Title, Version (start at 1.0), Last Updated date, Updated By name, Owner (the person responsible for keeping this current — not the CEO).",
    "PURPOSE: 1 to 2 sentences on why this SOP exists.",
    "SCOPE: Who it applies to, when used, when it does not apply.",
    "RESPONSIBILITIES: Who owns this process and who carries it out.",
    "PROCEDURE: Numbered steps in plain language a new hire can follow on day one. Where judgment is needed give a rule of thumb.",
    "QUALITY STANDARDS: What done correctly looks like.",
    "COMMON MISTAKES TO AVOID: 3 to 5 specific errors written as plain statements.",
    "FIELD CHECKLIST: Yes/no checklist of 12 items or fewer. Every item physically confirmable.",
    "UPDATE LOG: A table with columns: Date | Updated By | What Changed | Version. Start with one row for today.",
    "Write in plain direct language. No jargon. Every sentence earns its place. Format so it pastes cleanly into a Google Doc."].join("\n\n");
}

function updateSop(existingSop, whatChanged, updatedBy) {
  return ["You are an SOP writer. An existing SOP needs to be updated to reflect a change in how the work is done.",
    "EXISTING SOP:", existingSop,
    "WHAT CHANGED: " + whatChanged,
    "UPDATED BY: " + updatedBy,
    "Rewrite the SOP incorporating the change throughout all relevant sections. Update the DOCUMENT INFO section with today's date and the name provided. Add a new row to the UPDATE LOG table documenting what changed and increment the version number.",
    "Keep everything that did not change exactly as it was. Only update what the change affects.",
    "Write in the same plain direct language as the original."].join("\n\n");
}

function askSops(sopContext, question) {
  return ["You are an operations assistant for a business. You have been given the business's SOP library. Answer the question below using only the information in the SOPs provided.",
    "If the answer is clearly covered in the SOPs, give a direct answer referencing the relevant SOP and the specific step or section.",
    "If the answer is partially covered, give the best answer you can and note what the SOP does not address.",
    "If the question is not covered at all, say so clearly rather than guessing.",
    "SOP LIBRARY:", sopContext,
    "QUESTION: " + question].join("\n\n");
}

// Claude API call with token tracking
async function callClaude(prompt, onChunk) {
  const used = getTokensUsed();
  if (used >= TOKEN_CAP) throw new Error("TOKEN_CAP");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let inputEstimate = estimateTokens(prompt);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
            fullText += data.delta.text;
            onChunk(fullText);
          }
        } catch (e) {}
      }
    }
  }

  const outputEstimate = estimateTokens(fullText);
  addTokens(inputEstimate + outputEstimate);
  return fullText;
}

// UI Components
function TokenMeter() {
  const used = getTokensUsed();
  const pct = Math.min(100, Math.round((used / TOKEN_CAP) * 100));
  const color = pct > 90 ? COLORS.error : pct > 70 ? COLORS.warning : COLORS.success;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
      <div style={{ flex: 1, height: 4, background: COLORS.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: 2, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 11, color: COLORS.muted, whiteSpace: "nowrap" }}>{used.toLocaleString()} / {TOKEN_CAP.toLocaleString()} tokens this month</span>
    </div>
  );
}

function OutputBox({ text, loading }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [text]);
  return (
    <div ref={ref} style={{
      background: COLORS.bg, border: "1px solid " + COLORS.border,
      borderRadius: 8, padding: "16px 20px", maxHeight: 420,
      overflowY: "auto", fontFamily: "Georgia, serif",
      fontSize: 14, lineHeight: 1.8, color: COLORS.text,
      whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 16,
    }}>
      {text || <span style={{ color: COLORS.muted }}>{loading ? "Generating..." : ""}</span>}
    </div>
  );
}

function Btn({ onClick, children, secondary, disabled, color }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "11px 24px", borderRadius: 6,
      border: secondary ? "1px solid " + COLORS.border : "none",
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", fontSize: 14, fontWeight: 600,
      background: secondary ? "transparent" : (color || COLORS.accent),
      color: secondary ? COLORS.muted : "#fff",
      opacity: disabled ? 0.4 : 1,
      transition: "all 0.2s",
    }}>{children}</button>
  );
}

const cardStyle = { background: "#1a1917", border: "1px solid #2e2c29", borderRadius: 12, padding: 32, marginBottom: 16 };
const h2Style = { fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 6px", color: "#f5f0eb" };
const subStyle = { color: "#8a8480", fontSize: 14, margin: 0, lineHeight: 1.6 };
const labelStyle = { display: "block", fontSize: 11, color: "#8a8480", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" };
const inputBase = { width: "100%", background: "#0f0e0d", border: "1px solid #2e2c29", borderRadius: 6, padding: "11px 14px", color: "#f5f0eb", fontSize: 14, lineHeight: 1.6, outline: "none", boxSizing: "border-box" };
const rowEnd = { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 };
const copyBtn = { background: "none", border: "1px solid #2e2c29", borderRadius: 4, padding: "4px 10px", color: "#8a8480", cursor: "pointer", fontSize: 12, fontFamily: "inherit" };

const buildSteps = [
  { id: "start", label: "Info" },
  { id: "brief", label: "Brief" },
  { id: "discovery", label: "Discovery" },
  { id: "plan", label: "Plan" },
  { id: "sop", label: "Write SOP" },
];

function ProgressBar({ currentStep, steps }) {
  const idx = steps.findIndex(s => s.id === currentStep);
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {steps.map((step, i) => (
        <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
            background: i < idx ? COLORS.accentDim : i === idx ? COLORS.accent : COLORS.border,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: i <= idx ? "#fff" : COLORS.muted,
          }}>
            {i < idx ? "✓" : i + 1}
          </div>
          <span style={{ fontSize: 11, color: i === idx ? COLORS.accent : COLORS.muted, marginLeft: 5, marginRight: 8, whiteSpace: "nowrap" }}>{step.label}</span>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: i < idx ? COLORS.accentDim : COLORS.border }} />}
        </div>
      ))}
    </div>
  );
}

// ── GATE SCREEN ──────────────────────────────────────
function GateScreen({ onAccess }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    if (validateCode(code)) { grantAccess(code); onAccess(); }
    else setErr("Invalid access code. Check your purchase confirmation email and try again.");
  };
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: COLORS.accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>Bottleneck Buster</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, margin: "0 0 10px", color: COLORS.text }}>Enter Access Code</h1>
          <p style={{ color: COLORS.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>Your access code is in your purchase confirmation email. It looks like BB-XXXXXX.</p>
        </div>
        <div style={cardStyle}>
          <label style={labelStyle}>Access Code</label>
          <input
            value={code}
            onChange={e => { setCode(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="BB-XXXXXX"
            style={{ ...inputBase, fontSize: 18, textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}
          />
          {err && <div style={{ color: COLORS.error, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <Btn onClick={submit} disabled={!code.trim()} color={COLORS.blue}>Unlock →</Btn>
        </div>
        <p style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, marginTop: 16 }}>
          Need help? Email jessica@jessicalaurenvine.com
        </p>
      </div>
    </div>
  );
}

// ── HOME SCREEN ──────────────────────────────────────
function HomeScreen({ onMode }) {
  const used = getTokensUsed();
  const pct = Math.round((used / TOKEN_CAP) * 100);
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ fontSize: 11, color: COLORS.accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>Bottleneck Buster</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 700, margin: "0 0 10px" }}>What do you want to do?</h1>
          <p style={{ color: COLORS.muted, fontSize: 15, margin: 0 }}>Build a new SOP library, update an existing SOP, or let your team ask questions.</p>
        </div>

        <TokenMeter />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            { mode: "build", icon: "⚡", title: "Build SOPs", desc: "Start from scratch. Four prompts take you from your website to a complete documented system.", color: COLORS.accent },
            { mode: "update", icon: "↺", title: "Update an SOP", desc: "Something changed in how you do the work. Paste the existing SOP and describe what's different.", color: COLORS.blue },
            { mode: "ask", icon: "💬", title: "Ask My SOPs", desc: "Team member? Paste your SOP library and ask any question. No Claude account needed.", color: COLORS.success },
          ].map(({ mode, icon, title, desc, color }) => (
            <div key={mode} onClick={() => onMode(mode)} style={{
              background: COLORS.surface, border: "1px solid " + COLORS.border,
              borderRadius: 14, padding: 28, cursor: "pointer",
              transition: "all 0.2s", position: "relative", overflow: "hidden",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = color}
            onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, marginBottom: 8, color: COLORS.text }}>{title}</div>
              <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>{desc}</div>
              <div style={{ position: "absolute", bottom: 16, right: 20, fontSize: 18, color, opacity: 0.6 }}>→</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, padding: "20px 24px", background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Monthly Usage</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 6, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: pct + "%", height: "100%", background: pct > 90 ? COLORS.error : pct > 70 ? COLORS.warning : COLORS.accent, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 13, color: COLORS.muted }}>{used.toLocaleString()} / {TOKEN_CAP.toLocaleString()} tokens</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>Resets on the 1st of each month.</div>
        </div>
      </div>
    </div>
  );
}

// ── BUILD FLOW ──────────────────────────────────────
function BuildFlow({ onHome }) {
  const [step, setStep] = useState("start");
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [brief, setBrief] = useState("");
  const [stream, setStream] = useState("");
  const [discovery, setDiscovery] = useState("");
  const [answers, setAnswers] = useState("");
  const [plan, setPlan] = useState("");
  const [sopTitle, setSopTitle] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [sop, setSop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async (prompt, onDone) => {
    setLoading(true); setStream(""); setError("");
    try {
      const result = await callClaude(prompt, setStream);
      onDone(result);
    } catch (e) {
      if (e.message === "TOKEN_CAP") setError("You have reached your monthly token limit. Upgrade to the $50/month plan to continue.");
      else setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const reset = () => {
    setStep("start"); setUrl(""); setManualText(""); setBrief(""); setStream("");
    setDiscovery(""); setAnswers(""); setPlan(""); setSopTitle(""); setSop("");
    setUpdatedBy(""); setLoading(false); setError("");
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Bottleneck Buster</div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, margin: 0 }}>Build Your SOP System</h1>
          </div>
          <button onClick={onHome} style={{ background: "none", border: "1px solid " + COLORS.border, borderRadius: 6, padding: "7px 14px", color: COLORS.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← Home</button>
        </div>

        <ProgressBar currentStep={step} steps={buildSteps} />

        {error && <div style={{ background: "#3f1010", border: "1px solid #7f2020", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: COLORS.error }}>{error}</div>}

        {step === "start" && (
          <div style={cardStyle}>
            <h2 style={h2Style}>Business Information</h2>
            <p style={{ ...subStyle, margin: "0 0 24px" }}>Use Website URL when the site is current. Use Manual Entry to paste in anything you have — notes, a transcript, intake form, or a document.</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              {[["url", "Website URL"], ["manual", "Manual Entry"]].map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: "9px 0", borderRadius: 6, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                  background: mode === m ? COLORS.accentDim : COLORS.bg,
                  color: mode === m ? "#fff" : COLORS.muted,
                  border: "1px solid " + (mode === m ? COLORS.accentDim : COLORS.border),
                }}>{label}</button>
              ))}
            </div>
            {mode === "url" ? (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Business Website URL</label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" style={inputBase} />
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Everything You Know About This Business</label>
                <p style={{ ...subStyle, margin: "0 0 10px", fontSize: 13 }}>Paste anything here — discovery notes, intake form, call transcript. Messy is fine.</p>
                <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Paste all business information here..." rows={12} style={{ ...inputBase, fontFamily: "Georgia, serif", lineHeight: 1.7, resize: "vertical" }} />
              </div>
            )}
            <div style={rowEnd}>
              <Btn secondary onClick={onHome}>Back</Btn>
              <Btn onClick={() => { setStep("brief"); run(mode === "url" ? buildBriefFromUrl(url) : buildBriefFromManual(manualText), setBrief); }} disabled={mode === "url" ? !url.trim() : !manualText.trim()}>
                Run Prompt 1 — Build Business Brief →
              </Btn>
            </div>
          </div>
        )}

        {step === "brief" && (
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={h2Style}>Business Brief</h2>
              {brief && <button onClick={() => navigator.clipboard.writeText(brief)} style={copyBtn}>Copy</button>}
            </div>
            <p style={subStyle}>Prompt 1 complete. Review the brief then generate discovery questions.</p>
            <OutputBox text={loading ? stream : brief} loading={loading} />
            {!loading && brief && (
              <div style={rowEnd}>
                <Btn secondary onClick={reset}>Start Over</Btn>
                <Btn onClick={() => { setStep("discovery"); run(discoveryQuestions(brief), setDiscovery); }}>Run Prompt 2 — Discovery Questions →</Btn>
              </div>
            )}
          </div>
        )}

        {step === "discovery" && (
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={h2Style}>Discovery Questions</h2>
              {discovery && <button onClick={() => navigator.clipboard.writeText(discovery)} style={copyBtn}>Copy</button>}
            </div>
            <p style={subStyle}>Prompt 2 complete. Answer every question below — be specific and honest.</p>
            <OutputBox text={loading ? stream : discovery} loading={loading} />
            {!loading && discovery && (
              <div style={{ marginTop: 24 }}>
                <div style={{ height: 1, background: COLORS.border, margin: "0 0 20px" }} />
                <label style={labelStyle}>Your Answers</label>
                <p style={{ ...subStyle, fontSize: 13, margin: "0 0 10px" }}>Answer every question. The more honest and specific you are here, the better your SOP plan will be.</p>
                <textarea value={answers} onChange={e => setAnswers(e.target.value)} placeholder="Type or paste your answers here..." rows={12} style={{ ...inputBase, fontFamily: "Georgia, serif", lineHeight: 1.7, resize: "vertical" }} />
                <div style={rowEnd}>
                  <Btn secondary onClick={reset}>Start Over</Btn>
                  <Btn onClick={() => { setStep("plan"); run(sopPlan(brief, answers), setPlan); }} disabled={!answers.trim()}>Run Prompt 3 — Build SOP Plan →</Btn>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "plan" && (
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={h2Style}>SOP Plan + Google Drive Structure</h2>
              {plan && <button onClick={() => navigator.clipboard.writeText(plan)} style={copyBtn}>Copy</button>}
            </div>
            <p style={subStyle}>Prompt 3 complete. Your plan includes a Google Drive folder structure. Save this to Google Drive first, then pick a Phase 1 SOP to write.</p>
            <OutputBox text={loading ? stream : plan} loading={loading} />
            {!loading && plan && (
              <div style={{ marginTop: 24 }}>
                <div style={{ height: 1, background: COLORS.border, margin: "0 0 20px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>SOP Title (from your Phase 1 list)</label>
                    <input value={sopTitle} onChange={e => setSopTitle(e.target.value)} placeholder="e.g. Daily Crew Launch and Morning Routine" style={inputBase} />
                  </div>
                  <div>
                    <label style={labelStyle}>Your Name (for document records)</label>
                    <input value={updatedBy} onChange={e => setUpdatedBy(e.target.value)} placeholder="e.g. Jessica Vine" style={inputBase} />
                  </div>
                </div>
                <div style={rowEnd}>
                  <Btn secondary onClick={reset}>Start Over</Btn>
                  <Btn onClick={() => { setStep("sop"); run(writeSop(brief, sopTitle, updatedBy, new Date().toLocaleDateString()), setSop); }} disabled={!sopTitle.trim()}>Run Prompt 4 — Write the SOP →</Btn>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "sop" && (
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={h2Style}>{loading ? "Writing SOP..." : "✓ SOP Complete"}</h2>
              {sop && !loading && <button onClick={() => navigator.clipboard.writeText(sop)} style={{ background: COLORS.accentDim, border: "none", borderRadius: 6, padding: "7px 14px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Copy SOP</button>}
            </div>
            {!loading && sop && <p style={{ ...subStyle, color: COLORS.success }}>Ready to paste into Google Drive. The document includes an Update Log — use it every time something changes.</p>}
            <OutputBox text={loading ? stream : sop} loading={loading} />
            {!loading && sop && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                <span style={{ fontSize: 13, color: COLORS.muted }}>Copy → paste into a new Google Doc → save to your SOP folder.</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn secondary onClick={() => { setStep("plan"); setSopTitle(""); setSop(""); setUpdatedBy(""); }}>Write Another SOP</Btn>
                  <Btn secondary onClick={reset}>New Business</Btn>
                  <Btn onClick={onHome} color={COLORS.blue}>Back to Home</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── UPDATE FLOW ──────────────────────────────────────
function UpdateFlow({ onHome }) {
  const [existingSop, setExistingSop] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [result, setResult] = useState("");
  const [stream, setStream] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true); setStream(""); setError("");
    try {
      const r = await callClaude(updateSop(existingSop, whatChanged, updatedBy), setStream);
      setResult(r);
    } catch (e) {
      if (e.message === "TOKEN_CAP") setError("Your monthly token allocation has been used. It resets on the 1st — or contact jessica@jessicalaurenvine.com if you need assistance.");
      else setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.blue, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Bottleneck Buster</div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, margin: 0 }}>Update an Existing SOP</h1>
          </div>
          <button onClick={onHome} style={{ background: "none", border: "1px solid " + COLORS.border, borderRadius: 6, padding: "7px 14px", color: COLORS.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← Home</button>
        </div>

        <TokenMeter />

        {error && <div style={{ background: "#3f1010", border: "1px solid #7f2020", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: COLORS.error }}>{error}</div>}

        <div style={{ ...cardStyle, background: "#0f1a2e", border: "1px solid #1a3a5c" }}>
          <div style={{ fontSize: 13, color: "#34aadc", lineHeight: 1.6 }}>
            <strong style={{ display: "block", marginBottom: 4 }}>How SOP updates work</strong>
            The person who does the work notices something changed. They flag it. You paste the old SOP here, describe what changed, and the tool rewrites only what needs updating — including the version number and update log.
          </div>
        </div>

        {!result ? (
          <div style={cardStyle}>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Paste the existing SOP</label>
              <textarea value={existingSop} onChange={e => setExistingSop(e.target.value)} placeholder="Paste the full SOP text here..." rows={12} style={{ ...inputBase, fontFamily: "Georgia, serif", lineHeight: 1.7, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>What changed?</label>
              <p style={{ ...subStyle, fontSize: 13, margin: "0 0 8px" }}>Describe exactly what is different. Be specific — what used to happen and what happens now.</p>
              <textarea value={whatChanged} onChange={e => setWhatChanged(e.target.value)} placeholder="e.g. We no longer use Jobber for scheduling. We switched to ServiceTitan in March. The steps for scheduling a new job are now different — instead of..." rows={5} style={{ ...inputBase, fontFamily: "Georgia, serif", lineHeight: 1.7, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Your name (for the update log)</label>
              <input value={updatedBy} onChange={e => setUpdatedBy(e.target.value)} placeholder="e.g. Jessica Vine" style={inputBase} />
            </div>
            <div style={rowEnd}>
              <Btn secondary onClick={onHome}>Back</Btn>
              <Btn onClick={run} disabled={!existingSop.trim() || !whatChanged.trim() || !updatedBy.trim() || loading} color={COLORS.blue}>
                {loading ? "Updating..." : "Update This SOP →"}
              </Btn>
            </div>
            {loading && <OutputBox text={stream} loading={true} />}
          </div>
        ) : (
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={h2Style}>✓ SOP Updated</h2>
              <button onClick={() => navigator.clipboard.writeText(result)} style={{ background: COLORS.blue, border: "none", borderRadius: 6, padding: "7px 14px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Copy Updated SOP</button>
            </div>
            <p style={{ ...subStyle, color: COLORS.success }}>Version number incremented. Update log updated. Copy and replace the old version in Google Drive.</p>
            <OutputBox text={result} loading={false} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
              <span style={{ fontSize: 13, color: COLORS.muted }}>Copy → replace the old version in Google Drive → done.</span>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn secondary onClick={() => { setResult(""); setExistingSop(""); setWhatChanged(""); setUpdatedBy(""); setStream(""); }}>Update Another SOP</Btn>
                <Btn onClick={onHome} color={COLORS.blue}>Home</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ASK FLOW ──────────────────────────────────────
function AskFlow({ onHome }) {
  const [sopContext, setSopContext] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [stream, setStream] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async () => {
    setLoading(true); setStream(""); setError("");
    try {
      const r = await callClaude(askSops(sopContext, question), setStream);
      setAnswer(r);
    } catch (e) {
      if (e.message === "TOKEN_CAP") setError("Monthly token limit reached.");
      else setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.success, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Bottleneck Buster</div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, margin: 0 }}>Ask My SOPs</h1>
          </div>
          <button onClick={onHome} style={{ background: "none", border: "1px solid " + COLORS.border, borderRadius: 6, padding: "7px 14px", color: COLORS.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>← Home</button>
        </div>

        <div style={{ ...cardStyle, background: "#0f1f0f", border: "1px solid #1a3f1a", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: COLORS.success, lineHeight: 1.6 }}>
            <strong style={{ display: "block", marginBottom: 4 }}>For team members</strong>
            Paste your company's SOP library below, then ask any question about how to handle a situation. No Claude account needed — just the access code your manager gave you.
          </div>
        </div>

        {error && <div style={{ background: "#3f1010", border: "1px solid #7f2020", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: COLORS.error }}>{error}</div>}

        <div style={cardStyle}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Paste your SOP library or the relevant SOP</label>
            <p style={{ ...subStyle, fontSize: 13, margin: "0 0 8px" }}>Copy the SOPs from Google Drive and paste them here. You can paste one SOP or all of them.</p>
            <textarea value={sopContext} onChange={e => setSopContext(e.target.value)} placeholder="Paste your SOPs here..." rows={10} style={{ ...inputBase, fontFamily: "Georgia, serif", lineHeight: 1.7, resize: "vertical" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Your question</label>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && sopContext.trim() && question.trim() && ask()}
              placeholder="e.g. What do I do when a customer calls to complain about the job?"
              style={inputBase}
            />
          </div>
          <div style={rowEnd}>
            <Btn onClick={ask} disabled={!sopContext.trim() || !question.trim() || loading} color={COLORS.success}>
              {loading ? "Searching SOPs..." : "Get Answer →"}
            </Btn>
          </div>

          {(loading || answer) && (
            <div style={{ marginTop: 24 }}>
              <div style={{ height: 1, background: COLORS.border, margin: "0 0 16px" }} />
              <label style={labelStyle}>Answer</label>
              <OutputBox text={loading ? stream : answer} loading={loading} />
              {!loading && answer && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                  <button onClick={() => navigator.clipboard.writeText(answer)} style={copyBtn}>Copy answer</button>
                  <Btn secondary onClick={() => { setAnswer(""); setQuestion(""); setStream(""); }}>Ask another question</Btn>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────
export default function App() {
  const [view, setView] = useState(isAccessGranted() ? "home" : "gate");

  if (view === "gate") return <GateScreen onAccess={() => setView("home")} />;
  if (view === "build") return <BuildFlow onHome={() => setView("home")} />;
  if (view === "update") return <UpdateFlow onHome={() => setView("home")} />;
  if (view === "ask") return <AskFlow onHome={() => setView("home")} />;
  return <HomeScreen onMode={setView} />;
}
