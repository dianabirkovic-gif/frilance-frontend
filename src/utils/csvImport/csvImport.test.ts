import { describe, expect, it } from "vitest";
import {
  autoMap,
  buildStatRows,
  distinctValues,
  findCampaignColumn,
  findTable,
  parseDate,
  parseNumber,
  type BuildOptions,
  type ColumnMapping,
} from "./adStatsImport";
import { MAX_IMPORT_ROWS } from "./limits";
import { decodeCsvBytes, parseCsv } from "./parseCsv";

const META = [
  "Day,Campaign name,Amount spent (UAH),Impressions,Reach,Link clicks,Results,Cost per result",
  '2026-11-05,Осінь,"1 234,50",12000,9000,240,12,102.87',
  '2026-11-06,Осінь,"980,00",9000,7000,180,9,108.88',
  "2026-11-06,Весна,100,1000,800,20,1,100",
].join("\n");

const GOOGLE_TSV = [
  "Campaign performance",
  '"November 1, 2026 - November 10, 2026"',
  "Day\tCampaign\tCost\tImpressions\tClicks\tConversions\tConv. value\tCost / conv.",
  "Nov 5, 2026\tBrand\t150.25\t5,000\t150\t15.00\t900.00\t10.02",
  "Nov 6, 2026\tBrand\t90.5\t3,000\t90\t--\t--\t--",
  "Total: Account\t\t240.75\t8,000\t240\t15.00\t900.00\t16.05",
].join("\n");

function table(csv: string) {
  const found = findTable(parseCsv(csv));
  if (!found) throw new Error("no table");
  return found;
}

function options(csv: string, overrides: Partial<BuildOptions> = {}): BuildOptions {
  const t = table(csv);
  return { mapping: autoMap(t.headers), dateFormat: "auto", campaignColumn: null, campaignValue: null, ...overrides };
}

describe("parseCsv", () => {
  it("detects comma, semicolon and tab", () => {
    expect(parseCsv("a,b,c\n1,2,3")[1]).toEqual(["1", "2", "3"]);
    expect(parseCsv("a;b;c\n1;2;3")[1]).toEqual(["1", "2", "3"]);
    expect(parseCsv("a\tb\tc\n1\t2\t3")[1]).toEqual(["1", "2", "3"]);
  });

  /** A decimal comma inside a quoted cell must not be mistaken for the delimiter. */
  it("keeps a quoted decimal comma inside its cell, and unescapes doubled quotes", () => {
    expect(parseCsv('a;b;c\n"1,5";"he said ""hi""";3')[1]).toEqual(["1,5", 'he said "hi"', "3"]);
  });

  it("reads a newline inside quotes as part of the cell, and handles CRLF and a BOM", () => {
    const rows = parseCsv('﻿a,b,c\r\n"x\ny",2,3\r\n');
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe("x\ny");
  });

  it("drops blank lines", () => {
    expect(parseCsv("a,b,c\n\n,,\n1,2,3\n")).toHaveLength(2);
  });
});

describe("decodeCsvBytes", () => {
  it("reads UTF-16 with a BOM (Google Ads) and UTF-8 with a BOM (Excel)", () => {
    const utf16 = new Uint8Array([0xff, 0xfe, ...[..."Дата"].flatMap((c) => [c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8])]);
    expect(decodeCsvBytes(utf16.buffer)).toBe("Дата");
    const utf8 = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("Дата")]);
    expect(decodeCsvBytes(utf8.buffer)).toBe("Дата");
  });

  it("falls back to Windows-1251 when the bytes are not valid UTF-8", () => {
    const cp1251 = new Uint8Array([0xc4, 0xe0, 0xf2, 0xe0]); // "Дата"
    expect(decodeCsvBytes(cp1251.buffer)).toBe("Дата");
  });
});

describe("parseNumber", () => {
  it.each([
    ["1234", 1234],
    ["1 234,56", 1234.56],
    ["1 234,56", 1234.56],
    ["1.234,56", 1234.56],
    ["1,234.56", 1234.56],
    ["₴1,234.56", 1234.56],
    ["1,234", 1234],
    ["1.234.567", 1234567],
    ["0.123", 0.123],
    ["12,5", 12.5],
    ["15.00", 15],
    ["12 %", 12],
    ["-5", -5],
  ])("reads %s as %s", (raw, expected) => {
    expect(parseNumber(raw)).toBeCloseTo(expected as number, 6);
  });

  /** "--" is what cabinets print for no data: zero, not an error. */
  it("reads a blank or a dash as zero, and text as not a number", () => {
    expect(parseNumber("")).toBe(0);
    expect(parseNumber("--")).toBe(0);
    expect(parseNumber("n/a")).toBeNull();
    expect(parseNumber("1-2")).toBeNull();
  });
});

describe("parseDate", () => {
  it("reads ISO, dotted day-first, and English month names", () => {
    expect(parseDate("2026-11-05")).toBe("2026-11-05");
    expect(parseDate("2026-11-05T10:00:00Z")).toBe("2026-11-05");
    expect(parseDate("05.11.2026")).toBe("2026-11-05");
    expect(parseDate("Nov 5, 2026")).toBe("2026-11-05");
    expect(parseDate("5 November 2026")).toBe("2026-11-05");
  });

  it("settles a slash date by the format, unless one part proves it", () => {
    expect(parseDate("03/04/2026", "auto")).toBe("2026-04-03");
    expect(parseDate("03/04/2026", "us")).toBe("2026-03-04");
    expect(parseDate("25/04/2026", "us")).toBe("2026-04-25"); // 25 cannot be a month
    expect(parseDate("04/25/2026", "auto")).toBe("2026-04-25");
  });

  it("refuses a date that does not exist, and anything that is not a date", () => {
    expect(parseDate("2026-02-31")).toBeNull();
    expect(parseDate("Total: Account")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("autoMap / findTable", () => {
  it("recognises a Meta export", () => {
    const m = autoMap(table(META).headers);

    expect(m).toEqual({ date: 0, spend: 2, impressions: 3, reach: 4, clicks: 5, leads: 6, revenue: null });
  });

  /** "Cost / conv." and "Conv. value" must not be taken for the spend or the number of conversions. */
  it("recognises a Google Ads export, skipping its title lines", () => {
    const t = table(GOOGLE_TSV);
    const m = autoMap(t.headers);

    expect(t.headers[0]).toBe("Day");
    expect(m).toEqual({ date: 0, spend: 2, impressions: 3, reach: null, clicks: 4, leads: 5, revenue: 6 });
  });

  it("recognises Ukrainian headers", () => {
    const m = autoMap(["Дата", "Витрачена сума (UAH)", "Покази", "Охоплення", "Кліки (усі)", "Результати"]);

    expect(m).toMatchObject({ date: 0, spend: 1, impressions: 2, reach: 3, clicks: 4, leads: 5 });
  });

  it("never gives one column to two fields", () => {
    const m = autoMap(["Date", "Clicks", "Impressions", "Cost"]);
    const used = Object.values(m).filter((index) => index !== null);

    expect(new Set(used).size).toBe(used.length);
  });

  it("leaves a field unmapped rather than guessing a ratio column", () => {
    const m = autoMap(["Day", "Cost per result", "CPC", "Impressions"]);

    expect(m.spend).toBeNull();
  });

  it("finds a multi-campaign column and its values", () => {
    const t = table(META);
    const col = findCampaignColumn(t.headers);

    expect(col).toBe(1);
    expect(distinctValues(t, col!).sort()).toEqual(["Весна", "Осінь"]);
  });
});

describe("buildStatRows", () => {
  it("builds one row per date from a Meta export, filtered to the chosen campaign", () => {
    const result = buildStatRows(table(META), options(META, { campaignColumn: 1, campaignValue: "Осінь" }));

    expect(result.rows).toEqual([
      { statDate: "2026-11-05", spend: 1234.5, impressions: 12000, reach: 9000, clicks: 240, leads: 12, revenue: null },
      { statDate: "2026-11-06", spend: 980, impressions: 9000, reach: 7000, clicks: 180, leads: 9, revenue: null },
    ]);
    expect(result.problems).toEqual([]);
  });

  /** Without the filter, two campaigns' days would be added together — the wrong default. */
  it("sums the lines of one date (ad sets of a campaign)", () => {
    const result = buildStatRows(table(META), options(META));
    const nov6 = result.rows.find((row) => row.statDate === "2026-11-06")!;

    expect(nov6.spend).toBe(1080);
    expect(nov6.impressions).toBe(10000);
  });

  it("drops a Google 'Total' row without calling it a problem, and reads dashes as zero", () => {
    const result = buildStatRows(table(GOOGLE_TSV), options(GOOGLE_TSV));

    expect(result.skipped).toBe(1);
    expect(result.problems).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toMatchObject({ statDate: "2026-11-06", leads: 0, revenue: 0 });
    expect(result.rows[0]).toMatchObject({ statDate: "2026-11-05", impressions: 5000, leads: 15, revenue: 900 });
  });

  it("sends revenue as null when the file has no such column", () => {
    const result = buildStatRows(table(META), options(META));

    expect(result.rows.every((row) => row.revenue === null)).toBe(true);
  });

  it("reports clicks above impressions and leaves that day out", () => {
    const csv = "Day,Cost,Impressions,Clicks\n2026-11-05,10,100,500\n2026-11-06,10,100,5";
    const result = buildStatRows(table(csv), options(csv));

    expect(result.rows.map((row) => row.statDate)).toEqual(["2026-11-06"]);
    expect(result.problems).toEqual([{ line: 2, reason: "clicksOverImpressions", date: "2026-11-05" }]);
  });

  /** Importing the good lines of a day would store a total smaller than the real one. */
  it("leaves a whole date out when any of its lines is unreadable", () => {
    const csv = "Day,Cost,Impressions,Clicks\n2026-11-05,10,100,5\n2026-11-05,abc,100,5\n2026-11-06,10,100,5";
    const result = buildStatRows(table(csv), options(csv));

    expect(result.rows.map((row) => row.statDate)).toEqual(["2026-11-06"]);
    expect(result.problems[0]).toMatchObject({ reason: "number", date: "2026-11-05" });
  });

  it("refuses a negative figure", () => {
    const csv = "Day,Cost,Impressions,Clicks\n2026-11-05,-10,100,5";
    const result = buildStatRows(table(csv), options(csv));

    expect(result.rows).toEqual([]);
    expect(result.problems[0].reason).toBe("negative");
  });

  it("returns nothing without a date column", () => {
    const mapping: ColumnMapping = { date: null, spend: 2, impressions: 3, reach: null, clicks: 5, leads: 6, revenue: null };
    const result = buildStatRows(table(META), { ...options(META), mapping });

    expect(result.rows).toEqual([]);
  });

  it("flags more days than the server accepts", () => {
    const lines = ["Day,Cost,Impressions,Clicks"];
    for (let i = 0; i < MAX_IMPORT_ROWS + 1; i++) {
      const date = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10);
      lines.push(`${date},1,100,1`);
    }
    const csv = lines.join("\n");

    expect(buildStatRows(table(csv), options(csv)).tooMany).toBe(true);
  });
});
