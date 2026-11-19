import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { Analytics, Metrics } from "../../api/targetAds";
import type { Dictionary } from "../../i18n/dictionary";
import { interpolate } from "../../i18n/interpolate";
import { NO_FIGURE, formatCount, formatDecimal, formatPercent, formatRoas } from "../adMetrics";
import { fromIsoDate, toIsoDate } from "../calendarDays";

/**
 * Colours are literals here, not `var(--…)`: a PDF has no stylesheet to resolve
 * them against. They are the design tokens' light-theme values — a printed page
 * is always white, whichever theme the app is in.
 */
const COLOR = {
  brand: "#3e6549",
  ink: "#17140f",
  muted: "#6b675d",
  line: "#d9d5c8",
  zebra: "#f6f4ee",
  headFill: "#eef2ee",
  good: "#3e6549",
};

export interface AdReportInput {
  clientName: string;
  analytics: Analytics;
  generatedAt: Date;
  t: Dictionary;
}

/**
 * Money in this document is a number and the currency as a word («1 229 грн»),
 * never the ₴ sign: the font embedded in the PDF has no glyph for it, and a
 * missing glyph prints as a box and corrupts the text that follows.
 */
function money(amount: number, t: Dictionary): string {
  return `${formatCount(amount)} ${t.adReport.pdf.currency}`;
}

/** A per-unit price (CPL, CPC, CPM) keeps its kopiykas; "no figure" stays a bare dash. */
function unitMoney(amount: number | null, t: Dictionary): string {
  return amount === null ? NO_FIGURE : `${formatDecimal(amount)} ${t.adReport.pdf.currency}`;
}

function formatLongDate(iso: string, t: Dictionary): string {
  const date = fromIsoDate(iso);
  return `${date.getDate()} ${t.calendar.monthsShort[date.getMonth()]} ${date.getFullYear()}`;
}

/** Whether the period has anything to report. An empty document is never worth sending. */
export function hasAdReportData(analytics: Analytics): boolean {
  return analytics.byCampaign.length > 0;
}

/**
 * The plain-language findings printed above the tables: what was spent and got,
 * which campaign was cheapest and dearest per lead, and the best day. Each is
 * stated only when the data supports it — a "best" campaign among one, or a
 * "best day" with no leads, would be an invented finding.
 */
export function buildInsights(analytics: Analytics, t: Dictionary): string[] {
  const text = t.adReport.pdf.insights;
  const { totals } = analytics;
  const lines: string[] = [];

  lines.push(
    totals.leads > 0
      ? interpolate(text.summaryTemplate, {
          spend: money(totals.spend, t),
          leads: formatCount(totals.leads),
          cpl: unitMoney(totals.cpl, t),
        })
      : interpolate(text.summaryNoLeadsTemplate, { spend: money(totals.spend, t) }),
  );

  if (totals.roas !== null) {
    lines.push(interpolate(text.roasTemplate, { revenue: money(totals.revenue, t), roas: formatRoas(totals.roas) }));
  }

  const withCpl = analytics.byCampaign.filter((row) => row.metrics.cpl !== null);
  if (withCpl.length >= 2) {
    const sorted = [...withCpl].sort((a, b) => a.metrics.cpl! - b.metrics.cpl!);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    // Equal prices have no best and worst.
    if (best.metrics.cpl !== worst.metrics.cpl) {
      lines.push(
        interpolate(text.bestCampaignTemplate, {
          best: best.name,
          bestCpl: unitMoney(best.metrics.cpl, t),
          worst: worst.name,
          worstCpl: unitMoney(worst.metrics.cpl, t),
        }),
      );
    }
  }

  const bestDay = analytics.daily.reduce<Analytics["daily"][number] | null>(
    (top, day) => (day.metrics.leads > (top?.metrics.leads ?? 0) ? day : top),
    null,
  );
  if (bestDay) {
    lines.push(
      interpolate(text.bestDayTemplate, {
        date: formatLongDate(bestDay.date, t),
        leads: formatCount(bestDay.metrics.leads),
      }),
    );
  }

  return lines;
}

function tile(label: string, value: string): Content {
  return {
    stack: [
      { text: label.toUpperCase(), fontSize: 7.5, bold: true, color: COLOR.muted, characterSpacing: 0.6 },
      { text: value, fontSize: 14, bold: true, margin: [0, 2, 0, 0] },
    ],
  };
}

/** Four tiles to a row, padded so the last row's table has equal cells. */
function totalsGrid(m: Metrics, t: Dictionary): Content {
  const tiles: Content[] = [
    tile(t.metrics.spend, money(m.spend, t)),
    tile(t.metrics.impressions, formatCount(m.impressions)),
    tile(t.metrics.clicks, formatCount(m.clicks)),
    tile(t.metrics.leads, formatCount(m.leads)),
    tile(t.metrics.ctr, formatPercent(m.ctr)),
    tile(t.metrics.cpc, unitMoney(m.cpc, t)),
    tile(t.metrics.cpl, unitMoney(m.cpl, t)),
    tile(t.metrics.cpm, unitMoney(m.cpm, t)),
  ];
  if (m.roas !== null) tiles.push(tile(t.metrics.roas, formatRoas(m.roas)));
  while (tiles.length % 4 !== 0) tiles.push({ text: "" });

  const body: Content[][] = [];
  for (let i = 0; i < tiles.length; i += 4) body.push(tiles.slice(i, i + 4));

  return {
    table: { widths: ["*", "*", "*", "*"], body },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => COLOR.line,
      paddingTop: () => 8,
      paddingBottom: () => 8,
      paddingLeft: () => 0,
      paddingRight: () => 8,
    },
  };
}

function section(title: string): Content {
  return { text: title, fontSize: 12, bold: true, color: COLOR.brand, margin: [0, 16, 0, 6] };
}

const TABLE_LAYOUT = {
  hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
    i === 0 || i === node.table.body.length ? 0 : i === 1 ? 1 : 0.5,
  vLineWidth: () => 0,
  hLineColor: () => COLOR.line,
  fillColor: (rowIndex: number) => (rowIndex === 0 ? COLOR.headFill : rowIndex % 2 === 0 ? COLOR.zebra : null),
  paddingTop: () => 5,
  paddingBottom: () => 5,
  paddingLeft: () => 6,
  paddingRight: () => 6,
};

function th(text: string, alignRight = false): Content {
  return { text, bold: true, fontSize: 8, color: COLOR.brand, alignment: alignRight ? "right" : "left" };
}

function num(text: string): Content {
  return { text, alignment: "right", fontSize: 9 };
}

/**
 * The document handed to pdfmake. Pure — no DOM, no network — so what it says
 * is testable without rendering a PDF.
 *
 * It is addressed to the *client*, which decides what is left out: no author,
 * no internal ids, nothing about creatives. What remains is what a client reads
 * an ad report for — what was spent, what it produced, and what worked best.
 * Every figure is the server's (ratios come from sums there), only formatted
 * here.
 */
export function buildAdReportPdf({ clientName, analytics, generatedAt, t }: AdReportInput): TDocumentDefinitions {
  const pdf = t.adReport.pdf;
  const insights = buildInsights(analytics, t);

  const campaignRows = analytics.byCampaign.map((row): Content[] => [
    { text: row.name, bold: true, fontSize: 9 },
    { text: t.campaignPlatform[row.platform], fontSize: 9 },
    num(money(row.metrics.spend, t)),
    num(formatCount(row.metrics.leads)),
    num(unitMoney(row.metrics.cpl, t)),
    num(formatPercent(row.metrics.ctr)),
    num(unitMoney(row.metrics.cpc, t)),
  ]);

  const platformRows = analytics.byPlatform.map((row): Content[] => [
    { text: t.campaignPlatform[row.platform], bold: true, fontSize: 9 },
    num(money(row.metrics.spend, t)),
    num(formatCount(row.metrics.leads)),
    num(unitMoney(row.metrics.cpl, t)),
    num(formatPercent(row.metrics.ctr)),
    num(unitMoney(row.metrics.cpc, t)),
  ]);

  const dailyRows = analytics.daily.map((day): Content[] => [
    { text: formatLongDate(day.date, t), fontSize: 9 },
    num(money(day.metrics.spend, t)),
    num(formatCount(day.metrics.impressions)),
    num(formatCount(day.metrics.clicks)),
    num(formatCount(day.metrics.leads)),
    num(unitMoney(day.metrics.cpl, t)),
  ]);

  return {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 54],
    info: { title: `${pdf.title} — ${clientName}`, author: "Frilance OS" },
    defaultStyle: { font: "Roboto", fontSize: 10, color: COLOR.ink, lineHeight: 1.15 },
    content: [
      { text: pdf.title.toUpperCase(), fontSize: 9, bold: true, color: COLOR.brand, characterSpacing: 1.5 },
      { text: clientName, fontSize: 22, bold: true, margin: [0, 4, 0, 2] },
      {
        text: `${pdf.periodLabel}: ${formatLongDate(analytics.from, t)} — ${formatLongDate(analytics.to, t)}`,
        color: COLOR.muted,
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: COLOR.brand }],
        margin: [0, 10, 0, 4],
      },

      section(pdf.sections.totals),
      totalsGrid(analytics.totals, t),
      { text: pdf.insights.reachNote, fontSize: 8, color: COLOR.muted, margin: [0, 6, 0, 0] },

      section(pdf.sections.insights),
      { ul: insights, fontSize: 10, lineHeight: 1.3 },

      section(pdf.sections.campaigns),
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ["*", 76, 50, 34, 48, 40, 44],
          body: [
            [
              th(pdf.headers.campaign),
              th(pdf.headers.platform),
              th(t.metrics.spend, true),
              th(t.metrics.leads, true),
              th(t.metrics.cpl, true),
              th(t.metrics.ctr, true),
              th(t.metrics.cpc, true),
            ],
            ...campaignRows,
          ],
        },
        layout: TABLE_LAYOUT,
      },

      section(pdf.sections.platforms),
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ["*", 56, 40, 52, 46, 50],
          body: [
            [
              th(pdf.headers.platform),
              th(t.metrics.spend, true),
              th(t.metrics.leads, true),
              th(t.metrics.cpl, true),
              th(t.metrics.ctr, true),
              th(t.metrics.cpc, true),
            ],
            ...platformRows,
          ],
        },
        layout: TABLE_LAYOUT,
      },

      section(pdf.sections.daily),
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ["*", 56, 64, 44, 40, 52],
          body: [
            [
              th(pdf.headers.date),
              th(t.metrics.spend, true),
              th(t.metrics.impressions, true),
              th(t.metrics.clicks, true),
              th(t.metrics.leads, true),
              th(t.metrics.cpl, true),
            ],
            ...dailyRows,
          ],
        },
        layout: TABLE_LAYOUT,
      },
    ],
    footer: (currentPage: number, pageCount: number): Content => ({
      columns: [
        {
          text: pdf.generatedTemplate.replace("{date}", formatLongDate(toIsoDate(generatedAt), t)),
          fontSize: 8,
          color: COLOR.muted,
        },
        { text: `${currentPage} / ${pageCount}`, alignment: "right", fontSize: 8, color: COLOR.muted },
      ],
      margin: [40, 18, 40, 0],
    }),
  };
}

/** `ad-report-muse23-2026-10-12_2026-11-10.pdf` — safe in any file system, readable in a mail attachment. */
export function adReportPdfFilename(clientName: string, from: string, to: string): string {
  const slug = clientName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9а-яіїєґ]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `ad-report-${slug || "client"}-${from}_${to}.pdf`;
}
