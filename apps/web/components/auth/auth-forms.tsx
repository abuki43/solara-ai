"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";

function AuthHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <p className="mb-3 text-[10px] font-medium tracking-[0.2em] text-black/35">{eyebrow}</p>
      <h2 className="text-3xl font-light tracking-[-0.03em] text-[#111] sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-black/45">{description}</p>
    </div>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30">
      {children}
    </span>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-black/60">
        {label}
      </Label>
      <div className="relative">
        <FieldIcon>
          <LockKeyhole className="size-4" />
        </FieldIcon>
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-12 rounded-xl border-black/[0.09] bg-white/60 pl-10 pr-11 shadow-sm transition-all placeholder:text-black/25 focus-visible:border-black/25 focus-visible:ring-black/5"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-black/30 transition-colors hover:bg-black/[0.04] hover:text-black/60"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

const panelClass =
  "rounded-[28px] border border-white/70 bg-white/65 p-6 shadow-[0_28px_80px_rgba(62,56,85,0.12)] backdrop-blur-2xl sm:p-9";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn.email({ email, password });
    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Login failed");
      return;
    }

    router.push("/agents");
  }

  return (
    <div className={panelClass}>
      <AuthHeading
        eyebrow="WELCOME BACK"
        title="Sign in to Solar AI"
        description="Continue managing the receptionists that keep your business available."
      />
      <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium text-black/60">
              Email address
            </Label>
            <div className="relative">
              <FieldIcon>
                <Mail className="size-4" />
              </FieldIcon>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@business.com"
                className="h-12 rounded-xl border-black/[0.09] bg-white/60 pl-10 shadow-sm transition-all placeholder:text-black/25 focus-visible:border-black/25 focus-visible:ring-black/5"
                required
              />
            </div>
          </div>
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <span className="text-xs text-black/35">Forgot password? Coming soon</span>
          </div>
          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2.5 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="group h-12 w-full gap-2 rounded-xl bg-[#111] text-white shadow-[0_10px_25px_rgba(17,17,17,.16)] transition-all hover:-translate-y-0.5 hover:bg-[#292929]"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
            {!loading ? <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /> : null}
          </Button>
          <p className="pt-1 text-center text-sm text-black/40">
            New to Solar AI?{" "}
            <Link href="/signup" className="font-medium text-black underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
      </form>
    </div>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await signUp.email({ name, email, password });
    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Signup failed");
      return;
    }

    router.push("/agents");
  }

  return (
    <div className={panelClass}>
      <AuthHeading
        eyebrow="GET STARTED"
        title="Create your workspace"
        description="Set up your business and launch your first voice receptionist."
      />
      <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-medium text-black/60">
              Your name
            </Label>
            <div className="relative">
              <FieldIcon>
                <UserRound className="size-4" />
              </FieldIcon>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Your full name"
                className="h-12 rounded-xl border-black/[0.09] bg-white/60 pl-10 shadow-sm transition-all placeholder:text-black/25 focus-visible:border-black/25 focus-visible:ring-black/5"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-xs font-medium text-black/60">
              Work email
            </Label>
            <div className="relative">
              <FieldIcon>
                <Mail className="size-4" />
              </FieldIcon>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@business.com"
                className="h-12 rounded-xl border-black/[0.09] bg-white/60 pl-10 shadow-sm transition-all placeholder:text-black/25 focus-visible:border-black/25 focus-visible:ring-black/5"
                required
              />
            </div>
          </div>
          <PasswordField
            id="signup-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
          <div className="flex gap-1.5" aria-label="Password must contain at least 8 characters">
            {[2, 4, 6, 8].map((threshold) => (
              <span
                key={threshold}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  password.length >= threshold ? "bg-[#111]" : "bg-black/[0.08]"
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-black/35">Use at least 8 characters</p>
          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2.5 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="group h-12 w-full gap-2 rounded-xl bg-[#111] text-white shadow-[0_10px_25px_rgba(17,17,17,.16)] transition-all hover:-translate-y-0.5 hover:bg-[#292929]"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
            {!loading ? <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /> : null}
          </Button>
          <p className="pt-1 text-center text-sm text-black/40">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-black underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
      </form>
    </div>
  );
}
