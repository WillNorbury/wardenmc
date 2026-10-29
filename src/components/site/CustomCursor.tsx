import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import wardenIcon from "@/assets/warden-network-icon.png";

/** One pointer overlay, outside layout and dialog stacking contexts. */
export function CustomCursor() {
  const cursor = useRef<HTMLDivElement>(null);
  const burst = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    const hide = () => {
      root.classList.remove("warden-cursor-active");
      if (cursor.current) cursor.current.hidden = true;
    };
    const move = (event: PointerEvent) => {
      const element = cursor.current;
      const target = event.target;
      if (!element || !finePointer.matches || event.pointerType !== "mouse" || !(target instanceof Element)) {
        hide();
        return;
      }
      // Keep text editing, embedded players, and resize/disabled pointers native.
      const native = target.closest('input, textarea, select, iframe, [contenteditable="true"], [data-sidebar="rail"], :disabled, [aria-disabled="true"]');
      if (native) {
        hide();
        return;
      }
      element.style.transform = `translate3d(${event.clientX - 8}px, ${event.clientY - 8}px, 0)`;
      element.dataset.interactive = String(Boolean(target.closest('a, button, [role="button"], [role="tab"], [role="menuitem"], label')) || getComputedStyle(target).cursor === "pointer");
      element.hidden = false;
      root.classList.add("warden-cursor-active");
    };
    const click = (event: PointerEvent) => {
      const element = burst.current;
      if (!element || event.button !== 0 || !root.classList.contains("warden-cursor-active") || reducedMotion.matches) return;
      element.getAnimations().forEach((animation) => animation.cancel());
      element.style.left = `${event.clientX}px`;
      element.style.top = `${event.clientY}px`;
      element.animate([
        { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0.8 },
        { transform: "translate(-50%, -50%) scale(2.4)", opacity: 0 },
      ], { duration: 450, easing: "ease-out" });
    };
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) hide(); };
    const visibility = () => { if (document.hidden) hide(); };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", click, { passive: true });
    document.addEventListener("pointerout", leave);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", hide);
    finePointer.addEventListener("change", hide);
    return () => {
      hide();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", click);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", hide);
      finePointer.removeEventListener("change", hide);
    };
  }, []);

  return createPortal(<>
    <div ref={cursor} className="warden-cursor" aria-hidden="true" hidden>
      <img src={wardenIcon} alt="" draggable={false} />
    </div>
    <div ref={burst} className="warden-cursor-burst" aria-hidden="true" />
  </>, document.body);
}