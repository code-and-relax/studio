'use client';

import { useState, useEffect } from 'react';
import type { Task } from '@/types';
import { TaskBoard } from '@/components/tasks/task-board'; // Re-use TaskBoard with print logic

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
          const parsedTasks = JSON.parse(storedTasks).map((task: any) => ({
            ...task,
            originalDueDate: new Date(task.originalDueDate),
            adjustedDate: new Date(task.adjustedDate),
            createdAt: new Date(task.createdAt),
          }));
          // For printing, maybe filter by status or apply other logic if needed
          // For now, printing all tasks from localStorage
          setTasks(parsedTasks);
        } catch (error) {
          console.error("Error parsing stored tasks for printing:", error);
        }
      } else {
        // Handle case where there's no data - perhaps show a message
        console.warn("No tasks found in localStorage for printing.");
      }
    }
  }, []);
  
  // This useEffect will trigger window.print() after tasks are loaded and rendered.
  // It was moved to AppHeader to control print dialog after window.open
  /*
  useEffect(() => {
    if (isClient && tasks.length > 0 && typeof window !== 'undefined') {
      // Ensure content is rendered before printing
      const timeoutId = setTimeout(() => {
        window.print();
      }, 500); // Adjust delay if needed
      return () => clearTimeout(timeoutId);
    }
  }, [isClient, tasks]);
  */


  if (!isClient) {
    return <div className="p-4">Carregant previsualització d'impressió...</div>;
  }
  
  if (tasks.length === 0 && isClient) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-semibold mb-4">No hi ha tasques per imprimir</h1>
        <p>Torna a la pàgina principal i importa o crea tasques.</p>
        <button 
          onClick={() => typeof window !== 'undefined' && window.close()} 
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 no-print"
        >
          Tancar
        </button>
      </div>
    );
  }

  return (
    <div className="print-a4-sheet">
      {/* The TaskBoard component will handle the specific print layout via its isPrintView prop */}
      <TaskBoard 
        tasks={tasks} 
        onUpdateTask={() => {}} // Placeholder, not used in print view
        onDeleteTask={() => {}} // Placeholder, not used in print view
        isPrintView={true} 
      />
    </div>
  );
}
