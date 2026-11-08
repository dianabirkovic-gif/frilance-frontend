import type { ClientAssignee } from "../../api/clients";
import { useLocale } from "../../i18n/useLocale";
import styles from "./AssigneePicker.module.css";

interface AssigneePickerProps {
  /** Everyone in the tenant — see `useAssignableMembers`. */
  members: ClientAssignee[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

/**
 * Who is staffed on a client, as a list of ticks.
 *
 * <p>Shared by the create drawer and the detail drawer's staffing section so
 * the two cannot drift about what an assignee row looks like or what the
 * consequence of ticking one is. That consequence is the hint at the bottom
 * and it is not decoration: staffing is what grants a member sight of a
 * client and its content plan (`new-requirements.md` #22), so the control
 * says so rather than leaving it to be discovered.
 */
export function AssigneePicker({ members, selectedIds, onToggle, disabled = false }: AssigneePickerProps) {
  const { t } = useLocale();

  if (members.length === 0) {
    return <p className={styles.empty}>{t.assigneePicker.empty}</p>;
  }

  return (
    <>
      <div className={styles.list}>
        {members.map((member) => (
          <label key={member.id} className={styles.option}>
            <input
              type="checkbox"
              checked={selectedIds.includes(member.id)}
              disabled={disabled}
              onChange={() => onToggle(member.id)}
            />
            <span className={styles.avatar} aria-hidden>
              {member.initials}
            </span>
            <span className={styles.name}>{member.name}</span>
            <span className={styles.role}>{t.role[member.role]}</span>
          </label>
        ))}
      </div>
      <p className={styles.hint}>{t.assigneePicker.hint}</p>
    </>
  );
}
