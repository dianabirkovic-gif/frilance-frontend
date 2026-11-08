/**
 * Whether a note holds nothing a reader would see.
 *
 * This is the client half of one rule with two implementations: its
 * counterpart is `PostNoteSanitizer.hasVisibleText` on the server, and they
 * must agree. The editor decides here whether to send a note at all, and the
 * server decides there whether to store what arrives — so a disagreement means
 * the form believes it holds a note the database will not keep, or drops one
 * the server would have accepted. Change one, change both.
 *
 * `editor.isEmpty` was what this replaced. It is TipTap's own notion, and it
 * differs from the server's in both directions: it calls `<p><br></p>` (a lone
 * Shift+Enter) non-empty, and an outline of empty bullets empty.
 */
export function isBlankNote(html: string | null): boolean {
  if (html === null) {
    return true;
  }
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    // Escaped, not pasted: a literal U+00A0 in source is invisible to the
    // next reader, and eslint rejects it outright.
    .replace(/\u00a0/g, " ");
  return text.trim().length === 0;
}
