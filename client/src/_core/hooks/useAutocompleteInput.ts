import { useInputIntent, type InputIntent, type InputEventDetail } from "./useInputIntent";
import { useCallback, useRef, useState, useEffect, useMemo } from "react";

export type AutocompleteItem<T = any> = {
  id: string;
  label: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  data?: T;
  disabled?: boolean;
};

export type UseAutocompleteInputOptions<T = any> = {
  items: AutocompleteItem<T>[];
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: AutocompleteItem<T>) => void;
  onOpen?: () => void;
  onClose?: () => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  selectedIndex?: number;
  setSelectedIndex?: (index: number) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  minChars?: number;
  debounceMs?: number;
  filter?: (item: AutocompleteItem<T>, query: string) => boolean;
  renderItem?: (item: AutocompleteItem<T>, isSelected: boolean) => React.ReactNode;
};

export function useAutocompleteInput<T = any>(options: UseAutocompleteInputOptions<T>) {
  const {
    items,
    value,
    onChange,
    onSelect,
    onOpen,
    onClose,
    searchQuery = "",
    setSearchQuery,
    selectedIndex = -1,
    setSelectedIndex,
    isOpen = false,
    setIsOpen,
    minChars = 1,
    debounceMs = 150,
    filter,
    renderItem,
  } = options;

  const [internalSelectedIndex, setInternalSelectedIndex] = useState(-1);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  const effectiveIsOpen = isOpen ?? internalIsOpen;
  const effectiveSelectedIndex = selectedIndex ?? internalSelectedIndex;
  const effectiveSetSelectedIndex = setSelectedIndex ?? setInternalSelectedIndex;
  const effectiveSetIsOpen = setIsOpen ?? setInternalIsOpen;
  const effectiveSetSearchQuery = setSearchQuery ?? ((q: string) => {});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  const filteredItems = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < minChars) return [];
    const query = debouncedQuery.toLowerCase();
    return items.filter(item => {
      if (item.disabled) return false;
      if (filter) return filter(item, query);
      return (
        item.label.toLowerCase().includes(query) ||
        item.value.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    });
  }, [items, debouncedQuery, minChars, filter]);

  const handleIntent = useCallback((detail: any) => {
    if (!detail.rawEvent) return false;

    const { intent, rawEvent, preventDefault, stopPropagation } = detail;

    if (detail.isComposing) return false;

    const hasItems = filteredItems.length > 0;

    switch (intent) {
      case "escape":
        effectiveSetIsOpen(false);
        onClose?.();
        return true;

      case "enter":
        if (effectiveIsOpen && effectiveSelectedIndex >= 0 && filteredItems[effectiveSelectedIndex]) {
          const item = filteredItems[effectiveSelectedIndex];
          onSelect?.(item);
          onChange(item.value);
          effectiveSetIsOpen(false);
        }
        return true;

      case "arrow-down":
        if (effectiveIsOpen && hasItems) {
          preventDefault();
          effectiveSetSelectedIndex(Math.min((effectiveSelectedIndex + 1) % filteredItems.length, filteredItems.length - 1));
          return true;
        } else if (!effectiveIsOpen && hasItems) {
          preventDefault();
          effectiveSetIsOpen(true);
          effectiveSetSelectedIndex(0);
          onOpen?.();
          return true;
        }
        break;

      case "arrow-up":
        if (effectiveIsOpen && hasItems) {
          preventDefault();
          effectiveSetSelectedIndex(Math.max(effectiveSelectedIndex - 1, 0));
          return true;
        }
        break;

      case "tab":
        if (effectiveIsOpen && hasItems) {
          preventDefault();
          effectiveSetSelectedIndex((effectiveSelectedIndex + 1) % filteredItems.length);
          return true;
        }
        break;

      case "shift-tab":
        if (effectiveIsOpen && hasItems) {
          preventDefault();
          effectiveSetSelectedIndex((effectiveSelectedIndex - 1 + filteredItems.length) % filteredItems.length);
          return true;
        }
        break;

      case "page-down":
        if (effectiveIsOpen && hasItems) {
          preventDefault();
          effectiveSetSelectedIndex(Math.min(effectiveSelectedIndex + 5, filteredItems.length - 1));
          return true;
        }
        break;

      case "page-up":
        if (effectiveIsOpen && hasItems) {
          preventDefault();
          effectiveSetSelectedIndex(Math.max(effectiveSelectedIndex - 5, 0));
          return true;
        }
        break;

      case "home":
        if (effectiveIsOpen && hasItems) {
          preventDefault();
          effectiveSetSelectedIndex(0);
          return true;
        }
        break;

      case "end":
        if (effectiveIsOpen && hasItems) {
          preventDefault();
          effectiveSetSelectedIndex(filteredItems.length - 1);
          return true;
        }
        break;
    }
    return false;
  }, [
    effectiveIsOpen,
    effectiveSelectedIndex,
    filteredItems,
    onClose,
    onOpen,
    onSelect,
    onChange,
    setInternalSelectedIndex,
    setInternalIsOpen,
    debouncedQuery,
  ]);

  useEffect(() => {
    if (effectiveIsOpen && setInternalSelectedIndex) {
      setInternalSelectedIndex(0);
    } else if (!effectiveIsOpen && setInternalSelectedIndex) {
      setInternalSelectedIndex(-1);
    }
  }, [effectiveIsOpen, setInternalSelectedIndex]);

  const open = useCallback(() => {
    effectiveSetIsOpen(true);
    onOpen?.();
  }, [effectiveSetIsOpen, onOpen]);

  const close = useCallback(() => {
    effectiveSetIsOpen(false);
    onClose?.();
  }, [effectiveSetIsOpen, onClose]);

  const selectItem = useCallback((item: any) => {
    onSelect?.(item);
    onChange(item.value);
    effectiveSetIsOpen(false);
  }, [onSelect, onChange, effectiveSetIsOpen]);

  return useMemo(() => ({
    items: filteredItems,
    isOpen: effectiveIsOpen,
    selectedIndex: effectiveSelectedIndex,
    searchQuery: debouncedQuery,
    open,
    close,
    selectItem,
    setSearchQuery: (q: string) => { effectiveSetSearchQuery(q); },
    setSelectedIndex: effectiveSetSelectedIndex,
    setIsOpen: effectiveSetIsOpen,
  }), [
    filteredItems,
    effectiveIsOpen,
    effectiveSelectedIndex,
    debouncedQuery,
    open,
    close,
    selectItem,
    effectiveSetSearchQuery,
    effectiveSetSelectedIndex,
    effectiveSetIsOpen,
  ]);
}
