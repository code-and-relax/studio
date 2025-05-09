
'use client';

import { useState, useEffect } from 'react';
import type { Task } from '@/types';
import { TaskBoard } from '@/components/tasks/task-board'; 
import { isValid } from 'date-fns'; // Import isValid

const TASKS_STORAGE_KEY = 'academiaBoardTasks';

export default function PrintPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); 
    if (typeof window !== 'undefined') { 
      const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      if (storedTasks) {
         try {
          const parsedRawTasks = JSON.parse(storedTasks);

          const mapStoredDate = (dateField: any): Date | string => {
            if (!dateField) return new Date(); // Default or placeholder
            
            // Attempt to parse as Date
            const d = new Date(dateField);
            
            if (typeof dateField === 'string' && ["Data no especificada", "Data Desconeguda", "N/A"].includes(dateField) || dateField.toUpperCase?.() === "#VALUE!") {
              return dateField;
            }

            if (isValid(d)) { // isValid from date-fns
              return d;
            }
            return String(dateField); // Keep as string if not a valid date representation
          };

          const mappedTasks = parsedRawTasks.map((task: any) => ({
            ...task,
            terminiRaw: task.terminiRaw || "N/A",
            originalDueDate: mapStoredDate(task.originalDueDate),
            adjustedDate: mapStoredDate(task.adjustedDate),
            createdAt: mapStoredDate(task.createdAt),
          }));
          setTasks(mappedTasks);
        } catch (error) {
          console.error("Error parsing stored tasks for printing:", error);
        }
      } else {
        console.warn("No tasks found in localStorage for printing.");
      }
    }
  }, []); 

  if (!isClient) {
    return <div className="p-4 text-center">Carregant previsualització d'impressió...</div>;
  }
  
  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-semibold mb-4">No hi ha tasques per imprimir</h1>
        <p className="text-muted-foreground">Torna a la pàgina principal i importa o crea tasques.</p>
        <button 
          onClick={() => { if (typeof window !== 'undefined') window.close(); }}
          className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 no-print"
          aria-label="Tancar pestanya d'impressió"
        >
          Tancar
        </button>
      </div>
    );
  }

  return (
    <div className="print-a4-sheet">
      <TaskBoard 
        tasks={tasks} 
        onUpdateTask={() => {}} 
        onDeleteTask={() => {}} 
        isPrintView={true} 
      />
    </div>
  );
}

