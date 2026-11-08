import type { ClientAssignee } from "../../api/clients";
import { useLocale } from "../../i18n/useLocale";
import { interpolate } from "../../i18n/interpolate";
import styles from "./AssigneeStack.module.css";

/** Beyond this the avatars stop being faces and start being a smear. */
const VISIBLE_LIMIT = 3;

interface AssigneeStackProps {
  assignees: ClientAssignee[];
  /** Name the first member in full beside the avatars — for wide rows. */
  withName?: boolean;
}

/**
 * The members staffed on a client, as overlapping initials.
 *
 * <p>The full roster is always in the accessible name even when the visuals
 * collapse to "+2": a screen reader user should not have to open the client
 * to learn who is on it. An empty staffing renders an em dash rather than
 * nothing, so the column reads as "nobody" instead of "not loaded".
 */
export function AssigneeStack({ assignees, withName = false }: AssigneeStackProps) {
  const { t } = useLocale();

  if (assignees.length === 0) {
    return <span className={styles.empty}>—</span>;
  }

  const shown = assignees.slice(0, VISIBLE_LIMIT);
  const overflow = assignees.length - shown.length;
  const everyone = assignees.map((member) => member.name).join(", ");

  return (
    <span className={styles.stack} title={everyone}>
      <span className={styles.avatars} role="img" aria-label={everyone}>
        {shown.map((member) => (
          <span key={member.id} className={styles.avatar} aria-hidden>
            {member.initials}
          </span>
        ))}
        {overflow > 0 && (
          <span className={`${styles.avatar} ${styles.overflow}`} aria-hidden>
            {interpolate(t.assigneeStack.overflowTemplate, { count: overflow })}
          </span>
        )}
      </span>
      {withName && (
        <span className={styles.name}>
          {assignees[0].name}
          {overflow > 0 && interpolate(t.assigneeStack.andMoreTemplate, { count: overflow })}
        </span>
      )}
    </span>
  );
}
