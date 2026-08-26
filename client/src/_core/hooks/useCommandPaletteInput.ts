import { useInputIntent, type InputIntent, type InputEventDetail } from "./useInputIntent";
import { useCallback, useRef, useState, useEffect } from "react";

export type CommandPaletteAction =
  | "open"
  | "close"
  | "select"
  | "select-next"
  | "select-previous"
  | "select-first"
  | "select-last"
  | "page-up"
  | "page-down"
  | "search"
  | "clear-search"
  | "execute"
  | "cancel";

export type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  category?: string;
  action: () => void;
  disabled?: boolean;
  group?: string;
};

export type UseCommandPaletteInputOptions = {
  items: CommandItem[];
  onExecute?: (item: CommandItem) => void;
  onClose?: () => void;
  onOpen?: () => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  selectedIndex?: number;
  setSelectedIndex?: (index: number) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
};

export function useCommandPaletteInput(options: UseCommandPaletteInputOptions) {
  const {
    items,
    onExecute,
    onClose,
    onOpen,
    searchQuery = "",
    setSearchQuery,
    selectedIndex = 0,
    setSelectedIndex,
    isOpen = false,
    setIsOpen,
  } = options;

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [internalSelectedIndex, setInternalSelectedIndex] = useState(0);
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const effectiveIsOpen = isOpen ?? internalIsOpen;
  const effectiveSelectedIndex = selectedIndex ?? internalSelectedIndex;
  const effectiveSetSelectedIndex = setSelectedIndex ?? setInternalSelectedIndex;
  const effectiveSetIsOpen = setIsOpen ?? setInternalIsOpen;

  const handleIntent = useCallback((detail: any) => {
    if (!detail.rawEvent) return false;

    const { intent, rawEvent, preventDefault, stopPropagation } = detail;

    if (!detail.isComposing) {
      switch (intent) {
        case "escape":
          effectiveSetIsOpen(false);
          onClose?.();
          return true;

        case "enter":
          if (effectiveIsOpen && filteredItems[effectiveSelectedIndex]) {
            const item = filteredItems[effectiveSelectedIndex];
            if (!item.disabled) {
              item.action();
              onExecute?.(item);
              effectiveSetIsOpen(false);
            }
            return true;
          }
          break;

        case "arrow-down":
          if (effectiveIsOpen) {
            preventDefault();
            effectiveSetSelectedIndex(Math.min(effectiveSelectedIndex + 1, filteredItems.length - 1));
            return true;
          }
          break;

        case "arrow-up":
          if (effectiveIsOpen) {
            preventDefault();
            effectiveSetSelectedIndex(Math.max(effectiveSelectedIndex - 1, 0));
            return true;
          }
          break;

        case "tab":
          if (effectiveIsOpen) {
            preventDefault();
            effectiveSetSelectedIndex((effectiveSelectedIndex + 1) % filteredItems.length);
            return true;
          }
          break;

        case "shift-tab":
          if (effectiveIsOpen) {
            preventDefault();
            effectiveSetSelectedIndex((effectiveSelectedIndex - 1 + filteredItems.length) % filteredItems.length);
            return true;
          }
          break;

        case "page-down":
          if (effectiveIsOpen) {
            preventDefault();
            effectiveSetSelectedIndex(Math.min(effectiveSelectedIndex + 5, filteredItems.length - 1));
            return true;
          }
          break;

        case "page-up":
          if (effectiveIsOpen) {
            preventDefault();
            effectiveSetSelectedIndex(Math.max(effectiveSelectedIndex - 5, 0));
            return true;
          }
          break;

        case "home":
          if (effectiveIsOpen) {
            preventDefault();
            effectiveSetSelectedIndex(0);
            return true;
          }
          break;

        case "end":
          if (effectiveIsOpen) {
            preventDefault();
            effectiveSetSelectedIndex(filteredItems.length - 1);
            return true;
          }
          break;
      }
    }
    return false;
  }, [effectiveIsOpen, effectiveSelectedIndex, effectiveSetIsOpen, effectiveSetSelectedIndex, filteredItems, onClose, onExecute]);

  useEffect(() => {
    if (effectiveIsOpen && setInternalSelectedIndex) {
      setInternalSelectedIndex(0);
    }
  }, [effectiveIsOpen, setInternalSelectedIndex]);

  return {
    filteredItems,
    selectedIndex: effectiveSelectedIndex,
    isOpen: effectiveIsOpen,
    open: () => { effectiveSetIsOpen(true); onOpen?.(); },
    close: () => { effectiveSetIsOpen(false); onClose?.(); },
    executeSelected: () => {
      if (filteredItems[effectiveSelectedIndex]) {
        filteredItems[effectiveSelectedIndex].action();
        onExecute?.(filteredItems[effectiveSelectedIndex]);
        effectiveSetIsOpen(false);
      }
    },
  };
}

export function useCommandPaletteKeyboard(options: UseCommandPaletteInputOptions) {
  const api = useInputIntent({
    onIntent: (detail) => {
      const { intent, rawEvent, preventDefault, stopPropagation } = detail;

      if (detail.isComposing) return false;

      switch (intent) {
        case "escape":
        case "enter":
        case "arrow-down":
        case "arrow-up":
        case "tab":
        case "shift-tab":
          return true;
      }
      return false;
    },
    enabled: true,
  });

  return api;
}
