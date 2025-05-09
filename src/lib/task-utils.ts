
import { parse, isValid, format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Task } from '@/types';
import { 
  APP_HEADER_TERMINI, 
  APP_HEADER_CONTENT, 
  APP_HEADER_DUE_DATE,
  INITIAL_POSTIT_COLOR,
  DEFAULT_TASK_STATUS
} from '@/config/app-config';

// Helper to parse various date string formats (DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD)
function parseCustomDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmedDateStr = dateStr.trim();
  // Handle common non-date placeholders found in CSVs
  if (trimmedDateStr.toUpperCase() === '#VALUE!' || trimmedDateStr === '-' || trimmedDateStr === '') return null;

  let parsedDate: Date | null = null;
  const referenceDate = new Date(); // For 'yy' parsing context

  // Attempt parsing DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedDateStr)) {
    parsedDate = parse(trimmedDateStr, 'dd/MM/yyyy', referenceDate);
    if (isValid(parsedDate)) return parsedDate;
  }
  
  // Attempt parsing DD/MM/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(trimmedDateStr)) {
    parsedDate = parse(trimmedDateStr, 'dd/MM/yy', referenceDate);
    if (isValid(parsedDate)) return parsedDate;
  }
  
  // Attempt parsing YYYY-MM-DD (ISO-like)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmedDateStr)) {
    try {
        parsedDate = parseISO(trimmedDateStr);
        if (isValid(parsedDate)) return parsedDate;
    } catch (e) { /* Ignore parseISO error and try new Date() */ }

    const parts = trimmedDateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) -1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        const dateFromParts = new Date(Date.UTC(year, month, day)); 
        if (isValid(dateFromParts) && 
            dateFromParts.getUTCFullYear() === year &&
            dateFromParts.getUTCMonth() === month &&
            dateFromParts.getUTCDate() === day) {
            return dateFromParts;
        }
    }
  }
  
  return null; 
}


export const parseTaskFile = async (file: File): Promise<Partial<Task>[]> => {
  const fileText = await file.text();
  const lines = fileText.split(/\r?\n/);

  if (lines.length === 0) return [];

  let terminiIndex = -1;
  let contentIndex = -1;
  let dueDateIndex = -1;
  let primaryHeaderRowIndex = -1; // Row index containing #TERMINI and #DOCUMENTS/ACCIONS

  // Scan lines to find column indices for each header and the primary header row
  for (let i = 0; i < lines.length; i++) {
    const lineContent = lines[i];
    // Skip effectively empty lines (e.g., just commas or whitespace)
    if (!lineContent.replace(/,/g, '').trim()) {
      continue;
    }
    const cells = lineContent.split(',').map(cell => String(cell || '').trim().toUpperCase());

    const currentTerminiInLine = cells.indexOf(APP_HEADER_TERMINI);
    const currentContentInLine = cells.indexOf(APP_HEADER_CONTENT);
    const currentDueDateInLine = cells.indexOf(APP_HEADER_DUE_DATE);

    if (terminiIndex === -1 && currentTerminiInLine !== -1) {
      terminiIndex = currentTerminiInLine;
    }
    if (contentIndex === -1 && currentContentInLine !== -1) {
      contentIndex = currentContentInLine;
    }
    if (dueDateIndex === -1 && currentDueDateInLine !== -1) {
      dueDateIndex = currentDueDateInLine;
    }

    // Identify the primary header row (contains both #TERMINI and #DOCUMENTS/ACCIONS)
    // This row determines where data rows begin.
    if (currentTerminiInLine !== -1 && currentContentInLine !== -1) {
      primaryHeaderRowIndex = i;
      // Ensure terminiIndex and contentIndex are from this primary header row
      terminiIndex = currentTerminiInLine;
      contentIndex = currentContentInLine;
    }
  }

  // Validate that all required column indices were found
  const missingHeaders: string[] = [];
  if (terminiIndex === -1) missingHeaders.push(APP_HEADER_TERMINI);
  if (contentIndex === -1) missingHeaders.push(APP_HEADER_CONTENT);
  if (dueDateIndex === -1) missingHeaders.push(APP_HEADER_DUE_DATE);

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required column(s): ${missingHeaders.join(', ')}. Ensure CSV contains columns with these headers (all must start with '#').`);
  }
  
  // Validate that a primary header row (for #TERMINI and #DOCUMENTS/ACCIONS) was found
  if (primaryHeaderRowIndex === -1) {
    throw new Error(`Could not find a header row containing both '${APP_HEADER_TERMINI}' and '${APP_HEADER_CONTENT}'. Please ensure these headers are on the same line above the data entries.`);
  }
  
  const tasks: Partial<Task>[] = [];
  const dataStartRow = primaryHeaderRowIndex + 1;

  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i];
    if (!line.replace(/,/g, '').trim()) { // Skip effectively empty lines
      continue; 
    }
    
    const row = line.split(','); 

    const maxIndexRequired = Math.max(terminiIndex, contentIndex, dueDateIndex);
    if (row.length <= maxIndexRequired) {
        console.warn(`Skipping row ${i + 1}: Not enough columns (${row.length}) to access all required data up to index ${maxIndexRequired}. Line: "${line}"`);
        continue;
    }

    const terminiRaw = String(row[terminiIndex] || '').trim();
    const content = String(row[contentIndex] || '').trim();
    const originalDueDateStr = String(row[dueDateIndex] || '').trim();
    
    if (content === '') {
      // console.warn(`Skipping row ${i+1} due to missing content in column ${contentIndex + 1} (header '${APP_HEADER_CONTENT}'). Line: "${line}"`);
      continue;
    }

    let taskDueDateField: Date | string;
    const parsedDate = parseCustomDateString(originalDueDateStr);

    if (parsedDate && isValid(parsedDate)) {
        taskDueDateField = parsedDate;
    } else {
        taskDueDateField = originalDueDateStr || "Data no especificada"; 
        if (originalDueDateStr && originalDueDateStr.toUpperCase() !== "#VALUE!" && !["Data no especificada", "Data Desconeguda", "N/A"].includes(originalDueDateStr)) {
           console.warn(`Row ${i + 1}: Invalid or unparseable date in column ${dueDateIndex + 1} (header '${APP_HEADER_DUE_DATE}', value: "${originalDueDateStr}"). Using raw string or placeholder: "${taskDueDateField}". Line: "${line}"`);
        }
    }

    tasks.push({
      content,
      originalDueDate: taskDueDateField,
      terminiRaw, 
      adjustedDate: taskDueDateField, // Initially same as original
    });
  }
  return tasks;
};

export const createNewTaskObject = (partialTask: Partial<Task>): Task => {
  const now = new Date();
  const id = uuidv4();

  let finalOriginalDueDate: Date | string;
  let finalAdjustedDate: Date | string;

  if (partialTask.originalDueDate instanceof Date && isValid(partialTask.originalDueDate)) {
    finalOriginalDueDate = partialTask.originalDueDate;
  } else if (typeof partialTask.originalDueDate === 'string') {
    finalOriginalDueDate = partialTask.originalDueDate; 
  } else {
    // This case should ideally not be hit if parseTaskFile ensures a string or Date
    console.warn(`Task ${id} received invalid or missing originalDueDate. Defaulting to "Data no especificada". Input was:`, partialTask.originalDueDate);
    finalOriginalDueDate = "Data no especificada"; 
  }
  
  // adjustedDate should mirror originalDueDate upon creation from CSV
  finalAdjustedDate = finalOriginalDueDate;


  return {
    id: id,
    content: partialTask.content || `Nova tasca ${id.substring(0,4)}`,
    terminiRaw: typeof partialTask.terminiRaw === 'string' ? partialTask.terminiRaw : "N/A",
    originalDueDate: finalOriginalDueDate,
    adjustedDate: finalAdjustedDate, // Set to be same as original, no calculations
    status: partialTask.status || DEFAULT_TASK_STATUS,
    color: partialTask.color || INITIAL_POSTIT_COLOR,
    createdAt: partialTask.createdAt ? ( (partialTask.createdAt instanceof Date && isValid(partialTask.createdAt)) ? partialTask.createdAt : now) : now,
  };
};

export const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return 'N/A';
  
  if (date instanceof Date) {
    if (isValid(date)) {
      return format(date, 'dd/MM/yyyy');
    }
    return 'Data invàlida';
  }
  
  if (typeof date === 'string') {
    // Return known placeholders or original string if not a parsable date representation
    if (["Data no especificada", "Data Desconeguda", "N/A"].includes(date) || date.toUpperCase() === "#VALUE!") {
        return date; // Return "#VALUE!" as is, or other placeholders
    }
    // Attempt to parse if it looks like a date, otherwise return the string
    const parsedDate = parseCustomDateString(date);
    if (parsedDate && isValid(parsedDate)) {
      return format(parsedDate, 'dd/MM/yyyy');
    }
    return date; // Return original string if not a known placeholder and not parsable
  }
  
  return 'Data desconeguda'; 
};

function escapeCsvCell(cellData: any): string {
  if (cellData == null) return ''; 
  
  let cell = '';
  if (cellData instanceof Date && isValid(cellData)) {
    cell = format(cellData, 'dd/MM/yyyy'); 
  } else if (typeof cellData === 'string'){
    // For #VALUE! or other placeholders, export them as they are.
    cell = cellData; 
  } else {
     cell = String(cellData);
  }

  if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
    cell = `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export const exportTasksToCSV = (tasks: Task[]): string => {
  const headerLine = [APP_HEADER_TERMINI, APP_HEADER_CONTENT, APP_HEADER_DUE_DATE].join(',');
  
  const rows = tasks.map(task => {
    const termini = escapeCsvCell(task.terminiRaw);
    const content = escapeCsvCell(task.content);
    // For export, use task.originalDueDate, as this reflects the value from the '#DATA A FER' column.
    // If it was a string like "#VALUE!", it should be exported as such.
    // If it was a valid date, formatDate within escapeCsvCell will handle it.
    const dueDateExportValue = task.originalDueDate instanceof Date && isValid(task.originalDueDate)
                         ? format(task.originalDueDate, 'dd/MM/yyyy') // Ensure specific format for dates
                         : (typeof task.originalDueDate === 'string' ? task.originalDueDate : ''); // Export strings as is

    const dueDate = escapeCsvCell(dueDateExportValue); 
    return [termini, content, dueDate].join(',');
  });

  return [headerLine, ...rows].join('\n');
};

