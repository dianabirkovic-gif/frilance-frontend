import { monthOf, toIsoDate } from "../../utils/calendarDays";

/**
 * The date a new operation starts on: today when today falls inside the month
 * being viewed, and the 1st of that month otherwise.
 *
 * Defaulting to today unconditionally is how an invoice ends up silently filed
 * in a month nobody was looking at — the user paged back to June, opened the
 * form, and saved something dated August. The content plan's FAB follows the
 * same rule for the same reason.
 */
export function defaultDateFor(month: string, today: Date): string {
  return monthOf(today) === month ? toIsoDate(today) : `${month}-01`;
}
