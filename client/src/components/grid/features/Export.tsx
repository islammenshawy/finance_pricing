/**
 * @fileoverview Grid Export Utilities
 *
 * Provides export functionality for grid data in various formats:
 * - CSV (Comma Separated Values)
 * - Excel (.xlsx via SheetJS-compatible format)
 * - JSON
 * - PDF (basic table format)
 *
 * @module grid/features/Export
 */

import { useCallback } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ColumnDef, ExportConfig } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

export interface ExportOptions<TRow> {
  /** Data to export */
  data: TRow[];

  /** Column definitions */
  columns: ColumnDef<TRow>[];

  /** Export format */
  format: ExportFormat;

  /** Filename without extension */
  filename?: string;

  /** Include column headers */
  includeHeaders?: boolean;

  /** Only visible columns */
  visibleColumnsOnly?: boolean;

  /** Column visibility state */
  columnVisibility?: Record<string, boolean>;

  /** Custom value formatter */
  formatValue?: (value: unknown, column: ColumnDef<TRow>, row: TRow) => string;
}

export interface UseExportOptions<TRow> {
  /** Data to export */
  data: TRow[];

  /** Column definitions */
  columns: ColumnDef<TRow>[];

  /** Export configuration */
  config?: ExportConfig<TRow>;

  /** Column visibility state */
  columnVisibility?: Record<string, boolean>;

  /** Selected rows (for selectedRowsOnly option) */
  selectedRows?: TRow[];
}

export interface UseExportReturn {
  /** Export data in specified format */
  exportData: (format: ExportFormat) => void;

  /** Check if format is supported */
  isFormatSupported: (format: ExportFormat) => boolean;

  /** Available export formats */
  availableFormats: ExportFormat[];
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing grid export
 */
export function useExport<TRow>({
  data,
  columns,
  config,
  columnVisibility,
  selectedRows,
}: UseExportOptions<TRow>): UseExportReturn {
  const availableFormats: ExportFormat[] = config?.formats ?? ['csv'];

  const isFormatSupported = useCallback((format: ExportFormat) => {
    return availableFormats.includes(format);
  }, [availableFormats]);

  const exportData = useCallback((format: ExportFormat) => {
    // Determine which data to export
    const exportRows = config?.selectedRowsOnly && selectedRows?.length
      ? selectedRows
      : data;

    // Determine which columns to export
    const exportColumns = config?.visibleColumnsOnly
      ? columns.filter((col) => columnVisibility?.[col.id] !== false)
      : columns;

    // Use custom handler if provided
    if (config?.onExport) {
      config.onExport(format, exportRows, exportColumns);
      return;
    }

    // Get filename
    const filename = typeof config?.filename === 'function'
      ? config.filename()
      : config?.filename ?? 'export';

    // Export based on format
    switch (format) {
      case 'csv':
        exportToCSV(exportRows, exportColumns, filename, config?.includeHeaders);
        break;
      case 'excel':
        exportToExcel(exportRows, exportColumns, filename, config?.includeHeaders);
        break;
      case 'json':
        exportToJSON(exportRows, exportColumns, filename);
        break;
      case 'pdf':
        exportToPDF(exportRows, exportColumns, filename, config?.includeHeaders);
        break;
    }
  }, [data, columns, config, columnVisibility, selectedRows]);

  return {
    exportData,
    isFormatSupported,
    availableFormats,
  };
}

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

/**
 * Export data to CSV format
 */
export function exportToCSV<TRow>(
  data: TRow[],
  columns: ColumnDef<TRow>[],
  filename: string,
  includeHeaders = true
): void {
  const rows: string[][] = [];

  // Add headers
  if (includeHeaders) {
    rows.push(columns.map((col) => escapeCSV(col.header)));
  }

  // Add data rows
  data.forEach((row) => {
    const rowData = columns.map((col) => {
      const value = col.accessor ? col.accessor(row) : '';
      return escapeCSV(formatExportValue(value));
    });
    rows.push(rowData);
  });

  // Convert to CSV string
  const csv = rows.map((row) => row.join(',')).join('\n');

  // Download
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export data to Excel format (CSV with BOM for Excel compatibility)
 */
export function exportToExcel<TRow>(
  data: TRow[],
  columns: ColumnDef<TRow>[],
  filename: string,
  includeHeaders = true
): void {
  const rows: string[][] = [];

  // Add headers
  if (includeHeaders) {
    rows.push(columns.map((col) => col.header));
  }

  // Add data rows
  data.forEach((row) => {
    const rowData = columns.map((col) => {
      const value = col.accessor ? col.accessor(row) : '';
      return formatExportValue(value);
    });
    rows.push(rowData);
  });

  // Convert to tab-separated for Excel
  const tsv = rows.map((row) => row.map(escapeExcel).join('\t')).join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const bom = '\uFEFF';
  downloadFile(bom + tsv, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
}

/**
 * Export data to JSON format
 */
export function exportToJSON<TRow>(
  data: TRow[],
  columns: ColumnDef<TRow>[],
  filename: string
): void {
  // Create objects with column headers as keys
  const jsonData = data.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col) => {
      const value = col.accessor ? col.accessor(row) : '';
      obj[col.header] = value;
    });
    return obj;
  });

  const json = JSON.stringify(jsonData, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json;charset=utf-8;');
}

/**
 * Export data to PDF format (basic HTML table)
 */
export function exportToPDF<TRow>(
  data: TRow[],
  columns: ColumnDef<TRow>[],
  filename: string,
  includeHeaders = true
): void {
  // Create HTML table
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        tr:nth-child(even) { background-color: #fafafa; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h2>${filename}</h2>
      <p>Exported: ${new Date().toLocaleString()}</p>
      <table>
  `;

  // Add headers
  if (includeHeaders) {
    html += '<thead><tr>';
    columns.forEach((col) => {
      html += `<th>${escapeHTML(col.header)}</th>`;
    });
    html += '</tr></thead>';
  }

  // Add body
  html += '<tbody>';
  data.forEach((row) => {
    html += '<tr>';
    columns.forEach((col) => {
      const value = col.accessor ? col.accessor(row) : '';
      html += `<td>${escapeHTML(formatExportValue(value))}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></body></html>';

  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatExportValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function escapeCSV(value: string): string {
  // Escape quotes and wrap in quotes if contains special characters
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeExcel(value: string): string {
  // Escape for Excel tab-separated format
  return value.replace(/\t/g, ' ').replace(/\n/g, ' ');
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface ExportButtonProps<TRow> {
  data: TRow[];
  columns: ColumnDef<TRow>[];
  config?: ExportConfig<TRow>;
  columnVisibility?: Record<string, boolean>;
  selectedRows?: TRow[];
}

/**
 * Export dropdown button component
 */
export function ExportButton<TRow>({
  data,
  columns,
  config,
  columnVisibility,
  selectedRows,
}: ExportButtonProps<TRow>) {
  const { exportData, availableFormats } = useExport({
    data,
    columns,
    config,
    columnVisibility,
    selectedRows,
  });

  const formatIcons: Record<ExportFormat, typeof Download> = {
    csv: FileText,
    excel: FileSpreadsheet,
    json: FileJson,
    pdf: FileText,
  };

  const formatLabels: Record<ExportFormat, string> = {
    csv: 'CSV',
    excel: 'Excel',
    json: 'JSON',
    pdf: 'PDF',
  };

  if (config?.display === 'button' && availableFormats.length === 1) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportData(availableFormats[0])}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {config?.label ?? 'Export'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          {config?.label ?? 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableFormats.map((format) => {
          const Icon = formatIcons[format];
          return (
            <DropdownMenuItem
              key={format}
              onClick={() => exportData(format)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {formatLabels[format]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportButton;
