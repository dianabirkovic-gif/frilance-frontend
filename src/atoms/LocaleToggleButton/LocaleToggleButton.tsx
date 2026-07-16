import { useLocale } from "../../i18n/useLocale";
import styles from "./LocaleToggleButton.module.css";

export function LocaleToggleButton({ size = "desktop" }: { size?: "desktop" | "mobile" }) {
  const { locale, toggleLocale, t } = useLocale();
  const buttonClass = size === "mobile" ? styles.mobileButton : styles.button;

  return (
    <button
      type="button"
      className={buttonClass}
      onClick={toggleLocale}
      aria-label={t.localeToggle.ariaLabel}
      aria-pressed={locale === "en"}
    >
      {locale === "en" ? "EN" : "UA"}
    </button>
  );
}
