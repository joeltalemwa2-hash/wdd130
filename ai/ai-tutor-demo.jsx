import React, { useState, useRef, useEffect } from "react";
import {
  GraduationCap, Send, Flame, Star, Trophy, BookOpen, Users, Home,
  ClipboardList, TrendingUp, Clock, CheckCircle2, XCircle, Loader2,
  Megaphone, Award, Target, ChevronRight, Sparkles
} from "lucide-react";

/* ---------- design tokens ----------
Color: ink #1B2A4A, paper #F1F3F6, rule #C9CDD6, teal #2E8B77, gold #E8A33D, rose #C4574B
Type: display serif "Fraunces" (headers), body "Inter", mono-ish label caps for eyebrows
Layout: school-folder tab switcher at top; ruled-notebook cards below
Signature: role switcher styled as physical folder tabs (Student / Teacher / Parent)
------------------------------------- */

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap";

function useFonts() {
  useEffect(() => {
    if (document.getElementById("tutor-fonts")) return;
    const l = document.createElement("link");
    l.id = "tutor-fonts";
    l.rel = "stylesheet";
    l.href = FONT_LINK;
    document.head.appendChild(l);
  }, []);
}

async function askClaude(messages, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  const text = (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n");
  return text;
}

/* ---------------- Student data (default, persisted via window.storage) ---------------- */
const DEFAULT_STUDENT = {
  name: "Alex",
  xp: 2140,
  level: 7,
  streak: 12,
  goalMinutes: 30,
  todayMinutes: 18,
  badges: [
    { icon: "🔥", label: "12-day streak" },
    { icon: "🧮", label: "Algebra novice" },
    { icon: "⚡", label: "Fast learner" },
  ],
  subjects: [
    { name: "Algebra I", progress: 72 },
    { name: "Biology", progress: 45 },
    { name: "World History", progress: 88 },
  ],
  upcoming: [{ title: "Quadratics Quiz", due: "Mon" }, { title: "Cell Biology Review", due: "Wed" }],
};

const STUDENT_KEY = "lumen:student";

function xpForLevel(level) { return level * 300; }

const TEACHER_CLASS = {
  name: "Period 3 — Algebra I",
  students: [
    { name: "Alex R.", progress: 72, lastActive: "Today", flag: null },
    { name: "Priya S.", progress: 91, lastActive: "Today", flag: null },
    { name: "Marcus T.", progress: 38, lastActive: "3 days ago", flag: "falling behind" },
    { name: "Yuki N.", progress: 65, lastActive: "Yesterday", flag: null },
    { name: "Devon K.", progress: 54, lastActive: "Today", flag: null },
    { name: "Sofia M.", progress: 97, lastActive: "Today", flag: "ahead of pace" },
  ],
};

const PARENT_CHILD = {
  name: "Alex",
  attendanceRate: "96%",
  weeklyMinutes: 210,
  goalMinutes: 210,
  grades: [
    { subject: "Algebra I", grade: "B+" },
    { subject: "Biology", grade: "B" },
    { subject: "World History", grade: "A-" },
  ],
  goals: [
    { label: "Finish Quadratics unit", done: false },
    { label: "30 min/day streak", done: true },
  ],
};

/* ---------------- shared UI bits ---------------- */

function Eyebrow({ children }) {
  return (
    <div style={{
      fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.14em", textTransform: "uppercase", color: "#7C8494",
      marginBottom: 6,
    }}>{children}</div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #DEE1E8", borderRadius: 10,
      padding: 20, ...style,
    }}>{children}</div>
  );
}

function ProgressBar({ value, color = "#2E8B77" }) {
  return (
    <div style={{ background: "#E7E9EF", borderRadius: 6, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, background: color, height: "100%", borderRadius: 6, transition: "width .4s ease" }} />
    </div>
  );
}

/* ---------------- Digital Library: curated open resources + personal notes ---------------- */

const LIBRARY = {
  "Algebra I": [{ title: "OpenStax — College Algebra 2e", url: "https://welib.st/search?q=Algebra&index=journals&page=1" }],
  "Biology": [{ title: "OpenStax — Biology 2e", url: "https://welib.st/search?q=Biology&index=journals&page=1" }],
  "Chemistry": [{ title: "OpenStax — Chemistry 2e", url: "https://openstax.org/details/books/chemistry-2e" }],
  "World History": [{ title: "OpenStax — World History, Vol. 1: to 1500", url: "https://openstax.org/details/books/world-history-volume-1" }],
  "English": [{ title: "OpenStax — Writing Guide with Handbook", url: "https://openstax.org/details/books/writing-guide" }],
  "Programming": [
    { title: "Khan Academy — Computer Programming", url: "https://www.khanacademy.org/computing/computer-programming" },
    { title: "MDN Web Docs — Learn web development", url: "https://developer.mozilla.org/en-US/docs/Learn" },
  ],
};

const GENERAL_RESOURCES = [
  { title: "Khan Academy — all subjects, free", url: "https://www.khanacademy.org" },
  { title: "MIT OpenCourseWare — free MIT course materials", url: "https://ocw.mit.edu" },
  { title: "Project Gutenberg — 70,000+ free public-domain books", url: "https://www.gutenberg.org" },
  { title: "OpenStax — full catalog of free peer-reviewed textbooks", url: "https://openstax.org/subjects" },
];

const NOTES_KEY = "lumen:notes";

function DigitalLibrary({ subject }) {
  const [notes, setNotes] = useState(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(NOTES_KEY, false);
        setNotes(res && res.value ? JSON.parse(res.value) : []);
      } catch (e) {
        setNotes([]);
      }
    })();
  }, []);

  const persist = async (next) => {
    setNotes(next);
    try { await window.storage.set(NOTES_KEY, JSON.stringify(next), false); } catch (e) {}
  };

  const addNote = async () => {
    if (!form.title.trim() || !form.content.trim() || saving) return;
    setSaving(true);
    const entry = { id: `${Date.now()}`, subject, title: form.title.trim(), content: form.content.trim() };
    await persist([entry, ...(notes || [])]);
    setForm({ title: "", content: "" });
    setSaving(false);
  };

  const removeNote = (id) => persist((notes || []).filter((n) => n.id !== id));

  const relevantLibrary = LIBRARY[subject] || [];
  const mySubjectNotes = (notes || []).filter((n) => n.subject === subject);

  return (
    <Card>
      <Eyebrow>Digital library · {subject}</Eyebrow>

      {relevantLibrary.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {relevantLibrary.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 12px", border: "1px solid #EBEDF2", borderRadius: 8,
              fontFamily: "Inter", fontSize: 13.5, color: "#1B2A4A", textDecoration: "none", marginBottom: 6,
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><BookOpen size={14} color="#2E8B77" />{r.title}</span>
              <ChevronRight size={14} color="#B7BCC7" />
            </a>
          ))}
        </div>
      )}

      <div style={{ fontFamily: "Inter", fontSize: 12, color: "#7C8494", marginBottom: 14 }}>
        More free, openly-licensed resources: {GENERAL_RESOURCES.map((r, i) => (
          <span key={r.url}>
            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2E8B77" }}>{r.title}</a>
            {i < GENERAL_RESOURCES.length - 1 ? " · " : ""}
          </span>
        ))}
      </div>

      <div style={{ borderTop: "1px solid #EBEDF2", paddingTop: 14 }}>
        <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#1B2A4A", marginBottom: 8 }}>Your notes for {subject}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title (e.g. Chapter 4 summary)"
            style={{ border: "1px solid #DEE1E8", borderRadius: 8, padding: "8px 12px", fontFamily: "Inter", fontSize: 13, outline: "none" }}
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Paste or type your notes here…"
            rows={3}
            style={{ border: "1px solid #DEE1E8", borderRadius: 8, padding: "8px 12px", fontFamily: "Inter", fontSize: 13, outline: "none", resize: "vertical" }}
          />
          <button onClick={addNote} disabled={saving} style={{
            alignSelf: "flex-start", background: "#1B2A4A", color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: 13, cursor: saving ? "default" : "pointer",
          }}>{saving ? "Saving…" : "Save note"}</button>
        </div>

        {notes === null ? (
          <div style={{ fontFamily: "Inter", fontSize: 12.5, color: "#7C8494" }}>Loading notes…</div>
        ) : mySubjectNotes.length === 0 ? (
          <div style={{ fontFamily: "Inter", fontSize: 12.5, color: "#7C8494" }}>No notes saved for this subject yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mySubjectNotes.map((n) => (
              <div key={n.id} style={{ background: "#F1F3F6", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: "#1B2A4A" }}>{n.title}</span>
                  <button onClick={() => removeNote(n.id)} style={{ border: "none", background: "none", color: "#C4574B", cursor: "pointer", fontFamily: "Inter", fontSize: 12 }}>Remove</button>
                </div>
                <div style={{ fontFamily: "Inter", fontSize: 12.5, color: "#4A5266", marginTop: 4, whiteSpace: "pre-wrap" }}>{n.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function TutorChat({ subject }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Hi! I'm your AI tutor for ${subject}. Ask me anything — a concept you're stuck on, a homework problem, or "quiz me."` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const apiMessages = next.map((m) => ({ role: m.role, content: m.text }));
      const reply = await askClaude(
        apiMessages,
        `You are a warm, patient AI tutor teaching a student about ${subject}. Explain clearly, use simple examples, adjust to a middle/high-school level unless the student signals otherwise, and ask a short follow-up question when it helps learning. Keep responses focused and not too long. Never just hand over answers to what are clearly graded assignment questions — guide with hints first.`
      );
      setMessages((m) => [...m, { role: "assistant", text: reply || "Sorry, I couldn't generate a response." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong reaching the tutor. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ display: "flex", flexDirection: "column", height: 460, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #EBEDF2", display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={16} color="#2E8B77" />
        <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: "#1B2A4A" }}>AI Tutor · {subject}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "82%",
            background: m.role === "user" ? "#1B2A4A" : "#F1F3F6",
            color: m.role === "user" ? "#fff" : "#1B2A4A",
            padding: "10px 14px", borderRadius: 12,
            fontFamily: "Inter", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap",
          }}>{m.text}</div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", color: "#7C8494", display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter", fontSize: 13 }}>
            <Loader2 size={14} className="spin" /> thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid #EBEDF2" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question…"
          style={{
            flex: 1, border: "1px solid #DEE1E8", borderRadius: 8, padding: "10px 12px",
            fontFamily: "Inter", fontSize: 14, outline: "none",
          }}
        />
        <button onClick={send} disabled={loading} style={{
          background: "#2E8B77", color: "#fff", border: "none", borderRadius: 8,
          padding: "0 16px", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Send size={16} />
        </button>
      </div>
    </Card>
  );
}

/* ---------------- Student: Quiz Generator ---------------- */

function QuizGenerator({ subject, onFinish }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setQuiz(null);
    setSubmitted(false);
    setAnswers({});
    setError("");
    try {
      const raw = await askClaude(
        [{ role: "user", content: `Create a 4-question multiple choice quiz about "${topic}" within the subject ${subject}, at ${difficulty} difficulty. Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape: {"questions":[{"question":"...","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}` }],
        "You output only strict JSON matching the requested schema. No commentary, no markdown code fences."
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setQuiz(parsed.questions || []);
    } catch (e) {
      setError("Couldn't generate the quiz — try a different topic.");
    } finally {
      setLoading(false);
    }
  };

  const score = quiz && submitted
    ? quiz.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0)
    : 0;

  return (
    <Card>
      <Eyebrow>Quiz generator</Eyebrow>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={`Topic within ${subject}, e.g. "quadratic equations"`}
          style={{ flex: 1, minWidth: 200, border: "1px solid #DEE1E8", borderRadius: 8, padding: "10px 12px", fontFamily: "Inter", fontSize: 14, outline: "none" }}
        />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{
          border: "1px solid #DEE1E8", borderRadius: 8, padding: "0 10px", fontFamily: "Inter", fontSize: 14,
        }}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button onClick={generate} disabled={loading} style={{
          background: "#E8A33D", color: "#1B2A4A", border: "none", borderRadius: 8, padding: "0 16px",
          fontFamily: "Inter", fontWeight: 600, fontSize: 14, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>
      {error && <div style={{ color: "#C4574B", fontFamily: "Inter", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      {quiz && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {quiz.map((q, i) => (
            <div key={i}>
              <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: "#1B2A4A", marginBottom: 8 }}>
                {i + 1}. {q.question}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {q.choices.map((c, ci) => {
                  const chosen = answers[i] === ci;
                  const isCorrect = submitted && ci === q.correctIndex;
                  const isWrongChosen = submitted && chosen && ci !== q.correctIndex;
                  return (
                    <button
                      key={ci}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: ci }))}
                      style={{
                        textAlign: "left", padding: "8px 12px", borderRadius: 8, fontFamily: "Inter", fontSize: 13.5,
                        border: `1px solid ${chosen ? "#1B2A4A" : "#DEE1E8"}`,
                        background: isCorrect ? "#E4F3EE" : isWrongChosen ? "#FBEAE8" : chosen ? "#F1F3F6" : "#fff",
                        cursor: submitted ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                    >
                      {c}
                      {isCorrect && <CheckCircle2 size={15} color="#2E8B77" />}
                      {isWrongChosen && <XCircle size={15} color="#C4574B" />}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <div style={{ fontFamily: "Inter", fontSize: 12.5, color: "#7C8494", marginTop: 6 }}>{q.explanation}</div>
              )}
            </div>
          ))}
          {!submitted ? (
            <button
              onClick={() => {
                setSubmitted(true);
                const finalScore = quiz.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);
                onFinish && onFinish(subject, finalScore, quiz.length);
              }}
              style={{
                alignSelf: "flex-start", background: "#1B2A4A", color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 18px", fontFamily: "Inter", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>Submit answers</button>
          ) : (
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: "#1B2A4A" }}>
              Score: {score} / {quiz.length} <span style={{ fontFamily: "Inter", fontSize: 13, color: "#2E8B77", fontWeight: 600 }}>+{score * 15} XP earned</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ---------------- Student view ---------------- */

function StudentView({ student, setStudent }) {
  const [subject, setSubject] = useState("Algebra I");
  const [customSubject, setCustomSubject] = useState("");
  const [toast, setToast] = useState("");

  const pickSubject = (s) => { setSubject(s); setCustomSubject(""); };

  const handleQuizFinish = (quizSubject, correct, total) => {
    const earnedXp = correct * 15;
    setStudent((prev) => {
      const nextXp = prev.xp + earnedXp;
      const nextLevel = Math.max(prev.level, Math.floor(nextXp / 300) + 1);
      const hasSubject = prev.subjects.some((s) => s.name.toLowerCase() === quizSubject.toLowerCase());
      const subjects = hasSubject
        ? prev.subjects.map((s) => s.name.toLowerCase() === quizSubject.toLowerCase()
            ? { ...s, progress: Math.min(100, s.progress + Math.round((correct / total) * 8)) }
            : s)
        : [...prev.subjects, { name: quizSubject, progress: Math.round((correct / total) * 20) }];
      return { ...prev, xp: nextXp, level: nextLevel, subjects };
    });
    setToast(`+${earnedXp} XP added to your total`);
    setTimeout(() => setToast(""), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 18, right: 18, background: "#1B2A4A", color: "#fff",
          padding: "10px 16px", borderRadius: 8, fontFamily: "Inter", fontSize: 13, zIndex: 50,
          boxShadow: "0 6px 18px rgba(27,42,74,0.25)",
        }}>{toast}</div>
      )}
      {/* header stats */}
      <div className="stat-grid">
        <Card style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Flame size={22} color="#E8A33D" />
          <div>
            <div style={{ fontFamily: "Fraunces", fontSize: 20, color: "#1B2A4A" }}>{student.streak} days</div>
            <div style={{ fontFamily: "Inter", fontSize: 11.5, color: "#7C8494" }}>learning streak</div>
          </div>
        </Card>
        <Card style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Star size={22} color="#2E8B77" />
          <div>
            <div style={{ fontFamily: "Fraunces", fontSize: 20, color: "#1B2A4A" }}>{student.xp.toLocaleString()} XP</div>
            <div style={{ fontFamily: "Inter", fontSize: 11.5, color: "#7C8494" }}>level {student.level}</div>
          </div>
        </Card>
        <Card style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Clock size={22} color="#1B2A4A" />
          <div>
            <div style={{ fontFamily: "Fraunces", fontSize: 20, color: "#1B2A4A" }}>{student.todayMinutes}/{student.goalMinutes} min</div>
            <div style={{ fontFamily: "Inter", fontSize: 11.5, color: "#7C8494" }}>today's goal</div>
          </div>
        </Card>
        <Card style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Trophy size={22} color="#C4574B" />
          <div>
            <div style={{ fontFamily: "Fraunces", fontSize: 20, color: "#1B2A4A" }}>{student.badges.length}</div>
            <div style={{ fontFamily: "Inter", fontSize: 11.5, color: "#7C8494" }}>badges earned</div>
          </div>
        </Card>
      </div>

      <div className="two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* subject picker */}
          <Card>
            <Eyebrow>Choose a subject</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {["Algebra I", "Biology", "World History", "Programming", "Chemistry", "English"].map((s) => (
                <button key={s} onClick={() => pickSubject(s)} style={{
                  padding: "7px 14px", borderRadius: 999, fontFamily: "Inter", fontSize: 13,
                  border: `1px solid ${subject === s ? "#1B2A4A" : "#DEE1E8"}`,
                  background: subject === s ? "#1B2A4A" : "#fff",
                  color: subject === s ? "#fff" : "#1B2A4A", cursor: "pointer",
                }}>{s}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && customSubject.trim() && pickSubject(customSubject.trim())}
                placeholder="Or type any subject…"
                style={{ flex: 1, border: "1px solid #DEE1E8", borderRadius: 8, padding: "8px 12px", fontFamily: "Inter", fontSize: 13, outline: "none" }}
              />
              <button
                onClick={() => customSubject.trim() && pickSubject(customSubject.trim())}
                style={{ border: "1px solid #DEE1E8", borderRadius: 8, padding: "0 12px", background: "#fff", cursor: "pointer", fontFamily: "Inter", fontSize: 13 }}
              >Set</button>
            </div>
          </Card>

          <TutorChat subject={subject} />
          <QuizGenerator subject={subject} onFinish={handleQuizFinish} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <DigitalLibrary subject={subject} />

          <Card>
            <Eyebrow>Your progress</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {student.subjects.map((s) => (
                <div key={s.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "#1B2A4A", fontWeight: 500 }}>{s.name}</span>
                    <span style={{ color: "#7C8494" }}>{s.progress}%</span>
                  </div>
                  <ProgressBar value={s.progress} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Eyebrow>Badges</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {student.badges.map((b) => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter", fontSize: 13.5, color: "#1B2A4A" }}>
                  <span style={{ fontSize: 16 }}>{b.icon}</span>{b.label}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Eyebrow>Upcoming</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {student.upcoming.map((u) => (
                <div key={u.title} style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter", fontSize: 13.5 }}>
                  <span style={{ color: "#1B2A4A" }}>{u.title}</span>
                  <span style={{ color: "#7C8494" }}>{u.due}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Teacher view ---------------- */

function TeacherView() {
  const [announcement, setAnnouncement] = useState("");
  const [sent, setSent] = useState([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <Eyebrow>Class</Eyebrow>
        <div style={{ fontFamily: "Fraunces", fontSize: 22, color: "#1B2A4A", marginBottom: 14 }}>{TEACHER_CLASS.name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TEACHER_CLASS.students.map((s) => (
            <div key={s.name} style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 0.8fr 1fr", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 13.5, color: "#1B2A4A" }}>{s.name}</span>
              <ProgressBar value={s.progress} color={s.progress < 45 ? "#C4574B" : "#2E8B77"} />
              <span style={{ fontFamily: "Inter", fontSize: 12.5, color: "#7C8494" }}>{s.progress}%</span>
              <span style={{ fontFamily: "Inter", fontSize: 12, color: s.flag ? (s.flag.includes("behind") ? "#C4574B" : "#2E8B77") : "#B7BCC7" }}>
                {s.flag || s.lastActive}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Eyebrow>Send announcement</Eyebrow>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="e.g. Quiz moved to Friday"
            style={{ flex: 1, border: "1px solid #DEE1E8", borderRadius: 8, padding: "10px 12px", fontFamily: "Inter", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={() => { if (announcement.trim()) { setSent((s) => [announcement.trim(), ...s]); setAnnouncement(""); } }}
            style={{ background: "#1B2A4A", color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontFamily: "Inter", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          ><Megaphone size={15} /></button>
        </div>
        {sent.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {sent.map((a, i) => (
              <div key={i} style={{ fontFamily: "Inter", fontSize: 13, color: "#1B2A4A", background: "#F1F3F6", padding: "8px 12px", borderRadius: 8 }}>{a}</div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Parent view ---------------- */

function ParentView() {
  return (
    <div className="two-col-even">
      <Card>
        <Eyebrow>{PARENT_CHILD.name}'s overview</Eyebrow>
        <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
          <div>
            <div style={{ fontFamily: "Fraunces", fontSize: 22, color: "#1B2A4A" }}>{PARENT_CHILD.attendanceRate}</div>
            <div style={{ fontFamily: "Inter", fontSize: 12, color: "#7C8494" }}>attendance</div>
          </div>
          <div>
            <div style={{ fontFamily: "Fraunces", fontSize: 22, color: "#1B2A4A" }}>{PARENT_CHILD.weeklyMinutes}m</div>
            <div style={{ fontFamily: "Inter", fontSize: 12, color: "#7C8494" }}>studied this week</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12.5, color: "#7C8494", marginBottom: 4 }}>
            weekly study goal ({PARENT_CHILD.weeklyMinutes}/{PARENT_CHILD.goalMinutes} min)
          </div>
          <ProgressBar value={Math.min(100, (PARENT_CHILD.weeklyMinutes / PARENT_CHILD.goalMinutes) * 100)} />
        </div>
      </Card>

      <Card>
        <Eyebrow>Grades</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PARENT_CHILD.grades.map((g) => (
            <div key={g.subject} style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter", fontSize: 13.5 }}>
              <span style={{ color: "#1B2A4A" }}>{g.subject}</span>
              <span style={{ color: "#2E8B77", fontWeight: 700 }}>{g.grade}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ gridColumn: "1 / -1" }}>
        <Eyebrow>Goals</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PARENT_CHILD.goals.map((g) => (
            <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter", fontSize: 13.5 }}>
              {g.done ? <CheckCircle2 size={16} color="#2E8B77" /> : <Target size={16} color="#B7BCC7" />}
              <span style={{ color: g.done ? "#1B2A4A" : "#7C8494", textDecoration: g.done ? "line-through" : "none" }}>{g.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Root: folder-tab role switcher ---------------- */

const ROLES = [
  { key: "student", label: "Student", icon: GraduationCap },
  { key: "teacher", label: "Teacher", icon: ClipboardList },
  { key: "parent", label: "Parent", icon: Home },
];

export default function App() {
  useFonts();
  const [role, setRole] = useState("student");
  const [student, setStudentRaw] = useState(DEFAULT_STUDENT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STUDENT_KEY, false);
        if (result && result.value) setStudentRaw(JSON.parse(result.value));
      } catch (e) {
        // no saved progress yet — defaults are fine
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setStudent = (updater) => {
    setStudentRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      window.storage.set(STUDENT_KEY, JSON.stringify(next), false).catch(() => {});
      return next;
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F3F6", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .two-col { display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px; }
        .two-col-even { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 760px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .two-col, .two-col-even { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 22 }}>
          <BookOpen size={22} color="#1B2A4A" />
          <span style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 24, color: "#1B2A4A" }}>Lumen</span>
          <span style={{ fontFamily: "Inter", fontSize: 12.5, color: "#7C8494" }}>personalized AI tutoring</span>
        </div>

        {/* folder tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: -1, position: "relative", zIndex: 1 }}>
          {ROLES.map((r) => {
            const active = role === r.key;
            const Icon = r.icon;
            return (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", cursor: "pointer",
                  fontFamily: "Inter", fontWeight: 600, fontSize: 13.5,
                  border: "1px solid #DEE1E8", borderBottom: active ? "1px solid #fff" : "1px solid #DEE1E8",
                  borderRadius: "10px 10px 0 0",
                  background: active ? "#fff" : "#E7E9EF",
                  color: active ? "#1B2A4A" : "#7C8494",
                  transform: active ? "translateY(0)" : "translateY(3px)",
                  transition: "all .15s ease",
                }}
              >
                <Icon size={15} /> {r.label}
              </button>
            );
          })}
        </div>
        <div style={{ background: "#fff", border: "1px solid #DEE1E8", borderRadius: "0 10px 10px 10px", padding: 24 }}>
          {!ready ? (
            <div style={{ padding: 40, textAlign: "center", fontFamily: "Inter", fontSize: 13, color: "#7C8494", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Loader2 size={16} className="spin" /> Loading your progress…
            </div>
          ) : (
            <>
              {role === "student" && <StudentView student={student} setStudent={setStudent} />}
              {role === "teacher" && <TeacherView />}
              {role === "parent" && <ParentView />}
            </>
          )}
        </div>

        <div style={{ marginTop: 18, fontFamily: "Inter", fontSize: 11.5, color: "#9AA0AC", display: "flex", alignItems: "center", gap: 6 }}>
          <TrendingUp size={13} /> Prototype demo — teacher &amp; parent data is mocked; the AI Tutor and Quiz Generator make real calls to Claude, and your XP/progress is saved automatically.
        </div>
      </div>
    </div>
  );
}
