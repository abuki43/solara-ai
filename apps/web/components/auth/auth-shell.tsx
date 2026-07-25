"use client";

import { ArrowLeft, Check, Headphones, Languages, Sparkles } from "lucide-react";
import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
  mode: "login" | "signup";
};

const benefits = [
  { icon: Headphones, label: "Answer every customer call, 24/7" },
  { icon: Languages, label: "English, Amharic, and Afan Oromo" },
  { icon: Check, label: "Launch your first receptionist in minutes" },
];

export function AuthShell({ children, mode }: AuthShellProps) {
  const isSignup = mode === "signup";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F5F4F0] font-sans text-[#111]">
      <div className="absolute inset-0 lg:hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/images/solar-hero.jpg"
          aria-hidden="true"
          className="size-full object-cover opacity-35 motion-reduce:hidden"
        >
          <source src="/images/solar-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#F5F4F0]/75 backdrop-blur-md" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col lg:justify-between">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/images/solar-hero.jpg"
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover motion-reduce:hidden"
          >
            <source src="/images/solar-hero.mp4" type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(245,244,240,.2) 0%, rgba(245,244,240,.05) 45%, rgba(245,244,240,.72) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[68%]"
            style={{
              background:
                "linear-gradient(to top, #F5F4F0 0%, rgba(245,244,240,.88) 27%, rgba(245,244,240,.25) 75%, transparent 100%)",
            }}
          />

          <div className="relative z-10 flex items-center justify-between p-8 xl:p-10">
            <Link href="/" className="font-pixel text-xs tracking-[0.28em] text-black/70">
              SOLAR AI
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full border border-white/60 bg-white/45 px-4 py-2 text-xs text-black/60 backdrop-blur-xl transition-colors hover:bg-white/70 hover:text-black"
            >
              <ArrowLeft className="size-3.5" />
              Back home
            </Link>
          </div>

          <div className="relative z-10 max-w-2xl p-8 pb-12 xl:p-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-3 py-1.5 backdrop-blur-xl">
              <Sparkles className="size-3.5 text-violet-500" />
              <span className="text-[10px] font-medium tracking-[0.18em] text-black/50">
                AI VOICE RECEPTIONIST
              </span>
            </div>
            <h1 className="max-w-xl text-5xl font-light leading-[1.02] tracking-[-0.04em] xl:text-6xl">
              {isSignup ? (
                <>
                  Your business,
                  <br />
                  always answering.
                </>
              ) : (
                <>
                  Welcome back
                  <br />
                  to every call.
                </>
              )}
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-black/50">
              Build an AI receptionist that knows your services, speaks your customers&apos;
              language, and never leaves a call unanswered.
            </p>
            <div className="mt-8 grid gap-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit.label}
                  className="flex w-fit items-center gap-3 rounded-xl border border-white/60 bg-white/45 px-4 py-3 text-sm text-black/60 backdrop-blur-xl"
                >
                  <benefit.icon className="size-4 text-black/45" />
                  {benefit.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:bg-[#F5F4F0] xl:px-16">
          <div className="absolute left-5 top-6 z-10 flex items-center gap-3 lg:hidden">
            <Link href="/" className="font-pixel text-xs tracking-[0.25em] text-black/60">
              SOLAR AI
            </Link>
          </div>
          <div className="w-full max-w-[470px]">{children}</div>
        </section>
      </div>
    </main>
  );
}
