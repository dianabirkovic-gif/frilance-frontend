/**
 * How every amount in the app is written. It moved here the moment the Фінанси
 * module needed it in four components at once — before that each panel
 * declared its own `Intl.NumberFormat`, which was fine for one and would have
 * been four chances to disagree about grouping.
 *
 * The locale is fixed to `uk-UA` rather than following the user's chosen
 * interface language, on purpose: it is the tenant's own money, written the
 * way their bank and their tax office write it, and a thin space between
 * thousands is not a translation.
 */
const AMOUNT_FORMAT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

/** Whole hryvnia — kopiykas are stored but never shown in a register meant to be scanned. */
export function formatMoney(amount: number): string {
  return `₴${AMOUNT_FORMAT.format(amount)}`;
}

/**
 * The register's signed amount: `+ ₴32 000` for money in, `− ₴14 000` for
 * money out. The minus is U+2212, not a hyphen — at the mono weights these
 * amounts are set in, a hyphen reads as a dash in the title beside it.
 *
 * The sign comes from the direction, never from a negative amount: the
 * backend stores every amount positive precisely so there is one
 * representation of "₴3 400 out" rather than two.
 */
export function formatSignedMoney(amount: number, direction: "IN" | "OUT"): string {
  return `${direction === "IN" ? "+" : "−"} ${formatMoney(Math.abs(amount))}`;
}
