"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DropdownMenuContext = createContext(null);

/** Above sticky chrome / cards; keep below modals (see ManagerDialog z-index). */
const MENU_Z = 9999;

function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error("DropdownMenu subcomponents must be used inside DropdownMenu");
  }
  return ctx;
}

export function DropdownMenu({ children }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  const value = {
    open,
    setOpen,
    close,
    toggle,
    triggerRef,
    menuId
  };

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
}

export function DropdownMenuTrigger({ className, children, ...props }) {
  const { open, toggle, triggerRef, close, menuId } = useDropdownMenuContext();

  return (
    <button
      type="button"
      ref={triggerRef}
      className={cn(className)}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls={open ? menuId : undefined}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" && !open) {
          e.preventDefault();
          toggle();
        }
        if (e.key === "Escape" && open) {
          e.preventDefault();
          close();
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * @param {Object} props
 * @param {"start" | "end"} [props.align]
 * @param {number} [props.sideOffset] px below trigger
 * @param {string} [props.className]
 */
export function DropdownMenuContent({ align = "start", sideOffset = 4, className, children }) {
  const { open, close, triggerRef, menuId } = useDropdownMenuContext();
  const panelRef = useRef(null);
  const [style, setStyle] = useState({ top: 0, left: 0, opacity: 0 });

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pw = panel?.offsetWidth ?? 224;
    const ph = panel?.offsetHeight ?? 0;

    let top = rect.bottom + sideOffset;
    let left = align === "end" ? rect.right - pw : rect.left;

    left = Math.max(pad, Math.min(left, vw - pw - pad));

    if (ph > 0 && top + ph > vh - pad) {
      const above = rect.top - ph - sideOffset;
      if (above >= pad) {
        top = above;
      }
    }

    top = Math.max(pad, Math.min(top, vh - (ph || 1) - pad));

    setStyle((s) => ({ ...s, top, left, opacity: 1 }));
  }, [align, sideOffset, triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle({ top: 0, left: 0, opacity: 0 });
      return undefined;
    }
    computePosition();
    const id = requestAnimationFrame(() => computePosition());
    const onScrollOrResize = () => computePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    const el = panelRef.current;
    const ro =
      el && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => computePosition())
        : null;
    if (el && ro) ro.observe(el);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      ro?.disconnect();
    };
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        triggerRef.current?.focus?.();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, close, triggerRef]);

  useEffect(() => {
    if (!open) return undefined;
    let removeListener = () => {};
    const frame = window.requestAnimationFrame(() => {
      const onPointerDown = (e) => {
        const t = triggerRef.current;
        const p = panelRef.current;
        if (t?.contains(e.target)) return;
        if (p?.contains(e.target)) return;
        close();
      };
      document.addEventListener("pointerdown", onPointerDown, true);
      removeListener = () => document.removeEventListener("pointerdown", onPointerDown, true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      removeListener();
    };
  }, [open, close, triggerRef]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={panelRef}
      id={menuId}
      role="menu"
      style={{
        position: "fixed",
        zIndex: MENU_Z,
        top: style.top,
        left: style.left,
        opacity: style.opacity,
        transition: "opacity 0.1s ease-out"
      }}
      className={cn(
        "min-w-[14rem] rounded-lg border border-border bg-card py-1 text-xs shadow-lg outline-none",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}

export function DropdownMenuItem({ className, destructive, disabled, onSelect, children, ...props }) {
  const { close, triggerRef } = useDropdownMenuContext();
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      className={cn(
        "block w-full px-3 py-2 text-left hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-50",
        destructive && "text-danger hover:bg-danger/10",
        className
      )}
      onClick={(e) => {
        if (disabled) return;
        onSelect?.(e);
        close();
        requestAnimationFrame(() => triggerRef.current?.focus?.());
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator(props) {
  return <div className="my-1 border-t border-border/60" role="separator" {...props} />;
}
