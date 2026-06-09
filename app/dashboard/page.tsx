"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "text" | "url" | "image";

interface BackendResult {
  verdict:        string;   // "FAKE NEWS" | "REAL NEWS"
  confidence:     string;   // "87.3%"
  raw_score:      number;
  extracted_text: string;
}

interface AnalysisResult {
  articleText: string;
  analysisId:  string;
  result:      BackendResult;
}

interface HistoryItem {
  id:         number;
  input_type: string;
  content:    string;
  verdict:    string;
  confidence: number;
  created_at: string;
}

// ─── Sample article ───────────────────────────────────────────────────────────
const SAMPLE_ARTICLE = `Breaking: Scientists Confirm That Drinking Coffee Reverses Aging by 15 Years

A groundbreaking study published yesterday by the Global Institute of Nutritional Sciences has definitively proven that consuming three cups of coffee daily can reverse the biological aging process by up to fifteen years. The research, conducted over just two weeks with 12 participants, has been hailed as "the most important discovery in human history" by lead researcher Dr. James Holloway.

Experts universally agree that this miracle cure will render all other anti-aging treatments obsolete. Government health agencies are expected to mandate coffee consumption in schools as early as next month. Those who refuse to adopt this lifestyle change are reportedly putting their families at serious risk.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-2 px-5 py-4 rounded-sm"
      style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a", animation: "fadeUp 0.25s ease both" }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: "#C35200", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <span className="text-xs font-medium ml-1" style={{ color: "#9ca3af" }}>Analyzing…</span>
    </div>
  );
}

function ResultCard({ data }: { data: AnalysisResult }) {
  const { result, articleText, analysisId } = data;
  const isFake        = result.verdict.toUpperCase().includes("FAKE");
  const accentColor   = isFake ? "#C35200" : "#4ade80";
  const confidencePct = parseFloat(result.confidence.replace("%", ""));

  const exportReport = () => {
    const text = [
      `VeriTas Analysis Report`,
      `Analysis ID: ${analysisId}`,
      `Verdict: ${result.verdict}`,
      `Confidence: ${result.confidence}`,
      ``,
      `--- Article ---`,
      articleText,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `veritas-${analysisId}.txt`;
    a.click();
  };

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a", animation: "fadeUp 0.4s ease both" }}
    >
      {/* Verdict + Confidence header */}
      <div
        className="px-5 py-4 flex items-center justify-between border-b"
        style={{ borderColor: "#3a3a3a", backgroundColor: "#252525" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#d1d5db" }}>Verdict</p>
            <div className="flex items-center gap-2 mt-0.5">
              {isFake ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              <p className="text-lg font-bold tracking-wider" style={{ color: accentColor }}>{result.verdict}</p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: "#d1d5db" }}>Confidence</p>
          <div className="flex items-center gap-3 justify-end">
            <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#3a3a3a" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${confidencePct}%`, backgroundColor: accentColor, transition: "width 1.2s ease 0.4s" }}
              />
            </div>
            <span className="text-base font-bold tabular-nums" style={{ color: "#f9fafb" }}>{result.confidence}</span>
          </div>
        </div>
      </div>

      {/* Analyzed text */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#d1d5db" }}>
          Analyzed Content
        </p>
        <div
          className="leading-7 p-4 rounded-sm whitespace-pre-wrap"
          style={{
            backgroundColor: "#1e1e1e",
            color: "#f3f4f6",
            fontFamily: "Georgia, serif",
            fontSize: "12.5px",
            border: "1px solid #3a3a3a",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {articleText}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-5 py-3 border-t flex items-center justify-between"
        style={{ borderColor: "#3a3a3a", backgroundColor: "#252525" }}
      >
        <p className="text-[10px] font-medium" style={{ color: "#6b7280" }}>Analysis ID: {analysisId}</p>
        <button
          onClick={exportReport}
          className="text-[10px] font-medium tracking-wider uppercase transition-colors"
          style={{ color: "#d1d5db" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#d1d5db")}
        >
          Export report →
        </button>
      </div>
    </div>
  );
}

// ─── Tab icon ─────────────────────────────────────────────────────────────────
function TabIcon({ tab }: { tab: Tab }) {
  if (tab === "text") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
  if (tab === "url") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();

  // Auth
  const [userId,    setUserId]    = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab,   setActiveTab]   = useState<Tab>("text");

  // Input state
  const [articleText, setArticleText] = useState("");
  const [urlInput,    setUrlInput]    = useState("");
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [imagePrev,   setImagePrev]   = useState<string>("");

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [result,    setResult]    = useState<AnalysisResult | null>(null);
  const [apiError,  setApiError]  = useState("");

  // History
  const [history,      setHistory]      = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const id    = sessionStorage.getItem("veritas_user_id");
    const email = sessionStorage.getItem("veritas_email") || "";
    if (!id) { router.replace("/"); return; }
    setUserId(Number(id));
    setUserEmail(email);
  }, [router]);

  // ── Load history ───────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (uid: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/history/${uid}`);
      if (res.ok) setHistory(await res.json());
    } catch { /* silent */ } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { if (userId) loadHistory(userId); }, [userId, loadHistory]);

  // ── Textarea auto-grow ─────────────────────────────────────────────────────
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setArticleText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 320) + "px";
  };

  // ── Image picker ───────────────────────────────────────────────────────────
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePrev(URL.createObjectURL(file));
    setResult(null);
  };

  // ── Analyze ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!userId || analyzing) return;
    setAnalyzing(true);
    setResult(null);
    setApiError("");

    try {
      let res: Response;
      let displayText = "";

      if (activeTab === "text") {
        const text = articleText.trim();
        if (!text) { setApiError("Please paste some article text first."); return; }
        displayText = text;
        res = await fetch(`${API}/analyze-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, user_id: userId }),
        });

      } else if (activeTab === "url") {
        const url = urlInput.trim();
        if (!url) { setApiError("Please enter a URL first."); return; }
        displayText = url;
        res = await fetch(`${API}/analyze-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, user_id: userId }),
        });

      } else {
        if (!imageFile) { setApiError("Please select an image first."); return; }
        displayText = `[Image: ${imageFile.name}]`;
        const fd = new FormData();
        fd.append("file",    imageFile);
        fd.append("user_id", String(userId));
        res = await fetch(`${API}/analyze-image`, { method: "POST", body: fd });
      }

      const data: BackendResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { detail: string }).detail || "Server error");

      // If URL/image, show the extracted text in the card
      const cardText = activeTab === "text"
        ? displayText
        : (data.extracted_text || displayText);

      setResult({
        articleText: cardText,
        analysisId:  `VRX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        result:      data,
      });

      // Refresh sidebar history
      await loadHistory(userId);

    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Could not reach the backend. Is it running?");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Compute disabled ───────────────────────────────────────────────────────
  const isDisabled = analyzing || (
    activeTab === "text"  ? !articleText.trim()  :
    activeTab === "url"   ? !urlInput.trim()      :
    !imageFile
  );

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = () => {
    sessionStorage.clear();
    router.replace("/");
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "#222222", color: "#f3f4f6", fontFamily: "ui-monospace, 'Cascadia Code', monospace" }}
    >
      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden border-r"
        style={{ width: sidebarOpen ? "260px" : "0px", borderColor: "#3a3a3a", backgroundColor: "#1e1e1e" }}
      >
        <div className="flex flex-col h-full min-w-[260px]">
          {/* History header */}
          <div className="px-5 py-4 border-b" style={{ borderColor: "#3a3a3a" }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#d1d5db" }}>
              Analysis History
            </p>
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto py-2">
            {historyLoading ? (
              <div className="px-5 py-4">
                <p className="text-xs" style={{ color: "#6b7280" }}>Loading…</p>
              </div>
            ) : history.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-xs" style={{ color: "#4a4a4a" }}>No analyses yet.</p>
                <p className="text-[11px] mt-1" style={{ color: "#3a3a3a" }}>Your results will appear here.</p>
              </div>
            ) : (
              history.map((item) => {
                const isFake = item.verdict.toUpperCase().includes("FAKE");
                return (
                  <button
                    key={item.id}
                    className="w-full text-left px-5 py-3 transition-colors duration-100"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2a2a2a")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium leading-snug truncate flex-1" style={{ color: "#f3f4f6" }}>
                        {item.content}
                      </p>
                      <span
                        className="text-[10px] font-bold tracking-wider flex-shrink-0 mt-0.5"
                        style={{ color: isFake ? "#C35200" : "#4ade80" }}
                      >
                        {isFake ? "FAKE" : "REAL"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: "#6b7280" }}>
                        {item.input_type.toUpperCase()}
                      </span>
                      <span style={{ color: "#4a4a4a" }}>·</span>
                      <span className="text-[10px]" style={{ color: "#6b7280" }}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* User profile */}
          <div className="border-t p-4" style={{ borderColor: "#3a3a3a" }}>
            <div
              className="flex items-center gap-3 rounded px-3 py-2"
              style={{ backgroundColor: "#252525" }}
            >
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "#C35200" }}
              >
                <span className="text-[11px] font-bold text-white">
                  {userEmail ? userEmail[0].toUpperCase() : "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "#f3f4f6" }}>{userEmail}</p>
                <p className="text-[11px]" style={{ color: "#6b7280" }}>Signed in</p>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="flex-shrink-0 transition-colors"
                style={{ color: "#6b7280" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#C35200")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════════ MAIN ══════════════ */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: "#3a3a3a", backgroundColor: "#222222" }}
        >
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex flex-col gap-1.5 p-1.5 rounded transition-colors flex-shrink-0"
            style={{ color: "#d1d5db" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#d1d5db")}
            aria-label="Toggle sidebar"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block transition-all duration-300"
                style={{
                  width: "18px", height: "1.5px", backgroundColor: "currentColor",
                  ...(i === 0 && sidebarOpen ? { transform: "rotate(45deg) translate(3px, 3px)" } : {}),
                  ...(i === 1 && sidebarOpen ? { opacity: 0 } : {}),
                  ...(i === 2 && sidebarOpen ? { transform: "rotate(-45deg) translate(3px, -3px)" } : {}),
                }}
              />
            ))}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-widest" style={{ color: "#f9fafb", letterSpacing: "0.15em" }}>
              VeriTas
            </span>
          </div>

          <div className="flex-1" />
        </header>

        {/* Workspace */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Input mode tabs */}
            <div className="flex gap-1">
              {(["text", "url", "image"] as Tab[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setResult(null); setApiError(""); }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium tracking-widest uppercase transition-all duration-150"
                    style={{
                      backgroundColor: isActive ? "#2a2a2a" : "transparent",
                      color:           isActive ? "#C35200" : "#9ca3af",
                      borderBottom:    isActive ? "1px solid #C35200" : "1px solid transparent",
                      letterSpacing:   "0.12em",
                      cursor:          "pointer",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "#d1d5db"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#9ca3af"; }}
                  >
                    <TabIcon tab={tab} />
                    {tab === "url" ? "URL" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                );
              })}
            </div>

            {/* ── TEXT tab ── */}
            {activeTab === "text" && (
              <div className="rounded-sm" style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}>
                <textarea
                  ref={textareaRef}
                  id="text-input"
                  value={articleText}
                  onChange={handleTextChange}
                  placeholder={`Paste article text here…\n\nThe system will analyze linguistic patterns, source credibility signals, and semantic consistency to detect potential misinformation.`}
                  rows={1}
                  className="w-full bg-transparent resize-none outline-none p-5 text-sm leading-relaxed"
                  style={{ color: "#f3f4f6", minHeight: "160px", maxHeight: "320px", overflowY: "auto", fontFamily: "inherit", caretColor: "#C35200" }}
                />
                <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "#3a3a3a" }}>
                  <button
                    onClick={() => {
                      setArticleText(SAMPLE_ARTICLE);
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.style.height = "auto";
                          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 320) + "px";
                        }
                      }, 0);
                    }}
                    className="text-xs font-medium transition-colors"
                    style={{ color: "#6b7280" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d5db")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
                  >
                    Load sample →
                  </button>
                  <span className="text-xs font-medium" style={{ color: "#6b7280" }}>
                    {articleText.trim() ? `${articleText.trim().split(/\s+/).filter(Boolean).length} words` : ""}
                  </span>
                </div>
              </div>
            )}

            {/* ── URL tab ── */}
            {activeTab === "url" && (
              <div className="rounded-sm" style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}>
                <div className="flex items-center gap-3 px-5 py-4">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  <input
                    id="url-input"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/news-article"
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: "#f3f4f6", caretColor: "#C35200" }}
                  />
                </div>
                <div className="px-5 py-3 border-t" style={{ borderColor: "#3a3a3a" }}>
                  <p className="text-[11px]" style={{ color: "#6b7280" }}>
                    VeriTas will scrape the article content and analyze it using RoBERTa.
                  </p>
                </div>
              </div>
            )}

            {/* ── IMAGE tab ── */}
            {activeTab === "image" && (
              <div
                className="rounded-sm overflow-hidden"
                style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="image-input"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePick}
                />

                {!imagePrev ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 py-12 transition-all"
                    style={{ color: "#6b7280" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#d1d5db"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-xs font-medium tracking-widest uppercase">Click to upload image</span>
                    <span className="text-[11px]" style={{ color: "#4a4a4a" }}>PNG, JPG, WEBP supported</span>
                  </button>
                ) : (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePrev}
                      alt="Preview"
                      className="w-full object-contain"
                      style={{ maxHeight: "240px", backgroundColor: "#1a1a1a" }}
                    />
                    <button
                      onClick={() => { setImageFile(null); setImagePrev(""); setResult(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#d1d5db" }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {imagePrev && (
                  <div className="px-5 py-3 border-t" style={{ borderColor: "#3a3a3a" }}>
                    <p className="text-[11px]" style={{ color: "#6b7280" }}>
                      EasyOCR will extract text from the image and analyze it.
                      <button
                        className="ml-3 transition-colors"
                        style={{ color: "#6b7280" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d5db")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change image →
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Analyze button */}
            <button
              id="btn-analyze"
              onClick={handleAnalyze}
              disabled={isDisabled}
              className="w-full py-3 text-sm font-semibold tracking-widest uppercase transition-all duration-200"
              style={{
                backgroundColor: isDisabled ? "#2a2a2a" : "#C35200",
                color:           isDisabled ? "#9ca3af" : "#ffffff",
                cursor:          isDisabled ? "not-allowed" : "pointer",
                letterSpacing:   "0.2em",
                border:          isDisabled ? "1px solid #3a3a3a" : "none",
                borderRadius:    "2px",
              }}
            >
              {analyzing ? (
                <span className="flex items-center justify-center gap-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ border: "2px solid #6b7280", borderTopColor: "#C35200", animation: "spin 0.7s linear infinite" }}
                  />
                  <span style={{ color: "#d1d5db" }}>Analyzing…</span>
                </span>
              ) : "Analyze"}
            </button>

            {/* API error */}
            {apiError && (
              <div
                className="px-5 py-4 rounded-sm text-sm"
                style={{ backgroundColor: "rgba(195,82,0,0.08)", border: "1px solid rgba(195,82,0,0.25)", color: "#ff8c42" }}
              >
                ⚠ {apiError}
              </div>
            )}

            {/* Loading indicator */}
            {analyzing && <TypingIndicator />}

            {/* Result card */}
            {result && !analyzing && <ResultCard data={result} />}

          </div>
        </main>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0); opacity:0.4; } 40% { transform:translateY(-6px); opacity:1; } }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: #1e1e1e; }
        ::-webkit-scrollbar-thumb { background: #4a4a4a; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #5a5a5a; }
        textarea::placeholder { color: #6b7280; line-height: 1.8; }
        input::placeholder    { color: #4a4a4a; }
      `}</style>
    </div>
  );
}
