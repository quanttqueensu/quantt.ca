import Link from "next/link";
import MediaSlot from "./MediaSlot";
import type { CSSProperties, ReactNode } from "react";

/* ---------- Buttons & arrows ---------- */

type ButtonVariant = "blue" | "accent" | "ghost";

/** CTA. Blue on white/grey surfaces; accent (white) or ghost (outline) on blue or a photo. */
export function Button({
  href,
  children,
  variant = "blue",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  const classes = `cs-btn cs-btn--${variant} ${className}`;
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  const external = !href.startsWith("mailto:");
  return (
    <a
      href={href}
      className={classes}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {external && <span className="sr-only"> (opens in new tab)</span>}
    </a>
  );
}

/** Thin right arrow at the end of a list row. Nudges right when its row is hovered. */
export function ArrowCircle({ className = "" }: { className?: string }) {
  return (
    <span className={`cs-arrow ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 25">
        <path d="M20.707 12.6875L14.3535 6.33391L13.6464 7.04101L18.7928 12.1874L3.99989 12.1874V13.1874L18.7929 13.1874L13.6464 18.3339L14.3535 19.041L20.707 12.6875Z" />
      </svg>
    </span>
  );
}

/* ---------- Layout ---------- */

export function Wrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cs-wrap ${className}`}>{children}</div>;
}

/** Headline in columns 1–11, lede + optional CTA from column 13. */
export function Split({
  title,
  lede,
  cta,
  as: Heading = "h2",
  onBlue = false,
  className = "",
}: {
  title: ReactNode;
  lede?: ReactNode;
  cta?: ReactNode;
  as?: "h1" | "h2";
  onBlue?: boolean;
  className?: string;
}) {
  return (
    <div className={`cs-grid cs-split cs-reveal ${className}`}>
      <Heading className={`cs-h2 ${onBlue ? "cs-h2--on-blue" : ""}`}>{title}</Heading>
      <div>
        {lede && <div className="cs-lede">{lede}</div>}
        {cta}
      </div>
    </div>
  );
}

/** A photo shown beside the title in a page intro. `position` is an object-position class that keeps the subject in frame. */
export type IntroPhoto = { src?: string; alt: string; position?: string };

/**
 * First block of every inner page: a compact title bar (title left, lede right, rule underneath). With a photo,
 * it becomes a short navy band with the title and lede on the left and the photo beside them (above them on
 * phones), never under the text.
 */
export function PageIntro({
  title,
  lede,
  cta,
  photo,
  children,
}: {
  title: string;
  lede?: ReactNode;
  cta?: ReactNode;
  photo?: IntroPhoto;
  children?: ReactNode;
}) {
  const hasPhoto = Boolean(photo?.src);
  return (
    <section className="cs-intro">
      <Wrap>
        <div className={`cs-intro__band cs-reveal ${hasPhoto ? "cs-intro__band--photo" : ""}`}>
          <div className={`cs-intro__text ${hasPhoto ? "on-blue" : ""}`}>
            <h1 className={`cs-h2 ${hasPhoto ? "cs-h2--on-blue" : ""}`}>{title}</h1>
            {(lede || cta) && (
              <div className="cs-intro__lede">
                {lede && <div className="cs-lede">{lede}</div>}
                {cta}
              </div>
            )}
          </div>
          {hasPhoto && photo && (
            <MediaSlot
              src={photo.src}
              alt={photo.alt}
              className="cs-intro__photo"
              imgClassName={photo.position}
              sizes="(max-width: 900px) 100vw, 800px"
              priority
            />
          )}
        </div>
        {children}
      </Wrap>
    </section>
  );
}

/** A white section with the standard top rhythm. */
export function Section({
  children,
  id,
  label,
  className = "",
}: {
  children: ReactNode;
  id?: string;
  label?: string;
  className?: string;
}) {
  return (
    <section id={id} aria-label={label} className={`cs-section scroll-mt-28 ${className}`}>
      <Wrap>{children}</Wrap>
    </section>
  );
}

/* ---------- Stats ---------- */

export interface StatItem {
  value: ReactNode;
  /** Small superscript suffix or prefix, e.g. "+", "%". */
  sup?: string;
  label: string;
}

/** Big blue figures in columns separated by hairline rules. Only real numbers. */
export function Stats({
  items,
  large = false,
  strip = false,
}: {
  items: StatItem[];
  large?: boolean;
  /** Full-width row with a bottom rule, directly under the home hero. */
  strip?: boolean;
}) {
  return (
    <dl
      className={`cs-stats ${large ? "cs-stats--lg" : ""} ${strip ? "cs-stats--strip" : ""}`}
      style={{ "--cols": items.length } as CSSProperties}
    >
      {items.map((item) => (
        <div key={item.label} className="cs-stat flex flex-col-reverse justify-end">
          <dt className="cs-stat__label">{item.label}</dt>
          <dd className="cs-stat__num">
            {item.value}
            {item.sup && <sup>{item.sup}</sup>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Lists ---------- */

export interface ListItem {
  href: string;
  title: string;
  byline?: string[];
  external?: boolean;
  label?: string;
}

/** Tinted inset panel: intro on the left, linked rows with arrows on the right. */
export function ListPanel({
  title,
  intro,
  items,
  children,
}: {
  title: ReactNode;
  intro?: ReactNode;
  items?: ListItem[];
  children?: ReactNode;
}) {
  return (
    <Wrap>
      <section className="cs-panel cs-reveal">
        <div className="cs-panel__intro">
          <h2 className="cs-h2 cs-h2--md">{title}</h2>
          {intro && <div className="mt-12 text-lg leading-7 text-ink">{intro}</div>}
        </div>
        {items ? <List items={items} /> : children}
      </section>
    </Wrap>
  );
}

export function List({ items }: { items: ListItem[] }) {
  return (
    <ul className="cs-list">
      {items.map((item) => {
        const inner = (
          <>
            {item.byline && item.byline.length > 0 && (
              <div className="cs-byline">
                {item.byline.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </div>
            )}
            <div>
              <h3>{item.title}</h3>
            </div>
            <ArrowCircle />
          </>
        );
        return (
          <li key={item.href + item.title}>
            {item.external ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label}>
                {inner}
              </a>
            ) : (
              <Link href={item.href} aria-label={item.label}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
