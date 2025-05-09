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
// Exported for use in TaskCard
export function parseCustomDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmedDateStr = dateStr.trim();
  // Handle common non-date placeholders found in CSVs
  if (trimmedDateStr.toUpperCase() === '#VALUE!' || trimmedDateStr === '-' || trimmedDateStr === '' || ["Data no especificada", "Data Desconeguda", "N/A"].includes(trimmedDateStr)) return null;


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
  let maxHeaderRowFound = -1; // Tracks the highest row index where one of our headers is found

  const MAX_HEADER_SCAN_LINES = 20; // Limit scanning for headers to the top N lines

  for (let i = 0; i < Math.min(lines.length, MAX_HEADER_SCAN_LINES); i++) {
    const lineContent = lines[i];
    // Skip effectively empty lines (only commas or whitespace)
    if (!lineContent.split(',').some(cell => cell.trim() !== '')) continue;

    const currentCells = lineContent.split(',').map(cell => String(cell || '').trim().toUpperCase());

    for (let j = 0; j < currentCells.length; j++) {
      const cellValue = currentCells[j];
      if (cellValue === APP_HEADER_TERMINI && terminiIndex === -1) {
        terminiIndex = j;
        maxHeaderRowFound = Math.max(maxHeaderRowFound, i);
      }
      if (cellValue === APP_HEADER_CONTENT && contentIndex === -1) {
        contentIndex = j;
        maxHeaderRowFound = Math.max(maxHeaderRowFound, i);
      }
      if (cellValue === APP_HEADER_DUE_DATE && dueDateIndex === -1) {
        dueDateIndex = j;
        maxHeaderRowFound = Math.max(maxHeaderRowFound, i);
      }
    }
    // Optimization: if all headers are found, we can stop scanning for headers.
    // maxHeaderRowFound will correctly reflect the latest row among these.
    if (terminiIndex !== -1 && contentIndex !== -1 && dueDateIndex !== -1) {
        break; 
    }
  }
  
  const missingHeaders: string[] = [];
  if (terminiIndex === -1) missingHeaders.push(APP_HEADER_TERMINI);
  if (contentIndex === -1) missingHeaders.push(APP_HEADER_CONTENT);
  if (dueDateIndex === -1) missingHeaders.push(APP_HEADER_DUE_DATE);

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required header columns. Ensure CSV contains columns starting with: ${missingHeaders.join(', ')}. These can be on different rows within the first ${MAX_HEADER_SCAN_LINES} lines.`);
  }
  
  const dataStartRow = maxHeaderRowFound + 1;

  if (dataStartRow >= lines.length) {
     console.warn("Headers found, but no data lines detected after the headers or headers are on the last line(s).");
     return []; // No data to parse
  }
  
  const tasks: Partial<Task>[] = [];
  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i];
    // Use a more robust way to check if a line is effectively empty or just commas
    if (!line.split(',').some(cell => cell.trim() !== '')) { 
        continue; 
    }
    
    const row = line.split(','); 

    const maxIndexRequiredByData = Math.max(terminiIndex, contentIndex, dueDateIndex);
    if (row.length <= maxIndexRequiredByData) {
        console.warn(`Skipping row ${i + 1}: Not enough columns (${row.length}) to access all required data up to index ${maxIndexRequiredByData}. Line: "${line}"`);
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
        if (originalDueDateStr && originalDueDateStr.toUpperCase() !== "#VALUE!" && !["Data no especificada", "Data Desconeguda", "N/A"].includes(originalDueDateStr) && !parseCustomDateString(originalDueDateStr)) {
           // console.warn(`Row ${i + 1}: Invalid or unparseable date in column ${dueDateIndex + 1} (header '${APP_HEADER_DUE_DATE}', value: "${originalDueDateStr}"). Using raw string or placeholder: "${taskDueDateField}". Line: "${line}"`);
        }
    }
    
    tasks.push({
      content,
      originalDueDate: taskDueDateField, // Store the date object or the original string
      terminiRaw, 
      adjustedDate: taskDueDateField, // Initially same as original, no calculation
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
    finalOriginalDueDate = "Data no especificada"; 
  }
  
  // adjustedDate should mirror originalDueDate upon creation from CSV, no calculation.
  finalAdjustedDate = finalOriginalDueDate;


  return {
    id: id,
    content: partialTask.content || `Nova tasca ${id.substring(0,4)}`,
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
    if (["Data no especificada", "Data Desconeguda", "N/A"].includes(date) || date.toUpperCase() === "#VALUE!") {
        return date; 
    }
    const parsedDate = parseCustomDateString(date);
    if (parsedDate && isValid(parsedDate)) {
      return format(parsedDate, 'dd/MM/yyyy');
    }
    return date; 
  }
  
  return 'Data desconeguda'; 
};

function escapeCsvCell(cellData: any): string {
  if (cellData == null) return ''; 
  
  let cell = '';
  if (cellData instanceof Date && isValid(cellData)) {
    cell = format(cellData, 'dd/MM/yyyy'); 
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
  const headerLine = [APP_HEADER_TERMINI, APP_HEADER_CONTENT, APP_HEADER_DUE_DATE].join(',');
  
  const rows = tasks.map(task => {
    const termini = escapeCsvCell(task.terminiRaw);
    const content = escapeCsvCell(task.content);
    
    const dueDateExportValue = task.originalDueDate instanceof Date && isValid(task.originalDueDate)
                         ? format(task.originalDueDate, 'dd/MM/yyyy') 
                         : (typeof task.originalDueDate === 'string' ? task.originalDueDate : '');

    const dueDate = escapeCsvCell(dueDateExportValue); 
    return [termini, content, dueDate].join(',');
  });

  return [headerLine, ...rows].join('\n');
};