import { PublicCallPage } from "@/components/voice/public-call-page";

export default async function CallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F4F0] px-5 py-16">
      <div className="voice-demo-aurora pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative z-10 w-full">
        <PublicCallPage slug={slug} />
      </div>
    </main>
  );
}
