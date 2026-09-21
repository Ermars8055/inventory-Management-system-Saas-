import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Boxes, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('priya@abcinternationalschool.edu');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // On subdomain → go to dashboard directly
      // On main domain → let RootRoute handle redirect to subdomain
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 bg-primary flex-col justify-between p-12 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg">StockPilot</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            One inventory platform for every organization.
          </h2>
          <p className="mt-4 text-primary-foreground/70 text-lg">
            Schools, pharmacies, retail, warehouses — configure modules and workflows to match your organization.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Configurable modules per organization',
              'Multi-tenant isolation with role-based access',
              'Custom fields, receipt templates, and workflows',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-primary-foreground/80">
                <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground/50" />
                <span className="text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-primary-foreground/40">© 2026 StockPilot. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">StockPilot</span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Sign in</CardTitle>
              <CardDescription>Enter your credentials to access your workspace</CardDescription>
            </CardHeader>
            <CardContent>
              {new URLSearchParams(window.location.search).get('expired') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
                  Your session has expired. Please sign in again.
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@organization.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Default password: <code className="bg-muted px-1 rounded">password123</code>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
