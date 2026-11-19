/**
 * How advertising figures are written. Counts are whole numbers with a thin
 * space between thousands; money per unit (CPL, CPC, CPM) keeps its kopiykas —
 * ₴0.45 a click is not ₴0 — while totals round like every other amount in the
 * app. A null ratio ("no figure": nothing to divide by) is a dash, never 0.
 */
const COUNT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
const UNIT_MONEY = new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const RATIO = new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const NO_FIGURE = "—";

export function formatCount(value: number): string {
  return COUNT.format(value);
}

/** A per-unit money figure (CPL, CPC, CPM): two decimals, or a dash. */
export function formatUnitMoney(value: number | null): string {
  return value === null ? NO_FIGURE : `₴${UNIT_MONEY.format(value)}`;
}

/**
 * A two-decimal number with no currency sign, or a dash. The PDF report uses it
 * with the currency written as a word: the font embedded in the PDF has no ₴
 * glyph, and a missing glyph prints as a box and mangles the text after it.
 */
export function formatDecimal(value: number | null): string {
  return value === null ? NO_FIGURE : UNIT_MONEY.format(value);
}

/** A percentage such as CTR, or a dash. */
export function formatPercent(value: number | null): string {
  return value === null ? NO_FIGURE : `${RATIO.format(value)}%`;
}

/** ROAS as a multiple: `4,00×`, or a dash. */
export function formatRoas(value: number | null): string {
  return value === null ? NO_FIGURE : `${RATIO.format(value)}×`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
