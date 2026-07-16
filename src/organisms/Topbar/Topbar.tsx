import { BellIcon, SearchIcon, SettingsIcon } from "../../atoms/icons/icons";
import { LocaleToggleButton } from "../../atoms/LocaleToggleButton/LocaleToggleButton";
import { ThemeToggleButton } from "../../atoms/ThemeToggleButton/ThemeToggleButton";
import { useLocale } from "../../i18n/useLocale";
import styles from "./Topbar.module.css";

interface TopbarProps {
  title: string;
  subtitle: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { t } = useLocale();
  return (
    <header className={styles.topbar}>
      <div>
        <div className={styles.pageTitle}>{title}</div>
        <div className={styles.pageSub}>{subtitle}</div>
      </div>
      <div className={styles.actions}>
        <div className={styles.cmdk}>
          <SearchIcon width={14} height={14} />
          {t.topbar.searchPlaceholder}
          <kbd className={styles.kbd}>⌘K</kbd>
        </div>
        <LocaleToggleButton />
        <ThemeToggleButton />
        <button className={styles.iconBtn} aria-label={t.topbar.notificationsAriaLabel}>
          <span className={styles.dot} />
          <BellIcon width={16} height={16} />
        </button>
        <button className={styles.iconBtn} aria-label={t.topbar.settingsAriaLabel}>
          <SettingsIcon width={16} height={16} />
        </button>
      </div>
    </header>
  );
}
