"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navLinks = [
  { href: "/portfolios", label: "Portfolios" },
  { href: "/education", label: "Education" },
  { href: "/competition", label: "Research" },
  { href: "/team", label: "Team" },
  { href: "/partners", label: "Partners" },
  { href: "/achievements", label: "Achievements" },
  { href: "/contact", label: "Contact" },
];

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const lastY = useRef(0);
  // On the home page the header sits on the hero photo until the page scrolls.
  const overHero = pathname === "/" && atTop && !menuOpen;

  // Hides on scroll down, returns on scroll up. Never hides with the menu open.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setHidden(y > lastY.current && y > 200);
        setAtTop(y < 40);
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={`cs-header ${hidden && !menuOpen ? "is-hidden" : ""} ${overHero ? "is-over-hero" : ""}`}
    >
      <div className="cs-wrap cs-header__row relative">
        <Link href="/" aria-label="QUANTT home" className="flex min-h-11 flex-shrink-0 items-center">
          <Image
            src="/images/logos/quantt-full.png"
            alt=""
            width={1617}
            height={400}
            className="cs-header__logo h-8 w-auto max-[900px]:h-7"
            priority
          />
          <Image
            src="/images/logos/quantt-full-white.png"
            alt=""
            width={1617}
            height={400}
            className="cs-header__logo-white h-8 w-auto max-[900px]:h-7"
            priority
          />
        </Link>

        <nav id="site-nav" aria-label="Main" className={`cs-nav ${menuOpen ? "is-open" : ""}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="cs-header__tools">
          <button
            type="button"
            className="cs-menu-btn min-h-11 min-w-11 items-center justify-center"
            aria-controls="site-nav"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              {menuOpen ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
