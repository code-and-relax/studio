
'use client';

import { useState, useEffect, useRef } from 'react';
import type { Task, TaskStatus } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Edit3, Palette, Trash2, MoreVertical, GripVertical, Circle } from 'lucide-react'; // Added Circle icon
import { formatDate } from '@/lib/task-utils';
import { POSTIT_COLOR_PALETTE, TASK_STATUSES } from '@/config/app-config';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  isPrintView?: boolean;
}

export function TaskCard({ task, onUpdateTask, onDeleteTask, isPrintView = false }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(task.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedContent(task.content); // Sync with prop changes
  }, [task.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSaveContent = () => {
    if (editedContent.trim() !== task.content) {
      onUpdateTask(task.id, { content: editedContent.trim() });
    }
    setIsEditing(false);
  };

  const handleColorChange = (color: string) => {
    onUpdateTask(task.id, { color });
  };

  const handleStatusChange = (status: TaskStatus) => {
    onUpdateTask(task.id, { status });
  };

  const CurrentStatusIcon = TASK_STATUSES.find(s => s.value === task.status)?.icon || Circle;

  const cardStyle = {
    backgroundColor: task.color,
    color: task.color && task.color.toLowerCase() > '#aaaaaa' ? 'var(--foreground)' : 'var(--card-foreground)',
  };
  
  if (isPrintView) {
    return (
      <div className="postit-print break-inside-avoid" style={cardStyle}>
        <p className="text-xs font-semibold mb-1 break-words hyphens-auto">{task.content}</p>
        <div className="mt-auto text-xs" style={{color: task.color && task.color.toLowerCase() > '#aaaaaa' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }}> {/* Adjusted text color for print based on background for better legibility */}
          <p>Data Ajustada: {formatDate(task.adjustedDate)}</p>
          <p>Estat: {TASK_STATUSES.find(s => s.value === task.status)?.label || task.status}</p>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200 break-inside-avoid-column",
        isEditing ? "ring-2 ring-primary ring-offset-2" : ""
      )}
      style={cardStyle}
    >
      <CardHeader className="p-3 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center space-x-2">
          <CurrentStatusIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            {TASK_STATUSES.find(s => s.value === task.status)?.label || task.status}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Opcions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsEditing(true)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Editar Text
            </DropdownMenuItem>
             <Popover>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Palette className="mr-2 h-4 w-4" />
                    Canviar Color
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {POSTIT_COLOR_PALETTE.map((colorOpt) => (
                      <Button
                        key={colorOpt.value}
                        variant="outline"
                        size="icon"
                        className={cn("h-8 w-8 rounded-full border-2", task.color === colorOpt.value ? "border-primary ring-2 ring-primary" : "border-transparent")}
                        style={{ backgroundColor: colorOpt.value }}
                        onClick={() => handleColorChange(colorOpt.value)}
                        aria-label={colorOpt.name}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDeleteTask(task.id)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onBlur={handleSaveContent}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveContent(); } else if (e.key === 'Escape') { setIsEditing(false); setEditedContent(task.content);}}}
            className="w-full h-full min-h-[100px] resize-none bg-transparent border-muted focus:border-primary"
            style={{ color: 'inherit' }}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words hyphens-auto cursor-pointer" onClick={() => setIsEditing(true)}>
            {task.content}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-3 text-xs flex flex-col items-start space-y-1">
         <div className="w-full">
          <Select value={task.status} onValueChange={(value: TaskStatus) => handleStatusChange(value)}>
            <SelectTrigger className="h-8 text-xs w-full bg-background/30 hover:bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Canviar estat" />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map(statusOpt => (
                <SelectItem key={statusOpt.value} value={statusOpt.value} className="text-xs">
                  <div className="flex items-center">
                    <statusOpt.icon className="mr-2 h-4 w-4" />
                    {statusOpt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center" style={{color: cardStyle.color === 'var(--foreground)' ? 'hsl(var(--muted-foreground))' : 'rgba(0,0,0,0.6)' }}>
          <CalendarDays className="mr-1 h-3 w-3" />
          Data Ajustada: {formatDate(task.adjustedDate)}
        </div>
        <div className="text-xs" style={{color: cardStyle.color === 'var(--foreground)' ? 'hsl(var(--muted-foreground))' : 'rgba(0,0,0,0.6)' }}>
          Data Original: {formatDate(task.originalDueDate)} (Termini: {task.terminiDays} dies)
        </div>
      </CardFooter>
    </Card>
  );
}

