"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Palette, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  POSTIT_COLOR_PALETTE,
  TASK_STATUSES,
  DEFAULT_TASK_STATUS,
  INITIAL_POSTIT_COLOR,
} from "@/config/app-config";
import type { TaskStatus } from "@/types";
import { formatDate } from "@/lib/task-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Clock,
  Calendar as CalendarIcon,
  CircleDashed,
  Tag,
  Bookmark,
  FileCode2,
  Building2,
  ImageIcon,
} from "lucide-react";

const addTaskFormSchema = z
  .object({
    content: z.string().min(1, { message: "El contingut és obligatori." }),
    terminiRaw: z.string().optional(),
    adjustedDate: z.date().optional(),
    inicio: z.date().optional(),
    status: z
      .custom<TaskStatus>((val) => TASK_STATUSES.some((s) => s.value === val), {
        message: "Estat invàlid",
      })
      .default(DEFAULT_TASK_STATUS),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, { message: "Color invàlid." })
      .default(INITIAL_POSTIT_COLOR),
    convocatoria: z.coerce.number().optional(),
    accio: z.string().optional(),
    cp: z.string().optional(),
    nomAccio: z.string().optional(),
    centro: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.inicio && data.adjustedDate) {
        return data.adjustedDate >= data.inicio;
      }
      return true;
    },
    {
      message: "La Data Límit no pot ser anterior a l'Inici de la Tasca.",
      path: ["adjustedDate"],
    }
  );

export type AddTaskFormValues = z.infer<typeof addTaskFormSchema>;
export type AddTaskFormSubmitValues = AddTaskFormValues & {
  logoFileBase64?: string | undefined;
};

interface AddTaskFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (values: AddTaskFormSubmitValues) => void;
}

export function AddTaskForm({
  isOpen,
  onOpenChange,
  onSubmit,
}: AddTaskFormProps) {
  const [calendarOpenAdjustedDate, setCalendarOpenAdjustedDate] =
    useState(false);
  const [calendarOpenInicio, setCalendarOpenInicio] = useState(false);
  const [maxDateCalendarOpen, setMaxDateCalendarOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [logoFileBase64, setLogoFileBase64] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (!isOpen) {
      setLogoFileBase64(undefined);
    }
  }, [isOpen]);

  const form = useForm<AddTaskFormValues>({
    resolver: zodResolver(addTaskFormSchema),
    defaultValues: {
      content: "",
      terminiRaw: "",
      status: DEFAULT_TASK_STATUS,
      color: INITIAL_POSTIT_COLOR,
      adjustedDate: undefined,
      inicio: undefined,
      convocatoria: undefined,
      accio: "",
      cp: "",
      nomAccio: "",
      centro: "",
    },
  });

  const watchedValues = form.watch();

  const handleLogoFileChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoFileBase64(undefined);
    }
  };

  const handleSubmit = (values: AddTaskFormValues) => {
    onSubmit({ ...values, logoFileBase64 });
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl">Creador de Tasques</DialogTitle>
              <DialogDescription>
                Crea o edita un post-it amb tota la informació necessària
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="mb-4 flex justify-end">
          <Button
            variant={activeTab === "preview" ? "default" : "outline"}
            onClick={() =>
              setActiveTab(activeTab === "preview" ? "basic" : "preview")
            }
          >
            {activeTab === "preview" ? "Edita" : "Vista prèvia"}
          </Button>
        </div>
        {activeTab === "preview" ? (
          <div className="flex justify-center">
            <div
              className="w-72 h-72 p-4 shadow-lg rounded-md transform rotate-1 transition-all relative"
              style={{ backgroundColor: watchedValues.color }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-bold">
                  {typeof watchedValues.convocatoria === "number" ||
                  typeof watchedValues.convocatoria === "string"
                    ? `CONV: ${watchedValues.convocatoria}`
                    : null}
                </div>
                <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-lg font-bold border border-gray-300">
                  {logoFileBase64 ? (
                    <img
                      src={logoFileBase64}
                      alt="preview"
                      className="w-10 h-10 object-contain rounded-full"
                    />
                  ) : (
                    (watchedValues.content?.[0] || "?").toUpperCase()
                  )}
                </div>
              </div>
              <div className="font-bold mb-2 text-sm truncate">
                {watchedValues.nomAccio || "Nom de l'acció"}
              </div>
              <div className="text-sm mb-3 overflow-hidden max-h-24">
                {watchedValues.content || "Contingut de la tasca..."}
              </div>
              <div className="text-xs mt-auto">
                {watchedValues.adjustedDate && (
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {watchedValues.adjustedDate instanceof Date
                      ? formatDate(watchedValues.adjustedDate)
                      : watchedValues.adjustedDate}
                  </div>
                )}
                {watchedValues.terminiRaw && (
                  <div className="text-xs italic mt-1">
                    {watchedValues.terminiRaw}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-2 text-xs">
                <div>{watchedValues.accio}</div>
                <div>{watchedValues.cp}</div>
              </div>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mb-4"
              >
                <TabsList className="grid grid-cols-2 mb-6">
                  <TabsTrigger value="basic">Informació bàsica</TabsTrigger>
                  <TabsTrigger value="details">Detalls addicionals</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            Contingut de la tasca
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descripció detallada de la tasca..."
                              className="min-h-[80px]"
                              {...field}
                            />
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
                          <FormLabel className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            Condició del termini
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: MÍNIM 7 DIES ABANS..."
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adjustedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Data límit
                          </FormLabel>
                          <Popover
                            open={calendarOpenAdjustedDate}
                            onOpenChange={setCalendarOpenAdjustedDate}
                          >
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
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setCalendarOpenAdjustedDate(false);
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
                      name="inicio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <CalendarDays className="w-4 h-4 mr-2" />
                            Inici de la tasca
                          </FormLabel>
                          <Popover
                            open={calendarOpenInicio}
                            onOpenChange={setCalendarOpenInicio}
                          >
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
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setCalendarOpenInicio(false);
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
                          <FormLabel className="flex items-center">
                            <CircleDashed className="w-4 h-4 mr-2" />
                            Estat
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un estat" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TASK_STATUSES.map((statusOpt) => (
                                <SelectItem
                                  key={statusOpt.value}
                                  value={statusOpt.value}
                                >
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
                          <FormLabel className="flex items-center">
                            <Tag className="w-4 h-4 mr-2" />
                            Color del post-it
                          </FormLabel>
                          <Popover
                            open={colorPickerOpen}
                            onOpenChange={setColorPickerOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start"
                                >
                                  <div
                                    className="w-4 h-4 rounded-full mr-2 border"
                                    style={{ backgroundColor: field.value }}
                                  />
                                  {POSTIT_COLOR_PALETTE.find(
                                    (c) => c.value === field.value
                                  )?.name || field.value}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3">
                              <div className="grid grid-cols-3 gap-2">
                                {POSTIT_COLOR_PALETTE.map((colorOpt) => (
                                  <Button
                                    key={colorOpt.value}
                                    variant="outline"
                                    size="icon"
                                    className={cn(
                                      "h-8 w-8 rounded-full border-2",
                                      field.value === colorOpt.value
                                        ? "border-primary ring-2 ring-primary"
                                        : "border-gray-300"
                                    )}
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
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="flex items-center font-medium mb-1">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Imatge o inicial de la tasca
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleLogoFileChange(e.target.files?.[0] || null)
                      }
                    />
                    {logoFileBase64 && (
                      <img
                        src={logoFileBase64}
                        alt="preview"
                        className="mt-2 w-16 h-16 object-contain rounded-full border"
                      />
                    )}
                    {!logoFileBase64 && watchedValues.content && (
                      <div className="mt-2 w-16 h-16 flex items-center justify-center rounded-full border bg-white/80 text-3xl font-bold text-gray-500">
                        {(watchedValues.content[0] || "?").toUpperCase()}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="details" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="convocatoria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Bookmark className="w-4 h-4 mr-2" />
                            Convocatòria
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Número de convocatòria"
                              value={
                                field.value === undefined ||
                                field.value === null
                                  ? ""
                                  : field.value
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <FileCode2 className="w-4 h-4 mr-2" />
                            Acció
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Identificador d'acció"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Tag className="w-4 h-4 mr-2" />
                            CP
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Identificador CP"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nomAccio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            Nom acció
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nom de l'acció"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="centro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Building2 className="w-4 h-4 mr-2" />
                            Centre
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Centre"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter className="flex justify-between mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel·la
                  </Button>
                </DialogClose>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Afegeix tasca
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
