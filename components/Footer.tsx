import Image from "next/image";
import Link from "next/link";
import { Link as LinkIcon } from "lucide-react";

// Brand marks as minimal inline SVG (lucide no longer ships brand icons).
const icons = {
  Instagram: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  LinkedIn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z" />
    </svg>
  ),
  Facebook: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z" />
    </svg>
  ),
  Linktree: <LinkIcon size={16} aria-hidden="true" />,
};

const socials = [
  { href: "https://www.instagram.com/quanttqueens", label: "Instagram" as const },
  { href: "https://www.linkedin.com/company/quanttqueens/", label: "LinkedIn" as const },
  { href: "https://www.facebook.com/QUANTTpage", label: "Facebook" as const },
  { href: "https://linktr.ee/quantt", label: "Linktree" as const },
];

export default function Footer() {
  return (
    <footer className="cs-footer on-blue">
      <div className="cs-wrap">
        <div className="cs-footer__top">
          <Link href="/" aria-label="QUANTT home" className="inline-flex min-h-11 items-start">
            <Image
              src="/images/logos/quantt-text-white.png"
              alt=""
              width={877}
              height={399}
              className="h-12 w-auto"
            />
          </Link>
          <nav aria-label="Footer" className="cs-footer__col">
            <Link href="/portfolios">Portfolios</Link>
            <Link href="/education">Education</Link>
            <Link href="/competition">Research</Link>
            <Link href="/team">Team</Link>
          </nav>
          <div className="cs-footer__col">
            <Link href="/partners">Partners</Link>
            <Link href="/achievements">Achievements</Link>
            <Link href="/contact">Contact</Link>
            <a href="mailto:quantt@clubs.queensu.ca">quantt@clubs.queensu.ca</a>
          </div>
        </div>

        <div className="cs-footer__bar">
          <p className="cs-footer__copy">
            {`© ${new Date().getFullYear()} QUANTT · Queen's University Algorithmic Network & Trading Team · Kingston, Ontario · Since 2018`}
          </p>
          <ul className="cs-social">
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in new tab)`}>
                  {icons[s.label]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
