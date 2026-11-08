import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { RichTextEditor } from "./RichTextEditor";

const LABEL = "Нотатка";

function renderEditor(value: string | null = null) {
  const onChange = vi.fn();
  const view = render(
    <LocaleProvider>
      <RichTextEditor value={value} onChange={onChange} ariaLabel={LABEL} />
    </LocaleProvider>,
  );
  return { onChange, view };
}

/** A controlled host, the way PostDrawer holds the note in its form state. */
function Controlled({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial);
  return (
    <LocaleProvider>
      <RichTextEditor value={value} onChange={setValue} ariaLabel={LABEL} />
      <output data-testid="value">{value ?? "—"}</output>
    </LocaleProvider>
  );
}

describe("RichTextEditor", () => {
  it("offers exactly the formatting the note supports, all off to begin with", () => {
    renderEditor();

    for (const name of [
      uk.richTextEditor.bold,
      uk.richTextEditor.italic,
      uk.richTextEditor.underline,
      uk.richTextEditor.bulletList,
      uk.richTextEditor.orderedList,
    ]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
    }
    // Nothing the server would strip back out — see PostNoteSanitizer.
    expect(screen.getByRole("toolbar", { name: uk.richTextEditor.toolbarLabel }).children).toHaveLength(6);
  });

  it("shows an existing note, formatting and emoji included", () => {
    renderEditor("<p><strong>Бриф</strong> від клієнтки 🔥</p><ul><li>без знижок</li></ul>");

    const surface = screen.getByRole("textbox", { name: LABEL });
    expect(surface).toHaveTextContent("Бриф");
    expect(surface).toHaveTextContent("🔥");
    expect(surface.querySelector("strong")).not.toBeNull();
    expect(surface.querySelectorAll("li")).toHaveLength(1);
  });

  it("reports the new markup when a list is applied", () => {
    render(<Controlled initial="<p>без знижок</p>" />);

    fireEvent.click(screen.getByRole("button", { name: uk.richTextEditor.bulletList }));

    expect(screen.getByTestId("value").textContent).toContain("<ul>");
    expect(screen.getByTestId("value").textContent).toContain("без знижок");
    expect(screen.getByRole("button", { name: uk.richTextEditor.bulletList })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("replaces its content when the field is handed a different note", () => {
    const { view } = renderEditor("<p>Перший бриф</p>");
    expect(screen.getByRole("textbox", { name: LABEL })).toHaveTextContent("Перший бриф");

    // The drawer reuses one editor across posts; a stale note in it would be
    // attached to the wrong publication on the next save.
    view.rerender(
      <LocaleProvider>
        <RichTextEditor value="<p>Другий бриф</p>" onChange={vi.fn()} ariaLabel={LABEL} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("textbox", { name: LABEL })).toHaveTextContent("Другий бриф");
    expect(screen.getByRole("textbox", { name: LABEL })).not.toHaveTextContent("Перший бриф");
  });

  /**
   * The guard on requirement #24a's central invariant: what the editor can
   * produce must be what `PostNoteSanitizer`'s allowlist keeps. Enabling an
   * extension the server strips (a heading, a link, a code block) is silent
   * data loss — the member formats, saves, and the formatting is gone with no
   * error. This test fails the moment the editor learns to make something the
   * Java allowlist does not list.
   *
   * Keep in step with `PostNoteSanitizer.POLICY`: p, br, strong, em, b, i, u,
   * ul, ol, li.
   */
  it("cannot produce any element the server's allowlist would strip", () => {
    renderEditor(
      "<h1>Заголовок</h1><a href=\"https://example.com\">лінк</a><code>код</code>" +
        "<blockquote>цитата</blockquote><pre>блок</pre><hr><s>закреслено</s>" +
        "<p><strong>жирний</strong> <em>курсив</em> <u>підкреслений</u></p>" +
        "<ul><li>маркер</li></ul><ol><li>номер</li></ol>",
    );

    const surface = screen.getByRole("textbox", { name: LABEL });
    for (const forbidden of ["h1", "h2", "a", "code", "pre", "blockquote", "hr", "s", "strike", "img"]) {
      expect(surface.querySelector(forbidden)).toBeNull();
    }
    // ...while everything the allowlist does permit survives.
    for (const kept of ["strong", "em", "u", "ul", "ol", "li"]) {
      expect(surface.querySelector(kept)).not.toBeNull();
    }
  });

  it("does not submit the form it sits in when a formatting button is clicked", () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <LocaleProvider>
        <form onSubmit={onSubmit}>
          <RichTextEditor value="<p>Бриф</p>" onChange={vi.fn()} ariaLabel={LABEL} />
        </form>
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: uk.richTextEditor.bold }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
