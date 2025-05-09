
'use client';

import { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/types';
import { parseTaskFile, createNewTaskObject } from '@/lib/task-utils'; 
import { APP_HEADER_TERMINI, APP_HEADER_CONTENT, APP_HEADER_DUE_DATE } from '@/config/app-config';

interface DataImporterProps {
  onTasksImported: (tasks: Task[]) => void;
}

export function DataImporter({ onTasksImported }: DataImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      // Check for CSV MIME types or .csv extension
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv') || selectedFile.type === 'application/vnd.ms-excel') { // Added application/vnd.ms-excel for some CSVs
        setFile(selectedFile);
      } else {
        toast({
          variant: "destructive",
          title: "Fitxer invàlid",
          description: "Si us plau, selecciona un fitxer CSV.",
        });
        setFile(null);
        event.target.value = ""; // Reset file input
      }
    }
  };

  const handleImport = async () => {
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
      onTasksImported(newTasks);
      toast({
        title: "Importació completada",
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
          Importar Tasques des de CSV
        </CardTitle>
        <CardDescription>
          Puja un fitxer CSV. Les capçaleres de columna requerides són '{APP_HEADER_TERMINI}', '{APP_HEADER_CONTENT}', i '{APP_HEADER_DUE_DATE}' (han de començar amb '#').
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="file-upload">Fitxer CSV</Label>
          <Input id="file-upload" type="file" accept=".csv,text/csv,application/vnd.ms-excel" onChange={handleFileChange} className="file:text-sm file:font-medium"/>
        </div>
        {file && (
          <div className="flex items-center text-sm text-muted-foreground">
            <FileText className="mr-2 h-4 w-4" />
            <span>{file.name}</span>
          </div>
        )}
        <Button onClick={handleImport} disabled={!file || isLoading} className="w-full sm:w-auto">
          {isLoading ? 'Important...' : 'Importar Tasques (CSV)'}
        </Button>
      </CardContent>
    </Card>
  );
}
