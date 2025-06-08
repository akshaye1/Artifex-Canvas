export function Footer() {
  return (
    <footer className="border-t border-border/40 py-6 md:py-8">
      <div className="container flex flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground md:flex-row md:justify-between md:gap-0">
        <p>&copy; {new Date().getFullYear()} Artifex Canvas. All rights reserved.</p>
        <p className="font-headline">Crafted with <span className="text-primary">&hearts;</span> by AI</p>
      </div>
    </footer>
  );
}
