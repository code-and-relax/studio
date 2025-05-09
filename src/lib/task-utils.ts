
import * as XLSX from 'xlsx';
import { subDays, parseISO, isValid, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskStatus } from '@/types';
import { 
  XLSX_COLUMN_TERMINI, 
  XLSX_COLUMN_CONTENT, 
  XLSX_COLUMN_DUE_DATE,
  INITIAL_POSTIT_COLOR,
  DEFAULT_TASK_STATUS
} from '@/config/app-config';

// Helper to convert Excel serial date to JS Date
function excelSerialToDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001; 

  let total_seconds = Math.floor(86400 * fractional_day);

  const seconds = total_seconds % 60;
  total_seconds -= seconds;

  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}


export const parseXLSXFile = async (file: File): Promise<Partial<Task>[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonDataRaw: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

  if (jsonDataRaw.length === 0) return [];

  let headerRowIndex = -1;
  let headers: string[] = [];

  // Find the header row
  for (let i = 0; i < jsonDataRaw.length; i++) {
    const row = jsonDataRaw[i].map(header => String(header || '').trim().toUpperCase());
    if (
      row.includes(XLSX_COLUMN_TERMINI) &&
      row.includes(XLSX_COLUMN_CONTENT) &&
      row.includes(XLSX_COLUMN_DUE_DATE)
    ) {
      headerRowIndex = i;
      headers = row;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(`Missing required columns or header row not found. Ensure '${XLSX_COLUMN_TERMINI}', '${XLSX_COLUMN_CONTENT}', and '${XLSX_COLUMN_DUE_DATE}' are present in one of the rows.`);
  }
  
  const terminiIndex = headers.indexOf(XLSX_COLUMN_TERMINI);
  const contentIndex = headers.indexOf(XLSX_COLUMN_CONTENT);
  const dueDateIndex = headers.indexOf(XLSX_COLUMN_DUE_DATE);

  // This check is technically redundant if headerRowIndex implies all columns were found, but kept for safety.
  if (terminiIndex === -1 || contentIndex === -1 || dueDateIndex === -1) {
     throw new Error(`One or more required columns ('${XLSX_COLUMN_TERMINI}', '${XLSX_COLUMN_CONTENT}', '${XLSX_COLUMN_DUE_DATE}') were not found in the identified header row.`);
  }
  
  const tasks: Partial<Task>[] = [];
  // Start from headerRowIndex + 1 to skip header row
  for (let i = headerRowIndex + 1; i < jsonDataRaw.length; i++) {
    const row = jsonDataRaw[i];
    if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue; // Skip empty rows
    }

    const terminiDaysStr = row[terminiIndex] !== null && row[terminiIndex] !== undefined ? String(row[terminiIndex]) : '';
    const terminiDays = parseInt(terminiDaysStr, 10);
    const content = String(row[contentIndex] || ''); // Ensure content is a string, even if cell is null/undefined
    let originalDueDateInput = row[dueDateIndex];
    
    if (content.trim() === '' || isNaN(terminiDays)) {
        console.warn(`Skipping row ${i+1} due to missing content or invalid termini days. Content: "${content}", Termini: "${terminiDaysStr}"`);
        continue;
    }

    let originalDueDate: Date;
    if (originalDueDateInput instanceof Date && isValid(originalDueDateInput)) {
      originalDueDate = originalDueDateInput;
    } else if (typeof originalDueDateInput === 'number') {
      originalDueDate = excelSerialToDate(originalDueDateInput);
      if (!isValid(originalDueDate)) {
         console.warn(`Skipping row ${i+1}: Invalid Excel serial date for ${XLSX_COLUMN_DUE_DATE}: ${originalDueDateInput}`);
         continue;
      }
    } else if (typeof originalDueDateInput === 'string') {
      originalDueDate = parseISO(originalDueDateInput);
      if (!isValid(originalDueDate)) {
        // Attempt to parse common non-ISO date formats like DD/MM/YYYY or MM/DD/YYYY if parseISO fails
        const parts = originalDueDateInput.split('/');
        if (parts.length === 3) {
          // Try DD/MM/YYYY
          let dateAttempt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (isValid(dateAttempt)) {
            originalDueDate = dateAttempt;
          } else {
            // Try MM/DD/YYYY
            dateAttempt = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
            if (isValid(dateAttempt)) {
              originalDueDate = dateAttempt;
            } else {
              console.warn(`Skipping row ${i+1}: Could not parse date string for ${XLSX_COLUMN_DUE_DATE}: ${originalDueDateInput}`);
              continue;
            }
          }
        } else {
            console.warn(`Skipping row ${i+1}: Could not parse date string for ${XLSX_COLUMN_DUE_DATE}: ${originalDueDateInput}`);
            continue;
        }
      }
    } else {
      console.warn(`Skipping row ${i+1}: Invalid or missing ${XLSX_COLUMN_DUE_DATE}: ${originalDueDateInput}`);
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
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) { // Check if date is valid after parsing
        // Try to parse DD/MM/YYYY if parseISO failed or resulted in invalid date for string inputs
        if (typeof date === 'string') {
            const parts = date.split('/');
            if (parts.length === 3) {
                const directDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                 if(isValid(directDate)) return format(directDate, 'dd/MM/yyyy');
            }
        }
       return 'Data invàlida';
    }
    return format(d, 'dd/MM/yyyy');
  } catch (error) {
    return 'Data invàlida';
  }
};
