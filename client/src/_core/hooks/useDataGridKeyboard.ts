import {
  useInputIntent,
  type InputIntent,
  type InputEventDetail,
} from "./useInputIntent";
import { useCallback, useRef, useState, useEffect, useMemo } from "react";

export type DataGridCell = {
  rowIndex: number;
  columnIndex: number;
  columnKey: string;
  value: any;
  editable?: boolean;
  editorType?: "text" | "number" | "select" | "date" | "checkbox";
  options?: { label: string; value: any }[];
};

export type DataGridRow = {
  id: string | number;
  cells: Record<string, DataGridCell>;
};

export type DataGridSelection = {
  rowIndex: number;
  columnIndex: number;
} | null;

export type UseDataGridKeyboardOptions = {
  rows: DataGridRow[];
  columns: {
    key: string;
    header: string;
    editable?: boolean;
    editorType?: DataGridCell["editorType"];
    options?: DataGridCell["options"];
  }[];
  selection: DataGridSelection;
  onSelectionChange: (selection: DataGridSelection) => void;
  onCellEdit?: (rowIndex: number, columnKey: string, value: any) => void;
  onRowAction?: (
    action: "duplicate" | "delete" | "insert-above" | "insert-below",
    rowIndex: number
  ) => void;
  onCopy?: (selection: DataGridSelection) => void;
  onPaste?: (rowIndex: number, columnIndex: number, data: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  isEditing?: boolean;
  setIsEditing?: (editing: boolean) => void;
};

export function useDataGridKeyboard(options: UseDataGridKeyboardOptions) {
  const {
    rows,
    columns,
    selection,
    onSelectionChange,
    onCellEdit,
    onRowAction,
    onCopy,
    onPaste,
    onUndo,
    onRedo,
    isEditing = false,
    setIsEditing,
  } = options;

  const columnKeys = columns.map(c => c.key);
  const editableColumns = columns.filter(c => c.editable).map(c => c.key);

  const handleIntent = useCallback(
    (detail: any) => {
      if (!detail.rawEvent) return false;

      const { intent, rawEvent, preventDefault, stopPropagation } = detail;

      if (detail.isComposing) return false;

      const currentSelection = selection;
      const hasSelection = currentSelection !== null;

      const getNextEditableColumn = (
        currentKey: string,
        direction: "next" | "prev"
      ) => {
        const idx = editableColumns.indexOf(currentKey);
        if (idx === -1) return editableColumns[0] ?? null;
        const nextIdx = direction === "next" ? idx + 1 : idx - 1;
        if (nextIdx >= 0 && nextIdx < editableColumns.length)
          return editableColumns[nextIdx];
        return direction === "next"
          ? editableColumns[0]
          : editableColumns[editableColumns.length - 1];
      };

      const getNextRow = (rowIndex: number, direction: "next" | "prev") => {
        const nextIdx = direction === "next" ? rowIndex + 1 : rowIndex - 1;
        if (nextIdx >= 0 && nextIdx < rows.length) return nextIdx;
        return null;
      };

      if (!hasSelection) {
        switch (detail.intent) {
          case "arrow-down":
          case "enter":
            if (!isEditing && rows.length > 0) {
              detail.preventDefault();
              onSelectionChange({ rowIndex: 0, columnIndex: 0 });
              return true;
            }
            break;
        }
        return false;
      }

      const { rowIndex, columnIndex } = currentSelection;
      const currentColumnKey = columnKeys[columnIndex];
      const isCurrentEditable = editableColumns.includes(currentColumnKey);

      switch (detail.intent) {
        case "escape":
          if (isEditing) {
            setIsEditing?.(false);
            return true;
          }
          if (hasSelection) {
            onSelectionChange(null);
            return true;
          }
          break;

        case "enter":
          if (isEditing) {
            setIsEditing?.(false);
            return true;
          }
          if (isCurrentEditable) {
            setIsEditing?.(true);
            return true;
          }
          break;

        case "tab":
          if (isEditing) {
            detail.preventDefault();
            detail.stopPropagation();
            const nextEditable = getNextEditableColumn(
              currentColumnKey,
              "next"
            );
            if (nextEditable) {
              const nextColIdx = columnKeys.indexOf(nextEditable);
              onSelectionChange({ rowIndex, columnIndex: nextColIdx });
              setIsEditing?.(true);
            }
            return true;
          } else if (isCurrentEditable) {
            detail.preventDefault();
            setIsEditing?.(true);
            return true;
          }
          break;

        case "shift-tab":
          if (isEditing) {
            detail.preventDefault();
            detail.stopPropagation();
            const prevEditable = getNextEditableColumn(
              currentColumnKey,
              "prev"
            );
            if (prevEditable) {
              const prevColIdx = columnKeys.indexOf(prevEditable);
              onSelectionChange({ rowIndex, columnIndex: prevColIdx });
              setIsEditing?.(true);
            }
            return true;
          } else if (isCurrentEditable) {
            detail.preventDefault();
            setIsEditing?.(true);
            return true;
          }
          break;

        case "arrow-right":
          if (isEditing) return false;
          detail.preventDefault();
          if (columnIndex < columnKeys.length - 1) {
            onSelectionChange({ rowIndex, columnIndex: columnIndex + 1 });
          } else if (rowIndex < rows.length - 1) {
            onSelectionChange({ rowIndex: rowIndex + 1, columnIndex: 0 });
          }
          return true;

        case "arrow-left":
          if (isEditing) return false;
          detail.preventDefault();
          if (columnIndex > 0) {
            onSelectionChange({ rowIndex, columnIndex: columnIndex - 1 });
          } else if (rowIndex > 0) {
            onSelectionChange({
              rowIndex: rowIndex - 1,
              columnIndex: columnKeys.length - 1,
            });
          }
          return true;

        case "arrow-down": {
          if (isEditing) return false;
          detail.preventDefault();
          const nextRow = getNextRow(rowIndex, "next");
          if (nextRow !== null) {
            onSelectionChange({ rowIndex: nextRow, columnIndex });
          }
          return true;
        }

        case "arrow-up": {
          if (isEditing) return false;
          detail.preventDefault();
          const prevRow = getNextRow(rowIndex, "prev");
          if (prevRow !== null) {
            onSelectionChange({ rowIndex: prevRow, columnIndex });
          }
          return true;
        }

        case "home":
          if (isEditing) return false;
          detail.preventDefault();
          if (
            detail.rawEvent &&
            (detail.rawEvent as React.KeyboardEvent).ctrlKey
          ) {
            onSelectionChange({ rowIndex: 0, columnIndex: 0 });
          } else {
            onSelectionChange({ rowIndex, columnIndex: 0 });
          }
          return true;

        case "end":
          if (isEditing) return false;
          detail.preventDefault();
          if (
            detail.rawEvent &&
            (detail.rawEvent as React.KeyboardEvent).ctrlKey
          ) {
            onSelectionChange({
              rowIndex: rows.length - 1,
              columnIndex: columnKeys.length - 1,
            });
          } else {
            onSelectionChange({ rowIndex, columnIndex: columnKeys.length - 1 });
          }
          return true;

        case "page-down": {
          if (isEditing) return false;
          detail.preventDefault();
          const pageDownRow = Math.min(rowIndex + 10, rows.length - 1);
          onSelectionChange({ rowIndex: pageDownRow, columnIndex });
          return true;
        }

        case "page-up": {
          if (isEditing) return false;
          detail.preventDefault();
          const pageUpRow = Math.max(rowIndex - 10, 0);
          onSelectionChange({ rowIndex: pageUpRow, columnIndex });
          return true;
        }

        case "delete":
        case "backspace":
          if (isEditing) return false;
          detail.preventDefault();
          if (isCurrentEditable && onCellEdit) {
            onCellEdit(rowIndex, currentColumnKey, "");
          }
          return true;

        case "f2":
          if (isCurrentEditable && !isEditing) {
            detail.preventDefault();
            setIsEditing?.(true);
            return true;
          }
          break;

        case "copy":
          if (hasSelection && onCopy) {
            onCopy(currentSelection);
            return true;
          }
          break;

        case "paste":
          if (hasSelection && onPaste && isCurrentEditable) {
            detail.preventDefault();
            const text = (
              detail.rawEvent as React.ClipboardEvent
            ).clipboardData.getData("text");
            if (text) {
              onPaste(rowIndex, columnIndex, text);
            }
            return true;
          }
          break;

        case "cut":
          if (hasSelection && isCurrentEditable && onCellEdit) {
            onCopy?.(currentSelection);
            onCellEdit(rowIndex, currentColumnKey, "");
            return true;
          }
          break;

        case "undo":
          if (onUndo) {
            onUndo();
            return true;
          }
          break;

        case "redo":
          if (onRedo) {
            onRedo();
            return true;
          }
          break;
      }
      return false;
    },
    [
      selection,
      rows,
      editableColumns,
      columnKeys,
      isEditing,
      onSelectionChange,
      onCellEdit,
      onCopy,
      onPaste,
      onUndo,
      onRedo,
      setIsEditing,
    ]
  );

  return useInputIntent({
    onIntent: handleIntent,
    enabled: true,
  });
}
