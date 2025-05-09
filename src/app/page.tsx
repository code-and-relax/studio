
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Task } from '@/types';
import { AppHeader } from '@/components/layout/app-header';
import { DataImporter } from '@/components/controls/data-importer';
import { SearchInput } from '@/components/controls/search-input';
import { TaskBoard } from '@/components/tasks/task-board';
import { useToast } from "@/hooks/use-toast";
import { exportTasksToCSV, createNewTaskObject } from '@/lib/task-utils';
import { isValid } from 'date-fns'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddTaskForm, type AddTaskFormValues } from '@/components/tasks/add-task-form';

const TASKS_STORAGE_KEY = 'academiaBoardTasks';

export default function AcademiaBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const [isClearConfirmDialogOpen, setIsClearConfirmDialogOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      if (storedTasks) {
        try {
          const parsedRawTasks = JSON.parse(storedTasks);
          
          const mapStoredDate = (dateField: any): Date | string => {
            if (!dateField) return "Data no especificada"; 
            
            const d = new Date(dateField);
            
            if (typeof dateField === 'string' && ["Data no especificada", "Data Desconeguda", "N/A"].includes(dateField) || dateField.toUpperCase?.() === "#VALUE!") {
              return dateField;
            }

            if (isValid(d)) { 
              return d;
            }
            return String(dateField); 
          };

          const mappedTasks = parsedRawTasks.map((task: any) => ({
            ...task,
            terminiRaw: typeof task.terminiRaw === 'string' ? task.terminiRaw : "N/A",
            originalDueDate: mapStoredDate(task.originalDueDate),
            adjustedDate: mapStoredDate(task.adjustedDate),
            createdAt: mapStoredDate(task.createdAt),
            status: task.status || 'Pendent', 
            color: task.color || '#E9F5E8' 
          }));
          setTasks(mappedTasks);
        } catch (error) {
          console.error("Error parsing stored tasks:", error);
          toast({
            variant: "destructive",
            title: "Error de dades",
            description: "No s'han pogut carregar les tasques desades. S'ha restablert l'emmagatzematge local.",
          });
          localStorage.removeItem(TASKS_STORAGE_KEY); 
        }
      }
    }
  }, [toast]); 

  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      } catch (error) {
        console.error("Error saving tasks to localStorage:", error);
      }
    }
  }, [tasks, isClient]);

  const handleTasksImported = (newTasks: Task[]) => {
    setTasks(prevTasks => [...prevTasks, ...newTasks]);
    toast({
      title: "Tasques afegides",
      description: `${newTasks.length} tasques importades i afegides a les existents.`,
    });
  };

  const handleTasksReplaced = (newTasks: Task[]) => {
    setTasks(newTasks);
    toast({
      title: "Tasques reemplaçades",
      description: `${newTasks.length} tasques importades, reemplaçant les existents.`,
    });
  };

  const handleDownloadCSV = () => {
    if (tasks.length === 0) {
      toast({
        variant: "destructive",
        title: "Cap tasca per descarregar",
        description: "No hi ha tasques actuals per exportar a CSV.",
      });
      return;
    }
    try {
      const csvData = exportTasksToCSV(tasks);
      const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' }); 
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'academia_board_tasks.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Descàrrega iniciada", description: "El fitxer CSV s'està descarregant." });
      } else {
         toast({ variant: "destructive", title: "Error de descàrrega", description: "El teu navegador no suporta la descàrrega directa." });
      }
    } catch (error: any) {
      console.error("Error exporting tasks to CSV:", error);
      toast({ variant: "destructive", title: "Error d'exportació", description: `No s'ha pogut generar el fitxer CSV: ${error.message}` });
    }
  };

  const requestClearAllTasks = () => {
    if (tasks.length === 0) {
      toast({
        title: "Cap tasca per eliminar",
        description: "Actualment no hi ha tasques al tauler.",
      });
      return;
    }
    setIsClearConfirmDialogOpen(true);
  };

  const confirmClearAllTasks = () => {
    setTasks([]);
    toast({
      title: "Tasques eliminades",
      description: "Totes les tasques han estat eliminades del tauler.",
    });
    setIsClearConfirmDialogOpen(false);
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
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (e) {
              console.error("Error calling printWindow.print():", e);
              toast({ variant: 'destructive', title: "Error d'impressió", description: "No s'ha pogut iniciar la impressió." });
            }
          }, 250); 
        };
      } else {
        toast({ variant: 'destructive', title: "Error d'impressió", description: "No s'ha pogut obrir la finestra d'impressió. Comprova els permisos del navegador." });
      }
    } else {
       toast({ variant: 'destructive', title: "Error", description: "La impressió no està disponible en aquest moment." });
    }
  };

  const handleOpenAddTaskDialog = () => {
    setIsAddTaskDialogOpen(true);
  };

  const handleManualTaskSubmit = (values: AddTaskFormValues) => {
    const newTaskPartial: Partial<Task> = {
      content: values.content,
      terminiRaw: values.terminiRaw || "N/A",
      originalDueDate: values.adjustedDate ? values.adjustedDate : "Data no especificada",
      adjustedDate: values.adjustedDate ? values.adjustedDate : "Data no especificada",
      status: values.status,
      color: values.color,
    };
  
    const newTask = createNewTaskObject(newTaskPartial);
    setTasks(prevTasks => [newTask, ...prevTasks]); // Add to the beginning
    toast({
      title: "Tasca afegida",
      description: "La nova tasca s'ha afegit correctament.",
    });
    setIsAddTaskDialogOpen(false); // Close dialog from here
  };

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    return tasks.filter(task =>
      (task.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.terminiRaw || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);
  
  if (!isClient) {
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
          <DataImporter 
            onTasksImported={handleTasksImported} 
            onTasksReplaced={handleTasksReplaced}
            onDownloadCSV={handleDownloadCSV}
            onClearAllTasksRequested={requestClearAllTasks}
            onOpenAddTaskDialog={handleOpenAddTaskDialog} // Pass new handler
          />
          <SearchInput searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <TaskBoard
            tasks={filteredTasks}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      </main>
      <AlertDialog open={isClearConfirmDialogOpen} onOpenChange={setIsClearConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminació</AlertDialogTitle>
            <AlertDialogDescription>
              Estàs segur que vols eliminar totes les tasques? Aquesta acció no es pot desfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAllTasks} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar Totes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AddTaskForm
        isOpen={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        onSubmit={handleManualTaskSubmit}
      />
    </div>
  );
}
