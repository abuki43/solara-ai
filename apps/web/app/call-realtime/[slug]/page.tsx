import { RealtimeCallPage } from "@/components/voice/realtime-call-page";

export default async function RealtimePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F4F0] px-5 py-16">
      <div className="relative z-10 w-full">
        <RealtimeCallPage slug={slug} />
      </div>
    </main>
  );
}
