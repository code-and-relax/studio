
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/types';
import { parseTaskFile, createNewTaskObject } from '@/lib/task-utils';
import { APP_HEADER_TERMINI, APP_HEADER_CONTENT, APP_HEADER_DUE_DATE } from '@/config/app-config';
import { useState, ChangeEvent, DragEvent, useCallback } from 'react';

interface DataImporterProps {
  onTasksImported: (tasks: Task[]) => void;
  onTasksReplaced: (tasks: Task[]) => void;
  onDownloadCSV: () => void;
  onClearAllTasksRequested: () => void;
}

export function DataImporter({ onTasksImported, onTasksReplaced, onDownloadCSV, onClearAllTasksRequested }: DataImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv') || selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile);
      } else {
        toast({
          variant: "destructive",
          title: "Fitxer invàlid",
          description: "Si us plau, selecciona un fitxer CSV.",
        });
        setFile(null);
        event.target.value = "";
      }
    }
  };

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv') || selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile);
      } else {
        toast({
          variant: "destructive",
          title: "Fitxer invàlid",
          description: "Si us plau, selecciona un fitxer CSV.",
        });
        setFile(null);
      }
    }
  }, [toast]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleImport = async (replaceExisting: boolean = false) => {
    if (!file) {
      toast({
        title: "Cap fitxer seleccionat",
        description: "Si us plau, selecciona un fitxer CSV per importar.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const partialTasks = await parseTaskFile(file);
      const newTasks = partialTasks.map(pt => createNewTaskObject(pt));

      if (replaceExisting) {
        onTasksReplaced(newTasks);
      } else {
        onTasksImported(newTasks);
      }

      toast({
        title: `Importació completada ${replaceExisting ? '(reemplaçant)' : '(afegint)'}`,
        description: `${newTasks.length} tasques importades correctament des del CSV.`,
      });
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error: any) {
      console.error("Error importing tasks from CSV:", error);
      toast({
        variant: "destructive",
        title: "Error d'importació CSV",
        description: error.message || "No s'han pogut importar les tasques del fitxer CSV.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-md no-print">
      <CardHeader>
        <CardTitle className="flex items-center">
          <UploadCloud className="mr-2 h-6 w-6 text-primary" />
          Gestionar Tasques (CSV)
        </CardTitle>
        <CardDescription>
          Puja un fitxer CSV per afegir o reemplaçar tasques. Les capçaleres requerides són '{APP_HEADER_TERMINI}', '{APP_HEADER_CONTENT}', i '{APP_HEADER_DUE_DATE}' (han de començar amb '#'). També pots descarregar les tasques actuals o eliminar-les totes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="file-upload">Fitxer CSV</Label>
          <div
            className="flex items-center justify-center w-full border-2 border-dashed border-border rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600 min-h-[150px]"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <div className="flex flex-col items-center justify-center text-center p-4">
              <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
              </svg>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Clica per pujar</span> o arrossega i deixa anar</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Només fitxers CSV</p>
              {file && <p className="mt-2 text-sm text-primary dark:text-primary">{file.name}</p>}
            </div>
            <input id="file-upload" type="file" accept=".csv,text/csv,application/vnd.ms-excel" onChange={handleFileChange} className="hidden" />
          </div>
        </div>
        {file && (
          <div className="flex items-center text-sm text-muted-foreground">
            <FileText className="mr-2 h-4 w-4" />
            <span>{file.name}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button onClick={() => handleImport(false)} disabled={!file || isLoading} className="flex-1">
            {isLoading ? 'Important...' : 'Afegir Tasques'}
          </Button>
          <Button onClick={() => handleImport(true)} disabled={!file || isLoading} variant="outline" className="flex-1">
            {isLoading ? 'Reemplaçant...' : 'Reemplaçar Tasques'}
          </Button>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={onDownloadCSV} variant="secondary" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Descarregar Tasques (CSV)
          </Button>
          <Button onClick={onClearAllTasksRequested} variant="destructive" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar Totes les Tasques
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
