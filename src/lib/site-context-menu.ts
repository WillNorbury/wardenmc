/** Leave browser editing, media controls, and explicitly opted-out areas alone. */
export function usesNativeContextMenu(target: EventTarget | null, shiftKey = false): boolean {
  if (shiftKey || !(target instanceof Element)) return true;
  return Boolean(target.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), video, audio, iframe, [data-native-context-menu], [role="menu"], [role="listbox"], [role="combobox"]',
  ));
}

/** Keep the menu inside a modal's focus/dismissal boundary or fullscreen layer. */
export function getContextMenuContainer(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const modal = target.closest('[role="dialog"], [role="alertdialog"]');
  if (modal instanceof HTMLElement) return modal;
  return document.fullscreenElement instanceof HTMLElement ? document.fullscreenElement : null;
}

/** Only ordinary web links may be opened or copied by the site menu. */
export function getContextLink(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  const href = anchor?.getAttribute("href");
  if (!href) return null;
  try {
    const url = new URL(href, document.baseURI);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}