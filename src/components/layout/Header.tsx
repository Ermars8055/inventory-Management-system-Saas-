import { Menu, Search, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { NotificationBell } from '@/components/shared/NotificationBell';

interface HeaderProps {
  onMenuClick: () => void;
  onStartTutorial: () => void;
}

export function Header({ onMenuClick, onStartTutorial }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 max-w-md">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="relative w-full flex items-center gap-2 h-9 px-3 rounded-md bg-muted/50 border border-transparent hover:border-input transition-colors text-left"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search...</span>
          <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 text-[10px] font-mono text-muted-foreground">
            Ctrl+K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant="ghost" size="icon" onClick={onStartTutorial} title="Take the tour">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <NotificationBell />
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {/* Will be populated from user context later */}
          </AvatarFallback>
        </Avatar>
      </div>

      <CommandPalette />
    </header>
  );
}
