
import Link from 'next/link';
import { AppLogo } from './app-logo';
import { ThemeToggleButton } from './theme-toggle-button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" passHref>
          <AppLogo />
        </Link>
        <nav className="flex items-center gap-4">
          <ThemeToggleButton />
        </nav>
      </div>
    </header>
  );
}
