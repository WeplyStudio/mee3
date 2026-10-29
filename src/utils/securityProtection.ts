/**
 * Security & Content Protection Utility
 * - Prevents copying and text selection across the website
 * - Prevents right-clicking on all images and page elements (context menu)
 * - Prevents dragging and saving images
 * - Blocks Ctrl+U / Cmd+U (View Source) and developer inspection shortcuts
 */

export function setupSecurityProtection(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // 1. Prevent right-click on images and globally on the web page
  const handleContextMenu = (e: MouseEvent) => {
    // Check if target is an image, svg, canvas, picture or container
    const target = e.target as HTMLElement | null;
    const isImage =
      target instanceof HTMLImageElement ||
      target instanceof SVGElement ||
      target?.tagName === 'IMG' ||
      target?.tagName === 'PICTURE' ||
      target?.tagName === 'FIGURE' ||
      target?.tagName === 'CANVAS' ||
      target?.closest('img, picture, svg, figure, canvas, [role="img"]');

    // Prevent context menu on all images or across the web to prevent "Save image" & "View source"
    if (isImage || !isInputOrTextarea(target)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  // 2. Prevent dragging of images or media elements
  const handleDragStart = (e: DragEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target instanceof HTMLImageElement ||
      target?.tagName === 'IMG' ||
      target?.closest('img, picture, figure')
    ) {
      e.preventDefault();
      return false;
    }
  };

  // 3. Prevent text copying and cutting
  const handleCopy = (e: ClipboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (!isInputOrTextarea(target)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  const handleCut = (e: ClipboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (!isInputOrTextarea(target)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  // 4. Prevent text selection (selectstart) outside form inputs
  const handleSelectStart = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!isInputOrTextarea(target)) {
      e.preventDefault();
      return false;
    }
  };

  // 5. Prevent Ctrl+U / Cmd+U (View Source) and related inspection shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = e.key ? e.key.toLowerCase() : '';
    const keyCode = e.keyCode || e.which;

    // Block Ctrl+U / Cmd+U (View Source)
    if (isCtrlOrCmd && (key === 'u' || keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block Ctrl+S / Cmd+S (Save webpage / Save images)
    if (isCtrlOrCmd && (key === 's' || keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block F12 (DevTools)
    if (key === 'f12' || keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block Ctrl+Shift+I / Cmd+Option+I (Inspect DevTools)
    if (isCtrlOrCmd && e.shiftKey && (key === 'i' || keyCode === 73)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block Ctrl+Shift+J / Cmd+Option+J (Console)
    if (isCtrlOrCmd && e.shiftKey && (key === 'j' || keyCode === 74)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
    if (isCtrlOrCmd && e.shiftKey && (key === 'c' || keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block Ctrl+C when selection is attempted outside inputs
    if (isCtrlOrCmd && (key === 'c' || keyCode === 67)) {
      const activeElement = document.activeElement as HTMLElement | null;
      if (!isInputOrTextarea(activeElement)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  };

  // Helper to check if target is an interactive input or textarea
  function isInputOrTextarea(target: HTMLElement | null): boolean {
    if (!target) return false;
    const tagName = target.tagName.toUpperCase();
    return (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      Boolean(target.closest('input, textarea, [contenteditable="true"]'))
    );
  }

  // Attach event listeners
  document.addEventListener('contextmenu', handleContextMenu, { capture: true });
  document.addEventListener('dragstart', handleDragStart, { capture: true });
  document.addEventListener('copy', handleCopy, { capture: true });
  document.addEventListener('cut', handleCut, { capture: true });
  document.addEventListener('selectstart', handleSelectStart, { capture: true });
  window.addEventListener('keydown', handleKeyDown, { capture: true });

  // Return cleanup function
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    document.removeEventListener('dragstart', handleDragStart, { capture: true });
    document.removeEventListener('copy', handleCopy, { capture: true });
    document.removeEventListener('cut', handleCut, { capture: true });
    document.removeEventListener('selectstart', handleSelectStart, { capture: true });
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}
