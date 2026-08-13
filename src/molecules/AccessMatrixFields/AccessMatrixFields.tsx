import { useMemo } from "react";
import { ACCESS_LEVELS, APP_SECTIONS, type AccessLevel, type AccessMatrix, type AppSection, type Role } from "../../api/auth";
import { useLocale } from "../../i18n/useLocale";
import styles from "./AccessMatrixFields.module.css";

/**
 * Mirrors RoleAccessPolicy.DEFAULT_ACCESS on the backend — keep in sync, same
 * convention as the api/*.ts DTOs. Only a starting point for the owner's own
 * choice: picking a role pre-fills these dropdowns and nothing more, since
 * the stored grants are what actually decide access (requirement #10).
 */
const ROLE_DEFAULT_ACCESS: Record<Role, AccessMatrix> = {
  OWNER: { CLIENTS: "FULL", CONTENT: "FULL", TARGET: "FULL", FINANCE: "FULL", ANALYTICS: "FULL" },
  FREELANCER: { CLIENTS: "FULL", CONTENT: "FULL", TARGET: "FULL", FINANCE: "FULL", ANALYTICS: "FULL" },
  PROJECT_MANAGER: { CLIENTS: "FULL", CONTENT: "FULL", TARGET: "NONE", FINANCE: "NONE", ANALYTICS: "NONE" },
  SMM: { CLIENTS: "FULL", CONTENT: "FULL", TARGET: "NONE", FINANCE: "NONE", ANALYTICS: "NONE" },
  TARGETOLOGIST: { CLIENTS: "FULL", CONTENT: "NONE", TARGET: "FULL", FINANCE: "NONE", ANALYTICS: "NONE" },
};

export function defaultAccessForRole(role: Role): AccessMatrix {
  return { ...ROLE_DEFAULT_ACCESS[role] };
}

interface AccessMatrixFieldsProps {
  value: AccessMatrix;
  disabled?: boolean;
  onChange: (next: AccessMatrix) => void;
}

/**
 * The owner's None/Read/Full picker, one row per grantable section. Shared by
 * the invite drawer and the roster's edit-access drawer so both always offer
 * the same sections in the same order — presentational, state lives in
 * whichever drawer is using it.
 */
export function AccessMatrixFields({ value, disabled = false, onChange }: AccessMatrixFieldsProps) {
  const { t } = useLocale();

  const levelOptions = useMemo(
    () => ACCESS_LEVELS.map((level) => ({ value: level, label: t.accessLevel[level] })),
    [t],
  );

  function setLevel(section: AppSection, level: AccessLevel) {
    onChange({ ...value, [section]: level });
  }

  return (
    <div className={styles.rows}>
      {APP_SECTIONS.map((section) => (
        <label className={styles.row} key={section}>
          <span className={styles.section}>{t.appSection[section]}</span>
          <select
            className={styles.select}
            value={value[section]}
            disabled={disabled}
            aria-label={t.appSection[section]}
            onChange={(event) => setLevel(section, event.target.value as AccessLevel)}
          >
            {levelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
