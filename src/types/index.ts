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
  convocatoria?: number; // NUEVO: número de convocatoria
  accio?: string;        // NUEVO: identificador de acción
  cp?: string;           // NUEVO: identificador CP
  nomAccio?: string;     // NUEVO: nombre de la acción
  centro?: string;       // NUEVO: centro
  logo?: string;         // NUEVO: logo/letra (puede ser base64, url o letra)
  logoFile?: string;     // NUEVO: imagen subida (base64 o url local)
  inicio?: Date | string; // NUEVO: fecha de inicio
}

