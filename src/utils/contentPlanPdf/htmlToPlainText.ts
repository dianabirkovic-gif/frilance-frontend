/**
 * A post's note is sanitized HTML from the editor (`PostNoteSanitizer`) — fine
 * on screen, meaningless in a PDF table cell. This reduces it to plain text,
 * one line per block, keeping list items as "• item".
 *
 * `DOMParser` builds an inert document: nothing in it runs or loads, and only
 * `textContent` is ever read back, so markup never reaches the PDF as markup.
 */
export function htmlToPlainText(html: string | null): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines: string[] = [];

  doc.body.querySelectorAll("p, li, h1, h2, h3, h4, blockquote").forEach((element) => {
    // A <p> inside an <li> or <blockquote> would be read twice.
    if (element.tagName === "P" && element.parentElement?.closest("li, blockquote")) return;
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    lines.push(element.tagName === "LI" ? `• ${text}` : text);
  });

  if (lines.length === 0) {
    // Plain text with no block elements at all.
    const text = (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
    return text;
  }
  return lines.join("\n");
}
