import type { Metadata } from "next";
import GalleryGrid from "@/components/GalleryGrid";
import { PageIntro, Wrap } from "@/components/ui";
import { getGallery, monthLabel } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/gallery" },
  title: "Gallery — QUANTT",
  description: "Photos from QUANTT competitions and events.",
};

export default function GalleryPage() {
  const events = getGallery();
  return (
    <>
      <PageIntro title="Gallery" />
      <section aria-label="Photos by event" className="cs-section">
        <Wrap>
          {events.map((e) => (
            <section key={e.title} className="cs-gallery-event" aria-label={e.title}>
              <div className="cs-gallery-event__head">
                <h2 className="cs-h2">{e.title}</h2>
                <p>{[e.place, monthLabel(e.date), e.result].filter(Boolean).join(", ")}</p>
              </div>
              <GalleryGrid photos={e.photos} />
            </section>
          ))}
        </Wrap>
      </section>
    </>
  );
}
