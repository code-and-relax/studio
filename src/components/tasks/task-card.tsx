
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, Edit3, Palette, Trash2, MoreVertical, Info, Save, CheckCircle2, Circle, Loader2, Archive } from 'lucide-react';
import { formatDate, parseCustomDateString } from '@/lib/task-utils';
import { POSTIT_COLOR_PALETTE, TASK_STATUSES, DEFAULT_TASK_STATUS } from '@/config/app-config';
import { cn } from '@/lib/utils';
import { isValid } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  isPrintView?: boolean;
}

export function TaskCard({ task, onUpdateTask, onDeleteTask, isPrintView = false }: TaskCardProps) {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState(task.content);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [isEditingTermini, setIsEditingTermini] = useState(false);
  const [editedTerminiRaw, setEditedTerminiRaw] = useState(task.terminiRaw);
  const terminiTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [popoverCalendarOpen, setPopoverCalendarOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);


  // Derived state for calendar: ensure it's a Date object or undefined
  const getCalendarSelectedDate = (): Date | undefined => {
    if (task.adjustedDate instanceof Date && isValid(task.adjustedDate)) {
      return task.adjustedDate;
    }
    // If it's a string, try to parse it. If not parsable, undefined.
    const parsed = parseCustomDateString(String(task.adjustedDate));
    return parsed && isValid(parsed) ? parsed : undefined;
  };


  useEffect(() => {
    setEditedContent(task.content);
  }, [task.content]);

  useEffect(() => {
    if (isEditingContent && contentTextareaRef.current) {
      contentTextareaRef.current.focus();
      contentTextareaRef.current.select();
    }
  }, [isEditingContent]);

  useEffect(() => {
    setEditedTerminiRaw(task.terminiRaw);
  }, [task.terminiRaw]);

  useEffect(() => {
    if (isEditingTermini && terminiTextareaRef.current) {
      terminiTextareaRef.current.focus();
      terminiTextareaRef.current.select();
    }
  }, [isEditingTermini]);

  const handleSaveContent = () => {
    if (editedContent.trim() !== task.content) {
      onUpdateTask(task.id, { content: editedContent.trim() });
    }
    setIsEditingContent(false);
  };

  const handleSaveTermini = () => {
    if (editedTerminiRaw.trim() !== task.terminiRaw) {
      onUpdateTask(task.id, { terminiRaw: editedTerminiRaw.trim() });
    }
    setIsEditingTermini(false);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onUpdateTask(task.id, { adjustedDate: selectedDate });
    } else {
      // If cleared, set to a specific placeholder or handle as needed
      onUpdateTask(task.id, { adjustedDate: "Data no especificada" });
    }
    setPopoverCalendarOpen(false); // Close popover after selection
  };

  const handleColorChange = (color: string) => {
    onUpdateTask(task.id, { color });
    setColorPickerOpen(false); // Close popover after color selection
  };

  const handleStatusChange = (status: TaskStatus) => {
    onUpdateTask(task.id, { status });
  };
  
  const currentStatusConfig = TASK_STATUSES.find(s => s.value === (task.status || DEFAULT_TASK_STATUS));
  const CurrentStatusIcon = currentStatusConfig?.icon || Circle;


  const cardStyle = {
    backgroundColor: task.color,
    // Basic contrast check: if color is light, use dark text, else use white text.
    // This is a simplification. True WCAG contrast calculation is more complex.
    color: parseInt(task.color.substring(1), 16) > 0xffffff / 2 ? 'hsl(var(--card-foreground))' : '#ffffff',
  };

  const mainTextColor = cardStyle.color;
  // A more nuanced subtle text color based on background lightness.
  // If background is very light (e.g., close to white), use a darker subtle text.
  // If background is darker, use a lighter subtle text.
  const subtleTextColor = parseInt(task.color.substring(1), 16) > 0xffffff / 1.5 
    ? 'rgba(0, 0, 0, 0.65)' // For light backgrounds like yellow, light green
    : 'rgba(255, 255, 255, 0.75)'; // For darker backgrounds


  if (isPrintView) {
    const printCardStyle = {
      backgroundColor: task.color,
      color: parseInt(task.color.substring(1), 16) > 0xffffff / 1.5 ? 'black' : 'white', // Simplified contrast for print
      border: '1px solid #ddd', // Ensure border for cutting
    };
    // Muted text color for print, ensuring readability
    const printMutedColor = parseInt(task.color.substring(1), 16) > 0xffffff / 1.5 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';

    return (
      <div className="postit-print break-inside-avoid flex flex-col justify-between" style={printCardStyle}>
        <div> {/* Content Section */}
          <h3 className="text-sm font-semibold mb-1.5 break-words hyphens-auto leading-tight" style={{ color: printCardStyle.color }}>
            {task.content}
          </h3>
        </div>
        <div className="mt-auto text-[10px] space-y-0.5" style={{ color: printMutedColor }}> {/* Footer Section */}
          <p><span className="font-medium" style={{ color: printCardStyle.color }}>Condició Termini:</span> {task.terminiRaw || "N/A"}</p>
          <p><span className="font-medium" style={{ color: printCardStyle.color }}>Data Límit:</span> {formatDate(task.adjustedDate)}</p>
          {/* Status is intentionally omitted for print view as per user request */}
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "flex flex-col shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out break-inside-avoid-column transform hover:scale-[1.02] rounded-lg",
        (isEditingContent || isEditingTermini) ? "ring-2 ring-primary ring-offset-2" : "" // visual cue for active editing
      )}
      style={{ backgroundColor: task.color }} // Dynamic background color
    >
      <CardHeader className="p-3 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center space-x-2" style={{ color: mainTextColor }}>
          <CurrentStatusIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            {currentStatusConfig?.label || task.status}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: mainTextColor, borderColor: subtleTextColor /* if button has border */ }}>
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Opcions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsEditingContent(true)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Editar Contingut
            </DropdownMenuItem>
             <DropdownMenuItem onSelect={() => setIsEditingTermini(true)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Editar Condició Termini
            </DropdownMenuItem>
            <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
              <PopoverTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setColorPickerOpen(true);
                  }}
                >
                  <Palette className="mr-2 h-4 w-4" />
                  Canviar Color
                </DropdownMenuItem>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-2"
                onOpenAutoFocus={(e) => e.preventDefault()} // Prevents focus shift issues
              >
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

      <CardContent className="p-3 flex-grow space-y-2">
        {isEditingContent ? (
          <div className="relative">
            <Textarea
              ref={contentTextareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onBlur={handleSaveContent} // Save on blur
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveContent(); } else if (e.key === 'Escape') { setIsEditingContent(false); setEditedContent(task.content); } }}
              className="w-full h-full min-h-[80px] resize-none bg-transparent border-white/30 focus:border-primary rounded-md placeholder:text-white/50"
              style={{ color: mainTextColor }}
              placeholder="Escriu el contingut..."
            />
             <Button size="sm" variant="ghost" onClick={handleSaveContent} className="absolute bottom-1 right-1" style={{color: mainTextColor}}>
              <Save size={16}/>
            </Button>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words hyphens-auto cursor-pointer min-h-[80px]" onClick={() => setIsEditingContent(true)} style={{ color: mainTextColor }}>
            {task.content}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-3 text-xs flex flex-col items-start space-y-2 border-t" style={{ borderColor: subtleTextColor, color: subtleTextColor }}>
        {/* Status Selector */}
        <div className="w-full">
          <Select value={task.status || DEFAULT_TASK_STATUS} onValueChange={(value: TaskStatus) => handleStatusChange(value)}>
            <SelectTrigger 
              className="h-8 text-xs w-full rounded"
              style={{ 
                backgroundColor: 'rgba(0,0,0,0.1)', // Slight dark overlay for readability
                color: mainTextColor, // Ensure text is readable
                borderColor: subtleTextColor // Use subtle border
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
        
        {/* Termini Raw Display & Edit */}
        <div className="pt-1 w-full">
            <p className="font-medium text-xs flex items-center mb-0.5" style={{ color: mainTextColor }}>
                <Info size={14} className="mr-1.5 shrink-0" /> Condició Termini:
            </p>
            {isEditingTermini ? (
              <div className="relative">
                <Textarea
                    ref={terminiTextareaRef}
                    value={editedTerminiRaw}
                    onChange={(e) => setEditedTerminiRaw(e.target.value)}
                    onBlur={handleSaveTermini}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveTermini(); } else if (e.key === 'Escape') { setIsEditingTermini(false); setEditedTerminiRaw(task.terminiRaw);}}}
                    className="w-full text-xs min-h-[40px] resize-none bg-transparent border-white/30 focus:border-primary rounded-md placeholder:text-white/50"
                    style={{ color: mainTextColor }}
                    placeholder="Escriu la condició del termini..."
                />
                 <Button size="sm" variant="ghost" onClick={handleSaveTermini} className="absolute bottom-0 right-0" style={{color: mainTextColor}}>
                   <Save size={14}/>
                 </Button>
              </div>
            ) : (
                <p className="pl-[22px] text-[11px] leading-tight break-words cursor-pointer" onClick={() => setIsEditingTermini(true)} style={{ color: mainTextColor }}>{task.terminiRaw || "N/A"}</p>
            )}
        </div>


        {/* Adjusted Date Display & Edit */}
        <div className="flex items-center text-xs pt-1 w-full justify-between" style={{ color: mainTextColor }}>
          <div className="flex items-center">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            Data Límit: {formatDate(task.adjustedDate)}
          </div>
          <Popover open={popoverCalendarOpen} onOpenChange={setPopoverCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" style={{ color: mainTextColor }}>
                <Edit3 size={14}/>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={getCalendarSelectedDate()}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Creation Date - less prominent */}
        <div className="text-[10px] opacity-80 pt-1" style={{ color: subtleTextColor }}>
          Creat: {formatDate(task.createdAt)}
        </div>
      </CardFooter>
    </Card>
  );
}

