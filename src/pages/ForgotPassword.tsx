import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full text-center">
          <div className="inline-flex h-16 w-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground mb-6">
            If an account exists for <strong>{email}</strong>, we've sent a password reset link.
          </p>
          <Link to="/login" className="text-sm text-primary font-medium hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full">
        <Link to="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Forgot password?</h2>
                <p className="text-xs text-muted-foreground">We'll send you a reset link</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email address</Label>
                <Input type="email" required placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
