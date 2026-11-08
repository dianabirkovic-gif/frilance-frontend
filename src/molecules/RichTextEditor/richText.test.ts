import { describe, expect, it } from "vitest";
import { isBlankNote } from "./richText";

/**
 * These cases mirror `PostNoteSanitizerTest.treatsAnEmptyEditorAsNoNoteAtAll`
 * on the backend one for one. If a change makes one file's expectations move,
 * the other must move with it — that is the whole point of the pair.
 */
describe("isBlankNote", () => {
  it("treats an empty editor, in all the shapes it takes, as no note", () => {
    expect(isBlankNote(null)).toBe(true);
    expect(isBlankNote("")).toBe(true);
    expect(isBlankNote("<p></p>")).toBe(true);
    expect(isBlankNote("<p>   </p>")).toBe(true);
    expect(isBlankNote("<p>&nbsp;</p>")).toBe(true);
    expect(isBlankNote("<p> </p>")).toBe(true);
    // A lone Shift+Enter. TipTap's own `isEmpty` disagrees with the server here.
    expect(isBlankNote("<p><br></p>")).toBe(true);
    // An outline with nothing written in it yet.
    expect(isBlankNote("<ul><li><p></p></li></ul>")).toBe(true);
  });

  it("treats anything a reader would see as a note", () => {
    expect(isBlankNote("<p>Бриф</p>")).toBe(false);
    expect(isBlankNote("<ul><li><p>без знижок</p></li></ul>")).toBe(false);
    // One emoji is a note, whether it arrives as a character or as the
    // reference the server stores it as.
    expect(isBlankNote("<p>🔥</p>")).toBe(false);
    expect(isBlankNote("<p>&#x1f525;</p>")).toBe(false);
  });
});
