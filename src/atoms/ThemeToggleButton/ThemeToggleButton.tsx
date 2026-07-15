import { useTheme } from "../../theme/useTheme";
import { MoonIcon, SunIcon } from "../icons/icons";
import styles from "./ThemeToggleButton.module.css";

export function ThemeToggleButton({ size = "desktop" }: { size?: "desktop" | "mobile" }) {
  const { theme, toggleTheme } = useTheme();
  const buttonClass = size === "mobile" ? styles.mobileButton : styles.button;

  return (
    <button
      type="button"
      className={buttonClass}
      onClick={toggleTheme}
      aria-label="Перемкнути тему"
      aria-pressed={theme === "light"}
    >
      <MoonIcon className={`${styles.icon} ${styles.moon}`} width={16} height={16} />
      <SunIcon className={`${styles.icon} ${styles.sun}`} width={16} height={16} />
    </button>
  );
}
