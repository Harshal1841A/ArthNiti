/**
 * Single source of truth for tier/lender color mapping.
 *
 * Previously this exact object (STRONG/ADEQUATE/WATCH/HIGH_RISK -> hex) was
 * independently copy-pasted into ScoreGauge.tsx, FinancialHealthCard.tsx,
 * Dashboard.tsx, DemoModePage.tsx, and LoanOfferCarousel.tsx (as
 * LENDER_COLORS). Six copies of "the same fact" means a color change has to
 * be made six times correctly, or the UI silently drifts — the same failure
 * mode as hardcoding hex directly, just one level up. Import from here
 * instead of redefining the object locally.
 *
 * Values reference the CSS custom properties in index.css (var(--tier-...)),
 * not raw hex — this works correctly in inline `style={{color}}` usage
 * (unlike Tailwind's arbitrary-value opacity modifiers, which cannot reliably
 * decompose a CSS variable's alpha channel — that's why JSX className
 * contexts use the `tier-strong` / `tier-high-risk` Tailwind theme classes
 * defined in tailwind.config.js instead of this file).
 */

export type Tier = 'STRONG' | 'ADEQUATE' | 'WATCH' | 'HIGH_RISK';

export const TIER_COLORS: Record<Tier, string> = {
  STRONG: 'var(--tier-strong)',
  ADEQUATE: 'var(--tier-adequate)',
  WATCH: 'var(--tier-watch)',
  HIGH_RISK: 'var(--tier-high-risk)',
};

export const FALLBACK_COLOR = 'var(--text-muted)';

export function tierColor(tier: string | undefined | null): string {
  if (tier && tier in TIER_COLORS) return TIER_COLORS[tier as Tier];
  return FALLBACK_COLOR;
}

export const LENDER_COLORS: Record<string, string> = {
  BANK: 'var(--tier-adequate)',
  COOP: 'var(--tier-strong)',
  NBFC: 'var(--tier-watch)',
};

export function lenderColor(lenderType: string | undefined | null): string {
  if (lenderType && lenderType in LENDER_COLORS) return LENDER_COLORS[lenderType];
  return FALLBACK_COLOR;
}
