import { Link } from 'react-router-dom';
import {
  Check, Package, BarChart3, Users, Shield, Zap, Building2, ChevronRight,
  ArrowRight, Layers, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

const PLANS = [
  {
    name: 'Starter',
    price: '₹999',
    period: '/month',
    desc: 'Perfect for small teams',
    features: ['Up to 500 items', '3 users', 'Basic reports', 'Email support'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '₹2,999',
    period: '/month',
    desc: 'For growing organizations',
    features: [
      'Unlimited items', '15 users', 'Advanced analytics',
      'Barcode scanning', 'Custom fields', 'Priority support',
    ],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large organizations',
    features: [
      'Unlimited everything', 'Unlimited users', 'Custom subdomain',
      'API access', 'Dedicated support', 'SLA guarantee',
    ],
    cta: 'Contact sales',
    highlight: false,
  },
];

const FEATURES = [
  { icon: Package, title: 'Smart Inventory', desc: 'Real-time stock levels, low-stock alerts, and automated reorder points across all locations.' },
  { icon: BarChart3, title: 'Deep Analytics', desc: 'Visual dashboards to understand consumption patterns and forecast demand before stockouts.' },
  { icon: Users, title: 'Multi-user Roles', desc: 'Granular permissions for admins, managers, and staff. Everyone sees only what they need.' },
  { icon: Shield, title: 'Full Audit Trail', desc: 'Every stock movement logged with user, timestamp, and reference — zero blind spots.' },
  { icon: Zap, title: 'Barcode & QR', desc: 'Scan and look up items instantly on any device. Issue stock in seconds, not minutes.' },
  { icon: Globe, title: 'Your Own Subdomain', desc: 'Every org gets its own subdomain. abcschool.stockpilot.com — branded and isolated.' },
];

const INDUSTRIES = [
  { label: 'Schools', color: 'bg-blue-100 text-blue-700' },
  { label: 'Pharmacies', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'Warehouses', color: 'bg-amber-100 text-amber-700' },
  { label: 'Clinics', color: 'bg-rose-100 text-rose-700' },
  { label: 'Retail Stores', color: 'bg-violet-100 text-violet-700' },
  { label: 'NGOs', color: 'bg-orange-100 text-orange-700' },
];

const FAQ = [
  { q: 'Can I use StockPilot for any type of organization?', a: 'Yes. StockPilot is built for schools, pharmacies, warehouses, clinics, and more. Each industry gets tailored modules and workflows — not a generic one-size-fits-all tool.' },
  { q: 'How is my data kept secure?', a: 'All data is encrypted in transit (TLS) and at rest. Each organization is fully isolated — no data is ever shared between tenants.' },
  { q: 'Can I switch plans later?', a: 'Absolutely. You can upgrade or downgrade at any time. Charges are prorated automatically so you never overpay.' },
  { q: 'Do I need to install anything?', a: 'Nothing. StockPilot is fully web-based and works on any modern browser — desktop, tablet, or mobile. No app downloads required.' },
  { q: 'How does the subdomain work?', a: 'When you sign up, you pick a subdomain (e.g. abcschool). Your team then accesses the app at abcschool.stockpilot.com — separate from all other organizations.' },
];

const STEPS = [
  { num: '01', title: 'Create your account', desc: 'Sign up with your email and set up your organization profile in under 2 minutes.' },
  { num: '02', title: 'Choose your plan', desc: 'Pick the plan that fits your team size. Start free — no credit card needed for the trial.' },
  { num: '03', title: 'Invite your team', desc: 'Add your staff with the right roles. Everyone logs in at your custom subdomain.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-marketing">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg font-display tracking-tight">StockPilot</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-slate-600">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Get Started <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="bg-slate-950 text-white pt-24 pb-28 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.3),transparent)] pointer-events-none" />
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-[10%] w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Badge className="mb-6 inline-flex gap-1.5 items-center bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/15 cursor-default">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Now with barcode scanning &amp; custom modules
          </Badge>

          <h1 className="font-display text-5xl md:text-[4.25rem] lg:text-7xl font-bold leading-[1.08] tracking-tight mb-7">
            <span className="bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
              Inventory that works<br />for{' '}
            </span>
            <span className="text-indigo-400">every</span>
            <span className="bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
              {' '}organization
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Schools, pharmacies, warehouses, clinics — StockPilot adapts to your workflow.
            Real-time tracking, smart alerts, and powerful analytics in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 text-base gap-2 shadow-lg shadow-indigo-900/40">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600 px-8 h-12 text-base">
                View live demo
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-sm text-slate-500 font-mono">No credit card required · 14-day free trial · Cancel anytime</p>

          {/* Mini dashboard preview */}
          <div className="mt-16 max-w-3xl mx-auto rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl shadow-slate-950">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-800">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-slate-500 font-mono">abcschool.stockpilot.com/dashboard</span>
            </div>
            <div className="p-6 grid grid-cols-4 gap-3">
              {[
                { label: 'Total Items', val: '1,284', color: 'text-white' },
                { label: 'In Stock', val: '1,102', color: 'text-emerald-400' },
                { label: 'Low Stock', val: '91', color: 'text-amber-400' },
                { label: 'Out of Stock', val: '21', color: 'text-red-400' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-slate-800/60 p-3 text-left">
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="rounded-lg bg-slate-800/40 border border-slate-800 divide-y divide-slate-800">
                {[
                  { name: 'School Shirt (Size 32)', cat: 'Uniforms', qty: 240, status: 'in_stock' },
                  { name: 'Mathematics Textbook', cat: 'Books', qty: 45, status: 'low_stock' },
                  { name: 'Paracetamol 500mg', cat: 'Medicine', qty: 0, status: 'out_of_stock' },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <span className="text-slate-300">{row.name}</span>
                    <span className="text-slate-500">{row.cat}</span>
                    <span className={`font-mono font-medium ${row.qty === 0 ? 'text-red-400' : row.qty < 50 ? 'text-amber-400' : 'text-emerald-400'}`}>{row.qty} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-slate-50 py-14 px-5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '500+', label: 'Organizations' },
            { num: '50K+', label: 'Items tracked daily' },
            { num: '99.9%', label: 'Uptime SLA' },
            { num: '4.9★', label: 'Average rating' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-slate-900 font-mono">{s.num}</p>
              <p className="text-sm text-slate-500 mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Industries ──────────────────────────────────────── */}
      <section className="py-16 px-5 border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-5 font-mono">Built for</p>
          <div className="flex flex-wrap justify-center gap-3">
            {INDUSTRIES.map((ind) => (
              <span key={ind.label} className={`px-4 py-2 rounded-full text-sm font-semibold ${ind.color}`}>
                {ind.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Everything you need,<br />nothing you don't
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Built for real-world inventory workflows — not just spreadsheets with a nicer font.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-200">
                <CardContent className="p-6">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="font-display font-semibold text-slate-900 mb-2 text-[15px]">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how" className="py-24 px-5 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">Up and running in minutes</h2>
            <p className="text-lg text-slate-500">No IT team needed. No long onboarding calls.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] w-full h-px bg-gradient-to-r from-indigo-200 to-transparent" />
                )}
                <div className="text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-mono font-bold text-sm mb-4 shadow-lg shadow-indigo-200">
                    {step.num}
                  </div>
                  <h3 className="font-display font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-slate-500">Start free. Scale as you grow. No surprises.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlight
                    ? 'border-indigo-500 shadow-2xl shadow-indigo-100 ring-2 ring-indigo-500/20 scale-[1.02]'
                    : 'border-slate-200'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-indigo-600 text-white border-0 px-3 py-0.5 text-xs font-semibold shadow-md">
                      Most popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2 pt-7 px-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">{plan.name}</p>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-4xl font-bold text-slate-900 font-mono">{plan.price}</span>
                    <span className="text-slate-400 pb-1.5 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{plan.desc}</p>
                </CardHeader>
                <CardContent className="px-6 pb-7 flex flex-col flex-1">
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                        <div className="h-5 w-5 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-indigo-600" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup">
                    <Button
                      className={`w-full h-10 ${plan.highlight ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200' : ''}`}
                      variant={plan.highlight ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-5 bg-slate-50 border-t border-slate-100">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-4xl font-bold text-slate-900 mb-12 text-center tracking-tight">FAQ</h2>
          <Accordion type="single" collapsible className="space-y-2.5">
            {FAQ.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-slate-200 rounded-xl px-5 bg-white shadow-sm data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-sm font-semibold text-slate-900 hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-500 leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="bg-slate-950 text-white py-28 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-5 tracking-tight">
            Ready to take control<br />of your inventory?
          </h2>
          <p className="text-slate-400 mb-10 text-lg leading-relaxed">
            Join 500+ organizations managing their stock smarter.<br />Your custom subdomain is waiting.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 px-10 h-13 text-base gap-2 shadow-xl shadow-indigo-900/40">
              Get started for free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-5 text-sm text-slate-500 font-mono">14-day free trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <Layers className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 font-display">StockPilot</span>
          </div>
          <p className="font-mono text-xs">© 2026 StockPilot. All rights reserved.</p>
          <div className="flex gap-6 text-xs">
            <a href="#" className="hover:text-slate-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-700 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-700 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
