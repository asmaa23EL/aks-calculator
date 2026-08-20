import { Copy, Mail, PhoneCall, X, MessageSquare, FileText, PlusCircle, Clock3, FileDown } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import type { LeadStatus } from '@/components/admin/AdminDashboard';

type LeadDetailsPanelProps = {
  lead: any;
  isOpen: boolean;
  activeTab: 'informations' | 'activites' | 'simulation' | 'pdf';
  onClose: () => void;
  onTabChange: (tab: 'informations' | 'activites' | 'simulation' | 'pdf') => void;
  onAddActivity: () => void;
  onEmailLead: () => void;
  onViewPdf: () => void;
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

export default function LeadDetailsPanel({ lead, isOpen, activeTab, onClose, onTabChange, onAddActivity, onEmailLead, onViewPdf }: LeadDetailsPanelProps) {
  if (!isOpen || !lead) return null;

  const statusValue = lead.status || (lead.contacted ? 'CONTACTE' : lead.pdfSent ? 'A_CONTACTER' : 'NOUVEAU');
  const sourceLabel = lead.leadPayload?.source ? String(lead.leadPayload.source) : '—';
  const nextActionDate = lead.nextActionDate ? formatDate(lead.nextActionDate) : '—';
  const results = lead.results ?? {};

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/40 xl:static xl:z-auto xl:block xl:min-h-0 xl:border-l xl:border-slate-200 xl:bg-white">
      <div className="ml-auto flex h-full w-full max-w-[640px] flex-col bg-white shadow-2xl xl:max-w-none xl:shadow-none">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#001F4D_0%,_#0969F9_100%)] text-sm font-semibold text-white">
              {getInitials(lead.prenom, lead.nom)}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{lead.prenom} {lead.nom}</p>
              <p className="text-sm text-slate-500">{lead.societe || '—'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <StatusBadge status={statusValue as LeadStatus} />
          <span className="text-sm text-slate-500">{lead.role || '—'}</span>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
          <button type="button" onClick={onAddActivity} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <PlusCircle size={16} /> Ajouter une activité
          </button>
          <button type="button" onClick={onEmailLead} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <Mail size={16} /> Relancer par e-mail
          </button>
          <button type="button" onClick={onViewPdf} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <FileText size={16} /> Voir le PDF
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-5">
          {(['informations', 'activites', 'simulation', 'pdf'] as const).map((tab) => {
            const labelMap = { informations: 'Informations', activites: 'Activités', simulation: 'Simulation', pdf: 'PDF' };
            const isActive = activeTab === tab;
            return (
              <button key={tab} type="button" onClick={() => onTabChange(tab)} className={`px-4 py-3 text-sm font-medium ${isActive ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500'}`}>
                {labelMap[tab]}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,_#F8FAFD_0%,_#FFFFFF_100%)] px-5 py-4">
          {activeTab === 'informations' && (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Coordonnées</p>
                    <p className="mt-1 font-semibold text-slate-900">{lead.email || '—'}</p>
                    <p className="mt-1 text-sm text-slate-500">{lead.telephone || '—'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600">
                      <Copy size={15} />
                    </button>
                    <button type="button" className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600">
                      <PhoneCall size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Prénom', lead.prenom || '—'],
                  ['Nom', lead.nom || '—'],
                  ['Société', lead.societe || '—'],
                  ['Rôle', lead.role || '—'],
                  ['Date de soumission', formatDate(lead.submittedAt)],
                  ['Source', sourceLabel],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activites' && (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Clock3 size={16} className="text-primary-600" /> Prochaine action
                </div>
                <p className="mt-2 text-sm text-slate-600">{lead.nextAction || 'Aucune action prévue'}</p>
                <p className="text-sm text-slate-500">{nextActionDate}</p>
              </div>

              <div className="space-y-3">
                {[{ type: 'Appel', content: lead.statusNote || 'Aucun résultat enregistré', date: lead.lastContactedAt || lead.submittedAt, icon: PhoneCall }, { type: 'Note', content: lead.note || 'Aucune note ajoutée', date: lead.lastEmailAt || lead.submittedAt, icon: FileText }, { type: 'PDF envoyé', content: lead.pdfSent ? 'Rapport envoyé au lead.' : 'Aucun PDF envoyé.', date: lead.lastPdfSentAt || lead.submittedAt, icon: FileDown }].map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.type} className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Icon size={15} className="text-primary-600" />
                            <p className="font-semibold text-slate-900">{activity.type}</p>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{activity.content}</p>
                          <p className="mt-2 text-xs text-slate-400">{formatDate(activity.date)}</p>
                        </div>
                        <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><MessageSquare size={15} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'simulation' && (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Données de la dernière simulation</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[['Économies mensuelles', results.economiesMensuelles ?? '—'], ['ROI 12 mois', results.roi12Mois ?? '—'], ['Payback', results.paybackMois ?? '—'], ['Investissement initial', results.investissementInitial ?? '—']].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Rapport PDF</p>
                <p className="mt-2 text-sm text-slate-600">{lead.pdfSent ? 'Un rapport PDF a déjà été envoyé à ce lead.' : 'Aucun rapport PDF disponible pour ce lead.'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
