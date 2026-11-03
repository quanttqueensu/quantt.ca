import type { Valuation } from "@/lib/research";
import { slugify } from "@/lib/research";

/** Headshot from the member directory over the person's initials (shown if there's no photo). */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span className="ra-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
      <span className="ra-avatar__photo" style={{ backgroundImage: `url(/team/photos/${slugify(name)})` }} />
    </span>
  );
}

/** A price range on one axis: the current price as a rule, each scenario as a marker. */
export function ValuationRange({ data }: { data: Valuation }) {
  const prices = [data.current, ...data.points.map((p) => p.price)];
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = (hi - lo) * 0.08 || 1;
  const pos = (v: number) => ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 100;
  const sorted = [...data.points].sort((a, b) => a.price - b.price);
  const down = sorted.filter((p) => p.price < data.current);
  const up = sorted.filter((p) => p.price >= data.current);
  const fmt = (v: number) => v.toFixed(2);
  return (
    <figure className="ra-val" aria-label={`${data.title ?? "Valuation"}: current ${fmt(data.current)}`}>
      {data.title && <figcaption className="ra-val__title">{data.title}</figcaption>}
      <div className="ra-val__track">
        {down.length > 0 && (
          <span className="ra-val__bar ra-val__bar--down" style={{ left: `${pos(down[0].price)}%`, width: `${pos(data.current) - pos(down[0].price)}%` }} />
        )}
        {up.length > 0 && (
          <span className="ra-val__bar ra-val__bar--up" style={{ left: `${pos(data.current)}%`, width: `${pos(up[up.length - 1].price) - pos(data.current)}%` }} />
        )}
        <span className="ra-val__now" style={{ left: `${pos(data.current)}%` }}>
          <b>{fmt(data.current)}</b>
        </span>
        {sorted.map((p) => (
          <span key={p.price} className={`ra-val__pt ${p.price < data.current ? "is-down" : "is-up"}`} style={{ left: `${pos(p.price)}%` }}>
            <b>{fmt(p.price)}</b>
            {p.change && <em>{p.change}</em>}
          </span>
        ))}
      </div>
    </figure>
  );
}

/**
 * Legal notice under every research article. Kept to what matters for publishing stock views in Canada:
 * general, non-tailored information (the "advising generally" exemption, NI 31-103 s. 8.25), the author's
 * own view, no liability, and the author's holdings when they have any (that exemption requires it).
 */
export function Disclaimer({ disclosure }: { disclosure?: string }) {
  return (
    <aside id="disclaimer" className="ra-disclaimer" aria-label="Disclaimer">
      <p>
        <b>For education only.</b>{" "}
        This is the author&apos;s opinion, not financial or investment advice or a
        recommendation to buy or sell any security. Do your own research. Views are not those of QUANTT or
        Queen&apos;s University, and neither they nor the author accept liability for any loss from its use.
        {disclosure && ` ${disclosure}`}
      </p>
    </aside>
  );
}
