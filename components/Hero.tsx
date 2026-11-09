import HeroSlides from "./HeroSlides";
import MediaSlot from "./MediaSlot";
import RotatingPhrase from "./RotatingPhrase";
import { Button } from "./ui";
import { getHeroPhotos, getSiteConfig } from "@/lib/content";

/** Full-bleed photo (rotating through the gallery when it has photos) with the headline over a navy fade. The header sits on top. */
export default function Hero() {
  const { media } = getSiteConfig();
  const slides = getHeroPhotos().map((p) => p.src);

  return (
    <section className="cs-hero cs-reveal on-blue" aria-labelledby="hero-title">
      {slides.length > 0 ? (
        <HeroSlides photos={slides} />
      ) : (
      <MediaSlot
        src={media?.hero}
        alt="QUANTT members on a visit to an industry partner's office"
        className="cs-hero__media"
        sizes="100vw"
        priority
      >
        <div className="cs-hero__media" aria-hidden="true" />
      </MediaSlot>
      )}

      <div className="cs-wrap cs-hero__body">
        <h1 id="hero-title" className="cs-h1">
          <span className="sr-only">
            Tomorrow&apos;s talent in quantitative finance, algorithmic trading, and data science.
          </span>
          <span aria-hidden="true" className="block">
            Tomorrow&apos;s Talent in
          </span>
          <RotatingPhrase />
        </h1>
        <p>
          Students research, build, and test systematic strategies across equities, rates, credit,
          options, and energy.
        </p>
        <div className="cs-hero__ctas">
          <Button href="/competition" variant="accent">
            Explore Our Research
          </Button>
          <Button href="/team" variant="ghost">
            Meet the Team
          </Button>
        </div>
      </div>
    </section>
  );
}
