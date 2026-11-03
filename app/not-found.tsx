import { Button, PageIntro } from "@/components/ui";

export default function NotFound() {
  return (
    <PageIntro
      title="Page Not Found"
      lede={<p>The page you requested doesn&apos;t exist or has moved.</p>}
      cta={
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-3">
          <Button href="/" variant="accent">Go Home</Button>
          <Button href="/competition" variant="ghost">Explore Our Research</Button>
        </div>
      }
    />
  );
}
