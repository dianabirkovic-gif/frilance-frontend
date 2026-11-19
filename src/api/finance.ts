import { apiRequest } from "./client";

/**
 * Mirrors the backend's `FinanceEntryType`. The order is the chip row's order
 * in the mockup, minus «Усі операції», which is the absence of a filter rather
 * than a value.
 */
export const FINANCE_ENTRY_TYPE_ORDER = ["INCOME", "EXPENSE", "PAYOUT", "TAX"] as const;

export type FinanceEntryType = (typeof FINANCE_ENTRY_TYPE_ORDER)[number];

/**
 * The two stored payment states — the drawer's stepper offers exactly these.
 *
 * «Прострочено», the third status DESIGN_SYSTEM.md 12.7 names, is not one of
 * them: it is `PENDING` past its due date, computed server-side and delivered
 * as `FinanceEntry.overdue`. Nobody sets it, so nobody can clear it by setting
 * something else — paying the invoice is what clears it.
 */
export const PAYMENT_STATUS_ORDER = ["PENDING", "PAID"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS_ORDER)[number];

/** Mirrors the backend's `PaymentMethod` — «Спосіб оплати» in the detail drawer. */
export const PAYMENT_METHOD_ORDER = ["CARD", "BANK_TRANSFER", "INVOICE", "AGENCY_CARD", "CASH"] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_ORDER)[number];

/** Mirrors FinanceResponse.FinanceEntryDto on the backend exactly — keep in sync. */
export interface FinanceEntry {
  id: string;
  type: FinanceEntryType;
  /** Money in or money out — the row's arrow icon, derived server-side from `type`. */
  direction: "IN" | "OUT";
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  clientId: string | null;
  clientName: string | null;
  /** «Отримувач» when no client is behind it: 'Оксана (SMM)', 'Meta Ads'. */
  counterparty: string | null;
  /** `YYYY-MM-DD` — «Дата виставлення». */
  entryDate: string;
  /** `YYYY-MM-DD` — «Термін оплати». Null when nothing is owed. */
  dueDate: string | null;
  paymentStatus: PaymentStatus;
  /** Awaiting payment past its deadline. Derived, never stored — see PAYMENT_STATUS_ORDER. */
  overdue: boolean;
  paymentMethod: PaymentMethod;
  invoiceNumber: string | null;
  /**
   * Dated outside the month on screen: an unpaid overdue operation the
   * register carries forward until it is settled. The table labels it rather
   * than showing what looks like a stray date.
   */
  carriedOver: boolean;
  /** The team member a payout is paid to — it is what puts the row on their «Моя зп». */
  recipientUserId: string | null;
}

/** Mirrors FinanceResponse.FinanceSummaryDto — the four stat cards. */
export interface FinanceSummary {
  income: number;
  /** Null when the previous month has nothing to compare against — render nothing, not "+100%". */
  incomeDeltaPercent: number | null;
  expenses: number;
  expensesDeltaPercent: number | null;
  netProfit: number;
  netProfitDeltaPercent: number | null;
  taxReserve: number;
  taxReserveGoal: number;
  taxReservePercentOfGoal: number;
  overdueReceivable: number;
  overdueCount: number;
}

/** Mirrors FinanceResponse.FinanceFlowPointDto — one day of the cash-flow chart. */
export interface FinanceFlowPoint {
  date: string;
  cumulativeIncome: number;
  cumulativeExpense: number;
}

/** Mirrors FinanceResponse.FinanceClientDto — the screen's own client picker. */
export interface FinanceClient {
  id: string;
  name: string;
}

/** Mirrors FinanceResponse.FinanceMemberDto — the payout form's recipient picker. */
export interface FinanceMember {
  id: string;
  name: string;
}

/** Mirrors FinanceResponse.FinanceDto on the backend exactly — keep in sync. */
export interface Finance {
  /** `YYYY-MM`. */
  month: string;
  currency: string;
  selectedClientId: string | null;
  selectedType: FinanceEntryType | null;
  clients: FinanceClient[];
  members: FinanceMember[];
  summary: FinanceSummary;
  flow: FinanceFlowPoint[];
  entries: FinanceEntry[];
}

/** Mirrors CreateFinanceEntryRequest — `paymentStatus` omitted means PAID. */
export interface CreateFinanceEntryPayload {
  type: FinanceEntryType;
  amount: number;
  entryDate: string;
  title: string;
  description: string | null;
  clientId: string | null;
  counterparty: string | null;
  paymentStatus?: PaymentStatus;
  paymentMethod: PaymentMethod;
  dueDate: string | null;
  invoiceNumber: string | null;
  /** Only meaningful for a PAYOUT; the backend refuses it on any other type. */
  recipientUserId: string | null;
}

/** Mirrors UpdateFinanceEntryRequest — a full replacement, so `paymentStatus` is required. */
export interface UpdateFinanceEntryPayload extends CreateFinanceEntryPayload {
  paymentStatus: PaymentStatus;
}

/**
 * The TanStack cache identity of one month of the register. It lives beside
 * the request it stands for, the way `contentPlanQueryKey` does: the mutations
 * invalidate the whole `finance` prefix, so a second key under another name
 * would quietly go stale.
 */
export function financeQueryKey(month: string, clientId: string | null, type: FinanceEntryType | null) {
  return ["finance", month, clientId, type] as const;
}

export function getFinance(
  month: string,
  clientId: string | null,
  type: FinanceEntryType | null,
): Promise<Finance> {
  const params = new URLSearchParams({ month });
  if (clientId) {
    params.set("clientId", clientId);
  }
  if (type) {
    params.set("type", type);
  }
  return apiRequest<Finance>(`/finance?${params.toString()}`);
}

export function createFinanceEntry(payload: CreateFinanceEntryPayload): Promise<FinanceEntry> {
  return apiRequest<FinanceEntry>("/finance/entries", { method: "POST", body: payload });
}

export function updateFinanceEntry(id: string, payload: UpdateFinanceEntryPayload): Promise<FinanceEntry> {
  return apiRequest<FinanceEntry>(`/finance/entries/${id}`, { method: "PUT", body: payload });
}

export function updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<FinanceEntry> {
  return apiRequest<FinanceEntry>(`/finance/entries/${id}/payment-status`, {
    method: "PATCH",
    body: { paymentStatus },
  });
}

export function deleteFinanceEntry(id: string): Promise<void> {
  return apiRequest<void>(`/finance/entries/${id}`, { method: "DELETE" });
}

/** Mirrors FinanceResponse.MySalaryPaymentDto — one payout, with nothing about clients or invoices. */
export interface MySalaryPayment {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  /** `YYYY-MM-DD`. */
  entryDate: string;
  dueDate: string | null;
  paymentStatus: PaymentStatus;
  overdue: boolean;
  paymentMethod: PaymentMethod;
}

/** Mirrors FinanceResponse.MySalaryDto — the signed-in member's own pay for one month. */
export interface MySalary {
  /** `YYYY-MM`. */
  month: string;
  currency: string;
  paidTotal: number;
  pendingTotal: number;
  payments: MySalaryPayment[];
}

/**
 * Its own cache key, outside the `finance` prefix on purpose: the register's
 * mutations invalidate that prefix, and `useCreateFinanceEntry` for a payout
 * should refresh both — see `useFinanceMutation`.
 */
export function mySalaryQueryKey(month: string) {
  return ["my-salary", month] as const;
}

/** The caller's own payouts. The server takes the member from the token — there is no id to pass. */
export function getMySalary(month: string): Promise<MySalary> {
  return apiRequest<MySalary>(`/finance/my-salary?month=${encodeURIComponent(month)}`);
}
