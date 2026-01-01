import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Save, MessageSquare } from 'lucide-react';

interface SaveChangesDialogProps {
  isOpen: boolean;
  changeCount: number;
  saving: boolean;
  onClose: () => void;
  onSave: (description?: string) => void;
}

/**
 * Dialog for saving changes with optional description
 * Shows change count summary and allows adding a note for the snapshot
 */
export function SaveChangesDialog({
  isOpen,
  changeCount,
  saving,
  onClose,
  onSave,
}: SaveChangesDialogProps) {
  const [description, setDescription] = useState('');

  const handleSave = () => {
    onSave(description.trim() || undefined);
    setDescription('');
  };

  const handleClose = () => {
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Changes
          </DialogTitle>
          <DialogDescription>
            You have {changeCount} pending change{changeCount !== 1 ? 's' : ''} to save.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <MessageSquare className="h-4 w-4" />
            Add a note (optional)
          </label>
          <Input
            placeholder="e.g., Updated rates for Q1 pricing..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !saving) {
                handleSave();
              }
            }}
            disabled={saving}
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-2">
            This note will appear in the pricing history timeline.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
