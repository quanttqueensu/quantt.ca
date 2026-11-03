import { Button, PageIntro } from "@/components/ui";

export default function NotFound() {
  return (
    <PageIntro
      title="Page Not Found"
      lede={<p>The page you requested doesn&apos;t exist or has moved.</p>}
      cta={
        <div className="flex flex-wrap gap-x-4">
          <Button href="/">Go Home</Button>
          <Button href="/competition">Explore Our Research</Button>
        </div>
      }
    />
  );
}
