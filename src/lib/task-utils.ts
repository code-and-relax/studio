
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

  // Find the header row and store its index and contents
  for (let i = 0; i < lines.length; i++) {
    const rowCells = lines[i].split(',').map(cell => String(cell || '').trim().toUpperCase());
    if (rowCells.includes(APP_HEADER_TERMINI) && rowCells.includes(APP_HEADER_CONTENT) && rowCells.includes(APP_HEADER_DUE_DATE)) {
      headerRowIndex = i;
      csvHeaders.push(...rowCells);
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error(`Missing required header row or columns. Ensure CSV contains a row with '${APP_HEADER_TERMINI}', '${APP_HEADER_CONTENT}', and '${APP_HEADER_DUE_DATE}'. All must start with '#'.`);
  }
  
  const terminiIndex = csvHeaders.indexOf(APP_HEADER_TERMINI);
  const contentIndex = csvHeaders.indexOf(APP_HEADER_CONTENT);
  const dueDateIndex = csvHeaders.indexOf(APP_HEADER_DUE_DATE);

  // This check might be redundant if the headerRowIndex check above is comprehensive, but kept for safety.
  if (terminiIndex === -1 || contentIndex === -1 || dueDateIndex === -1) {
    throw new Error(`One or more required headers ('${APP_HEADER_TERMINI}', '${APP_HEADER_CONTENT}', '${APP_HEADER_DUE_DATE}') not found in the identified header row.`);
  }
  
  const tasks: Partial<Task>[] = [];
  const dataStartRow = headerRowIndex + 1;

  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') {
      continue; 
    }
    
    // Basic CSV split. Does not handle commas within quoted fields robustly.
    // For more complex CSVs, a proper CSV parsing library would be needed.
    const row = line.split(','); 

    const maxIndexRequired = Math.max(terminiIndex, contentIndex, dueDateIndex);
    if (row.length <= maxIndexRequired) {
        console.warn(`Skipping row ${i + 1}: Not enough columns to access all required data. Line: "${line}"`);
        continue;
    }

    const terminiRaw = String(row[terminiIndex] || '').trim();
    const content = String(row[contentIndex] || '').trim();
    const originalDueDateStr = String(row[dueDateIndex] || '').trim();
    
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
      adjustedDate: originalDueDate, // Default adjustedDate to originalDueDate
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
    adjustedDate: partialTask.adjustedDate || originalDate, // Ensure adjustedDate is set
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
      d = parseISO(date);
      if (!isValid(d)) {
        const customParsedDate = parseCustomDateString(date); 
        if (customParsedDate && isValid(customParsedDate)) {
          d = customParsedDate;
        } else {
          // Attempt simple Date constructor as last resort for already formatted strings like "YYYY-MM-DDTHH:mm:ss.sssZ"
          d = new Date(date); 
          if (!isValid(d)) return 'Data invàlida';
        }
      }
    } else {
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

