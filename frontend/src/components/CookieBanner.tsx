import { useState, useEffect } from "react";

const STORAGE_KEY = "gitpulse_cookie_consent";

export function CookieBanner(): JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss(): void {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between gap-4 px-6 py-3.5 border-t border-border bg-background/95 backdrop-blur-sm text-[12px] text-muted-foreground"
    >
      <p>
        We use a session cookie to keep you logged in and preserve your review
        history.{" "}
        <span className="text-foreground">No tracking or advertising cookies.</span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md px-3 py-1.5 text-[12px] font-medium bg-foreground text-background hover:opacity-80 transition-opacity"
      >
        Got it
      </button>
    </div>
  );
}
