
'use client';

import type { Task } from '@/types';
import { TaskCard } from './task-card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TaskBoardProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  isPrintView?: boolean;
}

export function TaskBoard({ tasks, onUpdateTask, onDeleteTask, isPrintView = false }: TaskBoardProps) {
  if (tasks.length === 0 && !isPrintView) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg h-64 no-print">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sticky-note text-muted-foreground mb-4"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg>
        <h3 className="text-xl font-semibold text-foreground mb-2">No hi ha tasques</h3>
        <p className="text-muted-foreground">Importa tasques des d'un fitxer CSV per començar.</p>
      </div>
    );
  }
  
  if (isPrintView) {
    return (
      <div className="postit-grid-print print-only">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdateTask={onUpdateTask} 
            onDeleteTask={onDeleteTask} 
            isPrintView={true}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full no-print">
      <ScrollArea className="h-[calc(100vh-240px)] pr-2"> {/* Adjusted pr slightly */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4" // Added p-4 for padding around the grid
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
