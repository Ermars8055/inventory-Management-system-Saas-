import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@stockpilot.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#cdd9c4' }}
    >
      <div className="w-full max-w-[420px]">

        {/* Heading */}
        <div className="mb-8">
          <h1
            className="font-display leading-tight"
            style={{ fontSize: 44, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}
          >
            Admin{' '}
            <span
              className="inline-flex items-center justify-center px-3 rounded-2xl align-middle"
              style={{ background: '#c9f53c', height: 48 }}
            >
              <ShieldCheck className="h-6 w-6" style={{ color: '#141414' }} />
            </span>
            {' '}Access
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: '#6b7a62' }}>
            StockPilot super admin control panel
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-6"
          style={{ background: '#ffffff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: '#a0a89a' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl px-4 py-3 text-[14px] outline-none transition-all"
                style={{
                  background: '#f4f7f2',
                  border: '2px solid transparent',
                  color: '#141414',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#c9f53c')}
                onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: '#a0a89a' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl px-4 py-3 text-[14px] outline-none transition-all"
                style={{
                  background: '#f4f7f2',
                  border: '2px solid transparent',
                  color: '#141414',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#c9f53c')}
                onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
              />
            </div>

            {error && (
              <p
                className="text-[13px] px-4 py-2.5 rounded-2xl"
                style={{ background: '#fef2f2', color: '#e11d48' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold transition-all mt-2"
              style={{
                background: '#141414',
                color: '#ffffff',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Signing in…' : <><span>Sign in</span><ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] mt-5 font-mono" style={{ color: '#a0a89a' }}>
          admin@stockpilot.com · admin123
        </p>
      </div>
    </div>
  );
}
