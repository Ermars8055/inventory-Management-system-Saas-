import { useNavigate } from 'react-router-dom';
import { Building2, Sliders, FileText, CreditCard, BookOpen, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

const SETTINGS_ITEMS = [
  {
    path: '/settings/organization',
    icon: Building2,
    label: 'Organization',
    description: 'Manage organization name, address, and contact information.',
  },
  {
    path: '/settings/custom-fields',
    icon: Sliders,
    label: 'Custom Fields',
    description: 'Define additional fields for inventory items and other entities.',
  },
  {
    path: '/settings/document-templates',
    icon: FileText,
    label: 'Document Templates',
    description: 'Configure receipt and document templates for your organization.',
  },
  {
    path: '/settings/class-templates',
    icon: BookOpen,
    label: 'Class Material Templates',
    description: 'Define item kits per class/group for one-click bulk issue.',
  },
  {
    path: '/settings/subscription',
    icon: CreditCard,
    label: 'Subscription',
    description: 'View your current plan and upgrade to access more features.',
  },
];

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Settings" description="Manage your organization configuration" />

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
        {SETTINGS_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.path}
              className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
