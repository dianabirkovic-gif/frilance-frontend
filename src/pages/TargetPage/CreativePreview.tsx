import { useEffect, useState } from "react";
import { getCreativeContent, type Creative } from "../../api/targetAds";
import { useLocale } from "../../i18n/useLocale";
import styles from "./TargetPage.module.css";

type Loaded = { status: "loading" } | { status: "error" } | { status: "ready"; url: string };

/**
 * The bytes behind a bearer-protected URL, as an object URL a media element can
 * play. Revoked on unmount or when the creative changes, so scrolling a long
 * list does not pile up copies of every file in memory.
 */
function useCreativeObjectUrl(id: string, enabled: boolean): Loaded {
  const [state, setState] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let objectUrl: string | null = null;
    setState({ status: "loading" });
    getCreativeContent(id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: "ready", url: objectUrl });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, enabled]);

  return state;
}

/**
 * An image shows itself; a video waits for «Відтворити» — a card list must not
 * pull up to 100 MB per video just because it scrolled into view.
 */
export function CreativePreview({ creative }: { creative: Creative }) {
  const { t } = useLocale();
  const [requested, setRequested] = useState(false);
  const enabled = creative.kind === "IMAGE" || requested;
  const loaded = useCreativeObjectUrl(creative.id, enabled);

  if (!enabled) {
    return (
      <div className={styles.preview}>
        <button type="button" className={styles.playBtn} onClick={() => setRequested(true)}>
          {t.creativesTab.play}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.preview}>
      {loaded.status === "loading" && <span>{t.creativesTab.previewLoading}</span>}
      {loaded.status === "error" && <span role="alert">{t.creativesTab.previewError}</span>}
      {loaded.status === "ready" &&
        (creative.kind === "IMAGE" ? (
          <img src={loaded.url} alt={creative.name} />
        ) : (
          <video src={loaded.url} controls autoPlay aria-label={creative.name} />
        ))}
    </div>
  );
}
