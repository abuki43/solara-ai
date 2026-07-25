import { EmbedCallWidget } from "@/components/voice/embed-call-widget";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex min-h-[120px] items-center justify-center bg-transparent p-2">
      <div className="w-full max-w-md">
        <EmbedCallWidget slug={slug} />
      </div>
    </main>
  );
}
