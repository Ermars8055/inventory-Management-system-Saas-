import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check, ChevronRight, Package, Building2, Layers,
  Eye, EyeOff, CreditCard, Lock, ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const INDUSTRIES = [
  { value: 'school', label: 'School / College' },
  { value: 'pharmacy', label: 'Pharmacy / Medical Store' },
  { value: 'warehouse', label: 'Warehouse / Logistics' },
  { value: 'clinic', label: 'Clinic / Hospital' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'ngo', label: 'NGO / Non-profit' },
  { value: 'other', label: 'Other' },
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹999/mo',
    desc: 'Up to 500 items · 3 users',
    badge: '',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹2,999/mo',
    desc: 'Unlimited items · 15 users',
    badge: 'Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Unlimited · Dedicated support',
    badge: '',
  },
];

const STEP_LABELS = ['Account', 'Organization', 'Plan & Payment'];

function slugify(val: string) {
  return val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
}

export function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [plan, setPlan] = useState('professional');

  // Mock payment
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  function handleOrgName(val: string) {
    setOrgName(val);
    setSubdomain(slugify(val));
  }

  const [signupError, setSignupError] = useState('');
  const [signupResult, setSignupResult] = useState<{ domain: string } | null>(null);

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSignupError('');
    try {
      const res = await api.post<{
        access_token: string;
        user: { id: string; name: string; email: string; role: string; organizationId: string };
        organization: { id: string; name: string; subdomain: string; domain: string };
      }>('/signup', {
        orgName, industry, subdomain, name, email, password,
        enabledModules: ['inventory', 'reports'],
      });
      localStorage.setItem('token', res.access_token);
      setSignupResult({ domain: res.organization.domain });
      setDone(true);
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center px-5 font-marketing">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex h-20 w-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 items-center justify-center mb-6 mx-auto">
            <Check className="h-10 w-10 text-emerald-400" />
          </div>

          <h1 className="font-display text-3xl font-bold text-white mb-2 tracking-tight">
            You're all set!
          </h1>
          <p className="text-slate-400 mb-8">
            Your StockPilot account is ready. Here are your details:
          </p>

          <Card className="bg-slate-900/60 border-slate-700 text-left mb-6">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-sm text-slate-400">Organization</span>
                <span className="text-sm font-semibold text-white">{orgName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-sm text-slate-400">Your URL</span>
                <span className="text-sm font-mono text-indigo-400">{signupResult?.domain || `${subdomain}.stockpilot.ermarscastar.in`}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-sm text-slate-400">Login email</span>
                <span className="text-sm font-mono text-white">{email}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-400">Temp password</span>
                <span className="text-sm font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-400">
                  SP@{name.split(' ')[0] || 'Admin'}2026
                </span>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-slate-500 mb-8">
            A welcome email with these details has been sent to <strong className="text-slate-400">{email}</strong>
          </p>

          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500 h-11 text-base gap-2"
            onClick={() => {
              const domain = signupResult?.domain || `${subdomain}.stockpilot.ermarscastar.in`;
              window.location.href = `https://${domain}/dashboard`;
            }}
          >
            Go to Dashboard <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-marketing">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-5 h-15 flex items-center justify-between py-4">
        <Link to="/landing" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900 font-display text-base">StockPilot</span>
        </Link>
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Log in</Link>
        </p>
      </header>

      <div className="max-w-lg mx-auto px-5 py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const completed = step > n;
            return (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    completed
                      ? 'bg-indigo-600 text-white'
                      : active
                      ? 'bg-slate-900 text-white ring-4 ring-slate-900/10'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {completed ? <Check className="h-4 w-4" /> : n}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`h-px w-12 sm:w-20 mx-2 mb-5 transition-colors ${completed ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-7">

            {/* ── Step 1: Account ─────────────────────────────── */}
            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-5">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
                  <p className="text-sm text-slate-500 mt-1">Start your 14-day free trial. No credit card needed.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s1-name" className="text-sm font-medium">Full name</Label>
                  <Input
                    id="s1-name" placeholder="Raj Kumar" required
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s1-email" className="text-sm font-medium">Work email</Label>
                  <Input
                    id="s1-email" type="email" placeholder="raj@abcschool.edu" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s1-pass" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="s1-pass" type={showPass ? 'text' : 'password'}
                      placeholder="Min. 8 characters" required minLength={8}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-10 bg-slate-900 hover:bg-slate-700 gap-2">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>

                <p className="text-xs text-slate-400 text-center">
                  By continuing you agree to our{' '}
                  <a href="#" className="underline hover:text-slate-600">Terms of Service</a> and{' '}
                  <a href="#" className="underline hover:text-slate-600">Privacy Policy</a>.
                </p>
              </form>
            )}

            {/* ── Step 2: Organization ────────────────────────── */}
            {step === 2 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-5">
                <div>
                  <button
                    type="button" onClick={() => setStep(1)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mb-3"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Set up your organization</h2>
                  <p className="text-sm text-slate-500 mt-1">Tell us about your organization so we can customize the experience.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s2-org" className="text-sm font-medium">Organization name</Label>
                  <Input
                    id="s2-org" placeholder="ABC International School" required
                    value={orgName} onChange={(e) => handleOrgName(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s2-sub" className="text-sm font-medium">Your subdomain</Label>
                  <div className="flex items-center gap-0 rounded-md border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-slate-900">
                    <Input
                      id="s2-sub" placeholder="abcschool" required
                      value={subdomain} onChange={(e) => setSubdomain(slugify(e.target.value))}
                      className="h-10 rounded-none border-0 focus-visible:ring-0 flex-1"
                    />
                    <span className="px-3 h-10 flex items-center text-sm text-slate-500 bg-slate-50 border-l border-slate-200 font-mono whitespace-nowrap">
                      .stockpilot.ermarscastar.in
                    </span>
                  </div>
                  {subdomain && (
                    <p className="text-xs text-indigo-600 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" />
                      Your app will live at <strong>{subdomain}.stockpilot.ermarscastar.in</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Industry</Label>
                  <Select required value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full h-10 bg-slate-900 hover:bg-slate-700 gap-2" disabled={!industry}>
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            {/* ── Step 3: Plan + Payment ───────────────────────── */}
            {step === 3 && (
              <form onSubmit={handleComplete} className="space-y-5">
                <div>
                  <button
                    type="button" onClick={() => setStep(2)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mb-3"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Choose your plan</h2>
                  <p className="text-sm text-slate-500 mt-1">You can change your plan at any time.</p>
                </div>

                {/* Plan selector */}
                <div className="space-y-2.5">
                  {PLANS.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        plan === p.id
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio" name="plan" value={p.id}
                        checked={plan === p.id} onChange={() => setPlan(p.id)}
                        className="sr-only"
                      />
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        plan === p.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}>
                        {plan === p.id && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 font-display">{p.name}</span>
                          {p.badge && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px] px-1.5 py-0">{p.badge}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                      </div>
                      <span className="text-sm font-bold font-mono text-slate-900">{p.price}</span>
                    </label>
                  ))}
                </div>

                {plan !== 'enterprise' && (
                  <>
                    <div className="border-t border-slate-100 pt-5">
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">Payment details</span>
                        <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                          <Lock className="h-3 w-3" /> Secure checkout
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-600">Card number</Label>
                          <Input
                            placeholder="1234 5678 9012 3456" maxLength={19} required
                            value={cardNum}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                              setCardNum(v.replace(/(.{4})/g, '$1 ').trim());
                            }}
                            className="h-10 font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-600">Expiry (MM/YY)</Label>
                            <Input
                              placeholder="MM / YY" maxLength={7} required
                              value={expiry}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setExpiry(v.length > 2 ? `${v.slice(0, 2)} / ${v.slice(2)}` : v);
                              }}
                              className="h-10 font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-600">CVV</Label>
                            <Input
                              placeholder="•••" maxLength={4} required type="password"
                              value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              className="h-10 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {PLANS.find((p2) => p2.id === plan)?.name} plan — first month
                      </span>
                      <span className="font-bold font-mono text-slate-900">
                        {PLANS.find((p2) => p2.id === plan)?.price}
                      </span>
                    </div>
                  </>
                )}

                {plan === 'enterprise' && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
                    <p className="font-semibold mb-1">Enterprise plan selected</p>
                    <p className="text-indigo-600 text-xs">Our team will reach out within 24 hours to discuss pricing and onboarding.</p>
                  </div>
                )}

                {signupError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{signupError}</div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-base gap-2 shadow-lg shadow-indigo-200"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Setting up your account…
                    </>
                  ) : plan === 'enterprise' ? (
                    <>Contact Sales <ChevronRight className="h-4 w-4" /></>
                  ) : (
                    <>Complete purchase <ChevronRight className="h-4 w-4" /></>
                  )}
                </Button>

                <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" />
                  Your payment is encrypted and secure. Cancel anytime.
                </p>
              </form>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
