"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}

const MENU_HEIGHT = 96;

function place(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  // Open upwards when there isn't room below the button.
  const below = r.bottom + 4 + MENU_HEIGHT <= window.innerHeight;
  return { top: below ? r.bottom + 4 : r.top - 4 - MENU_HEIGHT, right: window.innerWidth - r.right };
}

/** Overflow "⋮" menu. The popover is fixed-positioned so the table's scroll container can't clip it. */
export default function RowMenu({ label, onEdit, onDelete }: Props) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pos === null) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    // Follow the button when the page or table scrolls.
    const follow = () => btn.current && setPos(place(btn.current));
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [pos === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => setPos(pos ? null : place(btn.current!));

  const pick = (fn: () => void) => () => {
    setPos(null);
    fn();
  };

  return (
    <>
      <button
        ref={btn}
        onClick={toggle}
        aria-label={`More actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-paper hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {pos && (
        <div
          ref={menu}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-40 w-36 overflow-hidden rounded-xl border border-line bg-card py-1 text-sm shadow-xl"
        >
          <button role="menuitem" onClick={pick(onEdit)} className="block w-full px-4 py-2.5 text-left font-semibold hover:bg-paper">
            Edit
          </button>
          <button role="menuitem" onClick={pick(onDelete)} className="block w-full px-4 py-2.5 text-left font-semibold text-over hover:bg-over-bg/60">
            Delete
          </button>
        </div>
      )}
    </>
  );
}
