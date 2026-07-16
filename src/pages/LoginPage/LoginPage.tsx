import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../api/client";
import { BRAND_NAME } from "../../config/brand";
import { useLocale } from "../../i18n/useLocale";
import styles from "./LoginPage.module.css";

/** FR-01 freelancer login only — FR-02 agency role picker is future work (see backend CLAUDE.md). */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [email, setEmail] = useState("diana@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.loginPage.genericError);
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
        <label className={styles.field}>
          <span>{t.loginPage.email}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className={styles.field}>
          <span>{t.loginPage.password}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
          />
        </label>
        {error && <div className={styles.error}>{error}</div>}
        <button type="submit" className={styles.submit} disabled={isSubmitting}>
          {isSubmitting ? t.loginPage.submitLoading : t.loginPage.submitIdle}
        </button>
      </form>
    </div>
  );
}
