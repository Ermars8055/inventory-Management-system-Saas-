import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const isSubdomain = window.location.hostname.includes('.stockpilot.') && window.location.hostname !== 'stockpilot.ermarscastar.in';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex h-20 w-20 rounded-full bg-muted items-center justify-center mb-6">
          <MapPinOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
        <h2 className="text-lg font-semibold mb-2">
          {isSubdomain ? 'Organization not found' : 'Page not found'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {isSubdomain
            ? "This subdomain doesn't belong to any organization. Check the URL or contact your admin."
            : "The page you're looking for doesn't exist or has been moved."
          }
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
          {!isSubdomain && (
            <Link to="/">
              <Button>Go Home</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
