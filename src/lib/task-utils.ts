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

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedDateStr)) {
    parsedDate = parse(trimmedDateStr, 'dd/MM/yyyy', referenceDate);
    if (isValid(parsedDate)) return parsedDate;
  }
  
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(trimmedDateStr)) {
    parsedDate = parse(trimmedDateStr, 'dd/MM/yy', referenceDate);
    if (isValid(parsedDate)) return parsedDate;
  }
  
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmedDateStr)) {
    try {
        parsedDate = parseISO(trimmedDateStr);
        if (isValid(parsedDate)) return parsedDate;
    } catch (e) { /* Ignore */ }

    const parts = trimmedDateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) -1; 
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

  let headerRowIndex = -1;
  let csvHeaders: string[] = [];
  const MAX_HEADER_SCAN_LINES = 20; 

  const VARIANTS_TERMINI_UPPER = HEADER_VARIANTS_TERMINI.map(s => s.toUpperCase());
  const VARIANTS_CONTENT_UPPER = HEADER_VARIANTS_CONTENT.map(s => s.toUpperCase());
  const VARIANTS_DUE_DATE_UPPER = HEADER_VARIANTS_DUE_DATE.map(s => s.toUpperCase());

  let foundTerminiHeader: string | undefined;
  let foundContentHeader: string | undefined;
  let foundDueDateHeader: string | undefined;

  for (let i = 0; i < Math.min(lines.length, MAX_HEADER_SCAN_LINES); i++) {
    const lineContent = lines[i];
    if (lineContent.split(',').every(cell => cell.trim() === '')) continue; 

    const currentCellsUpper = lineContent.split(',').map(cell => String(cell || '').trim().toUpperCase());
    
    const lineHasTermini = VARIANTS_TERMINI_UPPER.some(h => currentCellsUpper.includes(h));
    const lineHasContent = VARIANTS_CONTENT_UPPER.some(h => currentCellsUpper.includes(h));
    const lineHasDueDate = VARIANTS_DUE_DATE_UPPER.some(h => currentCellsUpper.includes(h));

    if (lineHasTermini && lineHasContent && lineHasDueDate) {
      headerRowIndex = i;
      csvHeaders = currentCellsUpper; 

      foundTerminiHeader = VARIANTS_TERMINI_UPPER.find(h => csvHeaders.includes(h));
      foundContentHeader = VARIANTS_CONTENT_UPPER.find(h => csvHeaders.includes(h));
      foundDueDateHeader = VARIANTS_DUE_DATE_UPPER.find(h => csvHeaders.includes(h));
      break; 
    }
  }
  
  if (headerRowIndex === -1 || !foundTerminiHeader || !foundContentHeader || !foundDueDateHeader) {
    const exampleHeaders = [
        HEADER_VARIANTS_TERMINI[0], // Show the '#' prefixed version if available, else the first variant
        HEADER_VARIANTS_CONTENT[0],
        HEADER_VARIANTS_DUE_DATE[0]
    ];
    throw new Error(`Missing required header row or columns. Ensure CSV contains headers for 'TERMINI', 'DOCUMENTS/ACCIONS' (or 'DOCUMENT/ACCIONS'), and 'DATA A FER'. For example: '${exampleHeaders.join("', '")}'. Common variations (e.g., with/without '#') are checked.`);
  }
  
  const terminiIndex = csvHeaders.indexOf(foundTerminiHeader);
  const contentIndex = csvHeaders.indexOf(foundContentHeader);
  const dueDateIndex = csvHeaders.indexOf(foundDueDateHeader);

  const dataStartRow = headerRowIndex + 1;

  if (dataStartRow >= lines.length) {
     console.warn("Headers found, but no data lines detected after the headers or headers are on the last line(s).");
     return [];
  }
  
  const tasks: Partial<Task>[] = [];
  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i];
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
      console.warn(`Skipping row ${i + 1} due to empty content. Line: "${line}"`);
      continue;
    }

    let taskDueDateField: Date | string;
    const parsedDate = parseCustomDateString(originalDueDateStr);

    if (parsedDate && isValid(parsedDate)) {
        taskDueDateField = parsedDate;
    } else {
        taskDueDateField = originalDueDateStr || "Data no especificada"; 
    }
    
    tasks.push({
      content,
      originalDueDate: taskDueDateField,
      terminiRaw, 
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
      return dateInput;
    }
    return "Data no especificada"; 
  };

  const finalOriginalDueDate = determineDateValue(partialTask.originalDueDate);
  const finalAdjustedDate = determineDateValue(partialTask.adjustedDate ?? finalOriginalDueDate);
  
  const terminiValue = typeof partialTask.terminiRaw === 'string' 
    ? partialTask.terminiRaw 
    : (partialTask.terminiRaw === undefined ? "N/A" : String(partialTask.terminiRaw));


  return {
    id: id,
    content: partialTask.content || `Nova tasca ${id.substring(0,4)}`,
    terminiRaw: terminiValue,
    originalDueDate: finalOriginalDueDate,
    adjustedDate: finalAdjustedDate, 
    status: partialTask.status || DEFAULT_TASK_STATUS,
    color: partialTask.color || INITIAL_POSTIT_COLOR,
    createdAt: (partialTask.createdAt && partialTask.createdAt instanceof Date && isValid(partialTask.createdAt)) ? partialTask.createdAt : now,
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
    if (["Data no especificada", "Data Desconeguda", "N/A"].includes(cellData) || cellData.toUpperCase() === "#VALUE!") {
        cell = cellData;
    } else {
        const parsed = parseCustomDateString(cellData);
        cell = (parsed && isValid(parsed)) ? format(parsed, 'dd/MM/yyyy') : cellData;
    }
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