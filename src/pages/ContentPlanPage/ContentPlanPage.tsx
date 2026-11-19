import { useCallback, useMemo, useState } from "react";
import { nextPostStatus, POST_STATUS_ORDER, type Post, type UpdatePostPayload } from "../../api/contentPlan";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PlusIcon } from "../../atoms/icons/icons";
import { useAuth } from "../../hooks/useAuth";
import { useToday } from "../../hooks/useToday";
import type { ContentPlanView } from "../../i18n/dictionary";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { MonthRuler } from "../../molecules/MonthRuler/MonthRuler";
import { ConfirmationDialog } from "../../organisms/ConfirmationDialog/ConfirmationDialog";
import { ContentPlanBoard } from "../../organisms/ContentPlanBoard/ContentPlanBoard";
import { ContentPlanExportDialog } from "../../organisms/ContentPlanExportDialog/ContentPlanExportDialog";
import { ContentPlanCalendar } from "../../organisms/ContentPlanCalendar/ContentPlanCalendar";
import { PostDrawer } from "../../organisms/PostDrawer/PostDrawer";
import { usePageFab } from "../../templates/AppShell/PageFabContext";
import { usePageHeader } from "../../templates/AppShell/PageHeaderContext";
import {
  buildMonthDays,
  buildWeekDays,
  formatRangeLabel,
  monthOfIso,
  monthsInRange,
  monthTitle,
  toIsoDate,
} from "../../utils/calendarDays";
import styles from "./ContentPlanPage.module.css";
import {
  clampToMonth,
  daysInMonth,
  rangeContains,
  rangeFor,
  rulerMonth,
  stepAnchor,
  type PlanRange,
} from "./planRange";
import { useContentPlan } from "./useContentPlan";
import {
  useCreatePost,
  useDeletePost,
  useRatePost,
  useUpdatePost,
  useUpdatePostStatus,
} from "./usePostMutations";

const VIEWS: ContentPlanView[] = ["week", "month", "list"];

export function ContentPlanPage() {
  const { t, locale } = useLocale();
  // READ opens the plan but not its writes — the backend rejects them either
  // way (ContentPlanService), this just doesn't offer buttons that would 403.
  const canEdit = useAuth().canEdit("CONTENT");
  // Re-read when the day turns over, so a screen left open overnight stops
  // marking yesterday's column as today.
  const today = useToday();

  const [view, setView] = useState<ContentPlanView>("week");
  // One anchor for all three views: the week view shows the week around it,
  // the month and list views the month around it. Switching views therefore
  // keeps the user where they were instead of snapping back to today.
  const [anchor, setAnchor] = useState(() => toIsoDate(new Date()));
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [drawerDate, setDrawerDate] = useState(() => toIsoDate(new Date()));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [postPendingDeletion, setPostPendingDeletion] = useState<Post | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const month = monthOfIso(anchor);
  const range = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const months = useMemo(() => monthsInRange(range.from, range.to), [range]);

  const { posts, clients, isLoading, isFetching, isError, isPartialError, error, refetch } = useContentPlan(
    months,
    selectedClientId,
  );

  const days = useMemo(
    () =>
      view === "week"
        ? buildWeekDays(range.from, posts, today)
        : buildMonthDays(month, posts, today),
    [view, range.from, month, posts, today],
  );

  const visiblePosts = useMemo(() => days.flatMap((day) => day.posts), [days]);
  const publishedCount = visiblePosts.filter((post) => post.status === "PUBLISHED").length;

  usePageHeader({
    title: t.contentPlanPage.title,
    subtitle: isLoading
      ? ""
      : interpolate(t.contentPlanPage.subtitleTemplate, {
          total: visiblePosts.length,
          published: publishedCount,
        }),
  });

  const openCreateDrawer = useCallback((date: string) => {
    setEditingPost(null);
    setDrawerDate(date);
    setIsDrawerOpen(true);
  }, []);

  const todayIso = toIsoDate(today);
  const isTodayInRange = rangeContains(range, todayIso);

  // The FAB plans on today when today is in the range being viewed, and on its
  // first day otherwise — dropping the user into a date they aren't looking at
  // is how a post ends up silently scheduled in the wrong week.
  const openCreateForRange = useCallback(() => {
    openCreateDrawer(rangeContains(range, todayIso) ? todayIso : range.from);
  }, [range, todayIso, openCreateDrawer]);

  usePageFab(canEdit ? { label: t.contentPlanPage.newPostButton, onClick: openCreateForRange } : null);

  const openEditDrawer = useCallback((post: Post) => {
    setEditingPost(post);
    setIsDrawerOpen(true);
  }, []);

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const updateStatus = useUpdatePostStatus();
  const ratePost = useRatePost();
  const deletePost = useDeletePost();

  async function handleSubmitPost(payload: UpdatePostPayload) {
    if (editingPost) {
      await updatePost.mutateAsync({ id: editingPost.id, payload });
    } else {
      await createPost.mutateAsync(payload);
    }
    setIsDrawerOpen(false);
  }

  async function handleConfirmDeletion() {
    if (!postPendingDeletion) return;
    await deletePost.mutateAsync(postPendingDeletion.id);
    setPostPendingDeletion(null);
  }

  function step(direction: 1 | -1) {
    setAnchor(stepAnchor(view, anchor, direction));
  }

  const rangeTitle =
    view === "week" ? formatRangeLabel(range.from, range.to, t.calendar.monthsShort) : monthTitle(month, locale);

  const selectedClientName = clients.find((client) => client.id === selectedClientId)?.name;

  if (isLoading) {
    return <div className={styles.state}>{t.contentPlanPage.loading}</div>;
  }

  if (isError) {
    return (
      <div className={styles.state}>
        <p>
          {t.contentPlanPage.loadErrorPrefix}
          {error instanceof Error ? error.message : ""}
        </p>
        <button type="button" onClick={refetch} className={styles.retry}>
          {t.contentPlanPage.retry}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.rangeNav}>
          <button
            type="button"
            className={styles.rangeBtn}
            aria-label={t.contentPlanPage.previousPeriod}
            onClick={() => step(-1)}
          >
            <ChevronLeftIcon width={14} height={14} />
          </button>
          <span className={styles.rangeLabel}>{rangeTitle}</span>
          <button
            type="button"
            className={styles.rangeBtn}
            aria-label={t.contentPlanPage.nextPeriod}
            onClick={() => step(1)}
          >
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>

        <div className={styles.viewToggle}>
          {VIEWS.map((candidate) => (
            <button
              key={candidate}
              type="button"
              className={candidate === view ? styles.viewActive : undefined}
              aria-pressed={candidate === view}
              onClick={() => setView(candidate)}
            >
              {t.contentPlanPage.views[candidate]}
            </button>
          ))}
        </div>

        {/* Disabled rather than hidden when today is already on screen: a
            control that vanishes as you page back to the current week reads as
            a glitch, and one that stays live but does nothing reads as broken. */}
        <button
          type="button"
          className={styles.todayBtn}
          disabled={isTodayInRange}
          onClick={() => setAnchor(todayIso)}
        >
          {t.contentPlanPage.today}
        </button>

        <div className={styles.spacer} />

        <label className={styles.clientFilter}>
          <span className={styles.clientFilterText}>
            {interpolate(t.contentPlanPage.clientFilterLabelTemplate, {
              client: selectedClientName ?? t.contentPlanPage.allClients,
            })}
          </span>
          <ChevronDownIcon width={12} height={12} />
          <select
            value={selectedClientId ?? ""}
            onChange={(event) => setSelectedClientId(event.target.value || null)}
            aria-label={interpolate(t.contentPlanPage.clientFilterLabelTemplate, {
              client: selectedClientName ?? t.contentPlanPage.allClients,
            })}
          >
            <option value="">{t.contentPlanPage.allClients}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        {/* Open to anyone who can open the plan — READ included. Exporting
            writes nothing; it reads what the member is already allowed to see. */}
        <button type="button" className={styles.exportBtn} onClick={() => setIsExportOpen(true)}>
          <DownloadIcon width={14} height={14} />
          {t.contentPlanExport.button}
        </button>

        {canEdit && (
          <button type="button" className={styles.newPostBtn} onClick={openCreateForRange}>
            <PlusIcon width={15} height={15} />
            {t.contentPlanPage.newPostButton}
          </button>
        )}
      </div>

      {/* Only the week view shows a slice of the month — the other two already
          have the whole of it on screen, so the ruler would say nothing. */}
      {view === "week" && <WeekRuler range={range} />}

      {isPartialError && (
        <div className={styles.partialError} role="status">
          <span>{t.contentPlanPage.partialLoadError}</span>
          <button type="button" onClick={refetch} className={styles.partialRetry}>
            {t.contentPlanPage.retry}
          </button>
        </div>
      )}

      {/* The legend decodes the board's colour-coded cards. The list view names
          every status in its own column, so there it is redundant — and its
          chips are a different shape, which made the key read as a mismatch. */}
      {view !== "list" && (
        <div className={styles.legend} role="group" aria-label={t.contentPlanPage.legendLabel}>
          {POST_STATUS_ORDER.map((status) => (
            <span key={status} className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles[status.toLowerCase()]}`} />
              {t.postStatusShort[status]}
            </span>
          ))}
        </div>
      )}

      <div className={isFetching ? `${styles.viewport} ${styles.busy}` : styles.viewport} aria-busy={isFetching}>
      {view === "list" ? (
        <ContentPlanCalendar
          month={month}
          posts={posts}
          canEdit={canEdit}
          showClientName={selectedClientId === null}
          onAddPost={openCreateDrawer}
          onEditPost={openEditDrawer}
          onCycleStatus={(post) => updateStatus.mutate({ id: post.id, status: nextPostStatus(post.status) })}
          onRatePost={(post, rating) => ratePost.mutate({ id: post.id, rating })}
          onDeletePost={setPostPendingDeletion}
        />
      ) : (
        <ContentPlanBoard
          days={days}
          variant={view}
          canEdit={canEdit}
          showClientName={selectedClientId === null}
          onAddPost={openCreateDrawer}
          onEditPost={openEditDrawer}
          onCycleStatus={(post) => updateStatus.mutate({ id: post.id, status: nextPostStatus(post.status) })}
          onRatePost={(post, rating) => ratePost.mutate({ id: post.id, rating })}
          onDeletePost={setPostPendingDeletion}
        />
      )}
      </div>

      {canEdit && (
        <PostDrawer
          open={isDrawerOpen}
          post={editingPost}
          clients={clients}
          defaultClientId={selectedClientId}
          defaultDate={drawerDate}
          isSubmitting={createPost.isPending || updatePost.isPending}
          onSubmit={handleSubmitPost}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      <ContentPlanExportDialog
        open={isExportOpen}
        clients={clients}
        defaultClientId={selectedClientId}
        defaultFrom={range.from}
        defaultTo={range.to}
        onClose={() => setIsExportOpen(false)}
      />

      <ConfirmationDialog
        open={postPendingDeletion !== null}
        title={t.contentPlanPage.deleteConfirmTitle}
        message={interpolate(t.contentPlanPage.deleteConfirmMessageTemplate, {
          title: postPendingDeletion?.title ?? "",
        })}
        isConfirming={deletePost.isPending}
        onConfirm={handleConfirmDeletion}
        onCancel={() => setPostPendingDeletion(null)}
      />
    </div>
  );
}

/**
 * The ruler under the week view. It draws whichever month owns most of the
 * week (`rulerMonth`), so a week split across a boundary gets a highlight the
 * user can actually see rather than a sliver pinned to one edge.
 */
function WeekRuler({ range }: { range: PlanRange }) {
  const month = rulerMonth(range);
  const length = daysInMonth(month);
  return (
    <MonthRuler
      daysInMonth={length}
      highlightFrom={clampToMonth(range.from, month, 1)}
      highlightTo={clampToMonth(range.to, month, length)}
    />
  );
}
