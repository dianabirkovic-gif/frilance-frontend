import { describe, expect, it } from "vitest";
import type { Post } from "../../api/contentPlan";
import { uk } from "../../i18n/locales/uk";
import { buildContentPlanPdf, contentPlanPdfFilename } from "./buildContentPlanPdf";
import { htmlToPlainText } from "./htmlToPlainText";

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: "p1",
    clientId: "c1",
    clientName: "MUSE'23",
    type: "REELS",
    title: "Reels про новинку",
    scheduledDate: "2026-11-05",
    status: "READY",
    rating: 3,
    authorId: "u1",
    authorName: "Оксана",
    note: "<p>Показати процес <strong>зйомки</strong></p>",
    ...overrides,
  };
}

function build(posts: Post[]) {
  return buildContentPlanPdf({
    clientName: "MUSE'23",
    from: "2026-11-01",
    to: "2026-11-30",
    posts,
    generatedAt: new Date(2026, 10, 9),
    t: uk,
  });
}

/** Every string the document will print, in one blob. */
function allText(value: unknown): string {
  return JSON.stringify(value);
}

describe("buildContentPlanPdf", () => {
  it("lays the plan out as a table sorted by date, header row first", () => {
    const doc = build([post({ id: "b", title: "Пізніше", scheduledDate: "2026-11-20" }), post()]);
    const table = (doc.content as { table?: { body: unknown[][]; headerRows: number } }[]).find((c) => c.table)!.table!;

    expect(table.headerRows).toBe(1);
    expect(table.body).toHaveLength(3); // header + 2 posts
    const text = allText(table.body);
    expect(text.indexOf("Reels про новинку")).toBeLessThan(text.indexOf("Пізніше"));
  });

  it("prints the client, the period and the post count", () => {
    const text = allText(build([post()]));

    expect(text).toContain("MUSE'23");
    expect(text).toContain("1 лис 2026");
    expect(text).toContain("30 лис 2026");
    expect(text).toContain("Публікацій у плані: 1");
  });

  /** A document for the client: nothing from the studio's own bookkeeping. */
  it("leaves out internal fields — rating and author", () => {
    const text = allText(build([post({ rating: 3, authorName: "Оксана Внутрішня" })]));

    expect(text).not.toContain("Оксана Внутрішня");
    expect(text).not.toContain('"rating"');
  });

  it("turns the rich-text note into plain text", () => {
    const text = allText(build([post()]));

    expect(text).toContain("Показати процес зйомки");
    expect(text).not.toContain("<strong>");
  });

  it("names the file after the client and the period", () => {
    expect(contentPlanPdfFilename("MUSE'23", "2026-11-01", "2026-11-30")).toBe(
      "content-plan-muse-23-2026-11-01_2026-11-30.pdf",
    );
  });
});

describe("htmlToPlainText", () => {
  it("keeps list items as bullets and drops markup", () => {
    expect(htmlToPlainText("<p>Ідеї:</p><ul><li>один</li><li>два</li></ul>")).toBe("Ідеї:\n• один\n• два");
  });

  it("never lets markup through as markup", () => {
    expect(htmlToPlainText('<p>ok</p><img src=x onerror="alert(1)">')).toBe("ok");
  });

  it("returns an empty string for no note", () => {
    expect(htmlToPlainText(null)).toBe("");
  });
});
