import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex h-20 w-20 rounded-full bg-destructive/10 items-center justify-center mb-6">
          <ShieldOff className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">403</h1>
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You don't have permission to access this page. Please contact your organization administrator if you need access.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
          <Button variant="outline" onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
