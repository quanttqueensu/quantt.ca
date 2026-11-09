"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryPhoto } from "@/lib/content";

/** One event's photos: the first one large, the rest in an even grid. Click to view full size. */
export default function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const show = (i: number) => {
    setOpen(i);
    dialog.current?.showModal();
  };
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const onClose = () => setOpen(null);
    el.addEventListener("keydown", onKey);
    el.addEventListener("close", onClose);
    return () => {
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("close", onClose);
    };
  }, [step]);

  const current = open === null ? null : photos[open];

  return (
    <>
      <ul className="cs-gallery">
        {photos.map((p, i) => (
          <li key={p.src} className={i === 0 ? "cs-gallery__lead" : ""}>
            <button type="button" onClick={() => show(i)} aria-label={`View photo: ${p.alt ?? ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, images served as-is */}
              <img src={i === 0 ? p.src : p.thumb || p.src} alt={p.alt ?? ""} loading={i < 5 ? "eager" : "lazy"} decoding="async" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className="cs-lightbox"
        aria-label="Photo viewer"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <button type="button" className="cs-lightbox__btn cs-lightbox__close" onClick={() => dialog.current?.close()} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        {current && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} alt={current.alt ?? ""} />
            <figcaption>
              <span>{current.alt}</span>
              <span className="cs-lightbox__count">
                {(open ?? 0) + 1} of {photos.length}
              </span>
            </figcaption>
          </figure>
        )}
        <button type="button" className="cs-lightbox__btn cs-lightbox__prev" onClick={() => step(-1)} aria-label="Previous photo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
        </button>
        <button type="button" className="cs-lightbox__btn cs-lightbox__next" onClick={() => step(1)} aria-label="Next photo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button>
      </dialog>
    </>
  );
}
