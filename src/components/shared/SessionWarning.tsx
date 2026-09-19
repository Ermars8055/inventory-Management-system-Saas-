import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/** Decode the payload of a JWT without a library. */
function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url -> Base64 -> decoded string
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json);
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

const WARNING_THRESHOLD_SECONDS = 5 * 60; // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds

export default function SessionWarning() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);

  const check = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setOpen(false);
      return;
    }

    const exp = decodeJwtExp(token);
    if (exp === null) {
      setOpen(false);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = exp - now;

    if (remaining <= 0) {
      // Already expired -- let the normal 401 flow handle it
      setOpen(false);
      return;
    }

    if (remaining <= WARNING_THRESHOLD_SECONDS) {
      setMinutesLeft(Math.max(1, Math.ceil(remaining / 60)));
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    // Initial check
    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check]);

  const handleExtend = async () => {
    try {
      await api.get('/auth/me');
      // Token is still valid -- close the dialog and re-check later
      setOpen(false);
    } catch {
      // Token already invalid -- sign out
      logout();
    }
  };

  const handleSignOut = () => {
    setOpen(false);
    logout();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Session Expiring Soon</DialogTitle>
          <DialogDescription>
            Your session expires in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}.
            Continue working?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
          <Button onClick={handleExtend}>
            Extend Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
