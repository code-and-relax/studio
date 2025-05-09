
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Palette, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POSTIT_COLOR_PALETTE, TASK_STATUSES, DEFAULT_TASK_STATUS, INITIAL_POSTIT_COLOR } from '@/config/app-config';
import type { TaskStatus } from '@/types';
import { formatDate } from '@/lib/task-utils';


const addTaskFormSchema = z.object({
  content: z.string().min(1, { message: "El contingut és requerit." }),
  terminiRaw: z.string().optional(),
  adjustedDate: z.date().optional(),
  status: z.custom<TaskStatus>((val) => TASK_STATUSES.some(s => s.value === val), {
      message: "Estat invàlid",
    }).default(DEFAULT_TASK_STATUS),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "Color invàlid."}).default(INITIAL_POSTIT_COLOR),
});

export type AddTaskFormValues = z.infer<typeof addTaskFormSchema>;

interface AddTaskFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (values: AddTaskFormValues) => void;
}

export function AddTaskForm({ isOpen, onOpenChange, onSubmit }: AddTaskFormProps) {
  const form = useForm<AddTaskFormValues>({
    resolver: zodResolver(addTaskFormSchema),
    defaultValues: {
      content: '',
      terminiRaw: '',
      status: DEFAULT_TASK_STATUS,
      color: INITIAL_POSTIT_COLOR,
      adjustedDate: undefined,
    },
  });

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      form.reset({ // Reset to defaults when dialog opens
        content: '',
        terminiRaw: '',
        status: DEFAULT_TASK_STATUS,
        color: INITIAL_POSTIT_COLOR,
        adjustedDate: undefined,
      });
    }
  }, [isOpen, form]);

  const handleSubmit = (values: AddTaskFormValues) => {
    onSubmit(values);
    // onOpenChange(false); // Dialog will be closed by parent after successful submission in page.tsx
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Afegir Nova Tasca</DialogTitle>
          <DialogDescription>
            Completa els detalls de la nova tasca.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contingut de la Tasca</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripció detallada de la tasca..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terminiRaw"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condició del Termini (Textual)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: MÍNIM 7 DIES ABANS..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adjustedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Límit</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            formatDate(field.value)
                          ) : (
                            <span>Tria una data</span>
                          )}
                          <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setCalendarOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estat</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estat" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_STATUSES.map(statusOpt => (
                        <SelectItem key={statusOpt.value} value={statusOpt.value}>
                          <div className="flex items-center">
                            <statusOpt.icon className="mr-2 h-4 w-4" />
                            {statusOpt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color del Post-it</FormLabel>
                  <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start">
                          <div className="w-4 h-4 rounded-full mr-2 border" style={{ backgroundColor: field.value }} />
                          {POSTIT_COLOR_PALETTE.find(c => c.value === field.value)?.name || field.value}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                       <div className="grid grid-cols-3 gap-2">
                          {POSTIT_COLOR_PALETTE.map((colorOpt) => (
                            <Button
                              key={colorOpt.value}
                              variant="outline"
                              size="icon"
                              className={cn("h-8 w-8 rounded-full border-2", field.value === colorOpt.value ? "border-primary ring-2 ring-primary" : "border-gray-300")}
                              style={{ backgroundColor: colorOpt.value }}
                              onClick={() => {
                                field.onChange(colorOpt.value);
                                setColorPickerOpen(false);
                              }}
                              aria-label={colorOpt.name}
                            />
                          ))}
                        </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel·lar
                </Button>
              </DialogClose>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Afegir Tasca
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
