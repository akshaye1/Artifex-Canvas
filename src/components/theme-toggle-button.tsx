
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/theme-context';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder or null to avoid hydration mismatch
    // For example, a disabled button or nothing
    return <Button variant="ghost" size="icon" disabled aria-label="Toggle theme" className="h-6 w-6" />;
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'light' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
    </Button>
  );
}
