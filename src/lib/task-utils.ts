
import { parse, isValid, format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Task } from '@/types';
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

// Helper to parse various date string formats (DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD)
// Exported for use in TaskCard and AddTaskForm
export function parseCustomDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmedDateStr = dateStr.trim();
  if (trimmedDateStr.toUpperCase() === '#VALUE!' || trimmedDateStr === '-' || trimmedDateStr === '' || ["Data no especificada", "Data Desconeguda", "N/A"].includes(trimmedDateStr)) return null;


  let parsedDate: Date | null = null;
  const referenceDate = new Date(); 

  // Handle 'dd/MM/yyyy' format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedDateStr)) {
    parsedDate = parse(trimmedDateStr, 'dd/MM/yyyy', referenceDate);
    if (isValid(parsedDate)) return parsedDate;
  }
  
  // Handle 'dd/MM/yy' format
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(trimmedDateStr)) {
    parsedDate = parse(trimmedDateStr, 'dd/MM/yy', referenceDate);
    if (isValid(parsedDate)) return parsedDate;
  }
  
  // Handle 'yyyy-MM-dd' format (ISO or similar)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmedDateStr)) {
    try {
        // Try direct ISO parsing first
        parsedDate = parseISO(trimmedDateStr);
        if (isValid(parsedDate)) return parsedDate;
    } catch (e) { /* Ignore, try manual parsing */ }

    // Manual parsing for 'yyyy-MM-dd' if parseISO fails or is too strict
    const parts = trimmedDateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) -1; // Month is 0-indexed in Date
        const day = parseInt(parts[2], 10);
        // Ensure parts are valid numbers and form a valid date
        const dateFromParts = new Date(Date.UTC(year, month, day)); // Use UTC to avoid timezone issues with date-only strings
        if (isValid(dateFromParts) && 
            dateFromParts.getUTCFullYear() === year &&
            dateFromParts.getUTCMonth() === month &&
            dateFromParts.getUTCDate() === day) { // Check if parts created the intended date
            return dateFromParts;
        }
    }
  }
  
  // Fallback for other potential Excel date serial numbers or unhandled formats (attempt general parsing)
  // This is very broad, might need refinement if specific unhandled formats appear
  const generalParseAttempt = new Date(trimmedDateStr);
  if (isValid(generalParseAttempt)) {
    return generalParseAttempt;
  }

  return null; 
}

const cleanHeader = (header: string): string => {
  return String(header || '').trim().toUpperCase();
};


export const parseTaskFile = async (file: File): Promise<Partial<Task>[]> => {
  const fileText = await file.text();
  const lines = fileText.split(/\r?\n/);

  if (lines.length === 0) return [];

  let terminiColIndex = -1;
  let contentColIndex = -1;
  let dueDateColIndex = -1;
  let maxHeaderRowIndex = -1; 

  const MAX_HEADER_SCAN_LINES = 20; 

  const VARIANTS_TERMINI_UPPER = HEADER_VARIANTS_TERMINI.map(s => cleanHeader(s));
  const VARIANTS_CONTENT_UPPER = HEADER_VARIANTS_CONTENT.map(s => cleanHeader(s));
  const VARIANTS_DUE_DATE_UPPER = HEADER_VARIANTS_DUE_DATE.map(s => cleanHeader(s));
  
  const foundHeaders: { [key: string]: string } = {};

  for (let i = 0; i < Math.min(lines.length, MAX_HEADER_SCAN_LINES); i++) {
    const lineContent = lines[i];
    if (lineContent.trim() === '' || lineContent.split(',').every(cell => cell.trim() === '')) continue;

    const currentCells = lineContent.split(',').map(cell => String(cell || '').trim());
    const currentCellsUpper = currentCells.map(cell => cleanHeader(cell));
    
    let headersFoundInThisRow = 0;

    if (terminiColIndex === -1) {
      for (const variant of VARIANTS_TERMINI_UPPER) {
        const idx = currentCellsUpper.indexOf(variant);
        if (idx !== -1) {
          terminiColIndex = idx;
          foundHeaders[APP_HEADER_TERMINI] = currentCells[idx];
          headersFoundInThisRow++;
          break; 
        }
      }
    }
    if (contentColIndex === -1) {
      for (const variant of VARIANTS_CONTENT_UPPER) {
        const idx = currentCellsUpper.indexOf(variant);
        if (idx !== -1) {
          contentColIndex = idx;
          foundHeaders[APP_HEADER_CONTENT] = currentCells[idx];
          headersFoundInThisRow++;
          break;
        }
      }
    }
    if (dueDateColIndex === -1) {
       for (const variant of VARIANTS_DUE_DATE_UPPER) {
        const idx = currentCellsUpper.indexOf(variant);
        if (idx !== -1) {
          dueDateColIndex = idx;
          foundHeaders[APP_HEADER_DUE_DATE] = currentCells[idx];
          headersFoundInThisRow++;
          break;
        }
      }
    }
    
    // If at least two of the primary target headers are found in this row, consider it the header row.
    // This handles cases where one might be optional (like #TERMINI) or uses a very different variant.
    const primaryHeadersFound = (foundHeaders[APP_HEADER_CONTENT] ? 1:0) + (foundHeaders[APP_HEADER_DUE_DATE] ? 1:0);
    
    if (headersFoundInThisRow > 0 && primaryHeadersFound >=1) { // Check if we found at least one expected header
      // If a more complete header row is found later, it will overwrite maxHeaderRowIndex.
      // We prioritize rows that contain more of the target headers.
      if (i > maxHeaderRowIndex || headersFoundInThisRow > (Object.keys(foundHeaders).length) ) {
         maxHeaderRowIndex = i;
      }
      // If we've found all three target headers, we can confidently break.
      if (terminiColIndex !== -1 && contentColIndex !== -1 && dueDateColIndex !== -1) {
          maxHeaderRowIndex = i; // Ensure this row is marked as header row
          break; 
      }
    }
  }
  
  const errorMessages: string[] = [];
  if (contentColIndex === -1) {
    errorMessages.push(`Columna Contingut no trobada (variants esperades: ${HEADER_VARIANTS_CONTENT.join(', ')})`);
  }
  if (dueDateColIndex === -1) {
    errorMessages.push(`Columna Data a Fer no trobada (variants esperades: ${HEADER_VARIANTS_DUE_DATE.join(', ')})`);
  }
   // Termini is optional, so we don't throw an error if it's missing, but warn.
  if (terminiColIndex === -1 && maxHeaderRowIndex !== -1) { // Only warn if we think we found a header row
    console.warn(`Columna Termini no trobada (variants: ${HEADER_VARIANTS_TERMINI.join(', ')}). Les dades de Termini seran "N/A" per defecte.`);
  }


  if (contentColIndex === -1 || dueDateColIndex === -1 ) { // Critical headers missing
     throw new Error(`No s'han pogut trobar totes les columnes necessàries. Detalls: ${errorMessages.join('; ')}. Assegura't que el CSV conté aquestes capçaleres a les primeres files.`);
  }
  
  // If maxHeaderRowIndex is still -1, it means no identifiable header row was found.
  // This can happen if the CSV has no headers, or headers are completely different.
  if (maxHeaderRowIndex === -1) {
      console.warn("No s'ha pogut identificar una fila de capçalera clara. S'intentarà processar les dades assumint un ordre de columnes per defecte si les columnes crítiques s'han trobat (això no hauria de passar si contentColIndex o dueDateColIndex són -1).");
      // This state implies an issue with the CSV or parsing logic if critical checks failed.
      // If criticals somehow passed but no header row ID'd, something is very off.
      // For now, the throw above for missing critical headers should catch most headerless issues.
  }

  const dataStartRow = maxHeaderRowIndex === -1 ? 0 : maxHeaderRowIndex + 1; // If no header row, start from first line

  if (dataStartRow >= lines.length && maxHeaderRowIndex !== -1) { 
     console.warn("Capçaleres trobades, però no s'han detectat línies de dades després de les capçaleres.");
     return [];
  }
  
  const tasks: Partial<Task>[] = [];
  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i];
    // Skip if line is completely empty or only contains commas
    if (line.trim() === '' || line.split(',').every(cell => cell.trim() === '')) { 
        continue; 
    }
    
    const row = line.split(','); 

    const terminiRaw = (terminiColIndex !== -1 && row[terminiColIndex]) ? String(row[terminiColIndex] || '').trim() : "N/A";
    const content = (contentColIndex !== -1 && row[contentColIndex]) ? String(row[contentColIndex] || '').trim() : "";
    const originalDueDateStr = (dueDateColIndex !== -1 && row[dueDateColIndex]) ? String(row[dueDateColIndex] || '').trim() : "";
    
    // Skip row if essential content is missing. Termini and DueDate can be somewhat flexible.
    if (content === '') { 
      console.warn(`Saltant fila ${i + 1} per contingut buit. Termini: "${terminiRaw}", DataVenciment: "${originalDueDateStr}". Línia: "${line}"`);
      continue;
    }

    let taskDueDateField: Date | string;
    const parsedDate = parseCustomDateString(originalDueDateStr);

    if (parsedDate && isValid(parsedDate)) {
        taskDueDateField = parsedDate;
    } else {
        // Keep original string if parsing fails or if it's a special string like '#VALUE!'
        taskDueDateField = originalDueDateStr || "Data no especificada"; 
    }
    
    tasks.push({
      content,
      originalDueDate: taskDueDateField,
      terminiRaw: terminiRaw, 
      adjustedDate: taskDueDateField, 
    });
  }
  return tasks;
};

export const createNewTaskObject = (partialTask: Partial<Task>): Task => {
  const now = new Date();
  const id = partialTask.id || uuidv4(); 

  const determineDateValue = (dateInput: Date | string | undefined): Date | string => {
    if (dateInput instanceof Date && isValid(dateInput)) {
      return dateInput;
    }
    if (typeof dateInput === 'string' && dateInput.trim() !== "") {
      const parsed = parseCustomDateString(dateInput);
      if (parsed && isValid(parsed)) return parsed;
      // If parsing fails, return the original string (could be "N/A", "#VALUE!", etc.)
      return dateInput; 
    }
    return "Data no especificada"; // Default if undefined or empty string
  };

  const finalOriginalDueDate = determineDateValue(partialTask.originalDueDate);
  // If adjustedDate is not provided, default it to originalDueDate.
  // If it IS provided, process it with determineDateValue as well.
  const finalAdjustedDate = determineDateValue(partialTask.adjustedDate ?? finalOriginalDueDate);
  
  // Ensure terminiRaw is always a string, defaulting to "N/A" if undefined.
  const terminiValue = typeof partialTask.terminiRaw === 'string' 
    ? partialTask.terminiRaw 
    : (partialTask.terminiRaw === undefined ? "N/A" : String(partialTask.terminiRaw));


  return {
    id: id,
    content: partialTask.content || `Nova tasca ${id.substring(0,4)}`,
    terminiRaw: terminiValue, // Directly use the processed string
    originalDueDate: finalOriginalDueDate, // This is what was 'DATA A FER'
    adjustedDate: finalAdjustedDate, // User-editable date, defaults to originalDueDate
    status: partialTask.status || DEFAULT_TASK_STATUS,
    color: partialTask.color || INITIAL_POSTIT_COLOR,
    createdAt: (partialTask.createdAt && partialTask.createdAt instanceof Date && isValid(partialTask.createdAt)) ? partialTask.createdAt : now,
  };
};

// Exported for use in TaskCard and AddTaskForm for consistent display
export const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return 'N/A'; // Handles null, undefined
  
  if (date instanceof Date) {
    if (isValid(date)) {
      return format(date, 'dd/MM/yyyy');
    }
    return 'Data invàlida'; // Should not happen if date is validated before storing
  }
  
  // If it's a string, it might be a pre-formatted date, a special string, or something unparseable
  if (typeof date === 'string') {
    // Handle specific non-date strings first
    if (["Data no especificada", "Data Desconeguda", "N/A"].includes(date) || date.toUpperCase() === "#VALUE!") {
        return date; // Return as is
    }
    // Attempt to parse it, if successful, format it. Otherwise, return the string itself.
    const parsedDate = parseCustomDateString(date);
    if (parsedDate && isValid(parsedDate)) {
      return format(parsedDate, 'dd/MM/yyyy');
    }
    return date; // Return original string if not parseable or not a special string
  }
  
  return 'Data desconeguda'; // Fallback for other types (e.g. number, though not expected)
};


// Helper for CSV export to ensure data is escaped correctly
function escapeCsvCell(cellData: any): string {
  if (cellData == null) return ''; // Handle null or undefined by returning an empty string
  
  let cell = '';
  // If it's a Date object, format it.
  if (cellData instanceof Date && isValid(cellData)) {
    cell = format(cellData, 'dd/MM/yyyy'); // Standard export format
  } else if (typeof cellData === 'string'){
    // If it's already one of our special "non-date" strings, use it as is
    if (["Data no especificada", "Data Desconeguda", "N/A"].includes(cellData) || cellData.toUpperCase() === "#VALUE!") {
        cell = cellData;
    } else {
        // Otherwise, attempt to parse and reformat. If not parseable, use original string.
        const parsed = parseCustomDateString(cellData);
        cell = (parsed && isValid(parsed)) ? format(parsed, 'dd/MM/yyyy') : cellData;
    }
  } else {
     // For any other type, convert to string
     cell = String(cellData);
  }

  // Escape quotes and handle commas/newlines
  if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
    cell = `"${cell.replace(/"/g, '""')}"`; // Replace " with "" and wrap in quotes
  }
  return cell;
}


export const exportTasksToCSV = (tasks: Task[]): string => {
  // Use the # prefixed headers for export consistency, as defined in app-config
  const headerLine = [APP_HEADER_TERMINI, APP_HEADER_CONTENT, APP_HEADER_DUE_DATE].join(',');
  
  const rows = tasks.map(task => {
    const termini = escapeCsvCell(task.terminiRaw);
    const content = escapeCsvCell(task.content);
    
    // For export, use originalDueDate as it represents '#DATA A FER'
    // Ensure it's formatted correctly if it's a Date object, or use the string as is.
    const dueDateExportValue = task.originalDueDate instanceof Date && isValid(task.originalDueDate)
                         ? format(task.originalDueDate, 'dd/MM/yyyy') 
                         : (typeof task.originalDueDate === 'string' ? task.originalDueDate : '');

    const dueDate = escapeCsvCell(dueDateExportValue); 
    return [termini, content, dueDate].join(',');
  });

  // Join header and rows with newline character
  return [headerLine, ...rows].join('\n');
};
