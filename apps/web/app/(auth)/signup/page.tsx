import Link from "next/link";

import { SignupForm } from "@/components/auth/auth-forms";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F4F0] p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="font-pixel text-xs tracking-[0.25em] text-black/50">
            SOLAR AI
          </Link>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
