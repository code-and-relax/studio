
'use client';

import { useState, useEffect } from 'react';
import type { Task } from '@/types';
import { TaskBoard } from '@/components/tasks/task-board'; 

const TASKS_STORAGE_KEY = 'academiaBoardTasks'; // Ensure this matches the key used in page.tsx

export default function PrintPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // This ensures the following logic runs only on the client
    if (typeof window !== 'undefined') { // Double check, though isClient should gate this
      const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      if (storedTasks) {
         try {
          const parsedTasks = JSON.parse(storedTasks).map((task: any) => ({
            ...task,
            // Ensure dates are properly converted back to Date objects
            originalDueDate: task.originalDueDate ? new Date(task.originalDueDate) : new Date(),
            adjustedDate: task.adjustedDate ? new Date(task.adjustedDate) : new Date(),
            createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
          }));
          setTasks(parsedTasks);
        } catch (error) {
          console.error("Error parsing stored tasks for printing:", error);
          // Optionally, display an error message to the user on the print page itself
        }
      } else {
        console.warn("No tasks found in localStorage for printing.");
      }
    }
  }, []); // Empty dependency array: runs once on mount on the client side

  // The print dialog is now initiated from the main page (page.tsx)
  // after this page (print/page.tsx) loads its content.

  if (!isClient) {
    // This is rendered on the server and initially on the client before useEffect runs.
    // It must match what the client would render in this state to avoid hydration mismatch.
    return <div className="p-4 text-center">Carregant previsualització d'impressió...</div>;
  }
  
  // From this point, isClient is true, and we are rendering client-side.
  if (tasks.length === 0) { // Removed redundant && isClient
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
        onUpdateTask={() => {}} // Not used in print view
        onDeleteTask={() => {}} // Not used in print view
        isPrintView={true} 
      />
    </div>
  );
}
