import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { detectFormKeyword } from './forms';
import type { Medicine, SearchMedicinesFn } from './types';

type Props = {
  value: string;
  onChange: (next: string) => void;
  onPickMedicine: (medicine: Medicine) => void;
  searchMedicines: SearchMedicinesFn;
};

type DropdownState = {
  open: boolean;
  top: number;
  left: number;
  results: Medicine[];
  activeIndex: number;
  triggerWord: string;
  triggerStart: number;
  triggerEnd: number;
};

const EMPTY_DROPDOWN: DropdownState = {
  open: false,
  top: 0,
  left: 0,
  results: [],
  activeIndex: 0,
  triggerWord: '',
  triggerStart: 0,
  triggerEnd: 0,
};

function getLastWordInfo(text: string, caret: number) {
  // Walk backward from caret until whitespace or start.
  let i = caret;
  while (i > 0 && !/\s/.test(text[i - 1]!)) i--;
  const start = i;
  const end = caret;
  return { word: text.slice(start, end), start, end };
}

function systemBadge(sys?: Medicine['system']) {
  if (!sys) return null;
  const cls =
    sys === 'ayurvedic'
      ? 'pe-badge pe-badge-ayur'
      : sys === 'homeopathic'
      ? 'pe-badge pe-badge-homeo'
      : 'pe-badge pe-badge-allo';
  const label =
    sys === 'ayurvedic' ? 'Ayur' : sys === 'homeopathic' ? 'Homeo' : 'Allo';
  return <span className={cls}>{label}</span>;
}

export function FreeTextCanvas({
  value,
  onChange,
  onPickMedicine,
  searchMedicines,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdown, setDropdown] = useState<DropdownState>(EMPTY_DROPDOWN);
  // Keep a ref so event handlers read the latest dropdown state.
  const dropdownRef = useRef(dropdown);
  useEffect(() => {
    dropdownRef.current = dropdown;
  }, [dropdown]);

  // Sync external value -> contentEditable only when it diverges. Without
  // this guard each keystroke would wipe selection.
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerText !== value) {
      el.innerText = value;
    }
  }, [value]);

  const closeDropdown = useCallback(() => {
    setDropdown((d) => (d.open ? { ...d, open: false } : d));
  }, []);

  const computeDropdownPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { top: 0, left: 0 };
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { top: 0, left: 0 };
    const range = sel.getRangeAt(0).cloneRange();
    const rects = range.getClientRects();
    let rect: DOMRect | undefined = rects[rects.length - 1];
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      // Collapsed cursor may produce empty rect — use the editor's rect.
      const ed = editorRef.current;
      rect = ed ? ed.getBoundingClientRect() : undefined;
    }
    if (!rect) return { top: 0, left: 0 };
    const containerRect = container.getBoundingClientRect();
    return {
      top: rect.bottom - containerRect.top + 4,
      left: rect.left - containerRect.left,
    };
  }, []);

  const runSearch = useDebouncedCallback(
    async (word: string, start: number, end: number) => {
      const form = detectFormKeyword(word);
      let results: Medicine[] = [];
      try {
        if (form) {
          results = await searchMedicines('', { form });
        } else if (word.length > 2) {
          results = await searchMedicines(word);
        } else {
          closeDropdown();
          return;
        }
      } catch {
        results = [];
      }
      if (!results.length) {
        closeDropdown();
        return;
      }
      const pos = computeDropdownPosition();
      setDropdown({
        open: true,
        top: pos.top,
        left: pos.left,
        results: results.slice(0, 8),
        activeIndex: 0,
        triggerWord: word,
        triggerStart: start,
        triggerEnd: end,
      });
    },
    150
  );

  const getCaretOffset = useCallback(() => {
    const el = editorRef.current;
    if (!el) return 0;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString().length;
  }, []);

  const setCaretOffset = useCallback((offset: number) => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    let remaining = offset;
    let found = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();
    while (node) {
      const len = (node as Text).data.length;
      if (remaining <= len) {
        range.setStart(node, remaining);
        range.collapse(true);
        found = true;
        break;
      }
      remaining -= len;
      node = walker.nextNode();
    }
    if (!found) {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText;
    onChange(text);
    const caret = getCaretOffset();
    const { word, start, end } = getLastWordInfo(text, caret);
    if (!word) {
      closeDropdown();
      return;
    }
    const form = detectFormKeyword(word);
    if (!form && word.length <= 2) {
      closeDropdown();
      return;
    }
    runSearch(word, start, end);
  }, [onChange, getCaretOffset, runSearch, closeDropdown]);

  const insertMedicine = useCallback(
    (med: Medicine) => {
      const d = dropdownRef.current;
      const el = editorRef.current;
      if (!el) return;
      const text = el.innerText;
      const replacement = `${med.brand}${med.strength ? ' ' + med.strength : ''} `;
      const before = text.slice(0, d.triggerStart);
      const after = text.slice(d.triggerEnd);
      const next = before + replacement + after;
      onChange(next);
      // Update DOM immediately so caret placement is correct.
      el.innerText = next;
      const caretPos = before.length + replacement.length;
      requestAnimationFrame(() => setCaretOffset(caretPos));
      closeDropdown();
      onPickMedicine(med);
    },
    [onChange, setCaretOffset, closeDropdown, onPickMedicine]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const d = dropdownRef.current;
      if (!d.open || d.results.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDropdown((s) => ({
          ...s,
          activeIndex: (s.activeIndex + 1) % s.results.length,
        }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDropdown((s) => ({
          ...s,
          activeIndex:
            (s.activeIndex - 1 + s.results.length) % s.results.length,
        }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const med = d.results[d.activeIndex];
        if (med) insertMedicine(med);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
      }
    },
    [insertMedicine, closeDropdown]
  );

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // If focus moved into the dropdown, keep it open.
    const next = e.relatedTarget as HTMLElement | null;
    if (next && next.closest('[data-pe-dropdown]')) return;
    setTimeout(() => closeDropdown(), 120);
  }, [closeDropdown]);

  const dropdownUI = useMemo(() => {
    if (!dropdown.open) return null;
    return (
      <div
        data-pe-dropdown
        className="pe-dropdown"
        style={{ top: dropdown.top, left: dropdown.left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {dropdown.results.map((m, i) => (
          <div
            key={m.id}
            className="pe-dropdown-item"
            data-active={i === dropdown.activeIndex}
            onMouseEnter={() =>
              setDropdown((s) => ({ ...s, activeIndex: i }))
            }
            onClick={() => insertMedicine(m)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{m.brand}</span>
                {m.strength && (
                  <span style={{ color: '#64748b', fontSize: 12 }}>
                    {m.strength}
                  </span>
                )}
                {systemBadge(m.system)}
              </div>
              {(m.generic || m.composition) && (
                <div
                  style={{
                    color: '#64748b',
                    fontSize: 12,
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.generic || m.composition}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }, [dropdown, insertMedicine]);

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '100%' }}>
      <div
        ref={editorRef}
        className="pe-canvas"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        data-placeholder="Type notes, diagnoses, or medicines freely. Try typing 'tab' or 'syrup' for autocomplete..."
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        style={{
          minHeight: 400,
          height: '100%',
          padding: '16px 20px',
          fontSize: 15,
        }}
      />
      {dropdownUI}
    </div>
  );
}
