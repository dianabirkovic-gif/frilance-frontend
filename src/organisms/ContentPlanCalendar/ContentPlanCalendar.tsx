import { useMemo } from "react";
import type { Post } from "../../api/contentPlan";
import { RatingStars } from "../../atoms/RatingStars/RatingStars";
import { TrashIcon } from "../../atoms/icons/icons";
import { useToday } from "../../hooks/useToday";
import { useLocale } from "../../i18n/useLocale";
import { Panel } from "../../molecules/Panel/Panel";
import { buildMonthDays, formatDayMonth, type CalendarDay } from "../../utils/calendarDays";
import styles from "./ContentPlanCalendar.module.css";

interface ContentPlanCalendarProps {
  /** `YYYY-MM`. */
  month: string;
  posts: Post[];
  /** False under a READ grant — the plan is visible, nothing in it is clickable. */
  canEdit: boolean;
  /** Whether to show which client each post belongs to (pointless when one is selected). */
  showClientName: boolean;
  onAddPost: (date: string) => void;
  onEditPost: (post: Post) => void;
  onCycleStatus: (post: Post) => void;
  onRatePost: (post: Post, rating: number | null) => void;
  onDeletePost: (post: Post) => void;
}

/**
 * FR-08's calendar: every day of the month in order, each with whatever is
 * scheduled on it, and an empty day as a row that plans one — the mockup's
 * "Клікни щоб додати пост".
 *
 * <p>One markup, two layouts: a real `<table>` at ≥900px and stacked day
 * cards below it, both `display`-toggled in CSS rather than branched in JS
 * (frontend CLAUDE.md "Responsive strategy"). Days with nothing planned are
 * hidden on mobile — 31 rows of "нічого" is most of a phone screen, and the
 * FAB is the mobile way to add a post.
 */
export function ContentPlanCalendar({
  month,
  posts,
  canEdit,
  showClientName,
  onAddPost,
  onEditPost,
  onCycleStatus,
  onRatePost,
  onDeletePost,
}: ContentPlanCalendarProps) {
  const { t } = useLocale();
  const today = useToday();
  const days = useMemo(() => buildMonthDays(month, posts, today), [month, posts, today]);

  const weekdayLabels = t.calendar.weekdaysShort;
  const dayLabel = (day: CalendarDay) => formatDayMonth(day.date, t.calendar.monthsShort);

  return (
    <>
      <Panel flush className={styles.panel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.dateCol}>{t.contentPlanCalendar.headers.date}</th>
              <th className={styles.dayCol}>{t.contentPlanCalendar.headers.day}</th>
              <th>{t.contentPlanCalendar.headers.type}</th>
              <th>{t.contentPlanCalendar.headers.topic}</th>
              <th className={styles.authorCol}>{t.contentPlanCalendar.headers.author}</th>
              <th>{t.contentPlanCalendar.headers.status}</th>
              <th className={styles.ratingCol}>{t.contentPlanCalendar.headers.rating}</th>
              <th className={styles.actionsCol} />
            </tr>
          </thead>
          <tbody>
            {days.map((day) =>
              day.posts.length === 0 ? (
                <tr key={day.date} className={rowClass(day, styles)}>
                  <td className={styles.dateCell}>{dayLabel(day)}</td>
                  <td className={styles.mutedCell}>{weekdayLabels[day.weekday]}</td>
                  <td colSpan={6} className={styles.emptyDayCell}>
                    {canEdit ? (
                      <button type="button" className={styles.addInline} onClick={() => onAddPost(day.date)}>
                        {t.contentPlanCalendar.addOnDay}
                      </button>
                    ) : (
                      <span className={styles.mutedCell}>—</span>
                    )}
                  </td>
                </tr>
              ) : (
                day.posts.map((post, index) => (
                  <tr key={post.id} className={rowClass(day, styles)}>
                    {index === 0 && (
                      <>
                        <td rowSpan={day.posts.length} className={styles.dateCell}>
                          {dayLabel(day)}
                        </td>
                        <td rowSpan={day.posts.length} className={styles.mutedCell}>
                          {weekdayLabels[day.weekday]}
                        </td>
                      </>
                    )}
                    <td>
                      <span className={styles.typeTag}>{t.postType[post.type]}</span>
                    </td>
                    <td>
                      <button type="button" className={styles.topicBtn} onClick={() => onEditPost(post)}>
                        {post.title}
                      </button>
                      {showClientName && <div className={styles.clientName}>{post.clientName}</div>}
                    </td>
                    <td className={styles.authorCell}>{post.authorName ?? "—"}</td>
                    <td>
                      <StatusChip post={post} canEdit={canEdit} onCycleStatus={onCycleStatus} />
                    </td>
                    <td>
                      {post.status === "PUBLISHED" ? (
                        <RatingStars
                          rating={post.rating}
                          canEdit={canEdit}
                          onRate={(rating) => onRatePost(post, rating)}
                        />
                      ) : (
                        <span className={styles.mutedCell}>—</span>
                      )}
                    </td>
                    <td className={styles.actionsCell}>
                      {canEdit && (
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          aria-label={t.contentPlanCalendar.deleteAriaLabel}
                          onClick={() => onDeletePost(post)}
                        >
                          <TrashIcon width={14} height={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ),
            )}
          </tbody>
        </table>
      </Panel>

      <ul className={styles.cardList}>
        {days
          .filter((day) => day.posts.length > 0)
          .map((day) => (
            <li key={day.date} className={styles.dayCard}>
              <div className={day.isToday ? `${styles.cardDate} ${styles.today}` : styles.cardDate}>
                {dayLabel(day)} · {weekdayLabels[day.weekday]}
              </div>
              {day.posts.map((post) => (
                <div key={post.id} className={styles.cardPost}>
                  <div className={styles.cardPostHead}>
                    <span className={styles.typeTag}>{t.postType[post.type]}</span>
                    <StatusChip post={post} canEdit={canEdit} onCycleStatus={onCycleStatus} />
                  </div>
                  <button type="button" className={styles.topicBtn} onClick={() => onEditPost(post)}>
                    {post.title}
                  </button>
                  {showClientName && <div className={styles.clientName}>{post.clientName}</div>}
                  {post.authorName && <div className={styles.clientName}>{post.authorName}</div>}
                  <div className={styles.cardFooter}>
                    {post.status === "PUBLISHED" && (
                      <RatingStars
                        rating={post.rating}
                        canEdit={canEdit}
                        onRate={(rating) => onRatePost(post, rating)}
                      />
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        aria-label={t.contentPlanCalendar.deleteAriaLabel}
                        onClick={() => onDeletePost(post)}
                      >
                        <TrashIcon width={14} height={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </li>
          ))}
        {posts.length === 0 && <li className={styles.mobileEmpty}>{t.contentPlanCalendar.empty}</li>}
      </ul>
    </>
  );
}

function StatusChip({
  post,
  canEdit,
  onCycleStatus,
}: {
  post: Post;
  canEdit: boolean;
  onCycleStatus: (post: Post) => void;
}) {
  const { t } = useLocale();
  const className = `${styles.statusChip} ${styles[post.status.toLowerCase()]}`;

  if (!canEdit) {
    return <span className={className}>{t.postStatus[post.status]}</span>;
  }
  return (
    <button
      type="button"
      className={className}
      title={t.contentPlanCalendar.cycleStatusHint}
      onClick={() => onCycleStatus(post)}
    >
      {t.postStatus[post.status]}
    </button>
  );
}

function rowClass(day: CalendarDay, css: Record<string, string>): string {
  if (day.isToday) return css.todayRow;
  return day.isWeekend ? css.weekendRow : "";
}
