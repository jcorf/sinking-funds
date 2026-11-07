import { useEffect } from 'react';

// For pages with a bottom-pinned sheet on phones: publishes the sheet's height
// as --sheet-height so the tools dock (ToolsDock.css) can sit just above it.
export default function useSheetHeight(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--sheet-height', `${el.offsetHeight}px`);
    publish();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(publish);
      ro.observe(el);
    }
    window.addEventListener('resize', publish);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', publish);
      root.style.removeProperty('--sheet-height');
    };
  }, [ref]);
}
