
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
    parsedDate = parseISO(trimmedDateStr);
    if (isValid(parsedDate)) return parsedDate;
  }
  
  return null; // Return null if no format matches or date is invalid
}


export const parseTaskFile = async (file: File): Promise<Partial<Task>[]> => {
  const fileText = await file.text();
  const lines = fileText.split(/\r?\n/); // Split by newline, handling \r\n and \n

  if (lines.length === 0) return [];

  let headerRowIndex = -1;
  let csvHeaders: string[] = [];

  const requiredHeaders = [
    APP_HEADER_TERMINI, 
    APP_HEADER_CONTENT, 
    APP_HEADER_DUE_DATE
  ];

  for (let i = 0; i < lines.length; i++) {
    const potentialHeaders = lines[i].split(',').map(header => String(header || '').trim().toUpperCase());
    
    let foundCount = 0;
    for(const reqHeader of requiredHeaders) {
        if (potentialHeaders.includes(reqHeader)) {
            foundCount++;
        }
    }

    if (foundCount === requiredHeaders.length) {
        headerRowIndex = i;
        csvHeaders = potentialHeaders; // Store the actual headers from the found row
        break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(`Missing required header row or columns. Ensure CSV contains a row with '${APP_HEADER_TERMINI}', '${APP_HEADER_CONTENT}', and '${APP_HEADER_DUE_DATE}'. All must start with '#'.`);
  }
  
  const terminiIndex = csvHeaders.indexOf(APP_HEADER_TERMINI);
  const contentIndex = csvHeaders.indexOf(APP_HEADER_CONTENT);
  const dueDateIndex = csvHeaders.indexOf(APP_HEADER_DUE_DATE);

  if (terminiIndex === -1 || contentIndex === -1 || dueDateIndex === -1) {
     throw new Error(`One or more required column headers ('${APP_HEADER_TERMINI}', '${APP_HEADER_CONTENT}', '${APP_HEADER_DUE_DATE}') were not found in the identified header row: ${csvHeaders.join(',')}`);
  }
  
  const tasks: Partial<Task>[] = [];
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') {
      continue; 
    }
    
    // This is a naive CSV split, doesn't handle commas within quoted fields.
    const row = line.split(','); 

    if (row.length <= Math.max(terminiIndex, contentIndex, dueDateIndex)) {
        console.warn(`Skipping row ${i+1}: Not enough columns. Line: "${line}"`);
        continue;
    }

    const terminiDaysStrRaw = row[terminiIndex] !== undefined ? String(row[terminiIndex]).trim() : '';
    const content = row[contentIndex] !== undefined ? String(row[contentIndex]).trim() : '';
    const originalDueDateStr = row[dueDateIndex] !== undefined ? String(row[dueDateIndex]).trim() : '';
    
    if (content === '') {
        console.warn(`Skipping row ${i+1} due to missing content in column ${contentIndex + 1}. Line: "${line}"`);
        continue;
    }
    
    const terminiMatch = terminiDaysStrRaw.match(/\b(\d+)\b/);
    const terminiDays = terminiMatch && terminiMatch[1] ? parseInt(terminiMatch[1], 10) : NaN;

    if (isNaN(terminiDays)) {
        console.warn(`Skipping row ${i+1}: Could not parse termini days from "${terminiDaysStrRaw}" in column ${terminiIndex + 1}. Line: "${line}"`);
        continue;
    }

    const originalDueDate = parseCustomDateString(originalDueDateStr);
    if (!originalDueDate) {
      console.warn(`Skipping row ${i+1}: Invalid or missing ${APP_HEADER_DUE_DATE} ("${originalDueDateStr}") in column ${dueDateIndex + 1}. Line: "${line}"`);
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
