import { Paintbrush } from 'lucide-react';

export function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <Paintbrush className="h-8 w-8 text-primary" />
      <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">
        Artifex Canvas
      </h1>
    </div>
  );
}
