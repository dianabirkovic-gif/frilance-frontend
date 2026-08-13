import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { BRAND_NAME } from "../../config/brand";
import { useAuth } from "../../hooks/useAuth";
import { useLocale } from "../../i18n/useLocale";
import styles from "./ClaimInvitePage.module.css";

/**
 * Public activation screen for a team member invited via TeamService#invite
 * (see freelance-all/new-requirements.md #7-8). No email is actually sent —
 * the owner relays this page's link (with `email`/`token` query params
 * prefilled from the one-time invite response) to the invitee out-of-band.
 * Both fields stay editable in case the invitee is filling them in by hand
 * instead of following a link.
 */
export function ClaimInvitePage() {
  const { claimInvite } = useAuth();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await claimInvite(email, token, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.claimInvitePage.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>F</div>
          <div className={styles.brandName}>{BRAND_NAME}</div>
        </div>
        <p className={styles.intro}>{t.claimInvitePage.intro}</p>
        <label className={styles.field}>
          <span>{t.claimInvitePage.email}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className={styles.field}>
          <span>{t.claimInvitePage.token}</span>
          <input
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label className={styles.field}>
          <span>{t.claimInvitePage.password}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        {error && <div className={styles.error}>{error}</div>}
        <button type="submit" className={styles.submit} disabled={isSubmitting}>
          {isSubmitting ? t.claimInvitePage.submitLoading : t.claimInvitePage.submitIdle}
        </button>
      </form>
    </div>
  );
}
