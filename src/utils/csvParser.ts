import Papa from 'papaparse';

/**
 * Represents a work item parsed from CSV
 */
export interface WorkItemFromCsv {
  type: string;
  id: number;
  title: string;
  url: string;
}

/**
 * Expected CSV columns (matching the export format from csvExporter.ts)
 */
const REQUIRED_COLUMNS = ['Type', 'ID', 'Title', 'URL'];

/**
 * Valid work item types
 */
const VALID_WORK_ITEM_TYPES = [
  'User Story',
  'Bug',
  'Task',
  'Feature',
  'Epic',
  'Issue',
  'Product Backlog Item',
];

/**
 * Result of CSV validation
 */
export interface CsvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Result of CSV parsing
 */
export interface CsvParseResult {
  success: boolean;
  workItems: WorkItemFromCsv[];
  errors: string[];
  warnings: string[];
}

/**
 * Validates CSV content for required columns and data format
 */
export function validateCsvFormat(csvContent: string): CsvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    return { isValid: false, errors: ['CSV content is empty'], warnings: [] };
  }

  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    const parseErrors = result.errors.map(
      (e) => `Row ${e.row !== undefined ? e.row + 1 : '?'}: ${e.message}`
    );
    errors.push(...parseErrors);
  }

  // Check headers
  const headers = result.meta.fields || [];
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !headers.some((h) => h.toLowerCase() === col.toLowerCase())
  );

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Validate data rows
  const data = result.data as Record<string, string>[];
  
  if (data.length === 0) {
    errors.push('CSV contains no data rows');
  }

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because header is row 1 and 0-indexed

    // Check for required fields
    const type = getFieldValue(row, 'Type');
    const id = getFieldValue(row, 'ID');
    const title = getFieldValue(row, 'Title');

    if (!type) {
      errors.push(`Row ${rowNum}: Missing Type`);
    } else if (!VALID_WORK_ITEM_TYPES.some((t) => t.toLowerCase() === type.toLowerCase())) {
      warnings.push(`Row ${rowNum}: Unknown work item type "${type}"`);
    }

    if (!id) {
      errors.push(`Row ${rowNum}: Missing ID`);
    } else if (isNaN(parseInt(id, 10))) {
      errors.push(`Row ${rowNum}: Invalid ID "${id}" (must be a number)`);
    }

    if (!title) {
      errors.push(`Row ${rowNum}: Missing Title`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Helper function to get field value case-insensitively
 */
function getFieldValue(row: Record<string, string>, fieldName: string): string {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === fieldName.toLowerCase()
  );
  return key ? row[key] : '';
}

/**
 * Parses CSV content and converts to work items
 */
export function parseCsvToWorkItems(csvContent: string): CsvParseResult {
  const validation = validateCsvFormat(csvContent);

  if (!validation.isValid) {
    return {
      success: false,
      workItems: [],
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const data = result.data as Record<string, string>[];
  const workItems: WorkItemFromCsv[] = [];

  for (const row of data) {
    const type = getFieldValue(row, 'Type');
    const idStr = getFieldValue(row, 'ID');
    const title = getFieldValue(row, 'Title');
    const url = getFieldValue(row, 'URL');

    const id = parseInt(idStr, 10);
    
    if (type && !isNaN(id) && title) {
      workItems.push({
        type,
        id,
        title,
        url: url || '',
      });
    }
  }

  return {
    success: true,
    workItems,
    errors: [],
    warnings: validation.warnings,
  };
}

/**
 * Reads a File object and returns its content as a string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}
