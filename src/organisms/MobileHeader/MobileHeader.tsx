import { initials } from "../../utils/initials";
import { BellIcon, ChevronDownIcon, SearchIcon } from "../../atoms/icons/icons";
import { ThemeToggleButton } from "../../atoms/ThemeToggleButton/ThemeToggleButton";
import styles from "./MobileHeader.module.css";

interface MobileHeaderProps {
  title: string;
  greeting: string;
  userName: string;
}

export function MobileHeader({ title, greeting, userName }: MobileHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.safeTop} />
      <div className={styles.row}>
        <div className={styles.greet}>
          <div className={styles.avatar}>{initials(userName)}</div>
          <div>
            <div className={styles.hello}>{greeting}</div>
            <div className={styles.name}>{title}</div>
          </div>
        </div>
        <div className={styles.actions}>
          <ThemeToggleButton size="mobile" />
          <button className={styles.iconBtn} aria-label="Пошук">
            <SearchIcon width={16} height={16} />
          </button>
          <button className={styles.iconBtn} aria-label="Сповіщення">
            <span className={styles.dot} />
            <BellIcon width={16} height={16} />
          </button>
        </div>
      </div>
      <div className={styles.wsChip}>
        <div className={styles.wsLeft}>
          <span className={styles.wsDot} />
          Режим: Агентство
        </div>
        <ChevronDownIcon width={14} height={14} className={styles.wsCaret} />
      </div>
    </header>
  );
}
