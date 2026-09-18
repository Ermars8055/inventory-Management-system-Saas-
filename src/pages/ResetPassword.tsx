import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Check, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Invalid reset link</h2>
          <p className="text-sm text-muted-foreground mb-4">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-sm text-primary font-medium hover:underline">Request a new one</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Password reset!</h2>
          <p className="text-sm text-muted-foreground mb-6">You can now log in with your new password.</p>
          <Link to="/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Set new password</h2>
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
              </div>
            </div>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 text-sm text-destructive">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" required minLength={8} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm password</Label>
                <Input type="password" required minLength={8} placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
