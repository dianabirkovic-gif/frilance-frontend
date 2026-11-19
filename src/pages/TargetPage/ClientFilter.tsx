import type { TargetClient } from "../../api/target";
import { ChevronDownIcon } from "../../atoms/icons/icons";
import { interpolate } from "../../i18n/interpolate";
import styles from "./TargetPage.module.css";

interface ClientFilterProps {
  clients: TargetClient[];
  selectedClientId: string | null;
  onChange: (clientId: string | null) => void;
  allLabel: string;
  /** Contains `{client}`. */
  labelTemplate: string;
}

/** The section's client pill — the same control on every Таргет tab, so a choice reads the same everywhere. */
export function ClientFilter({ clients, selectedClientId, onChange, allLabel, labelTemplate }: ClientFilterProps) {
  const selectedName = clients.find((client) => client.id === selectedClientId)?.name;
  const label = interpolate(labelTemplate, { client: selectedName ?? allLabel });
  return (
    <label className={styles.clientFilter}>
      <span className={styles.clientFilterText}>{label}</span>
      <ChevronDownIcon width={12} height={12} />
      <select
        value={selectedClientId ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        aria-label={label}
      >
        <option value="">{allLabel}</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
    </label>
  );
}
