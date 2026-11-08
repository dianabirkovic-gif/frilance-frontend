import { MAX_POST_RATING } from "../../api/contentPlan";
import { interpolate } from "../../i18n/interpolate";
import { useLocale } from "../../i18n/useLocale";
import styles from "./RatingStars.module.css";

const STARS = Array.from({ length: MAX_POST_RATING }, (_, index) => index + 1);

interface RatingStarsProps {
  rating: number | null;
  /** Read-only stars when the member has no Content edit grant. */
  canEdit?: boolean;
  onRate?: (rating: number | null) => void;
}

/**
 * FR-08's 3-point effectiveness rating. Clicking the current rating clears
 * it — the mockup spells that out as a separate "скинути" link, but a star
 * that toggles is the same gesture without a second control to explain.
 */
export function RatingStars({ rating, canEdit = false, onRate }: RatingStarsProps) {
  const { t } = useLocale();
  const current = rating ?? 0;

  if (!canEdit) {
    return (
      <span className={styles.stars} aria-label={interpolate(t.ratingStars.currentTemplate, { rating: current })}>
        {STARS.map((star) => (
          <span key={star} className={star <= current ? `${styles.star} ${styles.filled}` : styles.star} aria-hidden>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={styles.stars}>
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          className={star <= current ? `${styles.star} ${styles.filled}` : styles.star}
          aria-label={interpolate(t.ratingStars.rateTemplate, { rating: star })}
          aria-pressed={star <= current}
          onClick={() => onRate?.(star === current ? null : star)}
        >
          ★
        </button>
      ))}
    </span>
  );
}
