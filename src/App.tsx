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

const buildBriefFromUrl = (url) =>

    `You are a business operations analyst. I am going to give you a client's website URL. Your job is to thoroughly research and extract every piece of information available about this business. Visit the website including the homepage, services pages, about page, FAQ, and any blog or review sections and document the following:

    SERVICES: List every service offered, how it is described, any pricing details visible, and service-specific conditions or triggers mentioned.

    OPERATIONAL MODEL: How the business delivers its services including scheduling approach, pricing model, service windows, automation or technology mentioned, staffing references, and any policies stated.

    CUSTOMER PROFILE: Who they serve based on the language they use. Note pain points they address, outcomes they promise, and any testimonials or review language visible on the site.

    COMMUNICATION AND BRAND: Their brand voice and tone. Key promises or differentiators they highlight. Any FAQs, guarantees, or policies that reveal how they run the business.

    SERVICE AREA AND SCALE: Geography served. Any indication of business size, team size, or growth stage.

    FORMAT YOUR OUTPUT as a clean business brief with these sections clearly labeled. Write it as a professional summary a consultant would hand to a senior colleague before a client meeting. End with a clearly labeled section called GAPS that lists everything the website could not tell you about internal operations, team, pricing rationale, what is currently documented, what is breaking down, or growth plans.

    Website URL: ${url}`;

const buildBriefFromManual = (data) =>

    `You are a business operations analyst. Based on the information below provided directly by the business owner, create a structured business brief.

    Business Name: ${data.businessName}

    What They Do: ${data.whatTheyDo}

    Who They Serve: ${data.whoTheyServe}

    Team Size: ${data.teamSize}

    Services Offered: ${data.services}

    Current Tools and Software: ${data.tools}

    Biggest Operational Gaps: ${data.gaps}

    What Breaks When Owner Is Away: ${data.breaks}

    Additional Notes: ${data.additionalNotes}

    FORMAT YOUR OUTPUT as a clean business brief with sections: SERVICES, OPERATIONAL MODEL, CUSTOMER PROFILE, COMMUNICATION AND BRAND, SERVICE AREA AND SCALE, and GAPS. Write it as a professional summary a consultant would hand to a senior colleague.`;

const discoveryQuestions = (brief) =>

    `You are an SOP development consultant preparing for a discovery call. Below is a research brief. Generate a targeted discovery interview asking ONLY questions the brief could not answer.

    ${brief}

    Surface: what lives in the owner's head vs written down, team size and hiring plans, where things break down, what onboarding has looked like, seasonal pressures, where the owner's time goes, and near-term events that change urgency.

    Format as numbered questions grouped by topic. Add an italicized note after each question explaining what you are listening for. End with a LISTEN FOR section with 6 to 8 signals indicating emergency triage vs structured phased build.`;

const sopPlan = (brief, answers) =>

    `You are an SOP development consultant. Build a prioritized SOP development plan.

    BUSINESS BRIEF:

    ${brief}

    DISCOVERY ANSWERS:

    ${answers}

    Include: BUSINESS STAGE ASSESSMENT (3-4 sentences on operational state and biggest risk), PRIORITIZED SOP LIST in three phases (Phase 1 Must Have Now, Phase 2 Scaling Support, Phase 3 Protection and Professionalism), QUICK WIN DOCUMENTS (3-5 one-page checklists buildable immediately), FIRST-WEEK ONBOARDING SEQUENCE (exact documents a new hire needs in order), and TIMELINE RECOMMENDATION.

    Write in a direct confident client-facing voice referencing specifics from their business throughout.`;

const writeSop = (brief, sopTitle) =>

    `You are an SOP writer for a small service business. Write a complete field-ready Standard Operating Procedure.

    BUSINESS BRIEF:

    ${brief}

    SOP TITLE: ${sopTitle}

    Include all sections: PURPOSE (1-2 sentences on why it exists), SCOPE (who it applies to and when), RESPONSIBILITIES (who owns and carries out the process), PROCEDURE (numbered steps in plain language a new hire can follow on day one), QUALITY STANDARDS (what done correctly looks like), COMMON MISTAKES TO AVOID (3-5 specific errors), and FIELD CHECKLIST (yes/no checklist of 12 items or fewer).

    Write in plain direct language. No jargon. No filler. Every sentence earns its place.`;

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

function ProgressBar({ currentStep }) {

  const idx = steps.findIndex((s) => s.id === currentStep);

  return (

        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>

          {steps.map((step, i) => (

                             <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>

                                         <div style={{

                                                       width: 28, height: 28, borderRadius: "50%",

                                           background: i < idx ? COLORS.accentDim : i === idx ? COLORS.accent : COLORS.border,

                                           display: "flex", alignItems: "center", justifyContent: "center",

                                           fontSize: 11, fontWeight: 600, color: i <= idx ? "#fff" : COLORS.muted,

                                           flexShrink: 0,

                             }}>

                                           {i < idx ? "✓" : i + 1}

                                         </div>div>

                               {i < steps.length - 1 && (

                                             <div style={{ flex: 1, height: 1, background: i < idx ? COLORS.accentDim : COLORS.border }} />

                                           )}

                             </div>div>

                ))}

        </div>div>

      );

}

function Output({ text, loading }) {

  const ref = useRef(null);

  useEffect(() => {

                if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;

  }, [text]);

  return (

        <div ref={ref} style={{

                background: COLORS.bg, border: "1px solid " + COLORS.border,

                borderRadius: 8, padding: "16px 20px", maxHeight: 400,

                overflowY: "auto", fontFamily: "Georgia, serif",

                fontSize: 14, lineHeight: 1.8, color: COLORS.text,

                whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 16,

        }}>

          {text || <span style={{ color: COLORS.muted }}>{loading ? "Generating..." : ""}</span>span>}

        </div>div>

      );

}

function Btn({ onClick, children, disabled, secondary }) {

  return (

        <button onClick={onClick} disabled={disabled} style={{

                padding: "11px 24px", borderRadius: 6,

                border: secondary ? "1px solid " + COLORS.border : "none",

                cursor: disabled ? "not-allowed" : "pointer",

                fontFamily: "inherit", fontSize: 14, fontWeight: 600,

                background: secondary ? "transparent" : COLORS.accent,

                color: secondary ? COLORS.muted : "#fff",

                opacity: disabled ? 0.4 : 1,

        }}>

          {children}

        </button>button>

      );

}

function Field({ label, value, onChange, placeholder, multi, rows }) {

  const style = {

        width: "100%", background: COLORS.bg, border: "1px solid " + COLORS.border,

        borderRadius: 6, padding: "11px 14px", color: COLORS.text,

        fontFamily: multi ? "Georgia, serif" : "inherit",

        fontSize: 14, lineHeight: 1.6, outline: "none",

        boxSizing: "border-box", resize: multi ? "vertical" : "none",

  };

  return (

        <div style={{ marginBottom: 14 }}>

          {label && <label style={{ display: "block", fontSize: 11, color: COLORS.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>label>}

          {multi

                    ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows || 4} style={style} />

                    : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />

          }

        </div>div>

      );

}

export default function App() {

  const [step, setStep] = useState("start");

  const [mode, setMode] = useState("url");

  const [url, setUrl] = useState("");

  const [manual, setManual] = useState({

                                           businessName: "", whatTheyDo: "", whoTheyServe: "",

        teamSize: "", services: "", tools: "", gaps: "", breaks: "", additionalNotes: "",

  });

  const [brief, setBrief] = useState("");

  const [stream, setStream] = useState("");

  const [discovery, setDiscovery] = useState("");

  const [answers, setAnswers] = useState("");

  const [plan, setPlan] = useState("");

  const [sopTitle, setSopTitle] = useState("");

  const [sop, setSop] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const run = async (prompt, onDone) => {

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

  };

  const reset = () => {

        setStep("start"); setUrl(""); setBrief(""); setStream("");

        setDiscovery(""); setAnswers(""); setPlan(""); setSopTitle(""); setSop("");

        setLoading(false); setError("");

        setManual({ businessName: "", whatTheyDo: "", whoTheyServe: "", teamSize: "", services: "", tools: "", gaps: "", breaks: "", additionalNotes: "" });

  };

  const card = { background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 12, padding: 32, marginBottom: 16 };

  const h2 = { fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 8px", color: COLORS.text };

  const sub = { color: COLORS.muted, fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 };

  const row = { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 };

  return (

        <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>

                <style>{`* { box-sizing: border-box; } textarea:focus, input:focus { border-color: ${COLORS.accentDim} !important; outline: none; }`}</style>style>
        
              <div style={{ maxWidth: 740, margin: "0 auto" }}>
              
                      <div style={{ textAlign: "center", marginBottom: 48 }}>
                      
                                <div style={{ fontSize: 11, color: COLORS.accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>Bottleneck Buster</div>div>
                      
                                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 34, fontWeight: 700, margin: "0 0 8px" }}>SOP Builder</h1>h1>
                      
                                <p style={{ color: COLORS.muted, fontSize: 15, margin: 0 }}>Four prompts. One sitting. A complete SOP system.</p>p>
                      
                      </div>div>
              
                      <ProgressBar currentStep={step} />
              
                {error && (
          
                    <div style={{ background: "#3f1010", border: "1px solid #7f2020", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#fca5a5" }}>
                    
                      {error}
                    
                    </div>div>
              
                  )}
              
                {step === "start" && (
          
                    <div style={card}>
                    
                                <h2 style={h2}>Client Information</h2>h2>
                    
                                <p style={sub}>Use Website URL when the site is current. Use Manual Entry when it is not.</p>p>
                    
                                <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                                
                                  {[["url", "Website URL"], ["manual", "Manual Entry"]].map(([m, label]) => (
                      
                                      <button key={m} onClick={() => setMode(m)} style={{
                                        
                                                          flex: 1, padding: "9px 0", borderRadius: 6, cursor: "pointer",
                                        
                                                          fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                        
                                                          background: mode === m ? COLORS.accentDim : COLORS.bg,
                                        
                                                          color: mode === m ? "#fff" : COLORS.muted,
                                        
                                                          border: "1px solid " + (mode === m ? COLORS.accentDim : COLORS.border),
                                        
                                      }}>{label}</button>button>
                      
                                    ))}
                                
                                </div>div>
                    
                      {mode === "url" ? (
                      
                                    <Field label="Business Website URL" value={url} onChange={setUrl} placeholder="https://example.com" />
                      
                                  ) : (
                      
                                    <div>
                                    
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                                                    
                                                                      <Field label="Business Name" value={manual.businessName} onChange={(v) => setManual((p) => ({ ...p, businessName: v }))} placeholder="Eagle Lawn and Snow" />
                                                    
                                                                      <Field label="Team Size" value={manual.teamSize} onChange={(v) => setManual((p) => ({ ...p, teamSize: v }))} placeholder="Owner + 3 crew members" />
                                                    
                                                    </div>div>
                                    
                                                    <Field label="What They Do" value={manual.whatTheyDo} onChange={(v) => setManual((p) => ({ ...p, whatTheyDo: v }))} placeholder="Residential lawn care and snow removal" />
                                    
                                                    <Field label="Who They Serve" value={manual.whoTheyServe} onChange={(v) => setManual((p) => ({ ...p, whoTheyServe: v }))} placeholder="Busy homeowners" />
                                    
                                                    <Field label="Services Offered" value={manual.services} onChange={(v) => setManual((p) => ({ ...p, services: v }))} placeholder="Weekly mowing, snow removal..." multi rows={3} />
                                    
                                                    <Field label="Current Tools and Software" value={manual.tools} onChange={(v) => setManual((p) => ({ ...p, tools: v }))} placeholder="Jobber, QuickBooks, WhatsApp..." />
                                    
                                                    <Field label="Biggest Operational Gaps" value={manual.gaps} onChange={(v) => setManual((p) => ({ ...p, gaps: v }))} placeholder="No written onboarding..." multi rows={2} />
                                    
                                                    <Field label="What Breaks When Owner Is Away" value={manual.breaks} onChange={(v) => setManual((p) => ({ ...p, breaks: v }))} placeholder="Client complaints go unanswered..." multi rows={2} />
                                    
                                                    <Field label="Additional Notes" value={manual.additionalNotes} onChange={(v) => setManual((p) => ({ ...p, additionalNotes: v }))} placeholder="Anything else relevant..." multi rows={2} />
                                    
                                    </div>div>
                    
                                  )}
                    
                                <div style={row}>
                                
                                              <Btn onClick={() => { setStep("brief"); run(mode === "url" ? buildBriefFromUrl(url) : buildBriefFromManual(manual), setBrief); }} disabled={mode === "url" ? !url.trim() : !manual.businessName.trim()}>
                                              
                                                              Run Prompt 1 — Build Business Brief →
                                              
                                              </Btn>Btn>
                                
                                </div>div>
                    
                    </div>div>
              
                  )}
              
                {step === "brief" && (
          
                    <div style={card}>
                    
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                
                                              <h2 style={{ ...h2, margin: 0 }}>Business Brief</h2>h2>
                                
                                  {brief && <button onClick={() => navigator.clipboard.writeText(brief)} style={{ background: "none", border: "1px solid " + COLORS.border, borderRadius: 4, padding: "4px 10px", color: COLORS.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Copy</button>button>}
                                
                                </div>div>
                    
                                <p style={{ ...sub, margin: "4px 0 0" }}>Prompt 1 complete. Review then generate discovery questions.</p>p>
                    
                                <Output text={loading ? stream : brief} loading={loading} />
                    
                      {!loading && brief && (
                      
                                    <div style={row}>
                                    
                                                    <Btn secondary onClick={reset}>Start Over</Btn>Btn>
                                    
                                                    <Btn onClick={() => { setStep("discovery"); run(discoveryQuestions(brief), setDiscovery); }}>Run Prompt 2 — Discovery Questions →</Btn>Btn>
                                    
                                    </div>div>
                    
                                  )}
                    
                    </div>div>
              
                  )}
              
                {step === "discovery" && (
          
                    <div style={card}>
                    
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                
                                              <h2 style={{ ...h2, margin: 0 }}>Discovery Questions</h2>h2>
                                
                                  {discovery && <button onClick={() => navigator.clipboard.writeText(discovery)} style={{ background: "none", border: "1px solid " + COLORS.border, borderRadius: 4, padding: "4px 10px", color: COLORS.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Copy</button>button>}
                                
                                </div>div>
                    
                                <p style={{ ...sub, margin: "4px 0 0" }}>Prompt 2 complete. Use these on your discovery call then paste your notes below.</p>p>
                    
                                <Output text={loading ? stream : discovery} loading={loading} />
                    
                      {!loading && discovery && (
                      
                                    <div style={{ marginTop: 24 }}>
                                    
                                                    <div style={{ height: 1, background: COLORS.border, margin: "0 0 20px" }} />
                                    
                                                    <Field label="Your Discovery Answers" value={answers} onChange={setAnswers} placeholder="Paste your call notes or type your answers here..." multi rows={10} />
                                    
                                                    <div style={row}>
                                                    
                                                                      <Btn secondary onClick={reset}>Start Over</Btn>Btn>
                                                    
                                                                      <Btn onClick={() => { setStep("plan"); run(sopPlan(brief, answers), setPlan); }} disabled={!answers.trim()}>Run Prompt 3 — Build SOP Plan →</Btn>Btn>
                                                    
                                                    </div>div>
                                    
                                    </div>div>
                    
                                  )}
                    
                    </div>div>
              
                  )}
              
                {step === "plan" && (
          
                    <div style={card}>
                    
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                
                                              <h2 style={{ ...h2, margin: 0 }}>SOP Plan</h2>h2>
                                
                                  {plan && <button onClick={() => navigator.clipboard.writeText(plan)} style={{ background: "none", border: "1px solid " + COLORS.border, borderRadius: 4, padding: "4px 10px", color: COLORS.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Copy</button>button>}
                                
                                </div>div>
                    
                                <p style={{ ...sub, margin: "4px 0 0" }}>Prompt 3 complete. Review the plan then pick a Phase 1 SOP to write first.</p>p>
                    
                                <Output text={loading ? stream : plan} loading={loading} />
                    
                      {!loading && plan && (
                      
                                    <div style={{ marginTop: 24 }}>
                                    
                                                    <div style={{ height: 1, background: COLORS.border, margin: "0 0 20px" }} />
                                    
                                                    <Field label="Which SOP do you want to write first?" value={sopTitle} onChange={setSopTitle} placeholder="e.g. Daily Crew Launch and Morning Routine" />
                                    
                                                    <div style={row}>
                                                    
                                                                      <Btn secondary onClick={reset}>Start Over</Btn>Btn>
                                                    
                                                                      <Btn onClick={() => { setStep("done"); run(writeSop(brief, sopTitle), setSop); }} disabled={!sopTitle.trim()}>Run Prompt 4 — Write the SOP →</Btn>Btn>
                                                    
                                                    </div>div>
                                    
                                    </div>div>
                    
                                  )}
                    
                    </div>div>
              
                  )}
              
                {step === "done" && (
          
                    <div style={card}>
                    
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                
                                              <h2 style={{ ...h2, margin: 0 }}>{loading ? "Writing SOP..." : "SOP Complete"}</h2>h2>
                                
                                  {sop && !loading && (
                      
                                      <button onClick={() => navigator.clipboard.writeText(sop)} style={{ background: COLORS.accentDim, border: "none", borderRadius: 6, padding: "7px 14px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>Copy SOP</button>button>
                                
                                    )}
                                
                                </div>div>
                    
                                <Output text={loading ? stream : sop} loading={loading} />
                    
                      {!loading && sop && (
                      
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                                    
                                                    <span style={{ fontSize: 13, color: COLORS.muted }}>Copy → paste into Google Drive → done.</span>span>
                                    
                                                    <div style={{ display: "flex", gap: 10 }}>
                                                    
                                                                      <Btn secondary onClick={() => { setStep("plan"); setSopTitle(""); setSop(""); }}>Write Another SOP</Btn>Btn>
                                                    
                                                                      <Btn onClick={reset}>New Client</Btn>Btn>
                                                    
                                                    </div>div>
                                    
                                    </div>div>
                    
                                  )}
                    
                    </div>div>
              
                  )}
              
              </div>div>
        
        </div>div>
    
      );
  
}</style>
