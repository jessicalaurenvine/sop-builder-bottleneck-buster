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
warning: "#fb923c",
};
const PROMPTS = {
buildBriefFromUrl: (url) => `You are a business operations analyst. I am going to give you a client's website URL. Your job is to thoroughly research and extract every piece of information available about this business.
Visit the website — including the homepage, services pages, about page, FAQ, and any blog or review sections — and document the following:
SERVICES
List every service offered, how it is described, any pricing details visible, and service-specific conditions or triggers mentioned.
OPERATIONAL MODEL
How the business delivers its services — scheduling approach, pricing model, service windows, automation or technology mentioned, staffing references, and any policies stated.
CUSTOMER PROFILE
Who they serve based on the language they use. Note pain points they address, outcomes they promise, and any testimonials or review language visible on the site.
COMMUNICATION AND BRAND
Their brand voice and tone. Key promises or differentiators they highlight. Any FAQs, guarantees, or policies that reveal how they run the business.
SERVICE AREA AND SCALE
Geography served. Any indication of business size, team size, or growth stage.
FORMAT YOUR OUTPUT as a clean business brief with these sections clearly labeled. Write it as a professional summary a consultant would hand to a senior colleague before a client meeting.
End with a clearly labeled section called GAPS — QUESTIONS FOR THE OWNER that lists everything the website could not tell you — anything about internal operations, team, pricing rationale, what is currently documented, what is breaking down, or growth plans.
Website URL: ${url}`,
buildBriefFromManual: (data) => `You are a business operations analyst. Based on the information below provided directly by the business owner, create a structured business brief exactly as you would if you had researched their website.
INFORMATION PROVIDED:
Business Name: ${data.businessName}
What They Do: ${data.whatTheyDo}
Who They Serve: ${data.whoTheyServe}
Team Size: ${data.teamSize}
Services Offered: ${data.services}
Current Tools and Software: ${data.tools}
Biggest Operational Gaps: ${data.gaps}
What Breaks When Owner Is Away: ${data.breaks}
Additional Notes: ${data.additionalNotes}
FORMAT YOUR OUTPUT as a clean business brief with these sections clearly labeled:

SERVICES
OPERATIONAL MODEL
CUSTOMER PROFILE
COMMUNICATION AND BRAND
SERVICE AREA AND SCALE
GAPS — QUESTIONS FOR THE OWNER (based on what's missing from the info above, what would you still want to know before building their SOP system?)

Write it as a professional summary a consultant would hand to a senior colleague before a client meeting.`,
discoveryQuestions: (brief) => `You are an SOP development consultant preparing for a discovery call with a business owner. Below is a research brief compiled from the client's website. Based on this information, generate a targeted discovery interview — asking ONLY questions the website could not answer. Do not ask about anything already captured in the brief.
${brief}
The goal of this interview is to surface:

What currently lives only in the owner's head vs. what is written down anywhere
Current team size and realistic hiring plans for the next 6-12 months
Where things are breaking down, falling through the cracks, or requiring the owner's direct involvement to not go wrong
What onboarding has looked like when they have brought someone new on
Seasonal or operational pressures that are specific to their situation
Where the owner's time is going and where they most need to stop being the bottleneck
Any near-term events that change the urgency — a new hire starting, a busy season coming, a key person leaving

Format the output as a numbered list of questions, grouped by topic with a clear heading for each group. Write the questions in a conversational tone — this is a call, not a form. After each question, add a brief italicized note explaining what you are listening for (for the interviewer's reference only — not shown to the client).
End with a section called LISTEN FOR — 6 to 8 signals that indicate this business needs emergency triage SOPs versus a structured phased build.`,
sopPlan: (brief, answers) => `You are an SOP development consultant. Based on the research brief and discovery notes below, build a prioritized SOP development plan for this business.
BUSINESS BRIEF:
${brief}
DISCOVERY ANSWERS:
${answers}
Your output should include the following sections:
BUSINESS STAGE ASSESSMENT
Write 3 to 4 sentences summarizing where this business is operationally right now — what systems exist, what is missing, and what their single biggest operational risk is if they hire someone tomorrow without any documentation in place.
PRIORITIZED SOP LIST
Organize all recommended SOPs into three phases:
Phase 1 — Must Have Now
SOPs required for operational survival and immediate consistency. Include the SOP title, one sentence on what it covers, and one sentence on what breaks without it.
Phase 2 — Scaling Support
SOPs that make adding crew members possible without the owner becoming a trainer and babysitter.
Phase 3 — Protection and Professionalism
SOPs for quality control, HR, accountability, and long-term business protection.
QUICK WIN DOCUMENTS
Identify 3 to 5 one-page checklists or reference cards that can be built immediately — before the full SOPs are written — and handed to team members to use right now. Name each one and describe what it covers in one sentence.
FIRST-WEEK ONBOARDING SEQUENCE
List the exact documents a new hire would need in their first week on the job, in the order they would use them. Flag which ones do not exist yet and need to be built.
TIMELINE RECOMMENDATION
Suggest a realistic phased build schedule — how many SOPs to tackle per week or month, what to build first for maximum impact, and how long until the business has a complete first-draft SOP library.
Write the full output in a direct, confident, client-facing voice. Reference specifics from their business throughout.`,
writeSop: (brief, sopTitle) => `You are an SOP writer for a small service business. Using the business brief below and the SOP title provided, write a complete, field-ready Standard Operating Procedure.
BUSINESS BRIEF:
${brief}
SOP TITLE: ${sopTitle}
Your SOP must include all of the following sections:
PURPOSE
One to two sentences explaining why this SOP exists and what problem it solves.
SCOPE
Who this SOP applies to, when it is used, and any situations where it does not apply.
RESPONSIBILITIES
Who owns this process and who carries it out.
PROCEDURE
Numbered step-by-step instructions written in plain language. Each step should be one clear action. Where timing matters, include it. Where judgment is required, give a rule of thumb so the employee does not have to guess. Write this so a new hire with zero prior context can follow it correctly on day one.
QUALITY STANDARDS
What done correctly looks like. Include the specific observable outcomes that tell the employee and the manager that the procedure was completed to standard.
COMMON MISTAKES TO AVOID
Three to five specific errors that are easy to make and costly to fix. Write these as plain statements, not warnings.
FIELD CHECKLIST
A simple yes/no checklist version of the key steps. Keep it to twelve items or fewer. Every item should be something an employee can physically confirm before moving on.
Write the entire SOP in plain, direct language. No jargon. No filler. Every sentence should earn its place.`,
};
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
model: "claude-sonnet-4-20250514",
max_tokens: 4000,
stream: true,
messages: [{ role: "user", content: prompt }],
}),
});
const reader = response.body.getReader();
const decoder = new TextDecoder();
let fullText = "";
while (true) {
const { done, value } = await reader.read();
if (done) break;
const chunk = decoder.decode(value);
const lines = chunk.split("\n");
for (const line of lines) {
if (line.startsWith("data: ")) {
try {
const data = JSON.parse(line.slice(6));
if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
fullText += data.delta.text;
onChunk(fullText);
}
} catch {}
}
}
}
return fullText;
}
const steps = [
{ id: "start", label: "Client Info" },
{ id: "brief", label: "Business Brief" },
{ id: "discovery", label: "Discovery" },
{ id: "answers", label: "Your Answers" },
{ id: "plan", label: "SOP Plan" },
{ id: "sop", label: "Write SOP" },
{ id: "done", label: "Done" },
];
function ProgressBar({ currentStep }) {
const idx = steps.findIndex(s => s.id === currentStep);
return (
<div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 40 }}>
{steps.map((step, i) => (
<div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
<div style={{
width: 28, height: 28, borderRadius: "50%",
background: i < idx ? COLORS.accentDim : i === idx ? COLORS.accent : COLORS.border,
display: "flex", alignItems: "center", justifyContent: "center",
fontSize: 11, fontWeight: 600, color: i <= idx ? "#fff" : COLORS.muted,
flexShrink: 0, transition: "all 0.3s",
boxShadow: i === idx ? 0 0 12px ${COLORS.accent}66 : "none",
}}>
{i < idx ? "✓" : i + 1}
</div>
{i < steps.length - 1 && (
<div style={{
flex: 1, height: 1,
background: i < idx ? COLORS.accentDim : COLORS.border,
transition: "background 0.3s",
}} />
)}
</div>
))}
</div>
);
}
function StreamingOutput({ text, label }) {
const ref = useRef(null);
useEffect(() => {
if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
}, [text]);
return (
<div style={{ marginTop: 20 }}>
{label && <div style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>}
<div ref={ref} style={{
background: COLORS.bg, border: 1px solid ${COLORS.border},
borderRadius: 8, padding: "16px 20px", maxHeight: 400,
overflowY: "auto", fontFamily: "Georgia, serif",
fontSize: 14, lineHeight: 1.8, color: COLORS.text,
whiteSpace: "pre-wrap", wordBreak: "break-word",
}}>
{text || <span style={{ color: COLORS.muted }}>Generating...</span>}
</div>
</div>
);
}
function Btn({ onClick, children, variant = "primary", disabled }) {
return (
<button onClick={onClick} disabled={disabled} style={{
padding: "12px 28px", borderRadius: 6, border: "none",
cursor: disabled ? "not-allowed" : "pointer",
fontFamily: "inherit", fontSize: 14, fontWeight: 600,
letterSpacing: "0.02em", transition: "all 0.2s",
background: variant === "primary" ? COLORS.accent : "transparent",
color: variant === "primary" ? "#fff" : COLORS.muted,
border: variant === "secondary" ? 1px solid ${COLORS.border} : "none",
opacity: disabled ? 0.4 : 1,
}}>
{children}
</button>
);
}
function Input({ label, value, onChange, placeholder, multiline, rows = 4 }) {
const shared = {
width: "100%", background: COLORS.bg, border: 1px solid ${COLORS.border},
borderRadius: 6, padding: "12px 14px", color: COLORS.text,
fontFamily: multiline ? "Georgia, serif" : "inherit",
fontSize: 14, lineHeight: 1.6, outline: "none",
boxSizing: "border-box", resize: multiline ? "vertical" : "none",
};
return (
<div style={{ marginBottom: 16 }}>
{label && <label style={{ display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}
{multiline
? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={shared} />
: <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={shared} />
}
</div>
);
}
export default function App() {
const [step, setStep] = useState("start");
const [inputMode, setInputMode] = useState("url");
const [url, setUrl] = useState("");
const [manualData, setManualData] = useState({
businessName: "", whatTheyDo: "", whoTheyServe: "",
teamSize: "", services: "", tools: "", gaps: "", breaks: "", additionalNotes: "",
});
const [brief, setBrief] = useState("");
const [streamText, setStreamText] = useState("");
const [discovery, setDiscovery] = useState("");
const [answers, setAnswers] = useState("");
const [plan, setPlan] = useState("");
const [sopTitle, setSopTitle] = useState("");
const [finalSop, setFinalSop] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const run = async (promptText, onDone) => {
setLoading(true);
setStreamText("");
setError("");
try {
const result = await callClaude(promptText, setStreamText);
onDone(result);
} catch (e) {
setError("Something went wrong. Check your API connection and try again.");
}
setLoading(false);
};
const runPrompt1 = () => {
const prompt = inputMode === "url"
? PROMPTS.buildBriefFromUrl(url)
: PROMPTS.buildBriefFromManual(manualData);
setStep("brief");
run(prompt, (result) => { setBrief(result); });
};
const runPrompt2 = () => {
setStep("discovery");
run(PROMPTS.discoveryQuestions(brief), (result) => { setDiscovery(result); });
};
const runPrompt3 = () => {
setStep("plan");
run(PROMPTS.sopPlan(brief, answers), (result) => { setPlan(result); });
};
const runPrompt4 = () => {
setStep("done");
run(PROMPTS.writeSop(brief, sopTitle), (result) => { setFinalSop(result); });
};
const copyToClipboard = (text) => navigator.clipboard.writeText(text);
const reset = () => {
setStep("start"); setUrl(""); setBrief(""); setStreamText("");
setDiscovery(""); setAnswers(""); setPlan(""); setSopTitle("");
setFinalSop(""); setLoading(false); setError("");
setManualData({ businessName: "", whatTheyDo: "", whoTheyServe: "", teamSize: "", services: "", tools: "", gaps: "", breaks: "", additionalNotes: "" });
};
return (
<div style={{
minHeight: "100vh", background: COLORS.bg, color: COLORS.text,
fontFamily: "'DM Sans', system-ui, sans-serif",
padding: "40px 20px",
}}>
<style>{        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;700&display=swap');         * { box-sizing: border-box; }         ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }         ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 2px; }         textarea::placeholder, input::placeholder { color: ${COLORS.muted}; opacity: 0.6; }         textarea:focus, input:focus { border-color: ${COLORS.accentDim} !important; }         button:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }      }</style>
  <div style={{ maxWidth: 760, margin: "0 auto" }}>
    <div style={{ marginBottom: 48, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: COLORS.accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>Bottleneck Buster</div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, margin: "0 0 8px", color: COLORS.text }}>SOP Builder</h1>
      <p style={{ color: COLORS.muted, fontSize: 15, margin: 0 }}>Four prompts. One sitting. A complete SOP system.</p>
    </div>

    <ProgressBar currentStep={step} />

    {error && (
      <div style={{ background: "#3f1010", border: `1px solid #7f2020`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#fca5a5" }}>
        {error}
      </div>
    )}

    {step === "start" && (
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 32 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: "0 0 8px" }}>Client Information</h2>
        <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 28px", lineHeight: 1.6 }}>Choose how to pull the business brief. Use a URL when the website is current. Use manual entry when it isn't.</p>
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          {[["url", "Website URL"], ["manual", "Manual Entry"]].map(([mode, label]) => (
            <button key={mode} onClick={() => setInputMode(mode)} style={{
              flex: 1, padding: "10px 0", borderRadius: 6, cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 500,
              background: inputMode === mode ? COLORS.accentDim : COLORS.bg,
              color: inputMode === mode ? "#fff" : COLORS.muted,
              border: `1px solid ${inputMode === mode ? COLORS.accentDim : COLORS.border}`,
              transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>
        {inputMode === "url" ? (
          <Input label="Business Website URL" value={url} onChange={setUrl} placeholder="https://example.com" />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Input label="Business Name" value={manualData.businessName} onChange={v => setManualData(p => ({ ...p, businessName: v }))} placeholder="Eagle Lawn and Snow" />
              <Input label="Team Size" value={manualData.teamSize} onChange={v => setManualData(p => ({ ...p, teamSize: v }))} placeholder="Owner + 3 crew members" />
            </div>
            <Input label="What They Do" value={manualData.whatTheyDo} onChange={v => setManualData(p => ({ ...p, whatTheyDo: v }))} placeholder="Residential lawn care and snow removal in central Vermont" />
            <Input label="Who They Serve" value={manualData.whoTheyServe} onChange={v => setManualData(p => ({ ...p, whoTheyServe: v }))} placeholder="Busy homeowners and second-home owners" />
            <Input label="Services Offered" value={manualData.services} onChange={v => setManualData(p => ({ ...p, services: v }))} placeholder="Weekly mowing, seasonal cleanups, snow removal..." multiline rows={3} />
            <Input label="Current Tools and Software" value={manualData.tools} onChange={v => setManualData(p => ({ ...p, tools: v }))} placeholder="Jobber, QuickBooks, WhatsApp for crew..." />
            <Input label="Biggest Operational Gaps" value={manualData.gaps} onChange={v => setManualData(p => ({ ...p, gaps: v }))} placeholder="No written onboarding, crew makes decisions differently each time..." multiline rows={3} />
            <Input label="What Breaks When Owner Is Away" value={manualData.breaks} onChange={v => setManualData(p => ({ ...p, breaks: v }))} placeholder="Client complaints go unanswered, crew skips quality checks..." multiline rows={2} />
            <Input label="Additional Notes" value={manualData.additionalNotes} onChange={v => setManualData(p => ({ ...p, additionalNotes: v }))} placeholder="Anything else relevant..." multiline rows={2} />
          </>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Btn onClick={runPrompt1} disabled={inputMode === "url" ? !url.trim() : !manualData.businessName.trim()}>
            Run Prompt 1 — Build Business Brief →
          </Btn>
        </div>
      </div>
    )}

    {step === "brief" && (
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: 0 }}>Business Brief</h2>
          {brief && <button onClick={() => copyToClipboard(brief)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "4px 10px", color: COLORS.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Copy</button>}
        </div>
        <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 4px", lineHeight: 1.6 }}>Prompt 1 complete. Review the brief before generating discovery questions.</p>
        <StreamingOutput text={loading ? streamText : brief} label={loading ? "Extracting business information..." : ""} />
        {!loading && brief && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <Btn variant="secondary" onClick={reset}>Start Over</Btn>
            <Btn onClick={runPrompt2}>Run Prompt 2 — Discovery Questions →</Btn>
          </div>
        )}
      </div>
    )}

    {step === "discovery" && (
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: 0 }}>Discovery Questions</h2>
          {discovery && <button onClick={() => copyToClipboard(discovery)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "4px 10px", color: COLORS.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Copy</button>}
        </div>
        <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 4px", lineHeight: 1.6 }}>Prompt 2 complete. Use these on your discovery call then paste your notes below.</p>
        <StreamingOutput text={loading ? streamText : discovery} label={loading ? "Generating discovery questions..." : ""} />
        {!loading && discovery && (
          <div style={{ marginTop: 24 }}>
            <div style={{ height: 1, background: COLORS.border, margin: "0 0 24px" }} />
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: COLORS.text }}>Your Discovery Answers</h3>
            <p style={{ color: COLORS.muted, fontSize: 13, margin: "0 0 12px", lineHeight: 1.6 }}>Paste your call notes or type your answers here. This goes into Prompt 3.</p>
            <textarea value={answers} onChange={e => setAnswers(e.target.value)} placeholder="Paste discovery call notes or type answers here..." rows={10} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "12px 14px", color: COLORS.text, fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.7, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <Btn variant="secondary" onClick={reset}>Start Over</Btn>
              <Btn onClick={runPrompt3} disabled={!answers.trim()}>Run Prompt 3 — Build SOP Plan →</Btn>
            </div>
          </div>
        )}
      </div>
    )}

    {step === "plan" && (
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: 0 }}>SOP Plan</h2>
          {plan && <button onClick={() => copyToClipboard(plan)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "4px 10px", color: COLORS.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Copy</button>}
        </div>
        <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 4px", lineHeight: 1.6 }}>Prompt 3 complete. Review the plan then pick a Phase 1 SOP to write first.</p>
        <StreamingOutput text={loading ? streamText : plan} label={loading ? "Building SOP plan..." : ""} />
        {!loading && plan && (
          <div style={{ marginTop: 24 }}>
            <div style={{ height: 1, background: COLORS.border, margin: "0 0 24px" }} />
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: COLORS.text }}>Which SOP do you want to write first?</h3>
            <p style={{ color: COLORS.muted, fontSize: 13, margin: "0 0 12px" }}>Pick a Phase 1 SOP from the plan above and enter the title exactly as written.</p>
            <input value={sopTitle} onChange={e => setSopTitle(e.target.value)} placeholder="e.g. Daily Crew Launch and Morning Routine" style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "12px 14px", color: COLORS.text, fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <Btn variant="secondary" onClick={reset}>Start Over</Btn>
              <Btn onClick={runPrompt4} disabled={!sopTitle.trim()}>Run Prompt 4 — Write the SOP →</Btn>
            </div>
          </div>
        )}
      </div>
    )}

    {step === "done" && (
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: "0 0 4px" }}>
              {loading ? "Writing SOP..." : "✓ SOP Complete"}
            </h2>
            {!loading && finalSop && <p style={{ color: COLORS.success, fontSize: 13, margin: 0 }}>Ready to paste into Google Drive</p>}
          </div>
          {finalSop && !loading && (
            <button onClick={() => copyToClipboard(finalSop)} style={{ background: COLORS.accentDim, border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Copy SOP</button>
          )}
        </div>
        <StreamingOutput text={loading ? streamText : finalSop} label={loading ? `Writing: ${sopTitle}...` : ""} />
        {!loading && finalSop && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
            <div style={{ fontSize: 13, color: COLORS.muted }}>Copy it → paste into a Google Doc → done.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="secondary" onClick={() => { setStep("plan"); setSopTitle(""); setFinalSop(""); }}>Write Another SOP</Btn>
              <Btn onClick={reset}>New Client</Btn>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
</div>
);
}
