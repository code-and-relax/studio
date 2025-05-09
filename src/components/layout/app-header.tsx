import { Button } from "@/components/ui/button";
import { Printer, BookOpenText } from "lucide-react";
import { useRouter } from 'next/navigation';

interface AppHeaderProps {
  onPrint: () => void;
}

export function AppHeader({ onPrint }: AppHeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b no-print">
      <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <BookOpenText className="h-7 w-7 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground">Academia Board</h1>
        </div>
        <Button variant="outline" onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>
    </header>
  );
}
