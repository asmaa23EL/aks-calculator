import type { LeadStatus } from '@/components/admin/AdminDashboard';

type StatusBadgeProps = {
  status: LeadStatus | string;
  compact?: boolean;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  NOUVEAU: { label: 'Nouveau', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  A_CONTACTER: { label: 'À contacter', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONTACTE: { label: 'Contacté', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  A_RELANCER: { label: 'À relancer', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  RDV_PLANIFIE: { label: 'Rendez-vous', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  INTERESSE: { label: 'Intéressé', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  NON_INTERESSE: { label: 'Non intéressé', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  CLIENT: { label: 'Client', className: 'bg-green-100 text-green-800 border-green-200' },
  PERDU: { label: 'Perdu', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  CONTACTE2: { label: 'Contacté', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const normalized = String(status || 'NOUVEAU').trim().toUpperCase();
  const meta = STATUS_META[normalized] || STATUS_META.NOUVEAU;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className} ${compact ? 'px-2 py-0.5' : ''}`}>
      {meta.label}
    </span>
  );
}
