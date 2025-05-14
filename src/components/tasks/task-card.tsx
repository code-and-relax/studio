"use client";

import { useState, useEffect, useRef } from "react";
import type { Task, TaskStatus } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarDays,
  Edit3,
  Palette,
  Trash2,
  MoreVertical,
  Info,
  Save,
  Copy,
} from "lucide-react";
import { formatDate, parseCustomDateString } from "@/lib/task-utils";
import {
  POSTIT_COLOR_PALETTE,
  TASK_STATUSES,
  DEFAULT_TASK_STATUS,
} from "@/config/app-config";
import { cn } from "@/lib/utils";
import { isValid } from "date-fns";

interface TaskCardProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  isPrintView?: boolean;
  onDuplicateTask?: (task: Task) => void; // Nuevo prop opcional para duplicar
}

export function TaskCard({
  task,
  onUpdateTask,
  onDeleteTask,
  isPrintView = false,
  onDuplicateTask,
}: TaskCardProps) {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState(task.content);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [isEditingTermini, setIsEditingTermini] = useState(false);
  const [editedTerminiRaw, setEditedTerminiRaw] = useState(task.terminiRaw);
  const terminiTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [popoverCalendarOpen, setPopoverCalendarOpen] = useState(false);

  // Color picker states
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const popoverColorContentRef = useRef<HTMLDivElement>(null);

  const getCalendarSelectedDate = (): Date | undefined => {
    if (task.adjustedDate instanceof Date && isValid(task.adjustedDate)) {
      return task.adjustedDate;
    }
    if (typeof task.adjustedDate === "string") {
      const parsed = parseCustomDateString(task.adjustedDate);
      return parsed instanceof Date && isValid(parsed) ? parsed : undefined;
    }
    return undefined;
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
      onUpdateTask(task.id, { adjustedDate: "Data no especificada" });
    }
    setPopoverCalendarOpen(false);
  };

  const handleColorChange = (color: string) => {
    onUpdateTask(task.id, { color });
    setColorPickerOpen(false);
    setDropdownOpen(false);
  };

  const handleStatusChange = (status: TaskStatus) => {
    onUpdateTask(task.id, { status });
  };

  const currentStatusConfig = TASK_STATUSES.find(
    (s) => s.value === (task.status || DEFAULT_TASK_STATUS)
  );
  const CurrentStatusIcon = currentStatusConfig?.icon || Info;

  const cardStyle = {
    backgroundColor: task.color,
    color:
      parseInt(task.color.substring(1), 16) > 0xffffff / 2
        ? "hsl(var(--card-foreground))"
        : "#ffffff",
  };

  const mainTextColor = cardStyle.color;
  const subtleTextColor =
    parseInt(task.color.substring(1), 16) > 0xffffff / 1.5
      ? "rgba(0, 0, 0, 0.65)"
      : "rgba(255, 255, 255, 0.75)";

  if (isPrintView) {
    const printCardStyle = {
      backgroundColor: task.color,
      color:
        parseInt(task.color.substring(1), 16) > 0xffffff / 1.5
          ? "black"
          : "white",
      border: "1px solid #ddd",
    };
    const printMutedColor =
      parseInt(task.color.substring(1), 16) > 0xffffff / 1.5
        ? "rgba(0,0,0,0.7)"
        : "rgba(255,255,255,0.8)";

    // Avatar: imagen subida o inicial
    let avatarNode = null;
    if (task.logoFile && typeof task.logoFile === "string") {
      avatarNode = (
        <img
          src={task.logoFile}
          alt="avatar"
          className="w-10 h-10 object-contain rounded-full border border-gray-300 bg-white"
          style={{ maxWidth: 40, maxHeight: 40 }}
        />
      );
    } else {
      const initial = (task.content?.[0] || "?").toUpperCase();
      avatarNode = (
        <span
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 text-lg font-bold border border-gray-300"
          style={{ fontSize: 22 }}
        >
          {initial}
        </span>
      );
    }

    return (
      <div
        className="postit-print break-inside-avoid flex flex-col justify-between relative"
        style={printCardStyle}
      >
        {/* Cabecera superior */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex flex-col items-start">
            <span
              className="text-xs font-bold"
              style={{ color: printCardStyle.color }}
            >
              {task.convocatoria ? `${task.convocatoria}` : null}
              {task.convocatoria && task.nomAccio ? " - " : ""}
              {task.nomAccio || null}
            </span>
          </div>
          <div className="flex-shrink-0 ml-2">{avatarNode}</div>
        </div>

        {/* Acción */}
        {task.accio && (
          <div
            className="text-xs font-semibold mb-1"
            style={{ color: printMutedColor }}
          >
            {task.accio}
          </div>
        )}

        {/* Fechas inicio y fin */}
        <div className="flex flex-row gap-2 mb-1 text-xs">
          <div>
            <span
              className="font-medium"
              style={{ color: printCardStyle.color }}
            >
              Inici:
            </span>{" "}
            {formatDate(task.inicio)}
          </div>
          <div>
            <span
              className="font-medium"
              style={{ color: printCardStyle.color }}
            >
              Fi:
            </span>{" "}
            {formatDate(task.adjustedDate)}
          </div>
        </div>

        {/* Centro */}
        {task.centro && (
          <div className="text-xs mb-1" style={{ color: printMutedColor }}>
            <span className="font-medium">Centre: </span>
            {task.centro}
          </div>
        )}

        {/* Área central para escribir */}
        <div
          className="flex-1 my-2 border-dashed border-2 border-gray-400 rounded bg-white/40 min-h-[32mm] max-h-[40mm]"
          style={{ minHeight: "32mm", background: "rgba(255,255,255,0.25)" }}
        />

        {/* Abajo: termini, data a fer */}
        <div
          className="mt-auto text-[10px] space-y-0.5"
          style={{ color: printMutedColor }}
        >
          {task.terminiRaw && (
            <p>
              <span
                className="font-medium"
                style={{ color: printCardStyle.color }}
              >
                Condició Termini:
              </span>{" "}
              {task.terminiRaw}
            </p>
          )}
          <p>
            <span
              className="font-medium"
              style={{ color: printCardStyle.color }}
            >
              Data a fer:
            </span>{" "}
            {formatDate(task.originalDueDate)}
          </p>
        </div>
      </div>
    );
  }

  // Avatar: imagen subida o inicial for UI
  let avatarNode = null;
  if (task.logoFile && typeof task.logoFile === "string") {
    avatarNode = (
      <img
        src={task.logoFile}
        alt="avatar"
        className="w-10 h-10 object-contain rounded-full border border-gray-300 bg-white"
        style={{ maxWidth: 40, maxHeight: 40 }}
      />
    );
  } else {
    const initial = (task.content?.[0] || "?").toUpperCase();
    avatarNode = (
      <span
        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 text-lg font-bold border border-gray-300"
        style={{ fontSize: 22 }}
      >
        {initial}
      </span>
    );
  }

  return (
    <Card
      className={cn(
        "flex flex-col shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out break-inside-avoid-column transform hover:scale-[1.02] rounded-lg",
        isEditingContent || isEditingTermini
          ? "ring-2 ring-primary ring-offset-2"
          : ""
      )}
      style={{ backgroundColor: task.color }}
    >
      <CardHeader className="p-3 flex flex-row items-start justify-between space-y-0">
        <div className="flex flex-col items-start">
          {!isPrintView && currentStatusConfig && (
            <div
              className="flex items-center space-x-2"
              style={{ color: mainTextColor }}
            >
              <CurrentStatusIcon className="h-5 w-5" />
              <span className="text-sm font-medium">
                {currentStatusConfig?.label || task.status}
              </span>
            </div>
          )}
          {isPrintView && <div />}{" "}
          {/* Placeholder to keep layout consistent if status is hidden */}
          <span className="text-xs" style={{ color: subtleTextColor }}>
            Inici: {formatDate(task.inicio)}
          </span>
        </div>
        <div className="flex-shrink-0 ml-2">{avatarNode}</div>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              style={{ color: mainTextColor, borderColor: subtleTextColor }}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Opcions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                setIsEditingContent(true);
                setDropdownOpen(false);
              }}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Editar Contingut
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setIsEditingTermini(true);
                setDropdownOpen(false);
              }}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Editar Condició Termini
            </DropdownMenuItem>

            {/* Color picker handling */}
            <div
              onMouseEnter={() => {
                // Keep dropdown open when hovering this container
                setColorPickerOpen(true);
              }}
            >
              <Popover
                open={colorPickerOpen}
                onOpenChange={(open) => {
                  setColorPickerOpen(open);
                  if (!open) {
                    // Allow dropdown to close when color picker is closed
                    setDropdownOpen(false);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault(); // Prevent default dropdown closing
                      setColorPickerOpen(true);
                    }}
                  >
                    <Palette className="mr-2 h-4 w-4" />
                    Canviar Color
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent
                  ref={popoverColorContentRef}
                  className="w-auto p-2"
                  side="right"
                  align="start"
                  onEscapeKeyDown={() => {
                    setColorPickerOpen(false);
                    setDropdownOpen(false);
                  }}
                  onPointerDownOutside={() => {
                    setColorPickerOpen(false);
                    setDropdownOpen(false);
                  }}
                  onInteractOutside={(e) => {
                    e.preventDefault(); // Prevent closing on interact outside
                  }}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {POSTIT_COLOR_PALETTE.map((colorOpt) => (
                      <Button
                        key={colorOpt.value}
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-full border-2",
                          task.color === colorOpt.value
                            ? "border-primary ring-2 ring-primary"
                            : "border-gray-300"
                        )}
                        style={{ backgroundColor: colorOpt.value }}
                        onClick={() => handleColorChange(colorOpt.value)}
                        aria-label={colorOpt.name}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <DropdownMenuItem
              onSelect={() => {
                if (onDuplicateTask) onDuplicateTask(task);
                setDropdownOpen(false);
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicar Nota
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                onDeleteTask(task.id);
                setDropdownOpen(false);
              }}
              className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
            >
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
              onBlur={handleSaveContent}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveContent();
                } else if (e.key === "Escape") {
                  setIsEditingContent(false);
                  setEditedContent(task.content);
                }
              }}
              className="w-full h-full min-h-[80px] resize-none bg-transparent border-white/30 focus:border-primary rounded-md placeholder:text-white/50"
              style={{ color: mainTextColor }}
              placeholder="Escriu el contingut..."
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSaveContent}
              className="absolute bottom-1 right-1"
              style={{ color: mainTextColor }}
            >
              <Save size={16} />
            </Button>
          </div>
        ) : (
          <p
            className="text-sm whitespace-pre-wrap break-words hyphens-auto cursor-pointer min-h-[80px]"
            onClick={() => setIsEditingContent(true)}
            style={{ color: mainTextColor }}
          >
            {task.content}
          </p>
        )}
      </CardContent>

      <CardFooter
        className="p-3 text-xs flex flex-col items-start space-y-2 border-t"
        style={{ borderColor: subtleTextColor, color: subtleTextColor }}
      >
        {!isPrintView && (
          <div className="w-full">
            <Select
              value={task.status || DEFAULT_TASK_STATUS}
              onValueChange={(value: TaskStatus) => handleStatusChange(value)}
            >
              <SelectTrigger className="h-8 text-xs w-full rounded">
                <SelectValue placeholder="Canviar estat" />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((statusOpt) => (
                  <SelectItem
                    key={statusOpt.value}
                    value={statusOpt.value}
                    className="text-xs"
                  >
                    <div className="flex items-center">
                      <statusOpt.icon className="mr-2 h-4 w-4" />
                      {statusOpt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="pt-1 w-full">
          <p
            className="font-medium text-xs flex items-center mb-0.5"
            style={{ color: mainTextColor }}
          >
            <Info size={14} className="mr-1.5 shrink-0" /> Condició Termini:
          </p>
          {isEditingTermini ? (
            <div className="relative">
              <Textarea
                ref={terminiTextareaRef}
                value={editedTerminiRaw}
                onChange={(e) => setEditedTerminiRaw(e.target.value)}
                onBlur={handleSaveTermini}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveTermini();
                  } else if (e.key === "Escape") {
                    setIsEditingTermini(false);
                    setEditedTerminiRaw(task.terminiRaw);
                  }
                }}
                className="w-full text-xs min-h-[40px] resize-none bg-transparent border-white/30 focus:border-primary rounded-md placeholder:text-white/50"
                style={{ color: mainTextColor }}
                placeholder="Escriu la condició del termini..."
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSaveTermini}
                className="absolute bottom-0 right-0"
                style={{ color: mainTextColor }}
              >
                <Save size={14} />
              </Button>
            </div>
          ) : (
            <p
              className="pl-[22px] text-[11px] leading-tight break-words cursor-pointer"
              onClick={() => setIsEditingTermini(true)}
              style={{ color: mainTextColor }}
            >
              {task.terminiRaw || "N/A"}
            </p>
          )}
        </div>

        <div
          className="flex items-center text-xs pt-1 w-full justify-between"
          style={{ color: mainTextColor }}
        >
          <div className="flex items-center">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            Data Límit: {formatDate(task.adjustedDate)}
          </div>
          <Popover
            open={popoverCalendarOpen}
            onOpenChange={setPopoverCalendarOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                style={{ color: mainTextColor }}
              >
                <Edit3 size={14} />
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
        {task.centro && (
          <div className="pt-1 w-full">
            <p
              className="text-xs font-medium"
              style={{ color: subtleTextColor }}
            >
              Centre: {task.centro}
            </p>
          </div>
        )}
        <div
          className="text-[10px] opacity-80 pt-1"
          style={{ color: subtleTextColor }}
        >
          Creat: {formatDate(task.createdAt)}
        </div>
      </CardFooter>
    </Card>
  );
}
