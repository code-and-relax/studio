
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Task } from '@/types';
import { AppHeader } from '@/components/layout/app-header';
import { DataImporter } from '@/components/controls/data-importer';
import { SearchInput } from '@/components/controls/search-input';
import { TaskBoard } from '@/components/tasks/task-board';
import { useToast } from "@/hooks/use-toast";
// Removed unused useRouter import: import { useRouter } from 'next/navigation';

const TASKS_STORAGE_KEY = 'academiaBoardTasks';

export default function AcademiaBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  // const router = useRouter(); // Not used

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
          setTasks(parsedTasks);
        } catch (error) {
          console.error("Error parsing stored tasks:", error);
          toast({
            variant: "destructive",
            title: "Error de dades",
            description: "No s'han pogut carregar les tasques desades. S'ha restablert l'emmagatzematge local.",
          });
          localStorage.removeItem(TASKS_STORAGE_KEY); // Clear corrupted data
        }
      }
    }
  }, []); // Removed toast from dependencies as it's stable

  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      } catch (error) {
        console.error("Error saving tasks to localStorage:", error);
        // Optionally, inform the user if saving persistently fails
        // toast({ variant: "destructive", title: "Error", description: "No s'han pogut desar les tasques automàticament." });
      }
    }
  }, [tasks, isClient]);

  const handleTasksImported = (newTasks: Task[]) => {
    setTasks(prevTasks => [...prevTasks, ...newTasks]);
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === id ? { ...task, ...updates } : task))
    );
    toast({ title: "Tasca actualitzada", description: "Els canvis s'han desat." });
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
    toast({ title: "Tasca eliminada" });
  };

  const handlePrint = () => {
    if (isClient && typeof window !== 'undefined') {
      // Explicitly save to localStorage just before opening the print window
      // to ensure the print page reads the most current data.
      try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      } catch (error) {
        console.error("Error saving tasks to localStorage before printing:", error);
        toast({ variant: 'destructive', title: "Error d'impressió", description: "No s'ha pogut desar les dades per imprimir." });
        return;
      }

      const printWindow = window.open('/print', '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          // Timeout to ensure content is loaded in the new window before print dialog
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (e) {
              console.error("Error calling printWindow.print():", e);
              toast({ variant: 'destructive', title: "Error d'impressió", description: "No s'ha pogut iniciar la impressió." });
              // It might be better to let user close it manually or add a close button on print page
            }
          }, 1000); // Increased timeout to 1000ms
        };
      } else {
        toast({ variant: 'destructive', title: "Error d'impressió", description: "No s'ha pogut obrir la finestra d'impressió. Comprova els permisos del navegador." });
      }
    } else {
       toast({ variant: 'destructive', title: "Error", description: "La impressió no està disponible en aquest moment." });
    }
  };

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    return tasks.filter(task =>
      task.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);
  
  if (!isClient) {
    // Render placeholder or loading state for SSR/hydrate mismatch prevention
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader onPrint={() => { /* No-op during server render/initial client render */ }} />
        <main className="flex-grow container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-10 bg-muted rounded-lg w-1/3"></div>
            <div className="grid gap-6" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'}}>
              {[1,2,3].map(i => <div key={i} className="h-64 bg-muted rounded-lg"></div>)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader onPrint={handlePrint} />
      <main className="flex-grow container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <DataImporter onTasksImported={handleTasksImported} />
          <SearchInput searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <TaskBoard
            tasks={filteredTasks}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      </main>
    </div>
  );
}
