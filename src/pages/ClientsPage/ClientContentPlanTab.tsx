import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../../atoms/icons/icons";
import { useAuth } from "../../hooks/useAuth";
import { useToday } from "../../hooks/useToday";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { formatDayMonth, fromIsoDate, monthOf, monthTitle, shiftMonth, toIsoDate } from "../../utils/calendarDays";
import styles from "./ClientContentPlanTab.module.css";
import { useClientMonthPlan } from "./useClientMonthPlan";

/**
 * The client drawer's «Контент-план» tab: one whole month of this client's
 * plan, with ‹ › to walk to any other month. Read-only.
 *
 * <p>Read-only on purpose. The plan's writes — create, re-schedule, cycle
 * status, rate, delete — all live on the content-plan module, where the whole
 * board is on screen to schedule against; editing here would mean a
 * `PostDrawer` stacked on top of the client drawer.
 *
 * <p>It lists what is planned rather than drawing the module's day grid,
 * because the drawer is 440px of a desktop screen and a bottom sheet on a
 * phone. Days with nothing on them get no row: a month is mostly empty days,
 * and 31 of them is several screens of "нічого" in a panel this narrow.
 */
export function ClientContentPlanTab({ clientId }: { clientId: string }) {
  const { t } = useLocale();
  // The plan is the CONTENT section's data even though the drawer belongs to
  // Clients — a member with no grant there gets the same "no access" state the
  // Overview panels give (new-requirements.md #13), not a failing request.
  const canViewContent = useAuth().canView("CONTENT");

  if (!canViewContent) {
    return (
      <div className={styles.tab}>
        <div className={styles.empty}>{t.clientContentPlanTab.noAccess}</div>
      </div>
    );
  }

  return <MonthPlan clientId={clientId} />;
}

/**
 * Split from the gate above so the hook is never called for a member who may
 * not read the section — an early `return` before a `useQuery` would be a
 * conditional hook.
 */
function MonthPlan({ clientId }: { clientId: string }) {
  const { t, locale } = useLocale();
  const today = useToday();
  const [month, setMonth] = useState(() => monthOf(today));
  const { posts, isLoading, isFetching, isError, refetch } = useClientMonthPlan(clientId, month);

  const todayIso = toIsoDate(today);

  return (
    <div className={styles.tab}>
      {/* Outside everything below on purpose: these two buttons are the only
          way off a month that is empty, or failed, or still loading. The
          content-plan module learned the same about its toolbar — a state that
          replaces its own navigation traps whoever reached it. */}
      <div className={styles.monthNav}>
        <button
          type="button"
          className={styles.monthBtn}
          aria-label={t.clientContentPlanTab.previousMonth}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeftIcon width={13} height={13} />
        </button>
        <span className={styles.monthLabel}>{monthTitle(month, locale)}</span>
        <button
          type="button"
          className={styles.monthBtn}
          aria-label={t.clientContentPlanTab.nextMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRightIcon width={13} height={13} />
        </button>
      </div>

      {/* Dims on a background revalidation rather than blanking. A *month
          change* is a different thing and shows the loading line: retaining
          the old month's rows would put them under the new month's title —
          see `useClientMonthPlan`. */}
      <div className={isFetching ? `${styles.viewport} ${styles.busy}` : styles.viewport} aria-busy={isFetching}>
        {isLoading ? (
          <div className={styles.empty}>{t.clientContentPlanTab.loading}</div>
        ) : isError ? (
          <div className={styles.empty}>
            <p>{t.clientContentPlanTab.loadError}</p>
            <button type="button" className={styles.retry} onClick={refetch}>
              {t.clientContentPlanTab.retry}
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>{t.clientContentPlanTab.empty}</div>
        ) : (
          <ul className={styles.list}>
            {posts.map((post) => (
              <li key={post.id} className={styles.row}>
                <div className={styles.date}>
                  <span className={styles.day}>{formatDayMonth(post.scheduledDate, t.calendar.monthsShort)}</span>
                  <span className={styles.weekday}>
                    {post.scheduledDate === todayIso
                      ? t.clientContentPlanTab.todaySuffix
                      : t.calendar.weekdaysShort[fromIsoDate(post.scheduledDate).getDay()]}
                  </span>
                </div>
                <div className={styles.text}>
                  <div className={styles.title}>{post.title}</div>
                  {/* Who wrote it, next to what it is. `authorName` is null on
                      posts that predate the column (#21) and renders as nothing
                      here, the way the board card treats it — an em dash is for
                      the list view's table, where a cell has to hold its
                      column. */}
                  <div className={styles.meta}>
                    {[
                      t.postType[post.type],
                      post.authorName && interpolate(t.clientContentPlanTab.authorTemplate, { name: post.authorName }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                {/* Not a button: everything in this tab is read-only, and a chip
                    that looks like the board's clickable one would say otherwise. */}
                <span className={`${styles.statusChip} ${styles[post.status.toLowerCase()]}`}>
                  {t.postStatusShort[post.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
