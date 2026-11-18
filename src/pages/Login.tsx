import { useState, type FormEvent } from "react";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { useStore } from "../store";
import { Button, Field, Input } from "../components/ui";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-6 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.27 5.48-4.8 7.18l7.73 6C44.38 38.03 46.98 31.68 46.98 24.55Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.77-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.5 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}

export function LoginPage() {
  const { login } = useStore();
  const [demoOpen, setDemoOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function googleSignIn() {
    setError("Google sign-in is not connected in this local preview. Use demo access below to review the ACP flow.");
  }

  function submitDemo(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (email.trim().toLowerCase() !== "admin@brio.co.in" || password !== "demo1234") {
      setError("Incorrect demo email or password.");
      return;
    }
    login({ name: "Workspace admin (demo)", email: "admin@brio.co.in" });
  }

  return (
    <div className="grid min-h-dvh bg-brio-surface lg:grid-cols-2">
      <aside className="relative h-52 overflow-hidden bg-brio-primary sm:h-72 lg:h-dvh" aria-hidden="true">
        <img src="/acp-login-reference.png" alt="" className="absolute inset-0 h-full w-[200%] max-w-none object-fill" />
      </aside>

      <main className="flex min-h-[calc(100dvh-13rem)] min-w-0 flex-col bg-brio-surface px-6 py-6 sm:px-10 sm:py-8 lg:min-h-dvh lg:px-12 lg:py-10 xl:px-16">
        <header className="flex items-start justify-between gap-5">
          <img src="/brio-logo.png" alt="Brio" className="h-9 w-auto object-contain sm:h-11" />
          <div className="text-right">
            <p className="text-2xl font-bold leading-none tracking-tight text-brio-ink sm:text-3xl">ACP</p>
            <p className="mt-1 text-xs text-brio-muted sm:text-sm">Admin Control Panel</p>
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="w-full max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-brio-ink sm:text-4xl xl:text-5xl">Admin Control Panel</h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-brio-muted sm:text-lg">
              Manage your Google Workspace services in one place.
            </p>

            <button
              type="button"
              onClick={googleSignIn}
              className="mt-10 inline-flex min-h-16 items-center justify-center gap-3 rounded-full bg-brio-subtle px-8 text-base font-semibold text-brio-ink transition-colors duration-120 ease-brio hover:bg-brio-border focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brio-focus sm:px-10 sm:text-lg"
            >
              <GoogleMark />
              Continue with Google
            </button>

            <div className="mx-auto mt-6 max-w-sm">
              <button type="button" onClick={() => { setDemoOpen(!demoOpen); setError(""); }} className="min-h-10 text-sm font-medium text-brio-muted underline underline-offset-4 hover:text-brio-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brio-focus">
                {demoOpen ? "Hide local demo access" : "Use local demo access"}
              </button>

              {error && <p role="alert" className="mt-3 rounded-brio-control bg-brio-warning-bg px-4 py-3 text-left text-sm leading-6 text-brio-warning-ink">{error}</p>}

              {demoOpen && (
                <form onSubmit={submitDemo} className="mt-4 flex flex-col gap-4 rounded-brio-panel border border-brio-subtle bg-canvas p-5 text-left" noValidate>
                  <p className="text-sm font-semibold text-brio-ink">Local demo sign-in</p>
                  <Field label="Work email"><Input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@brio.co.in" /></Field>
                  <Field label="Password">
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-10" />
                      <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-brio-control text-brio-muted hover:text-brio-ink focus-visible:outline-2 focus-visible:outline-brio-focus">
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </Field>
                  <p className="text-xs text-brio-muted">Preview only: admin@brio.co.in · demo1234</p>
                  <Button type="submit" variant="primary" className="w-full">Enter demo Workspace</Button>
                </form>
              )}
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 text-sm font-medium text-brio-muted">
          <a href="https://www.briotech.com/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 underline underline-offset-4 hover:text-brio-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brio-focus">briotech.com <ArrowUpRight className="size-4" aria-hidden /></a>
          <a href="https://support.briotech.com/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 underline underline-offset-4 hover:text-brio-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brio-focus">Support <ArrowUpRight className="size-4" aria-hidden /></a>
        </footer>
      </main>
    </div>
  );
}
