import { useMemo } from "react";
import type { Post, PostType } from "../../api/contentPlan";
import { RatingStars } from "../../atoms/RatingStars/RatingStars";
import { TrashIcon } from "../../atoms/icons/icons";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import { initials } from "../../utils/initials";
import { formatDayMonth, type CalendarDay } from "../../utils/calendarDays";
import styles from "./ContentPlanBoard.module.css";

/** `Date#getDay` indices in the order the grid lays its columns out. */
const WEEKDAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

/**
 * Decoration, not copy: the mockup marks each publication type with a glyph so
 * a column of cards is scannable without reading. It carries no meaning the
 * type label doesn't already carry, which is why it's `aria-hidden` and lives
 * here rather than in the dictionary — it is identical in every locale.
 */
const POST_TYPE_GLYPH: Record<PostType, string> = {
  REELS: "🎬",
  CAROUSEL: "🖼️",
  POST: "📝",
  STORIES: "📱",
  TIKTOK: "🎵",
};

interface ContentPlanBoardProps {
  days: CalendarDay[];
  /**
   * `week` gives every day its own full-height column; `month` lays the same
   * columns out as a grid, padded so the 1st lands under its weekday.
   */
  variant: "week" | "month";
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
 * FR-08's calendar as the mockup draws it: a row of day columns, each holding
 * the publications scheduled on it as cards and ending in the dashed slot that
 * plans a new one.
 *
 * <p>One markup, two layouts (frontend CLAUDE.md "Responsive strategy"): the
 * seven-column grid at ≥900px, and the same days as a stacked day-by-day list
 * below it, `display`-toggled in CSS rather than branched in JS. The month
 * variant hides its empty days on mobile — 31 "nothing scheduled" rows is most
 * of a phone screen, and the FAB is the mobile way to add a post.
 */
export function ContentPlanBoard({
  days,
  variant,
  canEdit,
  showClientName,
  onAddPost,
  onEditPost,
  onCycleStatus,
  onRatePost,
  onDeletePost,
}: ContentPlanBoardProps) {
  const { t } = useLocale();

  // The month grid starts wherever its 1st falls; the week grid always starts
  // on its Monday, so it never needs padding.
  const leadingBlanks = useMemo(() => {
    if (variant !== "month" || days.length === 0) return 0;
    return (days[0].weekday + 6) % 7;
  }, [variant, days]);

  const mobileDays = variant === "month" ? days.filter((day) => day.posts.length > 0) : days;

  const postCard = (post: Post) => (
    <PostCard
      key={post.id}
      post={post}
      canEdit={canEdit}
      showClientName={showClientName}
      onEditPost={onEditPost}
      onCycleStatus={onCycleStatus}
      onRatePost={onRatePost}
      onDeletePost={onDeletePost}
    />
  );

  return (
    <>
      <div className={variant === "month" ? `${styles.grid} ${styles.monthGrid}` : styles.grid}>
        {/* A month grid names its weekdays once, above the columns; a week grid
            has seven columns and can afford to name each one in place. */}
        {variant === "month" &&
          WEEKDAYS_MONDAY_FIRST.map((weekday) => (
            <div key={`head-${weekday}`} className={styles.weekdayHead}>
              {t.calendar.weekdaysShort[weekday]}
            </div>
          ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} className={styles.blankCol} aria-hidden />
        ))}
        {days.map((day) => (
          <div key={day.date} className={day.isToday ? `${styles.dayCol} ${styles.isToday}` : styles.dayCol}>
            <div className={styles.dayHead}>
              {variant === "week" && (
                <div className={styles.dayName}>
                  {t.calendar.weekdaysLong[day.weekday]}
                  {day.isToday && ` · ${t.contentPlanBoard.todaySuffix}`}
                </div>
              )}
              <div className={styles.dayNum}>{day.dayOfMonth}</div>
            </div>
            <div className={styles.dayBody}>
              {day.posts.map(postCard)}
              {canEdit && (
                <button type="button" className={styles.dayAdd} onClick={() => onAddPost(day.date)}>
                  {t.contentPlanBoard.addOnDay}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ul className={styles.mobileList}>
        {mobileDays.map((day) => (
          <li key={day.date} className={styles.mobileGroup}>
            <div className={day.isToday ? `${styles.mobileLabel} ${styles.isToday}` : styles.mobileLabel}>
              <span className={styles.mobileName}>
                {t.calendar.weekdaysLong[day.weekday]}
                {day.isToday && ` · ${t.contentPlanBoard.todaySuffix}`}
              </span>
              <span className={styles.mobileDate}>{formatDayMonth(day.date, t.calendar.monthsShort)}</span>
            </div>
            {day.posts.length === 0 ? (
              <div className={styles.mobileEmptyDay}>{t.contentPlanBoard.emptyDay}</div>
            ) : (
              day.posts.map(postCard)
            )}
          </li>
        ))}
        {mobileDays.length === 0 && <li className={styles.mobileEmpty}>{t.contentPlanBoard.empty}</li>}
      </ul>
    </>
  );
}

function PostCard({
  post,
  canEdit,
  showClientName,
  onEditPost,
  onCycleStatus,
  onRatePost,
  onDeletePost,
}: {
  post: Post;
  canEdit: boolean;
  showClientName: boolean;
  onEditPost: (post: Post) => void;
  onCycleStatus: (post: Post) => void;
  onRatePost: (post: Post, rating: number | null) => void;
  onDeletePost: (post: Post) => void;
}) {
  const { t } = useLocale();
  const statusClass = styles[post.status.toLowerCase()];

  return (
    <div className={`${styles.card} ${statusClass}`}>
      <button type="button" className={styles.cardMain} onClick={() => onEditPost(post)}>
        {showClientName && (
          <span className={styles.cardClient}>
            <span className={styles.cardAvatar} aria-hidden>
              {initials(post.clientName)}
            </span>
            <span className={styles.cardClientName}>{post.clientName}</span>
          </span>
        )}
        <span className={styles.cardType}>
          <span aria-hidden>{POST_TYPE_GLYPH[post.type]}</span>
          {t.postType[post.type]}
        </span>
        <span className={styles.cardTitle}>{post.title}</span>
        {/* Posts written before the backend recorded authorship have none;
            an "unknown author" line would be noise on every one of them. */}
        {post.authorName && (
          <span className={styles.cardAuthor}>
            {interpolate(t.contentPlanBoard.authorTemplate, { name: post.authorName })}
          </span>
        )}
      </button>

      <div className={styles.cardFoot}>
        <StatusChip post={post} canEdit={canEdit} onCycleStatus={onCycleStatus} />
        <div className={styles.cardFootEnd}>
          {post.status === "PUBLISHED" && (
            <RatingStars rating={post.rating} canEdit={canEdit} onRate={(rating) => onRatePost(post, rating)} />
          )}
          {canEdit && (
            <button
              type="button"
              className={styles.deleteBtn}
              aria-label={t.contentPlanBoard.deleteAriaLabel}
              onClick={() => onDeletePost(post)}
            >
              <TrashIcon width={13} height={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The status, and the way to advance it — one control, because a colour alone
 * is only legible against the legend and a bare dot is a 7px target nobody
 * finds. Clicking steps one place along `POST_STATUS_ORDER` and wraps; the
 * drawer's stepper is the way to jump straight to a status.
 */
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
  const label = (
    <>
      <span className={styles.chipDot} aria-hidden />
      {t.postStatusShort[post.status]}
    </>
  );

  if (!canEdit) {
    return <span className={className}>{label}</span>;
  }
  return (
    <button
      type="button"
      className={className}
      title={t.contentPlanBoard.cycleStatusHint}
      onClick={() => onCycleStatus(post)}
    >
      {label}
    </button>
  );
}
