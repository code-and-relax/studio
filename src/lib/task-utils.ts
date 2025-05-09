
import { subDays, parse, isValid, format, parseISO } from 'date-fns';
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
  const lines = fileText.split(/\r?\n/); // Split by newline, handling \r\n and \n

  if (lines.length === 0) return [];

  let terminiColIdx = -1;
  let contentColIdx = -1;
  let dueDateColIdx = -1;

  let terminiRowIdx = -1;
  let contentRowIdx = -1;
  let dueDateRowIdx = -1;

  // Find column indices and row indices for each header's first occurrence
  for (let i = 0; i < lines.length; i++) {
    const rowCells = lines[i].split(',');
    for (let j = 0; j < rowCells.length; j++) {
      const cellContent = String(rowCells[j] || '').trim().toUpperCase();
      if (cellContent === APP_HEADER_TERMINI && terminiColIdx === -1) {
        terminiColIdx = j;
        terminiRowIdx = i;
      }
      if (cellContent === APP_HEADER_CONTENT && contentColIdx === -1) {
        contentColIdx = j;
        contentRowIdx = i;
      }
      if (cellContent === APP_HEADER_DUE_DATE && dueDateColIdx === -1) {
        dueDateColIdx = j;
        dueDateRowIdx = i;
      }
    }
  }

  // Validate that all headers were found
  if (terminiColIdx === -1) {
    throw new Error(`Required header '${APP_HEADER_TERMINI}' not found in the CSV file.`);
  }
  if (contentColIdx === -1) {
    throw new Error(`Required header '${APP_HEADER_CONTENT}' not found in the CSV file.`);
  }
  if (dueDateColIdx === -1) {
    throw new Error(`Required header '${APP_HEADER_DUE_DATE}' not found in the CSV file.`);
  }
  
  const tasks: Partial<Task>[] = [];
  // Determine the starting row for data (first row after the last found header's row)
  const dataStartRow = Math.max(terminiRowIdx, contentRowIdx, dueDateRowIdx) + 1;

  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') {
      continue; 
    }
    
    // This is a naive CSV split, doesn't handle commas within quoted fields.
    const row = line.split(','); 

    const maxIndexRequired = Math.max(terminiColIdx, contentColIdx, dueDateColIdx);
    if (row.length <= maxIndexRequired) {
        console.warn(`Skipping row ${i + 1}: Not enough columns to access all required data. Line: "${line}"`);
        continue;
    }

    const terminiDaysStrRaw = row[terminiColIdx] !== undefined ? String(row[terminiColIdx]).trim() : '';
    const content = row[contentColIdx] !== undefined ? String(row[contentColIdx]).trim() : '';
    const originalDueDateStr = row[dueDateColIdx] !== undefined ? String(row[dueDateColIdx]).trim() : '';
    
    if (content === '') {
        console.warn(`Skipping row ${i + 1} due to missing content in column ${contentColIdx + 1} (using header '${APP_HEADER_CONTENT}'). Line: "${line}"`);
        continue;
    }
    
    const terminiMatch = terminiDaysStrRaw.match(/\b(\d+)\b/);
    const terminiDays = terminiMatch && terminiMatch[1] ? parseInt(terminiMatch[1], 10) : NaN;

    if (isNaN(terminiDays)) {
        console.warn(`Skipping row ${i + 1}: Could not parse termini days from "${terminiDaysStrRaw}" in column ${terminiColIdx + 1} (using header '${APP_HEADER_TERMINI}'). Line: "${line}"`);
        continue;
    }

    const originalDueDate = parseCustomDateString(originalDueDateStr);
    if (!originalDueDate) {
      console.warn(`Skipping row ${i + 1}: Invalid or missing date in column ${dueDateColIdx + 1} (using header '${APP_HEADER_DUE_DATE}', value: "${originalDueDateStr}"). Line: "${line}"`);
      continue;
    }

    const adjustedDate = subDays(originalDueDate, terminiDays);

    tasks.push({
      content,
      originalDueDate,
      terminiDays,
      adjustedDate,
    });
  }
  return tasks;
};

export const createNewTaskObject = (partialTask: Partial<Task>): Task => {
  return {
    id: uuidv4(),
    content: partialTask.content || "Nova tasca",
    originalDueDate: partialTask.originalDueDate || new Date(),
    terminiDays: partialTask.terminiDays || 0,
    adjustedDate: partialTask.adjustedDate || new Date(),
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
      // Try parsing as ISO string first
      d = parseISO(date);
      if (!isValid(d)) {
        const customParsedDate = parseCustomDateString(date); // handles DD/MM/YY and DD/MM/YYYY
        if (customParsedDate && isValid(customParsedDate)) {
          d = customParsedDate;
        } else {
          return 'Data invàlida';
        }
      }
    } else {
      d = date; // It's already a Date object
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

