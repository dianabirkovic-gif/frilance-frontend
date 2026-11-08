import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import type { Post } from "../../api/contentPlan";
import { interpolate } from "../../i18n/interpolate";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PostDrawer } from "./PostDrawer";

const clients = [
  { id: "client-1", name: "MUSE'23", archived: false },
  { id: "client-2", name: "Brookside", archived: false },
];

/** #23: a client whose cooperation is finished takes no new posts. */
const completedClient = { id: "client-3", name: "Kavamova", archived: true };

const existingPost: Post = {
  id: "post-1",
  clientId: "client-2",
  clientName: "Brookside",
  type: "CAROUSEL",
  title: "Кейс клієнта",
  scheduledDate: "2026-08-20",
  status: "REVIEW",
  rating: null,
  authorId: "author-1",
  authorName: "Оксана Коваль",
    note: null,
};

function renderDrawer(props: Partial<Parameters<typeof PostDrawer>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <LocaleProvider>
      <PostDrawer
        open
        post={null}
        clients={clients}
        defaultClientId={null}
        defaultDate="2026-08-13"
        isSubmitting={false}
        onSubmit={onSubmit}
        onClose={vi.fn()}
        {...props}
      />
    </LocaleProvider>,
  );
  return { onSubmit, view };
}

describe("PostDrawer", () => {
  it("creates a post on the clicked day, defaulting to the first client and DRAFT", () => {
    const { onSubmit } = renderDrawer();

    fireEvent.change(screen.getByLabelText(uk.postDrawer.fields.title), { target: { value: "  Reels про догляд  " } });
    fireEvent.click(screen.getByRole("button", { name: uk.postDrawer.submitIdle }));

    expect(onSubmit).toHaveBeenCalledWith({
      clientId: "client-1",
      type: "REELS",
      title: "Reels про догляд",
      scheduledDate: "2026-08-13",
      status: "DRAFT",
      note: null,
    });
  });

  it("pre-selects the client the page is filtered to", () => {
    renderDrawer({ defaultClientId: "client-2" });

    expect(screen.getByLabelText(uk.postDrawer.fields.client)).toHaveValue("client-2");
  });

  it("loads an existing post's values when editing and submits the edited ones", () => {
    const { onSubmit } = renderDrawer({ post: existingPost });

    expect(screen.getByText(uk.postDrawer.editTitle)).toBeInTheDocument();
    expect(screen.getByLabelText(uk.postDrawer.fields.title)).toHaveValue("Кейс клієнта");
    expect(screen.getByLabelText(uk.postDrawer.fields.date)).toHaveValue("2026-08-20");
    expect(screen.getByRole("button", { name: uk.postStatusShort.REVIEW })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: uk.postStatusShort.PUBLISHED }));
    fireEvent.click(screen.getByRole("button", { name: uk.postDrawer.submitIdle }));

    expect(onSubmit).toHaveBeenCalledWith({
      clientId: "client-2",
      type: "CAROUSEL",
      title: "Кейс клієнта",
      scheduledDate: "2026-08-20",
      status: "PUBLISHED",
      note: existingPost.note,
    });
  });

  it("names the author of the post being edited, without offering to change it", () => {
    renderDrawer({ post: existingPost });

    expect(screen.getByText(uk.postDrawer.authorLabel)).toBeInTheDocument();
    expect(screen.getByText("Оксана Коваль")).toBeInTheDocument();
    // Authorship is stamped server-side; there is no control for it.
    expect(screen.queryByLabelText(uk.postDrawer.authorLabel)).not.toBeInTheDocument();
  });

  it("falls back to an unknown author on a post that predates authorship", () => {
    renderDrawer({ post: { ...existingPost, authorId: null, authorName: null } });

    expect(screen.getByText(uk.postDrawer.unknownAuthor)).toBeInTheDocument();
  });

  it("says nothing about an author on a post that does not exist yet", () => {
    renderDrawer();

    expect(screen.queryByText(uk.postDrawer.authorLabel)).not.toBeInTheDocument();
  });

  it("shows an error instead of closing when saving fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    render(
      <LocaleProvider>
        <PostDrawer
          open
          post={null}
          clients={clients}
          defaultClientId={null}
          defaultDate="2026-08-13"
          isSubmitting={false}
          onSubmit={onSubmit}
          onClose={vi.fn()}
        />
      </LocaleProvider>,
    );

    fireEvent.change(screen.getByLabelText(uk.postDrawer.fields.title), { target: { value: "Reels" } });
    fireEvent.click(screen.getByRole("button", { name: uk.postDrawer.submitIdle }));

    expect(await screen.findByText(uk.postDrawer.genericError)).toBeInTheDocument();
  });

  it("disables submit while the save is in flight", () => {
    renderDrawer({ isSubmitting: true });

    expect(screen.getByRole("button", { name: uk.postDrawer.submitLoading })).toBeDisabled();
  });

  // #24: the note is part of the post form, written when the post is created
  // and edited afterwards through the same submit.
  it("starts a new post with an empty note", () => {
    renderDrawer();

    expect(screen.getByRole("textbox", { name: uk.postDrawer.fields.note })).toHaveTextContent("");
    expect(screen.getByRole("toolbar", { name: uk.richTextEditor.toolbarLabel })).toBeInTheDocument();
  });

  it("loads an existing note and submits the edited markup", () => {
    const { onSubmit } = renderDrawer({ post: { ...existingPost, note: "<p>Бриф від клієнтки 🔥</p>" } });

    const note = screen.getByRole("textbox", { name: uk.postDrawer.fields.note });
    expect(note).toHaveTextContent("Бриф від клієнтки");
    expect(note).toHaveTextContent("🔥");

    fireEvent.click(screen.getByRole("button", { name: uk.richTextEditor.bulletList }));
    fireEvent.click(screen.getByRole("button", { name: uk.postDrawer.submitIdle }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ note: expect.stringContaining("<ul>") }),
    );
  });

  it("carries a post's note away with it when the drawer is reused for another", () => {
    const { view } = renderDrawer({ post: { ...existingPost, note: "<p>Бриф першого</p>" } });

    view.rerender(
      <LocaleProvider>
        <PostDrawer
          open
          post={{ ...existingPost, id: "post-2", note: null }}
          clients={clients}
          defaultClientId={null}
          defaultDate="2026-08-13"
          isSubmitting={false}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("textbox", { name: uk.postDrawer.fields.note })).not.toHaveTextContent(
      "Бриф першого",
    );
  });

  /**
   * Regression: the reset effect used to depend on the `clients` array, so any
   * change to the team's client list — a teammate adding one, a refetch on
   * window focus — re-initialised the form under the member and threw away
   * whatever they had written, note included.
   */
  it("keeps what the member has written when the client list changes underneath them", () => {
    const { view } = renderDrawer();

    fireEvent.change(screen.getByLabelText(uk.postDrawer.fields.title), { target: { value: "ПІВГОДИНИ РОБОТИ" } });

    view.rerender(
      <LocaleProvider>
        <PostDrawer
          open
          post={null}
          clients={[...clients, { id: "client-9", name: "Новий клієнт", archived: false }]}
          defaultClientId={null}
          defaultDate="2026-08-13"
          isSubmitting={false}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByLabelText(uk.postDrawer.fields.title)).toHaveValue("ПІВГОДИНИ РОБОТИ");
    // ...and the client they had already picked is not re-picked for them.
    expect(screen.getByLabelText(uk.postDrawer.fields.client)).toHaveValue("client-1");
  });

  it("still fills in a default client when the plan's rows arrive after the drawer", () => {
    const { view } = renderDrawer({ clients: [] });
    expect(screen.getByLabelText(uk.postDrawer.fields.client)).toHaveValue("");

    view.rerender(
      <LocaleProvider>
        <PostDrawer
          open
          post={null}
          clients={clients}
          defaultClientId={null}
          defaultDate="2026-08-13"
          isSubmitting={false}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByLabelText(uk.postDrawer.fields.client)).toHaveValue("client-1");
  });

  it("says why a save failed in the user's language, not the backend's", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(400, "Cannot plan a post for a completed client",
      "CLIENT_COMPLETED", []));
    renderDrawer({ onSubmit });

    fireEvent.change(screen.getByLabelText(uk.postDrawer.fields.title), { target: { value: "Reels" } });
    fireEvent.click(screen.getByRole("button", { name: uk.postDrawer.submitIdle }));

    expect(await screen.findByText(uk.apiError.clientCompleted)).toBeInTheDocument();
    expect(screen.queryByText(/Cannot plan a post/)).not.toBeInTheDocument();
  });

  it("prefers the backend's field-level detail over its bare \"Validation failed\"", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(400, "Validation failed", null,
      ["note: розмір має бути між 0 та 20000"]));
    renderDrawer({ onSubmit });

    fireEvent.change(screen.getByLabelText(uk.postDrawer.fields.title), { target: { value: "Reels" } });
    fireEvent.click(screen.getByRole("button", { name: uk.postDrawer.submitIdle }));

    expect(await screen.findByText("note: розмір має бути між 0 та 20000")).toBeInTheDocument();
    expect(screen.queryByText("Validation failed")).not.toBeInTheDocument();
  });

  it("cannot submit with no client to plan for", () => {
    renderDrawer({ clients: [] });

    expect(screen.getByText(uk.postDrawer.noClients)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: uk.postDrawer.submitIdle })).toBeDisabled();
  });

  // #23: a completed client takes no new posts, so it is not in the picker
  // while creating — and everything that follows from it being absent.
  it("leaves a completed client out of the picker while creating", () => {
    renderDrawer({ clients: [...clients, completedClient] });

    const picker = screen.getByLabelText(uk.postDrawer.fields.client);
    expect(within(picker).queryByRole("option", { name: completedClient.name })).not.toBeInTheDocument();
    expect(
      within(picker).queryByRole("option", {
        name: interpolate(uk.postDrawer.completedClientOptionTemplate, { name: completedClient.name }),
      }),
    ).not.toBeInTheDocument();
    expect(within(picker).getAllByRole("option")).toHaveLength(clients.length);
    expect(picker).toHaveValue("client-1");
  });

  it("says whose plan it dropped when the page was filtered to a completed client", () => {
    const { onSubmit } = renderDrawer({
      clients: [...clients, completedClient],
      defaultClientId: completedClient.id,
    });

    // The substitution is announced, not silent — a post must not land on
    // another client without the user being told which one they are on.
    expect(
      screen.getByText(interpolate(uk.postDrawer.completedClientNoticeTemplate, { name: completedClient.name })),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(uk.postDrawer.fields.client)).toHaveValue("client-1");

    fireEvent.change(screen.getByLabelText(uk.postDrawer.fields.title), { target: { value: "Reels" } });
    fireEvent.click(screen.getByRole("button", { name: uk.postDrawer.submitIdle }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ clientId: "client-1" }));
  });

  it("cannot submit when every client the member has is completed", () => {
    const { onSubmit } = renderDrawer({ clients: [completedClient], defaultClientId: completedClient.id });

    expect(screen.getByText(uk.postDrawer.noClients)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: uk.postDrawer.submitIdle })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("still edits a post that already sits on a completed client", () => {
    const { onSubmit } = renderDrawer({
      clients: [...clients, completedClient],
      post: { ...existingPost, clientId: completedClient.id, clientName: completedClient.name },
    });

    // Editing lists it, named as completed, so the form can show whose post
    // this is — the rule is about planning something new, not about touching
    // what is already there.
    expect(
      screen.getByRole("option", {
        name: interpolate(uk.postDrawer.completedClientOptionTemplate, { name: completedClient.name }),
      }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: uk.postDrawer.submitIdle }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: completedClient.id, title: "Кейс клієнта" }),
    );
  });
});
