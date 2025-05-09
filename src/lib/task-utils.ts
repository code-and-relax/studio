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
// Excel stores dates as number of days since 1900-01-00 (Windows) or 1904-01-01 (Mac)
// XLSX library usually handles this conversion if { cellDates: true } is used,
// but sometimes manual conversion is needed if dates are read as numbers.
function excelSerialToDate(serial: number): Date {
  // Reference: https://github.com/SheetJS/sheetjs/blob/master/docbits/85_dates.md
  // This formula is common, but SheetJS's internal `SSF.parse_date_code` is more robust.
  // For simplicity, if cellDates:true doesn't work, this is a fallback.
  // The (serial - 25569) converts from Excel epoch to Unix epoch (days)
  // Multiply by 86400 seconds per day and 1000 ms per second.
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001; // Add small epsilon

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
  
  // Using header: 1 to get array of arrays, easier to find header row
  const jsonDataRaw: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

  if (jsonDataRaw.length === 0) return [];

  const headers = jsonDataRaw[0].map(header => String(header).trim());
  
  const terminiIndex = headers.indexOf(XLSX_COLUMN_TERMINI);
  const contentIndex = headers.indexOf(XLSX_COLUMN_CONTENT);
  const dueDateIndex = headers.indexOf(XLSX_COLUMN_DUE_DATE);

  if (terminiIndex === -1 || contentIndex === -1 || dueDateIndex === -1) {
    throw new Error(`Missing required columns. Ensure '${XLSX_COLUMN_TERMINI}', '${XLSX_COLUMN_CONTENT}', and '${XLSX_COLUMN_DUE_DATE}' are present.`);
  }
  
  const tasks: Partial<Task>[] = [];
  // Start from 1 to skip header row
  for (let i = 1; i < jsonDataRaw.length; i++) {
    const row = jsonDataRaw[i];
    if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue; // Skip empty rows
    }

    const terminiDays = parseInt(String(row[terminiIndex]), 10);
    const content = String(row[contentIndex]);
    let originalDueDateInput = row[dueDateIndex];
    
    if (content === null || String(content).trim() === '' || isNaN(terminiDays)) {
        console.warn(`Skipping row ${i+1} due to missing content or invalid termini days.`);
        continue;
    }

    let originalDueDate: Date;
    if (originalDueDateInput instanceof Date && isValid(originalDueDateInput)) {
      originalDueDate = originalDueDateInput;
    } else if (typeof originalDueDateInput === 'number') {
      // Attempt to convert Excel serial date number
      originalDueDate = excelSerialToDate(originalDueDateInput);
      if (!isValid(originalDueDate)) {
         console.warn(`Skipping row ${i+1}: Invalid Excel serial date for DATA A FER: ${originalDueDateInput}`);
         continue;
      }
    } else if (typeof originalDueDateInput === 'string') {
      originalDueDate = parseISO(originalDueDateInput);
      if (!isValid(originalDueDate)) {
        console.warn(`Skipping row ${i+1}: Could not parse date string for DATA A FER: ${originalDueDateInput}`);
        continue;
      }
    } else {
      console.warn(`Skipping row ${i+1}: Invalid or missing DATA A FER: ${originalDueDateInput}`);
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
    if (!isValid(d)) return 'Data invàlida';
    return format(d, 'dd/MM/yyyy');
  } catch (error) {
    return 'Data invàlida';
  }
};
