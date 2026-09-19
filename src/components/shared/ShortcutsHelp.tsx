import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { keys: 'Ctrl + K', description: 'Open search / command palette' },
  { keys: 'Ctrl + N', description: 'New item (context-aware)' },
  { keys: 'Escape', description: 'Close any open dialog' },
  { keys: '?', description: 'Show this keyboard shortcuts help' },
];

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster.
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Shortcut</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SHORTCUTS.map((s) => (
              <TableRow key={s.keys}>
                <TableCell>
                  <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    {s.keys}
                  </kbd>
                </TableCell>
                <TableCell className="text-sm">{s.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
