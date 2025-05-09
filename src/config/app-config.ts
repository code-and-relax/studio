
import type { TaskStatus } from '@/types';
import { Circle, CheckCircle2, Loader2, Archive } from 'lucide-react';

// --- CSV Header Configuration ---
// These are the exact header strings (case-insensitive after trimming) expected in the CSV file.
// They must start with '#' as per user requirement.
export const APP_HEADER_TERMINI = '#TERMINI';
export const APP_HEADER_CONTENT = '#DOCUMENTS/ACCIONS';
export const APP_HEADER_DUE_DATE = '#DATA A FER';

// --- Task Configuration ---
export const INITIAL_POSTIT_COLOR = "#E9F5E8"; // A slightly different soft green from theme for explicit setting. Theme --card is hsl(125, 50%, 95%) -> #E8F5E9

export const POSTIT_COLOR_PALETTE: { name: string; value: string }[] = [
  { name: "Green", value: INITIAL_POSTIT_COLOR },
  { name: "Yellow", value: "#FFFACD" }, // LemonChiffon
  { name: "Blue", value: "#ADD8E6" },   // LightBlue
  { name: "Pink", value: "#FFB6C1" },   // LightPink
  { name: "Orange", value: "#FFDAB9" }, // PeachPuff
  { name: "Purple", value: "#E6E6FA" }, // Lavender
];

export const TASK_STATUSES: { value: TaskStatus; label: string; icon: React.ElementType }[] = [
  { value: "Pendent", label: "Pendent", icon: Circle },
  { value: "En progrés", label: "En progrés", icon: Loader2 },
  { value: "Completat", label: "Completat", icon: CheckCircle2 },
  { value: "Arxivat", label: "Arxivat", icon: Archive },
];

export const DEFAULT_TASK_STATUS: TaskStatus = "Pendent";
