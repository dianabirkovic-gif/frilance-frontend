import type { StatPayload } from "../../api/targetAds";
import { MAX_IMPORT_ROWS } from "./limits";

/** The columns an import can fill. `date` is the only one without which nothing can be imported. */
export const IMPORT_FIELDS = ["date", "spend", "impressions", "reach", "clicks", "leads", "revenue"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Column index per field; null when the file has no such column. */
export type ColumnMapping = Record<ImportField, number | null>;

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

/** `auto`: day first (the Ukrainian habit), unless a part above 12 proves otherwise. `us`: month first. */
export type DateFormat = "auto" | "us";

// ---------------------------------------------------------------------------
// Finding the table and its columns
// ---------------------------------------------------------------------------

/**
 * Headers that look like a *ratio* of the thing a field wants, not the thing:
 * "Cost per result", "CPC", "Cost / conv.", "CTR". Matching "cost" against them
 * would import a price as a total.
 */
const RATIO_HEADER = /(\bper\b|\/|\bcp[cmlav]\b|\bctr\b|\bavg\b|average|\brate\b|%|середн|за\s+\d|\bціна\b|результат[уа]?\s*$)/i;

const SYNONYMS: Record<Exclude<ImportField, "date">, string[]> = {
  spend: ["amount spent", "spend", "cost", "витрачена сума", "витрачено", "витрати", "сума витрат", "вартість"],
  impressions: ["impressions", "impr", "покази", "покази"],
  reach: ["reach", "охоплення"],
  clicks: ["link clicks", "clicks", "click", "переходи за посиланням", "кліки", "кліків"],
  leads: ["leads", "lead", "results", "conversions", "conv.", "ліди", "результати", "конверсії", "заявки"],
  revenue: [
    "purchase conversion value",
    "purchases conversion value",
    "conversion value",
    "conv. value",
    "total conversion value",
    "revenue",
    "цінність конверсій",
    "сума конверсій",
    "дохід",
    "виручка",
  ],
};

const DATE_SYNONYMS = ["day", "date", "reporting starts", "reporting start", "дата", "день", "початок звітності"];

/** "Conv. value" is a money column — it must not be taken for the count of conversions. */
const NOT_A_COUNT = /(value|цінність|сума конверс)/i;

function norm(header: string): string {
  return header.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Guesses which column is which from the headers of Meta, Google Ads and TikTok
 * exports (English and Ukrainian). It is a guess — the dialog lets the user
 * correct every one — so it errs toward `null` over a wrong column, and never
 * gives one column to two fields.
 */
export function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    spend: null,
    impressions: null,
    reach: null,
    clicks: null,
    leads: null,
    revenue: null,
  };
  const used = new Set<number>();
  const normalized = headers.map(norm);

  function pick(synonyms: string[], accept: (header: string) => boolean): number | null {
    for (const synonym of synonyms) {
      const index = normalized.findIndex(
        (header, i) => !used.has(i) && header !== "" && accept(header) && header.includes(synonym),
      );
      if (index !== -1) return index;
    }
    return null;
  }

  mapping.date = pick(DATE_SYNONYMS, (h) => !/(ends|end|створ|updated|created)/.test(h));
  if (mapping.date !== null) used.add(mapping.date);

  for (const field of ["spend", "impressions", "reach", "clicks", "leads", "revenue"] as const) {
    const index = pick(SYNONYMS[field], (h) => !RATIO_HEADER.test(h) && (field === "leads" ? !NOT_A_COUNT.test(h) : true));
    mapping[field] = index;
    if (index !== null) used.add(index);
  }
  return mapping;
}

/**
 * Finds the header row. Ad exports are not clean tables: Google Ads puts a
 * title and a date range above the header, and a "Total" row below the data. The
 * header is the first row that has a date column *and* at least one metric; if no
 * row does, the first wide-enough row is offered so the user can map by hand.
 */
export function findTable(rows: string[][]): CsvTable | null {
  const wide = (cells: string[]) => cells.filter((cell) => cell.trim() !== "").length >= 3;

  for (let i = 0; i < rows.length; i++) {
    if (!wide(rows[i])) continue;
    const mapping = autoMap(rows[i]);
    if (mapping.date !== null && (mapping.spend !== null || mapping.impressions !== null || mapping.clicks !== null)) {
      return { headers: rows[i], rows: rows.slice(i + 1) };
    }
  }
  const first = rows.findIndex(wide);
  return first === -1 ? null : { headers: rows[first], rows: rows.slice(first + 1) };
}

/** The column holding the campaign's name, if the export has one — a multi-campaign file needs a filter. */
export function findCampaignColumn(headers: string[]): number | null {
  const index = headers.findIndex((header) => /^(campaign( name)?|назва кампанії|кампанія)$/i.test(header.trim()));
  return index === -1 ? null : index;
}

export function distinctValues(table: CsvTable, column: number): string[] {
  return [...new Set(table.rows.map((row) => (row[column] ?? "").trim()).filter((value) => value !== ""))];
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function isoOf(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day);
  // `new Date(2026, 1, 31)` rolls over to March; a date that does not exist is not a date.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** `YYYY-MM-DD`, or null when the cell is not a date (a "Total" row, a blank). */
export function parseDate(raw: string, format: DateFormat = "auto"): string | null {
  const value = raw.trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(value);
  if (iso) return isoOf(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = /^(\d{1,2})([./])(\d{1,2})\2(\d{4})$/.exec(value);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[3]);
    const year = Number(numeric[4]);
    // Dots are always day-first. Slashes are ambiguous: the user's chosen format decides,
    // except when one part cannot be a month and so settles it.
    const dayFirst =
      numeric[2] === "."
        ? true
        : first > 12
          ? true
          : second > 12
            ? false
            : format === "auto";
    return dayFirst ? isoOf(year, second, first) : isoOf(year, first, second);
  }

  const named = /^(?:(\d{1,2})\s+([a-z]{3,9})\.?,?\s+(\d{4})|([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4}))$/i.exec(value);
  if (named) {
    const day = Number(named[1] ?? named[5]);
    const monthName = (named[2] ?? named[4]).slice(0, 3).toLowerCase();
    const month = MONTHS.indexOf(monthName) + 1;
    return month === 0 ? null : isoOf(Number(named[3] ?? named[6]), month, day);
  }
  return null;
}

/** An empty cell or a dash ("--" is what cabinets print for no data) is zero, not an error. */
function isBlank(raw: string): boolean {
  return /^[\s\u00a0\u2013\u2014-]*$/.test(raw);
}

/**
 * A number in whichever notation the export used: `1 234,56`, `1.234,56`,
 * `1,234.56`, `₴1234.5`, `12 %`. With both separators the last one is the
 * decimal; with one repeated it is a thousands separator; a single one followed
 * by exactly three digits is a thousands separator too (so `1,234` is 1234,
 * not 1.234) unless the integer part is 0. Null for anything that is not a number.
 */
export function parseNumber(raw: string): number | null {
  if (isBlank(raw)) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!/\d/.test(cleaned)) return null;

  const negative = cleaned.startsWith("-");
  const body = cleaned.replace(/-/g, "");
  if (body !== cleaned.replace(/^-/, "")) return null; // a minus in the middle

  const lastComma = body.lastIndexOf(",");
  const lastDot = body.lastIndexOf(".");
  let normalized: string;

  if (lastComma !== -1 && lastDot !== -1) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = body.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma !== -1 || lastDot !== -1) {
    const separator = lastComma !== -1 ? "," : ".";
    const parts = body.split(separator);
    const afterLast = parts[parts.length - 1];
    if (parts.length > 2) {
      normalized = parts.join("");
    } else if (afterLast.length === 3 && parts[0] !== "0" && parts[0] !== "") {
      normalized = parts.join("");
    } else {
      normalized = `${parts[0] || "0"}.${afterLast}`;
    }
  } else {
    normalized = body;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? (negative ? -value : value) : null;
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export interface ImportProblem {
  /** The row's position in the file, counting the header as line 1 of the table. */
  line: number;
  reason: "number" | "negative" | "clicksOverImpressions" | "reachOverImpressions";
  /** The date involved when it is known. */
  date: string | null;
}

export interface BuildOptions {
  mapping: ColumnMapping;
  dateFormat: DateFormat;
  /** When the file has several campaigns: the column and the one value to keep. */
  campaignColumn: number | null;
  campaignValue: string | null;
}

export interface BuildResult {
  /** One row per date, sorted — what would be sent. */
  rows: StatPayload[];
  /** Rows whose date cell is not a date: titles, "Total" lines, blanks. Dropped without comment on purpose. */
  skipped: number;
  /** Rows (or days) that were dropped because the data in them cannot be right. */
  problems: ImportProblem[];
  tooMany: boolean;
}

const money = (value: number) => Math.round(value * 100) / 100;

/**
 * Turns the table into one row per date.
 *
 * Rows of the same date are **summed**: an export broken down by ad set or ad
 * has several lines per day for one campaign, and the day's figure is their
 * total. (A file with several *campaigns* must be narrowed to one first — the
 * campaign filter — or their days would be added together.)
 *
 * Nothing is silently invented or dropped: a row with a non-numeric figure, a
 * negative one, or clicks above impressions is reported as a problem and left
 * out, so the user decides with the count in front of them.
 */
export function buildStatRows(table: CsvTable, options: BuildOptions): BuildResult {
  const { mapping, dateFormat, campaignColumn, campaignValue } = options;
  const problems: ImportProblem[] = [];
  const byDate = new Map<
    string,
    { spend: number; impressions: number; reach: number; clicks: number; leads: number; revenue: number; lines: number[] }
  >();
  const badDates = new Set<string>();
  let skipped = 0;

  if (mapping.date === null) return { rows: [], skipped: table.rows.length, problems, tooMany: false };

  table.rows.forEach((cells, index) => {
    const line = index + 2; // header is line 1 of the table
    if (campaignColumn !== null && campaignValue !== null && (cells[campaignColumn] ?? "").trim() !== campaignValue) {
      return;
    }
    const date = parseDate(cells[mapping.date as number] ?? "", dateFormat);
    if (date === null) {
      skipped++;
      return;
    }

    const read = (field: Exclude<ImportField, "date">): number | null => {
      const column = mapping[field];
      return column === null ? 0 : parseNumber(cells[column] ?? "");
    };
    const values = {
      spend: read("spend"),
      impressions: read("impressions"),
      reach: read("reach"),
      clicks: read("clicks"),
      leads: read("leads"),
      revenue: read("revenue"),
    };

    if (Object.values(values).some((value) => value === null)) {
      problems.push({ line, reason: "number", date });
      badDates.add(date);
      return;
    }
    if (Object.values(values).some((value) => (value as number) < 0)) {
      problems.push({ line, reason: "negative", date });
      badDates.add(date);
      return;
    }

    const day = byDate.get(date) ?? {
      spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, revenue: 0, lines: [],
    };
    day.spend += values.spend as number;
    day.impressions += Math.round(values.impressions as number);
    day.reach += Math.round(values.reach as number);
    day.clicks += Math.round(values.clicks as number);
    day.leads += Math.round(values.leads as number);
    day.revenue += values.revenue as number;
    day.lines.push(line);
    byDate.set(date, day);
  });

  const rows: StatPayload[] = [];
  for (const [date, day] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    // A date with any rejected row is left out whole: importing the rest of its lines would
    // store a total that is smaller than the real one and look correct.
    if (badDates.has(date)) continue;
    if (day.clicks > day.impressions) {
      problems.push({ line: day.lines[0], reason: "clicksOverImpressions", date });
      continue;
    }
    if (day.reach > day.impressions) {
      problems.push({ line: day.lines[0], reason: "reachOverImpressions", date });
      continue;
    }
    rows.push({
      statDate: date,
      spend: money(day.spend),
      impressions: day.impressions,
      reach: day.reach,
      clicks: day.clicks,
      leads: day.leads,
      revenue: mapping.revenue === null ? null : money(day.revenue),
    });
  }

  return { rows, skipped, problems, tooMany: rows.length > MAX_IMPORT_ROWS };
}
