import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { Post, PostStatus } from "../../api/contentPlan";
import type { Dictionary } from "../../i18n/dictionary";
import { fromIsoDate } from "../calendarDays";
import { htmlToPlainText } from "./htmlToPlainText";

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
};

const STATUS_COLOR: Record<PostStatus, string> = {
  DRAFT: "#6b675d",
  REVIEW: "#a8741a",
  READY: "#2f6f9f",
  PUBLISHED: "#3e6549",
};

export interface ContentPlanPdfInput {
  clientName: string;
  /** Inclusive `YYYY-MM-DD` bounds of the period the document covers. */
  from: string;
  to: string;
  posts: Post[];
  generatedAt: Date;
  t: Dictionary;
}

function formatLongDate(iso: string, t: Dictionary): string {
  const date = fromIsoDate(iso);
  return `${date.getDate()} ${t.calendar.monthsShort[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * The document handed to pdfmake. Pure — no DOM, no network — so the layout
 * decisions are testable without rendering a PDF.
 *
 * It is addressed to the *client*, which decides what is left out: no rating,
 * no author, no internal ids. What remains is what a client reads a plan for —
 * when, what kind of thing, what it is, and where it stands.
 */
export function buildContentPlanPdf({
  clientName,
  from,
  to,
  posts,
  generatedAt,
  t,
}: ContentPlanPdfInput): TDocumentDefinitions {
  const pdf = t.contentPlanExport.pdf;
  const sorted = [...posts].sort(
    (a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.title.localeCompare(b.title),
  );

  const head = [pdf.headers.date, pdf.headers.type, pdf.headers.publication, pdf.headers.status].map(
    (text): Content => ({ text, style: "th" }),
  );

  const rows = sorted.map((post): Content[] => {
    const date = fromIsoDate(post.scheduledDate);
    const note = htmlToPlainText(post.note);
    return [
      {
        stack: [
          { text: formatLongDate(post.scheduledDate, t).replace(/ \d{4}$/, ""), bold: true },
          { text: t.calendar.weekdaysLong[date.getDay()], fontSize: 8, color: COLOR.muted },
        ],
      },
      { text: t.postType[post.type] },
      {
        stack: [
          { text: post.title, bold: true },
          ...(note ? [{ text: note, fontSize: 9, color: COLOR.muted, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
        ],
      },
      { text: t.postStatus[post.status], color: STATUS_COLOR[post.status], bold: true, fontSize: 9 },
    ];
  });

  return {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 54],
    info: { title: `${pdf.title} — ${clientName}`, author: "Frilance OS" },
    defaultStyle: { font: "Roboto", fontSize: 10, color: COLOR.ink, lineHeight: 1.15 },
    styles: {
      th: { bold: true, fontSize: 9, color: COLOR.brand },
    },
    content: [
      { text: pdf.title.toUpperCase(), fontSize: 9, bold: true, color: COLOR.brand, characterSpacing: 1.5 },
      { text: clientName, fontSize: 22, bold: true, margin: [0, 4, 0, 2] },
      {
        text: `${pdf.periodLabel}: ${formatLongDate(from, t)} — ${formatLongDate(to, t)}`,
        color: COLOR.muted,
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: COLOR.brand }],
        margin: [0, 10, 0, 12],
      },
      {
        text: pdf.summaryTemplate.replace("{count}", String(sorted.length)),
        fontSize: 9,
        color: COLOR.muted,
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: [64, 56, "*", 84],
          body: [head, ...rows],
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 || i === node.table.body.length ? 0 : i === 1 ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => COLOR.line,
          fillColor: (rowIndex: number) => (rowIndex === 0 ? COLOR.headFill : rowIndex % 2 === 0 ? COLOR.zebra : null),
          paddingTop: () => 6,
          paddingBottom: () => 6,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
      },
    ],
    footer: (currentPage: number, pageCount: number): Content => ({
      columns: [
        {
          text: pdf.generatedTemplate.replace("{date}", formatLongDate(toLocalIso(generatedAt), t)),
          fontSize: 8,
          color: COLOR.muted,
        },
        { text: `${currentPage} / ${pageCount}`, alignment: "right", fontSize: 8, color: COLOR.muted },
      ],
      margin: [40, 18, 40, 0],
    }),
  };
}

function toLocalIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `kontent-plan-muse23-2026-11-01_2026-11-30.pdf` — safe in any file system, readable in a mail attachment. */
export function contentPlanPdfFilename(clientName: string, from: string, to: string): string {
  const slug = clientName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9а-яіїєґ]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `content-plan-${slug || "client"}-${from}_${to}.pdf`;
}
