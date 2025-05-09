export type TaskStatus = "Pendent" | "En progrés" | "Completat" | "Arxivat";

export interface Task {
  id: string;
  content: string; // From 'DOCUMENTS/ACCIONS'
  originalDueDate: Date | string; // From 'DATA A FER'
  terminiRaw: string; // Raw text from '#TERMINI' column
  adjustedDate: Date | string; // User-editable date, defaults to originalDueDate
  status: TaskStatus;
  color: string; // Hex color for post-it
  createdAt: Date | string;
}

