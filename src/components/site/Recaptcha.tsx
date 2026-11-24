import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export const RECAPTCHA_SITE_KEY = "6LdUmC8uAAAAAFbv8WnUrCcxq3Qn_F8pDImvBrAq";

declare global {
  interface Window { grecaptcha?: any; __onRecaptchaLoad?: () => void }
}

let loader: Promise<void> | null = null;
function loadRecaptcha() {
  if (window.grecaptcha?.render) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve) => {
      window.__onRecaptchaLoad = () => resolve();
      const s = document.createElement("script");
      s.src = "https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit";
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return loader;
}

export type RecaptchaHandle = { reset: () => void };

export const Recaptcha = forwardRef<RecaptchaHandle, { onChange: (token: string | null) => void }>(
  ({ onChange }, ref) => {
    const box = useRef<HTMLDivElement>(null);
    const id = useRef<number | null>(null);
    useImperativeHandle(ref, () => ({
      reset: () => { if (id.current !== null) window.grecaptcha?.reset(id.current); onChange(null); },
    }));
    useEffect(() => {
      let cancelled = false;
      loadRecaptcha().then(() => {
        if (cancelled || !box.current || id.current !== null) return;
        id.current = window.grecaptcha.render(box.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: "dark",
          callback: (t: string) => onChange(t),
          "expired-callback": () => onChange(null),
          "error-callback": () => onChange(null),
        });
      });
      return () => { cancelled = true; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div ref={box} className="flex justify-center" />;
  },
);
Recaptcha.displayName = "Recaptcha";
