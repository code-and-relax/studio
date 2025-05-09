
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
import { CalendarDays, Edit3, Palette, Trash2, MoreVertical, GripVertical, Circle, Info } from 'lucide-react';
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
    setEditedContent(task.content); 
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
    color: parseInt(task.color.substring(1), 16) > 0xffffff / 2 ? 'hsl(var(--card-foreground))' : '#ffffff',
  };
  
  const mainTextColor = cardStyle.color;
  const subtleTextColor = parseInt(task.color.substring(1), 16) > 0xffffff / 1.5 
    ? 'rgba(0, 0, 0, 0.65)'
    : 'rgba(255, 255, 255, 0.75)';


  if (isPrintView) {
    const printCardStyle = {
      backgroundColor: task.color,
      color: parseInt(task.color.substring(1), 16) > 0xffffff / 1.5 ? 'black' : 'white',
      border: '1px solid #ddd', 
    };
    const printMutedColor = parseInt(task.color.substring(1), 16) > 0xffffff / 1.5 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';

    return (
      <div className="postit-print break-inside-avoid flex flex-col justify-between" style={printCardStyle}>
        <div>
          <h3 className="text-sm font-semibold mb-1.5 break-words hyphens-auto leading-tight" style={{ color: printCardStyle.color }}>
            {task.content}
          </h3>
        </div>
        <div className="mt-auto text-[10px] space-y-0.5" style={{ color: printMutedColor }}>
          <p><span className="font-medium" style={{color: printCardStyle.color}}>Condició Termini:</span> {task.terminiRaw}</p>
          <p><span className="font-medium" style={{color: printCardStyle.color}}>Data Límit:</span> {formatDate(task.adjustedDate)}</p>
          {/* Status removed from print view as per request */}
          {/* <p><span className="font-medium" style={{color: printCardStyle.color}}>Estat:</span> {TASK_STATUSES.find(s => s.value === task.status)?.label || task.status}</p> */}
        </div>
      </div>
    );
  }
  
  return (
    <Card
      className={cn(
        "flex flex-col shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out break-inside-avoid-column transform hover:scale-[1.02] rounded-lg",
        isEditing ? "ring-2 ring-primary ring-offset-2" : ""
      )}
      style={{ backgroundColor: task.color }} 
    >
      <CardHeader className="p-3 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center space-x-2" style={{ color: mainTextColor }}>
          <CurrentStatusIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            {TASK_STATUSES.find(s => s.value === task.status)?.label || task.status}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: mainTextColor,  borderColor: subtleTextColor }}>
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
                        className={cn("h-8 w-8 rounded-full border-2", task.color === colorOpt.value ? "border-primary ring-2 ring-primary" : "border-gray-300")}
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
            className="w-full h-full min-h-[100px] resize-none bg-transparent border-white/30 focus:border-primary rounded-md placeholder:text-white/50"
            style={{ color: mainTextColor }} 
            placeholder="Escriu el contingut..."
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words hyphens-auto cursor-pointer min-h-[100px]" onClick={() => setIsEditing(true)} style={{ color: mainTextColor }}>
            {task.content}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-3 text-xs flex flex-col items-start space-y-2 border-t" style={{ borderColor: subtleTextColor, color: subtleTextColor }}>
         <div className="w-full">
          <Select value={task.status} onValueChange={(value: TaskStatus) => handleStatusChange(value)}>
            <SelectTrigger 
              className="h-8 text-xs w-full rounded" 
              style={{ 
                backgroundColor: 'rgba(0,0,0,0.1)', 
                color: mainTextColor, 
                borderColor: subtleTextColor 
              }}
            >
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
        
        <div className="pt-1 w-full">
          <p className="font-medium text-xs flex items-center mb-0.5" style={{ color: mainTextColor }}>
            <Info size={14} className="mr-1.5 shrink-0" /> Condició Termini:
          </p>
          <p className="pl-[22px] text-[11px] leading-tight break-words" style={{ color: mainTextColor }}>{task.terminiRaw}</p>
        </div>

        <div className="flex items-center text-xs pt-1" style={{ color: mainTextColor }}>
          <CalendarDays className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          Data Límit: {formatDate(task.adjustedDate)}
        </div>
       
        <div className="text-[10px] opacity-80 pt-1" style={{ color: subtleTextColor }}>
          Creat: {formatDate(task.createdAt)}
        </div>
      </CardFooter>
    </Card>
  );
}
