'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Task } from '@/types';
import { AppHeader } from '@/components/layout/app-header';
import { DataImporter } from '@/components/controls/data-importer';
import { SearchInput } from '@/components/controls/search-input';
import { TaskBoard } from '@/components/tasks/task-board';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

const TASKS_STORAGE_KEY = 'academiaBoardTasks';

export default function AcademiaBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
          localStorage.removeItem(TASKS_STORAGE_KEY); // Clear corrupted data
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
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
    if (typeof window !== 'undefined') {
      // Data is already in localStorage due to the useEffect for tasks.
      // The print page will read from there.
      const printWindow = window.open('/print', '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          // Timeout to ensure content is loaded before print dialog
          setTimeout(() => {
            printWindow.print();
          }, 500); 
        };
      } else {
        toast({ variant: 'destructive', title: "Error", description: "No s'ha pogut obrir la finestra d'impressió. Comprova els permisos del navegador." });
      }
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
        <AppHeader onPrint={() => {}} />
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
