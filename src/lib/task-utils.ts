
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
    // Try parseISO first for strict ISO, then fallback to new Date for leniency
    try {
        parsedDate = parseISO(trimmedDateStr);
        if (isValid(parsedDate)) return parsedDate;
    } catch (e) { /* Ignore parseISO error and try new Date() */ }

    // Fallback for YYYY-MM-DD that parseISO might not catch (e.g. YYYY-M-D)
    // or if a more general interpretation is needed.
    const parts = trimmedDateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) -1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        const dateFromParts = new Date(Date.UTC(year, month, day)); // Use UTC to avoid timezone shifts
        if (isValid(dateFromParts) && 
            dateFromParts.getUTCFullYear() === year &&
            dateFromParts.getUTCMonth() === month &&
            dateFromParts.getUTCDate() === day) {
            return dateFromParts;
        }
    }
  }
  
  return null; // Return null if no format matches or date is invalid
}


export const parseTaskFile = async (file: File): Promise<Partial<Task>[]> => {
  const fileText = await file.text();
  const lines = fileText.split(/\r?\n/);

  if (lines.length === 0) return [];

  let headerRowIndex = -1;
  const csvHeaders: string[] = [];

  // Search for the header row more flexibly by checking for the presence of all required headers
  for (let i = 0; i < lines.length; i++) {
    // Split by comma, trim, and uppercase each cell for comparison
    const potentialHeaderLine = lines[i].split(',').map(cell => String(cell || '').trim().toUpperCase());
    
    // Check if all required headers are present in this line
    const hasTermini = potentialHeaderLine.includes(APP_HEADER_TERMINI);
    const hasContent = potentialHeaderLine.includes(APP_HEADER_CONTENT);
    const hasDueDate = potentialHeaderLine.includes(APP_HEADER_DUE_DATE);

    if (hasTermini && hasContent && hasDueDate) {
      headerRowIndex = i;
      csvHeaders.push(...potentialHeaderLine); // Store the found headers
      break; 
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error(`Missing required header row or columns. Ensure CSV contains a row with '${APP_HEADER_TERMINI}', '${APP_HEADER_CONTENT}', and '${APP_HEADER_DUE_DATE}'. All must start with '#'.`);
  }
  
  const terminiIndex = csvHeaders.indexOf(APP_HEADER_TERMINI);
  const contentIndex = csvHeaders.indexOf(APP_HEADER_CONTENT);
  const dueDateIndex = csvHeaders.indexOf(APP_HEADER_DUE_DATE);

  // This check is somewhat redundant if the loop condition for finding headerRowIndex worked,
  // but good for safety. indexOf would return -1 if any were not found.
  if (terminiIndex === -1 || contentIndex === -1 || dueDateIndex === -1) {
    throw new Error(`One or more required headers ('${APP_HEADER_TERMINI}', '${APP_HEADER_CONTENT}', '${APP_HEADER_DUE_DATE}') not found in the identified header row. Indices: Termini=${terminiIndex}, Content=${contentIndex}, DueDate=${dueDateIndex}. Headers found: ${csvHeaders.join(', ')}`);
  }
  
  const tasks: Partial<Task>[] = [];
  const dataStartRow = headerRowIndex + 1;

  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') {
      continue; 
    }
    
    // Basic CSV parsing: split by comma. This doesn't handle commas within quoted fields.
    // For more robust CSV parsing, a library would be better, but this matches previous implementation.
    const row = line.split(','); 

    const maxIndexRequired = Math.max(terminiIndex, contentIndex, dueDateIndex);
    if (row.length <= maxIndexRequired) {
        console.warn(`Skipping row ${i + 1}: Not enough columns to access all required data. Expected at least ${maxIndexRequired + 1} columns based on header indices, got ${row.length}. Line: "${line}"`);
        continue;
    }

    // Extract raw string values, trim them.
    const terminiRaw = String(row[terminiIndex] || '').trim();
    const content = String(row[contentIndex] || '').trim();
    const originalDueDateStr = String(row[dueDateIndex] || '').trim();
    
    // Skip row if all key fields are empty (after trimming)
    if (content === '' && terminiRaw === '' && originalDueDateStr === '') {
      // console.warn(`Skipping row ${i+1} as it appears to be empty or irrelevant based on key fields.`);
      continue;
    }

    // Content is mandatory
    if (content === '') {
        console.warn(`Skipping row ${i + 1} due to missing content in column ${contentIndex + 1} (header '${APP_HEADER_CONTENT}'). Line: "${line}"`);
        continue;
    }
    
    let taskDueDateField: Date | string;
    const parsedDate = parseCustomDateString(originalDueDateStr);

    if (parsedDate && isValid(parsedDate)) {
        taskDueDateField = parsedDate;
    } else {
        taskDueDateField = originalDueDateStr || "Data no especificada"; // Store original string or placeholder
        if (originalDueDateStr && originalDueDateStr.toUpperCase() !== "#VALUE!") { // Don't warn for expected #VALUE!
           console.warn(`Row ${i + 1}: Invalid or missing date in column ${dueDateIndex + 1} (header '${APP_HEADER_DUE_DATE}', value: "${originalDueDateStr}"). Using raw string or placeholder: "${taskDueDateField}". Line: "${line}"`);
        }
    }

    tasks.push({
      content,
      originalDueDate: taskDueDateField,
      terminiRaw, // This is the raw string from the CSV cell
      adjustedDate: taskDueDateField, 
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
    finalAdjustedDate = (partialTask.adjustedDate instanceof Date && isValid(partialTask.adjustedDate)) 
      ? partialTask.adjustedDate 
      : finalOriginalDueDate;
  } else if (typeof partialTask.originalDueDate === 'string') {
    finalOriginalDueDate = partialTask.originalDueDate; 
    finalAdjustedDate = (typeof partialTask.adjustedDate === 'string')
      ? partialTask.adjustedDate
      : (partialTask.adjustedDate instanceof Date && isValid(partialTask.adjustedDate) ? partialTask.adjustedDate : finalOriginalDueDate);
  } else {
    console.warn(`Task ${id} received invalid or missing originalDueDate. Defaulting to "Data no especificada". Input was:`, partialTask.originalDueDate);
    finalOriginalDueDate = "Data no especificada"; 
    finalAdjustedDate = "Data no especificada";
  }
  
  if (typeof finalOriginalDueDate === 'string' && finalAdjustedDate instanceof Date && isValid(finalAdjustedDate)) {
    // Okay: original was string placeholder, adjusted is a valid date.
  } else if (typeof finalOriginalDueDate === 'string' && typeof finalAdjustedDate !== 'string') {
      finalAdjustedDate = finalOriginalDueDate; 
  }


  return {
    id: id,
    content: partialTask.content || `Nova tasca ${id.substring(0,4)}`,
    // Preserve terminiRaw as is if it's a string (even empty), otherwise default to "N/A"
    terminiRaw: typeof partialTask.terminiRaw === 'string' ? partialTask.terminiRaw : "N/A",
    originalDueDate: finalOriginalDueDate,
    adjustedDate: finalAdjustedDate,
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
    if (["Data no especificada", "Data Desconeguda", "N/A"].includes(date)) return date;
    if (date.toUpperCase() === "#VALUE!") return "Data invàlida (#VALUE!)";

    const parsedDate = parseCustomDateString(date);
    if (parsedDate && isValid(parsedDate)) {
      return format(parsedDate, 'dd/MM/yyyy');
    }
    // If it's a string but not a known placeholder and not parsable, return the string itself,
    // as it might be a descriptive text rather than an attempt at a date.
    // However, for very long strings, we might still want to truncate for display if it's clearly not a date.
    // For now, returning as is, as per "tal cual" for non-date strings.
    return date; 
  }
  
  return 'Data desconeguda'; 
};

function escapeCsvCell(cellData: any): string {
  if (cellData == null) return ''; 
  
  let cell = '';
  if (cellData instanceof Date && isValid(cellData)) {
    cell = format(cellData, 'dd/MM/yyyy'); // Use 'dd/MM/yyyy' for CSV export of dates
  } else if (typeof cellData === 'string'){
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
  // Define headers exactly as expected by the import function for consistency
  const headerLine = [APP_HEADER_TERMINI, APP_HEADER_CONTENT, APP_HEADER_DUE_DATE].join(',');
  
  const rows = tasks.map(task => {
    const termini = escapeCsvCell(task.terminiRaw);
    const content = escapeCsvCell(task.content);
    // When exporting, originalDueDate might be what the user expects if they re-import.
    // However, adjustedDate reflects changes. Let's use adjustedDate for export
    // as it reflects the current state of the task's date.
    // formatDate will handle Date objects and string placeholders correctly.
    const dueDateValue = task.adjustedDate instanceof Date && isValid(task.adjustedDate)
                         ? format(task.adjustedDate, 'dd/MM/yyyy')
                         : (typeof task.adjustedDate === 'string' ? task.adjustedDate : '');

    const dueDate = escapeCsvCell(dueDateValue); 
    return [termini, content, dueDate].join(',');
  });

  return [headerLine, ...rows].join('\n');
};
