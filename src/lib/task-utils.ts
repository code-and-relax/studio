import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskStatus } from '@/types';
import { 
  APP_HEADER_TERMINI, 
  APP_HEADER_CONTENT, 
  APP_HEADER_DUE_DATE,
  HEADER_VARIANTS_TERMINI,
  HEADER_VARIANTS_CONTENT,
  HEADER_VARIANTS_DUE_DATE,
  INITIAL_POSTIT_COLOR,
  DEFAULT_TASK_STATUS
} from '@/config/app-config';
import { format, parse, isValid, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';
import * as XLSX from 'xlsx';

// --- Date Handling ---

/**
 * Parses a date string using multiple formats, including specific Spanish locale format.
 * Handles "N/A", "Data no especificada", "Data Desconeguda", "#VALUE!".
 * @param dateString The date string to parse.
 * @returns A Date object or the original string if parsing fails or it's a special string.
 */
export const parseCustomDateString = (dateString: string | Date | undefined | null): Date | string => {
  if (dateString instanceof Date) {
    return isValid(dateString) ? dateString : "Data invàlida";
  }
  if (typeof dateString !== 'string' || !dateString.trim()) {
    return "Data no especificada";
  }

  const trimmedDateString = dateString.trim();
  const specialStrings = ["DATA NO ESPECIFICADA", "DATA DESCONEGUDA", "N/A", "#VALUE!", ""];
  if (specialStrings.includes(trimmedDateString.toUpperCase())) {
    return dateString; // Return original special string
  }

  // Try ISO format first
  let date = parseISO(trimmedDateString);
  if (isValid(date)) return date;

  // Common European/Spanish formats
  const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'd-M-yyyy', 'yyyy-MM-dd'];
  for (const fmt of formats) {
    date = parse(trimmedDateString, fmt, new Date());
    if (isValid(date)) return date;
  }
  
  // Try to parse as Excel date serial number (if it's a number string)
  if (/^\d+(\.\d+)?$/.test(trimmedDateString)) {
    const excelSerialDate = parseFloat(trimmedDateString);
    if (!isNaN(excelSerialDate)) {
      // Excel base date is December 30, 1899 for Windows, or January 1, 1904 for Mac.
      // Assuming Windows for now.
      const baseDate = new Date(1899, 11, 30); // Excel's epoch on Windows
      date = new Date(baseDate.valueOf() + (excelSerialDate -1) * 24 * 60 * 60 * 1000);
      if (isValid(date)) return date;
    }
  }

  return dateString; // Return original string if all parsing fails
};


/**
 * Formats a date for display.
 * @param date The date to format (can be Date object or string).
 * @returns Formatted date string or the original string if invalid/special.
 */
export const formatDate = (date: Date | string | undefined | null): string => {
  if (date instanceof Date && isValid(date)) {
    return format(date, 'P', { locale: ca }); // 'P' is a localized date format, e.g., 23/12/2023
  }
  if (typeof date === 'string') {
    const parsed = parseCustomDateString(date);
    if (parsed instanceof Date && isValid(parsed)) {
      return format(parsed, 'P', { locale: ca });
    }
    return date; // Return original string if it's a special string or unparseable
  }
  return "Data no especificada";
};

// --- CSV Parsing ---

const normalizeHeader = (header: string): string => (header || '').trim().toUpperCase();

const findHeaderIndex = (headers: string[], variants: string[]): number => {
  const normalizedVariants = variants.map(normalizeHeader);
  for (const variant of normalizedVariants) {
    const index = headers.findIndex(h => normalizeHeader(h) === variant);
    if (index !== -1) return index;
  }
  return -1;
};

/**
 * Parses a CSV file to extract tasks.
 * @param file The CSV file to parse.
 * @returns A promise that resolves to an array of partial Task objects.
 */
export const parseTaskFile = async (file: File): Promise<Partial<Task>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvData = event.target?.result as string;
        const rows = csvData.split(/\r\n|\n/).map(row => row.split(','));

        let terminiColIndex = -1;
        let contentColIndex = -1;
        let dueDateColIndex = -1;
        let headerRowValues: string[] = [];
        let maxHeaderRowIndex = -1; // To find the actual header row

        // Search for headers in the first 10 rows
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const currentRow = rows[i].map(normalizeHeader);
          const currentTermini = findHeaderIndex(currentRow, HEADER_VARIANTS_TERMINI);
          const currentContent = findHeaderIndex(currentRow, HEADER_VARIANTS_CONTENT);
          const currentDueDate = findHeaderIndex(currentRow, HEADER_VARIANTS_DUE_DATE);

          // Prioritize rows that contain more of the target headers
          let foundCount = [currentTermini, currentContent, currentDueDate].filter(idx => idx !== -1).length;
          
          if (foundCount > [terminiColIndex, contentColIndex, dueDateColIndex].filter(idx => idx !== -1).length || maxHeaderRowIndex === -1) {
             if (currentTermini !== -1) terminiColIndex = currentTermini;
             if (currentContent !== -1) contentColIndex = currentContent;
             if (currentDueDate !== -1) dueDateColIndex = currentDueDate;
             headerRowValues = currentRow; // Store the headers of this potential row
             maxHeaderRowIndex = i; // Update the row index considered as header
          }
          // If all three found in this row, break early
          if (terminiColIndex !== -1 && contentColIndex !== -1 && dueDateColIndex !== -1) break;
        }
        
        const errorMessages: string[] = [];
        if (terminiColIndex === -1 && (HEADER_VARIANTS_TERMINI.includes(APP_HEADER_TERMINI) || HEADER_VARIANTS_TERMINI.includes(APP_HEADER_TERMINI.substring(1)))) {
           // Termini is optional if not explicitly among primary required headers
        } else if (terminiColIndex === -1) {
           // If Termini *is* considered primary (not the case with current config but for robustness)
           // errorMessages.push(`Columna Termini no trobada (variants esperades: ${HEADER_VARIANTS_TERMINI.join(', ')})`);
        }

        if (contentColIndex === -1) errorMessages.push(`Columna Contingut no trobada (variants esperades: ${HEADER_VARIANTS_CONTENT.join(', ')})`);
        if (dueDateColIndex === -1) errorMessages.push(`Columna Data a Fer no trobada (variants esperades: ${HEADER_VARIANTS_DUE_DATE.join(', ')})`);
        
        if (contentColIndex === -1 || dueDateColIndex === -1 ) { // Critical headers missing
           throw new Error(`No s'han pogut trobar totes les columnes necessàries. Detalls: ${errorMessages.join('; ')}. Assegura't que el CSV conté aquestes capçaleres a les primeres files.`);
        }
        
        // If maxHeaderRowIndex is still -1, it means no identifiable header row was found for critical columns.
        if (maxHeaderRowIndex === -1 && (contentColIndex === -1 || dueDateColIndex === -1)) {
          throw new Error(`No s'ha trobat una fila de capçalera vàlida amb '${APP_HEADER_CONTENT}' i '${APP_HEADER_DUE_DATE}' dins les primeres 10 files.`);
        }


        const dataStartRow = maxHeaderRowIndex + 1;
        const tasks: Partial<Task>[] = [];

        for (let i = dataStartRow; i < rows.length; i++) {
          const row = rows[i];
          if (row.every(cell => !cell || cell.trim() === '')) continue; // Skip empty rows

          const content = row[contentColIndex]?.trim() || '';
          // If content is empty, but other cells in expected columns might have data, skip
          if (!content) continue;

          const terminiRaw = terminiColIndex !== -1 ? (row[terminiColIndex]?.trim() || "N/A") : "N/A";
          const originalDueDateRaw = row[dueDateColIndex]?.trim() || "Data no especificada";
          
          const originalDueDate = parseCustomDateString(originalDueDateRaw);

          tasks.push({
            content,
            terminiRaw,
            originalDueDate,
            adjustedDate: originalDueDate, // Initially same as original
          });
        }
        resolve(tasks);
      } catch (error: any) {
        console.error("Error processing CSV file:", error);
        reject(new Error(error.message || "Error en processar el fitxer CSV."));
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      reject(new Error("No s'ha pogut llegir el fitxer."));
    };
    reader.readAsText(file, 'UTF-8'); // Specify UTF-8 encoding
  });
};


// --- Task Object Creation ---

/**
 * Creates a new full Task object from partial data.
 * @param partialTask Partial task data.
 * @returns A full Task object with defaults.
 */
export const createNewTaskObject = (partialTask: Partial<Task>): Task => {
  const now = new Date();
  const task: Task = {
    id: partialTask.id || uuidv4(),
    content: partialTask.content || "Nova Tasca",
    terminiRaw: partialTask.terminiRaw || "N/A",
    originalDueDate: partialTask.originalDueDate || "Data no especificada",
    adjustedDate: partialTask.adjustedDate || partialTask.originalDueDate || "Data no especificada",
    status: partialTask.status || DEFAULT_TASK_STATUS,
    color: partialTask.color || INITIAL_POSTIT_COLOR,
    createdAt: partialTask.createdAt || now,
    inicio: partialTask.inicio,
    convocatoria: partialTask.convocatoria,
    accio: partialTask.accio,
    cp: partialTask.cp,
    nomAccio: partialTask.nomAccio,
    centro: partialTask.centro,
  };
  // Include uploaded image if provided
  if (partialTask.logoFile) {
    task.logoFile = partialTask.logoFile;
  }
  return task;
};


// --- CSV Export ---

const formatForCSV = (value: any): string => {
  if (value instanceof Date && isValid(value)) {
    return format(value, 'dd/MM/yyyy');
  }
  if (typeof value === 'string') {
    // Escape quotes by doubling them, and enclose in quotes if it contains comma, newline, or quote
    const str = value.replace(/"/g, '""');
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  }
  return value?.toString() || '';
};


export const exportTasksToCSV = (tasks: Task[]): string => {
  if (!tasks.length) return "";

  const headers = [
    APP_HEADER_TERMINI,
    APP_HEADER_CONTENT,
    APP_HEADER_DUE_DATE, // Represents originalDueDate for export consistency
    '#DATA AJUSTADA', // adjustedDate
    '#ESTAT',
    '#COLOR',
    '#DATA CREACIÓ',
    '#ID'
  ];

  const csvRows = [headers.join(',')];

  tasks.forEach(task => {
    const row = [
      formatForCSV(task.terminiRaw),
      formatForCSV(task.content),
      formatForCSV(task.originalDueDate),
      formatForCSV(task.adjustedDate),
      formatForCSV(task.status),
      formatForCSV(task.color),
      formatForCSV(task.createdAt),
      formatForCSV(task.id)
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

// --- XLSX Parsing (Legacy or alternative) ---
// This function is kept for potential future use or if XLSX import is re-enabled.
// Currently, the primary import is CSV.

// Define expected column names for XLSX (can be same as CSV for consistency)
const XLSX_COLUMN_TERMINI = APP_HEADER_TERMINI; // e.g., '#TERMINI'
const XLSX_COLUMN_CONTENT = APP_HEADER_CONTENT; // e.g., '#DOCUMENTS/ACCIONS'
const XLSX_COLUMN_DUE_DATE = APP_HEADER_DUE_DATE; // e.g., '#DATA A FER'

export const parseXLSXFile = async (file: File): Promise<Partial<Task>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          reject(new Error("El fitxer XLSX està buit o no té dades."));
          return;
        }
        
        const headers: string[] = (jsonData[0] as string[]).map(h => String(h).trim());
        
        const terminiIndex = headers.findIndex(h => normalizeHeader(h) === normalizeHeader(XLSX_COLUMN_TERMINI));
        const contentIndex = headers.findIndex(h => normalizeHeader(h) === normalizeHeader(XLSX_COLUMN_CONTENT));
        const dueDateIndex = headers.findIndex(h => normalizeHeader(h) === normalizeHeader(XLSX_COLUMN_DUE_DATE));

        if (terminiIndex === -1 || contentIndex === -1 || dueDateIndex === -1) {
          let missingCols = [];
          if (terminiIndex === -1) missingCols.push(XLSX_COLUMN_TERMINI);
          if (contentIndex === -1) missingCols.push(XLSX_COLUMN_CONTENT);
          if (dueDateIndex === -1) missingCols.push(XLSX_COLUMN_DUE_DATE);
          reject(new Error(`Falten columnes necessàries. Assegura't que '${missingCols.join("', '")}' són presents a la capçalera del XLSX.`));
          return;
        }
        
        const tasks: Partial<Task>[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row: any[] = jsonData[i] as any[];
          if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;

          const content = row[contentIndex] ? String(row[contentIndex]).trim() : '';
          if (!content) continue;

          const terminiRaw = row[terminiIndex] ? String(row[terminiIndex]).trim() : "N/A";
          
          let originalDueDate: Date | string = "Data no especificada";
          const dueDateCell = row[dueDateIndex];
          if (dueDateCell instanceof Date && isValid(dueDateCell)) {
            originalDueDate = dueDateCell;
          } else if (typeof dueDateCell === 'string' && dueDateCell.trim()) {
            originalDueDate = parseCustomDateString(dueDateCell.trim());
          } else if (typeof dueDateCell === 'number') { // Excel date serial number
             const excelSerialDate = parseFloat(String(dueDateCell));
             const baseDate = new Date(1899, 11, 30);
             const parsedDate = new Date(baseDate.valueOf() + (excelSerialDate - 1) * 24 * 60 * 60 * 1000);
             if(isValid(parsedDate)) originalDueDate = parsedDate;
          }


          tasks.push({
            content,
            terminiRaw,
            originalDueDate,
            adjustedDate: originalDueDate,
          });
        }
        resolve(tasks);
      } catch (error: any) {
        console.error("Error processing XLSX file:", error);
        reject(new Error(error.message || "Error en processar el fitxer XLSX."));
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      reject(new Error("No s'ha pogut llegir el fitxer."));
    };
    reader.readAsArrayBuffer(file);
  });
};
