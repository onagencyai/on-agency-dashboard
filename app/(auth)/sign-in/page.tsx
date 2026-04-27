"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import Image from "next/image";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({ identifier: email, password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("Sign in could not be completed. Please try again.");
      }
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "errors" in err) {
        const errors = (err as { errors: Array<{ message: string }> }).errors;
        setError(errors[0]?.message ?? "An unexpected error occurred.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .oa-input::placeholder {
          color: rgba(17, 24, 39, 0.4);
        }
        .oa-input:-webkit-autofill,
        .oa-input:-webkit-autofill:hover,
        .oa-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
          -webkit-text-fill-color: #111827;
          caret-color: #111827;
          transition: background-color 5000s ease-in-out 0s;
        }
        .oa-btn:hover:not(:disabled) {
          opacity: 0.88 !important;
        }
        .oa-btn:active:not(:disabled) {
          opacity: 0.78 !important;
          transform: scale(0.99);
        }
        .oa-footer-link {
          color: rgba(17, 24, 39, 0.45);
          font-size: 13px;
          line-height: 1;
          letter-spacing: -0.01em;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .oa-footer-link:hover {
          color: rgba(17, 24, 39, 0.75);
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#FAFAFA",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* Centered form area */}
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "100px 16px 64px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 376 }}>
            {/* Icon */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 40,
              }}
            >
              <Image
                src="/logos/on-agency-four-line.svg"
                alt="On Agency Four Line"
                width={64}
                height={64}
                priority
              />
            </div>

            {/* Heading */}
            <h1
              style={{
                color: "#111827",
                fontSize: "32px",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                textAlign: "center",
                marginBottom: 10,
                fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
              }}
            >
              Log in to On Agency
            </h1>

            {/* Subheading */}
            <p
              style={{
                color: "rgba(17,24,39,0.62)",
                fontSize: "14px",
                textAlign: "center",
                lineHeight: 1.55,
                marginBottom: 36,
                letterSpacing: "-0.01em",
              }}
            >
              Access your dashboard and manage your AI agents
            </p>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    color: "rgba(17,24,39,0.7)",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    marginBottom: 7,
                  }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  className="oa-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 13px",
                    background: "#ffffff",
                    border: "1px solid rgba(17,24,39,0.1)",
                    borderRadius: 8,
                    color: "#111827",
                    fontSize: "14px",
                    letterSpacing: "-0.01em",
                    outline: "none",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59,130,246,0.65)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(59,130,246,0.13)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(17,24,39,0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Password field with toggle */}
              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: "block",
                    color: "rgba(17,24,39,0.7)",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    marginBottom: 7,
                  }}
                >
                  Password
                </label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <input
                    id="password"
                    className="oa-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 13px 10px 13px",
                      paddingRight: "40px",
                      background: "#ffffff",
                      border: "1px solid rgba(17,24,39,0.1)",
                      borderRadius: 8,
                      color: "#111827",
                      fontSize: "14px",
                      outline: "none",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(59,130,246,0.65)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px rgba(59,130,246,0.13)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(17,24,39,0.1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(17,24,39,0.45)",
                      transition: "color 0.2s ease",
                      zIndex: 10,
                      pointerEvents: "auto",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgba(17,24,39,0.72)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(17,24,39,0.45)";
                    }}
                  >
                    {showPassword ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div
                  role="alert"
                  style={{
                    padding: "10px 13px",
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.18)",
                    borderRadius: 8,
                    color: "#fc8181",
                    fontSize: "13px",
                    lineHeight: 1.45,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="oa-btn"
                disabled={loading || !isLoaded}
                style={{
                  marginTop: 2,
                  width: "100%",
                  padding: "11px 20px",
                  background: "#111111",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  cursor: loading || !isLoaded ? "not-allowed" : "pointer",
                  opacity: loading || !isLoaded ? 0.6 : 1,
                  transition: "opacity 0.15s ease, transform 0.1s ease",
                  fontFamily: "inherit",
                }}
              >
                {loading ? "Signing in…" : "Continue"}
              </button>
            </form>
          </div>
        </main>

        <footer
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 20,
            padding: "0 16px 32px",
          }}
        >
          <a
            className="oa-footer-link"
            href="https://onagency.ai/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms
          </a>
          <a
            className="oa-footer-link"
            href="https://onagency.ai/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
        </footer>
      </div>
    </>
  );
}