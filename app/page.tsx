"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────
type AuthMode = "login" | "register" | null;

// ─── Animated background dots ────────────────────────────────────────────────
function Background() {
  return (
    <>
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #3a3a3a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.25,
        }}
      />
      {/* Centre glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 52%, rgba(195,82,0,0.09) 0%, transparent 70%)",
        }}
      />
    </>
  );
}

// ─── Auth modal ───────────────────────────────────────────────────────────────
interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onSwitch: (m: AuthMode) => void;
}

function AuthModal({ mode, onClose, onSwitch }: AuthModalProps) {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const isLogin = mode === "login";
  const title   = isLogin ? "Welcome back" : "Create account";
  const cta     = isLogin ? "Sign in" : "Register";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");
      sessionStorage.setItem("veritas_user_id", String(data.user_id));
      sessionStorage.setItem("veritas_email",   data.email);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-sm rounded-sm overflow-hidden"
        style={{
          backgroundColor: "#1e1e1e",
          border: "1px solid #3a3a3a",
          animation: "fadeUp 0.3s ease both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stripe */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #C35200, #ff6b00, #C35200)" }}
        />

        <div className="px-8 py-7">
          {/* Title */}
          <div className="mb-6">
            <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: "#C35200" }}>
              VeriTas
            </p>
            <h2 className="text-xl font-bold" style={{ color: "#f9fafb" }}>
              {title}
            </h2>
            <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
              {isLogin
                ? "Sign in to access your analysis history."
                : "Create a free account to get started."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "#d1d5db" }}>
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-sm text-sm outline-none transition-all"
                style={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  color: "#f9fafb",
                  caretColor: "#C35200",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#C35200")}
                onBlur={(e) => (e.target.style.borderColor = "#3a3a3a")}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "#d1d5db" }}>
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-sm text-sm outline-none transition-all"
                style={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  color: "#f9fafb",
                  caretColor: "#C35200",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#C35200")}
                onBlur={(e) => (e.target.style.borderColor = "#3a3a3a")}
                placeholder="••••••••"
              />
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-xs px-3 py-2 rounded-sm"
                style={{ backgroundColor: "rgba(195,82,0,0.1)", color: "#ff8c42", border: "1px solid rgba(195,82,0,0.3)" }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              id={isLogin ? "btn-signin" : "btn-register"}
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold tracking-widest uppercase transition-all duration-200"
              style={{
                backgroundColor: loading ? "#2a2a2a" : "#C35200",
                color: loading ? "#6b7280" : "#ffffff",
                letterSpacing: "0.18em",
                cursor: loading ? "not-allowed" : "pointer",
                borderRadius: "2px",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ border: "2px solid #6b7280", borderTopColor: "#C35200", animation: "spin 0.7s linear infinite" }}
                  />
                  <span>Processing…</span>
                </span>
              ) : cta}
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-xs text-center mt-5" style={{ color: "#6b7280" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setError(""); setEmail(""); setPassword(""); onSwitch(isLogin ? "register" : "login"); }}
              className="font-medium transition-colors"
              style={{ color: "#C35200" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ff6b00")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#C35200")}
            >
              {isLogin ? "Register" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div
      className="rounded-sm p-6 transition-all duration-200 group"
      style={{ backgroundColor: "#1e1e1e", border: "1px solid #2a2a2a" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C35200")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
    >
      <div className="mb-3" style={{ color: "#C35200" }}>{icon}</div>
      <h3 className="text-sm font-bold mb-1" style={{ color: "#f9fafb" }}>{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>{desc}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [authMode, setAuthMode] = useState<AuthMode>(null);

  const openAuth = (mode: AuthMode) => setAuthMode(mode);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: "#1a1a1a", color: "#f3f4f6", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      <Background />

      {/* Auth modal */}
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitch={setAuthMode}
        />
      )}

      {/* ── Navbar ── */}
      <nav
        className="relative z-20 flex items-center justify-between px-8 md:px-16 py-5"
        style={{ borderBottom: "1px solid #2a2a2a" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-widest" style={{ color: "#f9fafb", letterSpacing: "0.15em" }}>
            VeriTas
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "How it works", "About"].map((item) => (
            <span
              key={item}
              className="text-xs font-medium tracking-widest uppercase cursor-pointer transition-colors duration-200"
              style={{ color: "#6b7280" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-nav-signin"
            onClick={() => openAuth("login")}
            className="text-xs font-medium tracking-widest uppercase px-4 py-2 transition-colors"
            style={{ color: "#9ca3af" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
          >
            Sign in
          </button>
          <button
            id="btn-nav-register"
            onClick={() => openAuth("register")}
            className="text-xs font-bold tracking-widest uppercase px-5 py-2.5 rounded-sm transition-all duration-200"
            style={{ backgroundColor: "#C35200", color: "#ffffff", letterSpacing: "0.15em" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a84700")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C35200")}
          >
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1
          className="text-4xl md:text-6xl font-black leading-tight mb-6 max-w-3xl"
          style={{ color: "#f9fafb", letterSpacing: "-0.02em" }}
        >
          Detect Fake News
          <span style={{ color: "#C35200" }}> Instantly.</span>
        </h1>

        <p className="text-base max-w-xl leading-relaxed mb-10" style={{ color: "#9ca3af" }}>
          VeriTas uses a transformer-based AI model fine-tuned on hundreds of thousands of news articles
          to classify content as real or fake — with a confidence score.
        </p>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <button
            id="btn-hero-start"
            onClick={() => openAuth("register")}
            className="px-8 py-3.5 text-sm font-bold tracking-widest uppercase rounded-sm transition-all duration-200"
            style={{ backgroundColor: "#C35200", color: "#ffffff", letterSpacing: "0.18em" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a84700")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C35200")}
          >
            Start analyzing →
          </button>
          <button
            id="btn-hero-signin"
            onClick={() => openAuth("login")}
            className="px-8 py-3.5 text-sm font-medium tracking-widest uppercase rounded-sm transition-all duration-200"
            style={{ color: "#9ca3af", border: "1px solid #3a3a3a" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C35200"; e.currentTarget.style.color = "#f9fafb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.color = "#9ca3af"; }}
          >
            Sign in
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-16 flex items-center gap-10 flex-wrap justify-center">
          {[
            { label: "Training samples",  value: "500K+" },
            { label: "Model accuracy",    value: "~93%"  },
            { label: "Input modes",       value: "3"     },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black" style={{ color: "#C35200" }}>{s.value}</p>
              <p className="text-[10px] font-medium tracking-widest uppercase mt-0.5" style={{ color: "#6b7280" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ── Features ── */}
      <section className="relative z-10 px-8 md:px-16 pb-20">
        <p className="text-center text-[10px] font-bold tracking-widest mb-8" style={{ color: "#6b7280" }}>
          What VeriTas can do
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <FeatureCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
            title="Text Analysis"
            desc="Paste any article or headline directly into the app and get an instant verdict."
          />
          <FeatureCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            }
            title="URL Scraping"
            desc="Paste a news URL — VeriTas scrapes the article and classifies it automatically."
          />
          <FeatureCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            }
            title="Image OCR"
            desc="Upload a screenshot of a news article — EasyOCR extracts the text for analysis."
          />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 px-8 py-5 flex items-center justify-between"
        style={{ borderTop: "1px solid #2a2a2a" }}
      >
        <p className="text-[10px] font-medium tracking-widest" style={{ color: "#3a3a3a" }}>
          © 2025 VeriTas
        </p>
        <p className="text-[10px] font-medium" style={{ color: "#3a3a3a" }}>
          Transformer-Based News Verification
        </p>
      </footer>

      {/* Global animations */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
