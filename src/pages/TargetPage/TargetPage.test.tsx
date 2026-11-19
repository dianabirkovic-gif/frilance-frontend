import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTargetBoard,
  updateTargetTaskStatus,
  type TargetBoard,
  type TargetTask,
} from "../../api/target";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { uk } from "../../i18n/locales/uk";
import { PageFabProvider } from "../../templates/AppShell/PageFabContext";
import { PageHeaderProvider } from "../../templates/AppShell/PageHeaderContext";
import { TargetPage } from "./TargetPage";

vi.mock("../../api/target", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/target")>()),
  getTargetBoard: vi.fn(),
  updateTargetTaskStatus: vi.fn(),
}));

const canEdit = vi.fn(() => true);
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ canEdit, canView: () => true }),
}));

const getBoardMock = vi.mocked(getTargetBoard);
const updateStatusMock = vi.mocked(updateTargetTaskStatus);

function task(overrides: Partial<TargetTask> = {}): TargetTask {
  return {
    id: "t1",
    clientId: "c1",
    clientName: "MUSE'23",
    kind: "LAUNCH",
    title: "Запуск кампанії",
    description: null,
    dueDate: "2026-07-20",
    status: "TODO",
    overdue: false,
    authorId: null,
    authorName: "Власниця",
    createdAt: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

function board(tasks: TargetTask[]): TargetBoard {
  return {
    selectedClientId: null,
    clients: [{ id: "c1", name: "MUSE'23", archived: false }],
    totalTasks: tasks.length,
    doneTasks: tasks.filter((item) => item.status === "DONE").length,
    overdueTasks: tasks.filter((item) => item.overdue).length,
    tasks,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <PageHeaderProvider>
          <PageFabProvider>{children}</PageFabProvider>
        </PageHeaderProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
  return render(<TargetPage />, { wrapper });
}

beforeEach(() => {
  canEdit.mockReturnValue(true);
  getBoardMock.mockReset();
  updateStatusMock.mockReset();
});

describe("TargetPage", () => {
  it("puts each task in the column of its status", async () => {
    getBoardMock.mockResolvedValue(
      board([
        task({ id: "a", title: "Креативи для осені", status: "TODO" }),
        task({ id: "b", title: "Налаштувати аудиторії", status: "IN_PROGRESS" }),
        task({ id: "c", title: "Звіт за червень", status: "DONE" }),
      ]),
    );
    renderPage();

    const todo = await screen.findByRole("region", { name: uk.targetStatus.TODO });
    expect(within(todo).getByText("Креативи для осені")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: uk.targetStatus.IN_PROGRESS })).getByText("Налаштувати аудиторії"),
    ).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: uk.targetStatus.DONE })).getByText("Звіт за червень")).toBeInTheDocument();
  });

  it("flags an overdue task", async () => {
    getBoardMock.mockResolvedValue(board([task({ overdue: true })]));
    renderPage();

    expect(await screen.findByText(uk.targetPage.overdueBadge)).toBeInTheDocument();
  });

  it("moves a card to the next column in one click", async () => {
    getBoardMock.mockResolvedValue(board([task({ id: "a", status: "TODO" })]));
    updateStatusMock.mockResolvedValue(task({ id: "a", status: "IN_PROGRESS" }));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: `Перемістити: ${uk.targetStatus.IN_PROGRESS}` }));

    await waitFor(() => expect(updateStatusMock).toHaveBeenCalledWith("a", "IN_PROGRESS"));
  });

  it("offers no way forward from the last column", async () => {
    getBoardMock.mockResolvedValue(board([task({ status: "DONE" })]));
    renderPage();

    await screen.findByText("Запуск кампанії");
    expect(screen.queryByRole("button", { name: /Перемістити/ })).not.toBeInTheDocument();
  });

  /** READ opens the board; the backend would 403 the writes, so none are offered. */
  it("shows no write controls without edit access", async () => {
    canEdit.mockReturnValue(false);
    getBoardMock.mockResolvedValue(board([task()]));
    renderPage();

    await screen.findByText("Запуск кампанії");
    expect(screen.queryByRole("button", { name: uk.targetPage.newTaskButton })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.targetPage.edit })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: uk.targetPage.delete })).not.toBeInTheDocument();
  });

  it("says so when there are no tasks", async () => {
    getBoardMock.mockResolvedValue(board([]));
    renderPage();

    expect(await screen.findByText(uk.targetPage.emptyBoard)).toBeInTheDocument();
  });

  it("offers a retry when the board fails to load", async () => {
    getBoardMock.mockRejectedValue(new Error("boom"));
    renderPage();

    expect(await screen.findByRole("button", { name: uk.targetPage.retry })).toBeInTheDocument();
  });
});
