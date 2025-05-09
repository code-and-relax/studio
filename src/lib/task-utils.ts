
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

  let terminiColIndex = -1;
  let contentColIndex = -1;
  let dueDateColIndex = -1;
  let maxHeaderRowIndex = -1; // Stores the maximum row index where any of the headers were found

  const MAX_HEADER_SCAN_LINES = 20; 

  const VARIANTS_TERMINI_UPPER = HEADER_VARIANTS_TERMINI.map(s => s.toUpperCase());
  const VARIANTS_CONTENT_UPPER = HEADER_VARIANTS_CONTENT.map(s => s.toUpperCase());
  const VARIANTS_DUE_DATE_UPPER = HEADER_VARIANTS_DUE_DATE.map(s => s.toUpperCase());

  for (let i = 0; i < Math.min(lines.length, MAX_HEADER_SCAN_LINES); i++) {
    const lineContent = lines[i];
    if (lineContent.trim() === '' || lineContent.split(',').every(cell => cell.trim() === '')) continue;

    const currentCells = lineContent.split(',').map(cell => String(cell || '').trim());
    const currentCellsUpper = currentCells.map(cell => cell.toUpperCase());

    if (terminiColIndex === -1) {
      const foundTerminiHeader = VARIANTS_TERMINI_UPPER.find(h => currentCellsUpper.includes(h));
      if (foundTerminiHeader) {
        terminiColIndex = currentCellsUpper.indexOf(foundTerminiHeader);
        maxHeaderRowIndex = Math.max(maxHeaderRowIndex, i);
      }
    }

    if (contentColIndex === -1) {
      const foundContentHeader = VARIANTS_CONTENT_UPPER.find(h => currentCellsUpper.includes(h));
      if (foundContentHeader) {
        contentColIndex = currentCellsUpper.indexOf(foundContentHeader);
        maxHeaderRowIndex = Math.max(maxHeaderRowIndex, i);
      }
    }

    if (dueDateColIndex === -1) {
      const foundDueDateHeader = VARIANTS_DUE_DATE_UPPER.find(h => currentCellsUpper.includes(h));
      if (foundDueDateHeader) {
        dueDateColIndex = currentCellsUpper.indexOf(foundDueDateHeader);
        maxHeaderRowIndex = Math.max(maxHeaderRowIndex, i);
      }
    }
    // Optimization: if all headers are found, no need to scan further lines for headers
    if (terminiColIndex !== -1 && contentColIndex !== -1 && dueDateColIndex !== -1 && i >= maxHeaderRowIndex) {
       // ensure we've processed the line that set maxHeaderRowIndex if it's the current one
       break;
    }
  }
  
  if (terminiColIndex === -1 || contentColIndex === -1 || dueDateColIndex === -1) {
    let errorMessages = [];
    if (terminiColIndex === -1) errorMessages.push(`Columna Termini no trobada (variants esperades: ${HEADER_VARIANTS_TERMINI.join(', ')})`);
    if (contentColIndex === -1) errorMessages.push(`Columna Contingut no trobada (variants esperades: ${HEADER_VARIANTS_CONTENT.join(', ')})`);
    if (dueDateColIndex === -1) errorMessages.push(`Columna Data a Fer no trobada (variants esperades: ${HEADER_VARIANTS_DUE_DATE.join(', ')})`);
    
    throw new Error(`No s'han pogut trobar totes les columnes necessàries. Detalls: ${errorMessages.join('; ')}. Assegura't que el CSV conté aquestes capçaleres a les primeres files.`);
  }
  
  const dataStartRow = maxHeaderRowIndex + 1;

  if (dataStartRow >= lines.length) {
     console.warn("Capçaleres trobades, però no s'han detectat línies de dades després de les capçaleres.");
     return [];
  }
  
  const tasks: Partial<Task>[] = [];
  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.split(',').every(cell => cell.trim() === '')) { 
        continue; 
    }
    
    const row = line.split(','); 

    // Check if row has enough columns to access all identified header indices
    const maxIndexRequiredByData = Math.max(terminiColIndex, contentColIndex, dueDateColIndex);
    if (row.length <= maxIndexRequiredByData) {
        console.warn(`Saltant fila ${i + 1}: No hi ha prou columnes (${row.length}) per accedir a totes les dades necessàries fins a l'índex ${maxIndexRequiredByData}. Línia: "${line}"`);
        continue;
    }
    
    const terminiRaw = String(row[terminiColIndex] || '').trim();
    const content = String(row[contentColIndex] || '').trim();
    const originalDueDateStr = String(row[dueDateColIndex] || '').trim();
    
    if (content === '' && terminiRaw === '' && originalDueDateStr === '') { 
      console.warn(`Saltant fila ${i + 1} perquè tots els camps clau (contingut, termini, data de venciment) estan buits. Línia: "${line}"`);
      continue;
    }
     if (content === '') { 
      console.warn(`Saltant fila ${i + 1} per contingut buit. Termini: "${terminiRaw}", DataVenciment: "${originalDueDateStr}". Línia: "${line}"`);
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
