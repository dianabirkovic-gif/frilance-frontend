import { BellIcon, SearchIcon, SettingsIcon } from "../../atoms/icons/icons";
import { ThemeToggleButton } from "../../atoms/ThemeToggleButton/ThemeToggleButton";
import styles from "./Topbar.module.css";

interface TopbarProps {
  title: string;
  subtitle: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div>
        <div className={styles.pageTitle}>{title}</div>
        <div className={styles.pageSub}>{subtitle}</div>
      </div>
      <div className={styles.actions}>
        <div className={styles.cmdk}>
          <SearchIcon width={14} height={14} />
          Пошук клієнта, задачі...
          <kbd className={styles.kbd}>⌘K</kbd>
        </div>
        <ThemeToggleButton />
        <button className={styles.iconBtn} aria-label="Сповіщення">
          <span className={styles.dot} />
          <BellIcon width={16} height={16} />
        </button>
        <button className={styles.iconBtn} aria-label="Налаштування">
          <SettingsIcon width={16} height={16} />
        </button>
      </div>
    </header>
  );
}
