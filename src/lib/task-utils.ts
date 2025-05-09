
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
    parsedDate = parseISO(trimmedDateStr); // parseISO handles YYYY-MM-DD directly
    if (isValid(parsedDate)) return parsedDate;
  }
  
  return null; // Return null if no format matches or date is invalid
}


export const parseTaskFile = async (file: File): Promise<Partial<Task>[]> => {
  const fileText = await file.text();
  const lines = fileText.split(/\r?\n/);

  if (lines.length === 0) return [];

  let headerRowIndex = -1;
  const csvHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rowCells = lines[i].split(',').map(cell => String(cell || '').trim().toUpperCase());
    // Check if all required headers are present in this row
    if (rowCells.includes(APP_HEADER_TERMINI) && rowCells.includes(APP_HEADER_CONTENT) && rowCells.includes(APP_HEADER_DUE_DATE)) {
      headerRowIndex = i;
      csvHeaders.push(...rowCells); // Store the found headers
      break; 
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error(`Missing required header row or columns. Ensure CSV contains a row with '${APP_HEADER_TERMINI}', '${APP_HEADER_CONTENT}', and '${APP_HEADER_DUE_DATE}'. All must start with '#'.`);
  }
  
  const terminiIndex = csvHeaders.indexOf(APP_HEADER_TERMINI);
  const contentIndex = csvHeaders.indexOf(APP_HEADER_CONTENT);
  const dueDateIndex = csvHeaders.indexOf(APP_HEADER_DUE_DATE);

  // This check is important as indexOf could return -1 even if headerRowIndex was found, if the headers array got mangled.
  if (terminiIndex === -1 || contentIndex === -1 || dueDateIndex === -1) {
    throw new Error(`One or more required headers ('${APP_HEADER_TERMINI}', '${APP_HEADER_CONTENT}', '${APP_HEADER_DUE_DATE}') not found in the identified header row. Indices: Termini=${terminiIndex}, Content=${contentIndex}, DueDate=${dueDateIndex}.`);
  }
  
  const tasks: Partial<Task>[] = [];
  const dataStartRow = headerRowIndex + 1;

  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') {
      continue; 
    }
    
    const row = line.split(','); 

    const maxIndexRequired = Math.max(terminiIndex, contentIndex, dueDateIndex);
    if (row.length <= maxIndexRequired) {
        console.warn(`Skipping row ${i + 1}: Not enough columns to access all required data. Expected at least ${maxIndexRequired + 1} columns based on header indices, got ${row.length}. Line: "${line}"`);
        continue;
    }

    const terminiRaw = String(row[terminiIndex] || '').trim();
    const content = String(row[contentIndex] || '').trim();
    const originalDueDateStr = String(row[dueDateIndex] || '').trim();
    
    if (content === '' && terminiRaw === '' && originalDueDateStr === '') {
      // Skip completely empty rows based on the three key fields
      console.warn(`Skipping row ${i+1} as it appears to be empty or irrelevant.`);
      continue;
    }

    if (content === '') {
        console.warn(`Skipping row ${i + 1} due to missing content in column ${contentIndex + 1} (header '${APP_HEADER_CONTENT}'). Line: "${line}"`);
        continue;
    }
    
    if (terminiRaw === '') {
        console.warn(`Skipping row ${i + 1} due to missing termini in column ${terminiIndex + 1} (header '${APP_HEADER_TERMINI}'). Line: "${line}"`);
        continue;
    }

    const originalDueDate = parseCustomDateString(originalDueDateStr);
    if (!originalDueDate) {
      console.warn(`Skipping row ${i + 1}: Invalid or missing date in column ${dueDateIndex + 1} (header '${APP_HEADER_DUE_DATE}', value: "${originalDueDateStr}"). Line: "${line}"`);
      continue;
    }

    tasks.push({
      content,
      originalDueDate,
      terminiRaw,
      adjustedDate: originalDueDate, 
    });
  }
  return tasks;
};

export const createNewTaskObject = (partialTask: Partial<Task>): Task => {
  const originalDate = partialTask.originalDueDate || new Date();
  return {
    id: uuidv4(),
    content: partialTask.content || "Nova tasca",
    originalDueDate: originalDate,
    terminiRaw: partialTask.terminiRaw || "N/A",
    adjustedDate: partialTask.adjustedDate || originalDate, 
    status: partialTask.status || DEFAULT_TASK_STATUS,
    color: partialTask.color || INITIAL_POSTIT_COLOR,
    createdAt: new Date(),
  };
};

export const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return 'N/A';
  try {
    let d: Date;
    if (typeof date === 'string') {
      d = parseISO(date); // Try ISO first (common for JS Date.toISOString())
      if (!isValid(d)) { // If not ISO, try custom parsing
        const customParsedDate = parseCustomDateString(date); 
        if (customParsedDate && isValid(customParsedDate)) {
          d = customParsedDate;
        } else {
          // Fallback for other string formats that new Date() might handle
          d = new Date(date); 
          if (!isValid(d)) return 'Data invàlida';
        }
      }
    } else { // If it's already a Date object
      d = date; 
    }
    
    if (!isValid(d)) {
       return 'Data invàlida';
    }
    return format(d, 'dd/MM/yyyy');
  } catch (error) {
    console.error("Error formatting date:", date, error);
    return 'Data invàlida';
  }
};

function escapeCsvCell(cellData: any): string {
  if (cellData == null) return ''; // Handle null or undefined as empty string
  
  let cell = '';
  if (cellData instanceof Date) {
    cell = formatDate(cellData); 
  } else {
    cell = String(cellData);
  }

  if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
    cell = `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export const exportTasksToCSV = (tasks: Task[]): string => {
  const headers = [APP_HEADER_TERMINI, APP_HEADER_CONTENT, APP_HEADER_DUE_DATE].join(',');
  
  const rows = tasks.map(task => {
    const termini = escapeCsvCell(task.terminiRaw);
    const content = escapeCsvCell(task.content);
    // For CSV export, use adjustedDate as it reflects user modifications.
    const dueDate = escapeCsvCell(task.adjustedDate); 
    return [termini, content, dueDate].join(',');
  });

  return [headers, ...rows].join('\n');
};
