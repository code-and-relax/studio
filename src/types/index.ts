export type TaskStatus = "Pendent" | "En progrés" | "Completat" | "Arxivat";

export interface Task {
  id: string;
  content: string; // From 'DOCUMENTS/ACCIONS'
  originalDueDate: Date | string; // From 'DATA A FER'
  terminiDays: number; // From 'TERMINI'
  adjustedDate: Date | string;
  status: TaskStatus;
  color: string; // Hex color for post-it
  createdAt: Date | string;
}
