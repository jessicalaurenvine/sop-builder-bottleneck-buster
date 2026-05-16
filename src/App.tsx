// @ts-nocheck
import { useState, useRef, useEffect } from "react";

const COLORS = {
  bg: "#0f0e0d",
  surface: "#1a1917",
  border: "#2e2c29",
  accent: "#c084fc",
  accentDim: "#7c3aed",
  text: "#f5f0eb",
  muted: "#8a8480",
  success: "#4ade80",
};

function buildBriefFromUrl(url) {
  return [
    "You are a business operations analyst. I will give you a client website URL. Research and extract every piece of information available about this business. Visit the homepage, services pages, about page, FAQ, and any blog or review sections and document the following.",
    "SERVICES: List every service offered, how it is described, any pricing details visible, and service specific conditions or triggers mentioned.",
    "OPERATIONAL MODEL: How the business delivers its services including scheduling approach, pricing model, service windows, automation or technology mentioned, staffing references, and any policies stated.",
    "CUSTOMER PROFILE: Who they serve based on the language they use. Note pain points they address, outcomes they promise, and any testimonials or review language visible on the site.",
    "COMMUNICATION AND BRAND: Their brand voice and tone. Key promises or differentiators they highlight. Any FAQs, guarantees, or policies that reveal how they run the business.",
    "SERVICE AREA AND SCALE: Geography served. Any indication of business size, team size, or growth stage.",
    "FORMAT YOUR OUTPUT as a clean business brief with these sections clearly labeled. Write it as a professional summary a consultant would hand to a senior colleague before a client meeting. End with a clearly labeled section called GAPS that lists everything the website could not tell you about internal operations, team, pricing rationale, what is currently documented, what is breaking down, or growth plans.",
    "Website URL: " + url,
  ].join("\n\n");
}

function buildBriefFromManual(rawText) {
  return [
    "You are a business operations analyst. Below is raw information about a business provided directly by a consultant. It may be messy notes, an intake form, a discovery transcript, or any other unstructured source. Read all of it and extract everything relevant to build a structured business brief.",
    "RAW CLIENT INFORMATION:",
    rawText,
    "FORMAT YOUR OUTPUT as a clean business brief with these sections clearly labeled: SERVICES, OPERATIONAL MODEL, CUSTOMER PROFILE, COMMUNICATION AND BRAND, SERVICE AREA AND SCALE, and GAPS. For the GAPS section, list anything important that the provided information did not cover and that you would still want to know before building their SOP system. Write it as a professional summary a consultant would hand to a senior colleague before a client meeting.",
  ].join("\n\n");
}

function discoveryQuestions(brief) {
  return [
    "You are an SOP development consultant preparing for a discovery call. Below is a research brief. Generate a targeted discovery interview asking only questions the brief could not answer.",
    brief,
    "Surface what lives in the owner head versus written down, team size and hiring plans, where things break down, what onboarding has looked like, seasonal pressures, where the owner time goes, and near term events that change urgency.",
    "Format as numbered questions grouped by topic. Add an italicized note after each question explaining what you are listening for. End with a LISTEN FOR section with 6 to 8 signals indicating emergency triage versus structured phased build.",
  ].join("\n\n");
}

function sopPlan(brief, answers) {
  return [
    "You are an SOP development consultant. Build a prioritized SOP development plan.",
    "BUSINESS BRIEF:",
    brief,
    "DISCOVERY ANSWERS:",
    answers,
    "Include BUSINESS STAGE ASSESSMENT of 3 to 4 sentences on operational state and biggest risk, PRIORITIZED SOP LIST in three phases named Phase 1 Must Have Now and Phase 2 Scaling Support and Phase 3 Protection and Professionalism, QUICK WIN DOCUMENTS of 3 to 5 one page checklists buildable immediately, FIRST WEEK ONBOARDING SEQUENCE listing the exact documents a new hire needs in order, and TIMELINE RECOMMENDATION.",
    "Write in a direct confident client facing voice referencing specifics from their business throughout.",
  ].join("\n\n");
}

function writeSop(brief, sopTitle) {
  return [
    "You are an SOP writer for a small service business. Write a complete field ready Standard Operating Procedure.",
    "BUSINESS BRIEF:",
    brief,
    "SOP TITLE: " + sopTitle,
    "Include all sections PURPOSE with 1 to 2 sentences on why it exists, SCOPE on who it applies to and when, RESPONSIBILITIES on who owns and carries out the process, PROCEDURE as numbered steps in plain language a new hire can follow on day one, QUALITY STANDARDS on what done correctly looks like, COMMON MISTAKES TO AVOID with 3 to 5 specific errors, and FIELD CHECKLIST as a yes or no checklist of 12 items or fewer.",
    "Write in plain direct language. No jargon. No filler. Every sentence earns its place.",
  ].join("\n\n");
}

async function callClaude(prompt, onChunk) {
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

  while (true) {
    const chunkResult = await reader.read();
    if (chunkResult.done) break;
    const chunk = decoder.decode(chunkResult.value);
    const lines = chunk.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.indexOf("data: ") === 0) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "content_block_delta" && data.delta && data.delta.type === "text_delta") {
            fullText += data.delta.text;
            onChunk(fullText);
          }
        } catch (e) {}
      }
    }
  }
  return fullText;
}

const steps = [
  { id: "start", label: "Client Info" },
  { id: "brief", label: "Business Brief" },
  { id: "discovery", label: "Discovery" },
  { id: "plan", label: "SOP Plan" },
  { id: "done", label: "Done" },
];

function ProgressBar(props) {
  const idx = steps.findIndex(function (s) { return s.id === props.currentStep; });
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
      {steps.map(function (step, i) {
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i < idx ? COLORS.accentDim : i === idx ? COLORS.accent : COLORS.border,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, color: i <= idx ? "#fff" : COLORS.muted,
              flexShrink: 0,
            }}>
              {i < idx ? "OK" : i + 1}
            </div>
            {i < steps.length - 1 ? (
              <div style={{ flex: 1, height: 1, background: i < idx ? COLORS.accentDim : COLORS.border }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function OutputBox(props) {
  const ref = useRef(null);
  useEffect(function () {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [props.text]);
  return (
    <div ref={ref} style={{
      background: COLORS.bg, border: "1px solid " + COLORS.border,
      borderRadius: 8, padding: "16px 20px", maxHeight: 400,
      overflowY: "auto", fontFamily: "Georgia, serif",
      fontSize: 14, lineHeight: 1.8, color: COLORS.text,
      whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 16,
    }}>
      {props.text ? props.text : <span style={{ color: COLORS.muted }}>{props.loading ? "Generating..." : ""}</span>}
    </div>
  );
}

function Btn(props) {
  return (
    <button onClick={props.onClick} disabled={props.disabled} style={{
      padding: "11px 24px", borderRadius: 6,
      border: props.secondary ? "1px solid " + COLORS.border : "none",
      cursor: props.disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", fontSize: 14, fontWeight: 600,
      background: props.secondary ? "transparent" : COLORS.accent,
      color: props.secondary ? COLORS.muted : "#fff",
      opacity: props.disabled ? 0.4 : 1,
    }}>
      {props.children}
    </button>
  );
}

export default function App() {
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
  const [sop, setSop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(prompt, onDone) {
    setLoading(true);
    setStream("");
    setError("");
    try {
      const result = await callClaude(prompt, setStream);
      onDone(result);
    } catch (e) {
      setError("Something went wrong. Check your API key and try again.");
    }
    setLoading(false);
  }

  function reset() {
    setStep("start"); setUrl(""); setManualText(""); setBrief(""); setStream("");
    setDiscovery(""); setAnswers(""); setPlan(""); setSopTitle(""); setSop("");
    setLoading(false); setError("");
  }

  const card = { background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 12, padding: 32, marginBottom: 16 };
  const h2 = { fontFamily: "Georgia, serif", fontSize: 22, margin: 0, color: COLORS.text };
  const sub = { color: COLORS.muted, fontSize: 14, margin: "4px 0 0", lineHeight: 1.6 };
  const rowEnd = { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 };
  const copyBtn = { background: "none", border: "1px solid " + COLORS.border, borderRadius: 4, padding: "4px 10px", color: COLORS.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: 11, color: COLORS.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" };
  const inputStyle = {
    width: "100%", background: COLORS.bg, border: "1px solid " + COLORS.border,
    borderRadius: 6, padding: "11px 14px", color: COLORS.text,
    fontSize: 14, lineHeight: 1.6, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: COLORS.accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>Bottleneck Buster</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 34, fontWeight: 700, margin: "0 0 8px" }}>SOP Builder</h1>
          <p style={{ color: COLORS.muted, fontSize: 15, margin: 0 }}>Four prompts. One sitting. A complete SOP system.</p>
        </div>

        <ProgressBar currentStep={step} />

        {error ? (
          <div style={{ background: "#3f1010", border: "1px solid #7f2020", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#fca5a5" }}>
            {error}
          </div>
        ) : null}

        {step === "start" ? (
          <div style={card}>
            <h2 style={{ ...h2, marginBottom: 8 }}>Client Information</h2>
            <p style={{ ...sub, margin: "0 0 24px" }}>Use Website URL when the site is current. Use Manual Entry to paste in whatever you have about the client.</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              {[["url", "Website URL"], ["manual", "Manual Entry"]].map(function (pair) {
                const m = pair[0];
                const label = pair[1];
                return (
                  <button key={m} onClick={function () { setMode(m); }} style={{
                    flex: 1, padding: "9px 0", borderRadius: 6, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                    background: mode === m ? COLORS.accentDim : COLORS.bg,
                    color: mode === m ? "#fff" : COLORS.muted,
                    border: "1px solid " + (mode === m ? COLORS.accentDim : COLORS.border),
                  }}>{label}</button>
                );
              })}
            </div>
            {mode === "url" ? (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Business Website URL</label>
                <input value={url} onChange={function (e) { setUrl(e.target.value); }} placeholder="https://example.com" style={inputStyle} />
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Everything You Know About The Client</label>
                <p style={{ ...sub, margin: "0 0 10px" }}>Paste anything here: discovery notes, intake form contents, a call transcript, a document you copied. Messy is fine. Claude will pull what it needs and build the structured brief.</p>
                <textarea
                  value={manualText}
                  onChange={function (e) { setManualText(e.target.value); }}
                  placeholder="Paste all client information here..."
                  rows={14}
                  style={{ ...inputStyle, fontFamily: "Georgia, serif", lineHeight: 1.7, resize: "vertical" }}
                />
              </div>
            )}
            <div style={rowEnd}>
              <Btn onClick={function () { setStep("brief"); run(mode === "url" ? buildBriefFromUrl(url) : buildBriefFromManual(manualText), setBrief); }} disabled={mode === "url" ? !url.trim() : !manualText.trim()}>
                Run Prompt 1 - Build Business Brief
              </Btn>
            </div>
          </div>
        ) : null}

        {step === "brief" ? (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={h2}>Business Brief</h2>
              {brief ? <button onClick={function () { navigator.clipboard.writeText(brief); }} style={copyBtn}>Copy</button> : null}
            </div>
            <p style={sub}>Prompt 1 complete. Review then generate discovery questions.</p>
            <OutputBox text={loading ? stream : brief} loading={loading} />
            {!loading && brief ? (
              <div style={rowEnd}>
                <Btn secondary onClick={reset}>Start Over</Btn>
                <Btn onClick={function () { setStep("discovery"); run(discoveryQuestions(brief), setDiscovery); }}>Run Prompt 2 - Discovery Questions</Btn>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "discovery" ? (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={h2}>Discovery Questions</h2>
              {discovery ? <button onClick={function () { navigator.clipboard.writeText(discovery); }} style={copyBtn}>Copy</button> : null}
            </div>
            <p style={sub}>Prompt 2 complete. Use these on your call then paste your notes below.</p>
            <OutputBox text={loading ? stream : discovery} loading={loading} />
            {!loading && discovery ? (
              <div style={{ marginTop: 24 }}>
                <div style={{ height: 1, background: COLORS.border, margin: "0 0 20px" }} />
                <label style={labelStyle}>Your Discovery Answers</label>
                <textarea value={answers} onChange={function (e) { setAnswers(e.target.value); }} placeholder="Paste your call notes or type answers here" rows={10} style={{ ...inputStyle, fontFamily: "Georgia, serif", lineHeight: 1.7, resize: "vertical" }} />
                <div style={rowEnd}>
                  <Btn secondary onClick={reset}>Start Over</Btn>
                  <Btn onClick={function () { setStep("plan"); run(sopPlan(brief, answers), setPlan); }} disabled={!answers.trim()}>Run Prompt 3 - Build SOP Plan</Btn>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "plan" ? (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={h2}>SOP Plan</h2>
              {plan ? <button onClick={function () { navigator.clipboard.writeText(plan); }} style={copyBtn}>Copy</button> : null}
            </div>
            <p style={sub}>Prompt 3 complete. Review the plan then pick a Phase 1 SOP to write first.</p>
            <OutputBox text={loading ? stream : plan} loading={loading} />
            {!loading && plan ? (
              <div style={{ marginTop: 24 }}>
                <div style={{ height: 1, background: COLORS.border, margin: "0 0 20px" }} />
                <label style={labelStyle}>Which SOP do you want to write first</label>
                <input value={sopTitle} onChange={function (e) { setSopTitle(e.target.value); }} placeholder="e.g. Daily Crew Launch and Morning Routine" style={inputStyle} />
                <div style={rowEnd}>
                  <Btn secondary onClick={reset}>Start Over</Btn>
                  <Btn onClick={function () { setStep("done"); run(writeSop(brief, sopTitle), setSop); }} disabled={!sopTitle.trim()}>Run Prompt 4 - Write the SOP</Btn>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "done" ? (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={h2}>{loading ? "Writing SOP..." : "SOP Complete"}</h2>
              {sop && !loading ? (
                <button onClick={function () { navigator.clipboard.writeText(sop); }} style={{ background: COLORS.accentDim, border: "none", borderRadius: 6, padding: "7px 14px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Copy SOP</button>
              ) : null}
            </div>
            <OutputBox text={loading ? stream : sop} loading={loading} />
            {!loading && sop ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                <span style={{ fontSize: 13, color: COLORS.muted }}>Copy then paste into Google Drive.</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn secondary onClick={function () { setStep("plan"); setSopTitle(""); setSop(""); }}>Write Another SOP</Btn>
                  <Btn onClick={reset}>New Client</Btn>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

      </div>
    </div>
  );
}
