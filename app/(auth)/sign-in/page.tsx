"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { Inter } from "next/font/google";
import LogoMark from "@/components/LogoMark";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

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
        :root {
          --oa-surface-subtle: #fafafa;
          --oa-surface-base: #ffffff;
          --oa-border-default: #e5e5e5;
          --oa-content-strong: #1a1a1a;
          --oa-content-default: #333333;
          --oa-content-subtle: #646465;
          --oa-content-disabled: #c2c2c2;
          --oa-interactive-hover: #f0f0f0;
          --oa-interactive-disabled: #e5e5e5;
          --oa-accent: #0391ff;
          --oa-accent-hover: #0380e0;
        }
        .oa-input {
          width: 100%;
          min-width: 0;
          outline: none;
          box-sizing: border-box;
          color: var(--oa-content-strong);
          background: var(--oa-surface-base);
          border: 1px solid var(--oa-border-default);
          border-radius: 8px;
          height: 34px;
          padding: 4px 10px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 150ms, background 150ms, box-shadow 150ms;
          appearance: none;
          -webkit-appearance: none;
        }
        .oa-input::placeholder {
          color: var(--oa-content-disabled);
        }
        .oa-input:hover {
          background: var(--oa-interactive-hover);
        }
        .oa-input:focus {
          border-color: var(--oa-content-disabled);
          background: var(--oa-interactive-hover);
          box-shadow: 0 0 0 3px #e1e1e1;
        }
        .oa-input:-webkit-autofill,
        .oa-input:-webkit-autofill:hover,
        .oa-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
          -webkit-text-fill-color: var(--oa-content-strong);
          caret-color: var(--oa-content-strong);
          transition: background-color 5000s ease-in-out 0s;
        }
        .oa-btn {
          background: var(--oa-accent);
        }
        .oa-btn:hover:not(:disabled) {
          background: var(--oa-accent-hover);
        }
        .oa-btn:disabled {
          background: var(--oa-interactive-disabled);
          color: var(--oa-content-disabled);
        }
        .oa-footer-text {
          color: #717172;
          font-size: 12px;
          font-family: inherit;
        }
        .oa-auth-container {
          width: 100%;
          max-width: 360px;
        }
        .oa-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 16px;
          position: relative;
          z-index: 2;
        }
        .oa-footer {
          display: flex;
          justify-content: center;
          padding: 0 16px 44px;
          position: relative;
          z-index: 2;
        }
        .oa-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0;
        }
        .oa-divider-line {
          height: 1px;
          flex: 1;
          background: var(--oa-border-default);
        }
        .oa-divider-text {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: var(--oa-content-subtle);
          text-transform: uppercase;
        }
        .oa-google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 37px;
          padding: 0 14px;
          background: var(--oa-surface-base);
          border: 1px solid var(--oa-border-default);
          border-radius: 8px;
          color: var(--oa-content-default);
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background-color 150ms;
        }
        .oa-google-btn:hover:not(:disabled) {
          background: var(--oa-interactive-hover);
        }
        .oa-google-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        @media (max-width: 640px) {
          .oa-auth-container {
            max-width: 320px;
          }
        }
      `}</style>

      <div
        className={inter.className}
        style={{
          minHeight: "100vh",
          background: "var(--oa-surface-subtle)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* Logo above the form */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "42px 0 0",
            color: "var(--oa-content-strong)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <LogoMark size={26} />
        </div>

        {/* Centered form area */}
        <main className="oa-main">
          <div className="oa-auth-container">
            {/* Heading */}
            <h1
              style={{
                color: "var(--oa-content-strong)",
                fontSize: "21px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
                textAlign: "center",
                marginBottom: 13,
                marginTop: 0,
              }}
            >
              Sign in
            </h1>

            {/* Subheading */}
            <p
              style={{
                color: "var(--oa-content-subtle)",
                fontSize: "13px",
                textAlign: "center",
                lineHeight: 1.5,
                marginBottom: 35,
              }}
            >
              Welcome back to On Agency
            </p>

            {/* Google sign-in */}
            <button
              type="button"
              className="oa-google-btn"
              disabled={!isLoaded || loading}
              onClick={() => {
                if (!isLoaded || !signIn) return;
                signIn.authenticateWithRedirect({
                  strategy: "oauth_google",
                  redirectUrl: "/sign-in/sso-callback",
                  redirectUrlComplete: "/dashboard",
                });
              }}
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              Sign in with Google
            </button>

            <div className="oa-divider">
              <span className="oa-divider-line" />
              <span className="oa-divider-text">Or</span>
              <span className="oa-divider-line" />
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {/* Email field */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="email"
                  style={{
                    color: "var(--oa-content-subtle)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  className="oa-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Password field with toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="password"
                  style={{
                    color: "var(--oa-content-subtle)",
                    fontSize: "12px",
                    fontWeight: 500,
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
                    style={{ paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 8,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--oa-content-subtle)",
                      transition: "color 0.2s ease",
                      zIndex: 10,
                      pointerEvents: "auto",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--oa-content-strong)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--oa-content-subtle)";
                    }}
                  >
                    {showPassword ? (
                      <svg
                        width="16"
                        height="16"
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
                        width="16"
                        height="16"
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
                    padding: "8px 10px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    color: "#dc2626",
                    fontSize: "12px",
                    lineHeight: 1.45,
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
                  height: 36,
                  padding: "0 14px",
                  color: "#ffffff",
                  border: "1px solid transparent",
                  borderRadius: 8,
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: loading || !isLoaded ? "not-allowed" : "pointer",
                  transition: "background 150ms",
                }}
              >
                {loading ? "Signing in…" : "Continue"}
              </button>
            </form>
          </div>
        </main>

        <footer className="oa-footer">
          <span className="oa-footer-text">© 2026 On Agency</span>
        </footer>
      </div>
    </>
  );
}
