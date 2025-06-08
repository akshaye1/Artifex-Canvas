import Link from 'next/link';
import { AppLogo } from './app-logo';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" passHref>
          <AppLogo />
        </Link>
        <nav className="flex items-center gap-4">
          {/* Placeholder for future navigation or user actions */}
          {/* <Button variant="ghost" size="icon">
            <UserCircle className="h-6 w-6" />
            <span className="sr-only">User Profile</span>
          </Button> */}
        </nav>
      </div>
    </header>
  );
}
