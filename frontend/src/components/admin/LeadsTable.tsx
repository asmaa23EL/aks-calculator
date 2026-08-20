import { useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, MoreHorizontal, Phone, Plus, RotateCcw, Search as SearchIcon } from 'lucide-react';
import type { LeadStatus } from '@/components/admin/AdminDashboard';

type LeadRow = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  societe: string | null;
  role: string | null;
  telephone: string | null;
  submittedAt: string;
  pdfSent: boolean;
  contacted: boolean;
  statusNote: string | null;
  status: string;
  note: string | null;
  nextActionDate: string | null;
  nextAction: string | null;
  lastContactedAt: string | null;
  lastPdfSentAt: string | null;
  emailCount: number;
  lastEmailAt: string | null;
  pdfDownloadCount: number;
  lastPdfDownloadAt: string | null;
  results: Record<string, unknown>;
  leadPayload: Record<string, unknown>;
};

type LeadsTableProps = {
  leads: LeadRow[];
  selectedLeadId: number | null;
  onSelectLead: (lead: LeadRow) => void;
  onOpenAddLead: () => void;
  onOpenMenu: (lead: LeadRow) => void;
  onUpdateLead: (leadId: number, updates: Partial<LeadRow>) => Promise<void> | void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  isLoading: boolean;
  pageLabel: string;
  onPrevPage: () => void;
  onNextPage: () => void;
};

function formatShortDate(dateValue: string | null): string {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatShortDateTime(dateValue: string | null): string {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

function getDisplayStatus(lead: LeadRow): LeadStatus {
  const validStatuses: LeadStatus[] = ['NOUVEAU', 'A_CONTACTER', 'CONTACTE', 'A_RELANCER', 'RDV_PLANIFIE', 'INTERESSE', 'NON_INTERESSE', 'CLIENT', 'PERDU'];
  if (validStatuses.includes(lead.status as LeadStatus)) return lead.status as LeadStatus;
  if (lead.contacted) return 'CONTACTE';
  if (lead.pdfSent) return 'A_CONTACTER';
  return 'NOUVEAU';
}

function getStatusSelectClass(status: LeadStatus): string {
  const classes: Record<LeadStatus, string> = {
    NOUVEAU: 'border-blue-200 bg-blue-50 text-blue-700',
    A_CONTACTER: 'border-amber-200 bg-amber-50 text-amber-700',
    CONTACTE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    A_RELANCER: 'border-orange-200 bg-orange-50 text-orange-700',
    RDV_PLANIFIE: 'border-violet-200 bg-violet-50 text-violet-700',
    INTERESSE: 'border-teal-200 bg-teal-50 text-teal-700',
    NON_INTERESSE: 'border-slate-200 bg-slate-100 text-slate-600',
    CLIENT: 'border-green-200 bg-green-50 text-green-700',
    PERDU: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return classes[status];
}

function getLastActivity(lead: LeadRow) {
  const candidates = [
    { label: 'Dernier contact', date: lead.lastContactedAt },
    { label: 'E-mail envoyé', date: lead.lastEmailAt },
    { label: 'PDF envoyé', date: lead.lastPdfSentAt },
    { label: 'Soumission', date: lead.submittedAt },
  ].filter((item) => Boolean(item.date));

  const latest = candidates.sort((left, right) => (new Date(right.date || '').getTime() || 0) - (new Date(left.date || '').getTime() || 0))[0];

  return latest ? { label: latest.label, value: formatShortDateTime(latest.date || null) } : { label: 'Aucune activité', value: '—' };
}

function getNextAction(lead: LeadRow) {
  if (lead.nextActionDate || lead.nextAction) {
    return {
      label: lead.nextAction || 'Action planifiée',
      value: formatShortDate(lead.nextActionDate),
    };
  }

  return { label: 'Aucune action', value: '—' };
}

export default function LeadsTable({
  leads,
  selectedLeadId,
  onSelectLead,
  onOpenAddLead,
  onOpenMenu,
  onUpdateLead,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  isLoading,
  pageLabel,
  onPrevPage,
  onNextPage,
}: LeadsTableProps) {
  const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState('');

  const updateStatus = async (lead: LeadRow, status: LeadStatus) => {
    setUpdatingLeadId(lead.id);
    setUpdateError('');
    try {
      await onUpdateLead(lead.id, { status });
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Impossible de mettre à jour le statut');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const updateNextAction = async (lead: LeadRow, nextAction: string) => {
    setUpdatingLeadId(lead.id);
    setUpdateError('');
    try {
      await onUpdateLead(lead.id, {
        nextAction: nextAction || null,
        nextActionDate: nextAction ? lead.nextActionDate : null,
      });
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Impossible de mettre à jour la prochaine action');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  return (
    <section className="flex h-full w-full max-w-full flex-col overflow-hidden bg-white">
      <div className="flex flex-col gap-4 bg-white px-1 pb-5 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-950">Leads</h2>
          <p className="mt-1 text-sm text-slate-500">Suivez vos prospects et organisez vos prochaines actions.</p>
        </div>
        <button type="button" onClick={onOpenAddLead} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
          <Plus size={16} />
          Ajouter un lead
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-white px-1 pb-5 sm:grid-cols-7 2xl:grid-cols-12">
        <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm sm:col-span-7 2xl:col-span-5">
          <SearchIcon size={16} className="text-slate-400" />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Rechercher un lead…" className="w-full min-w-0 border-0 bg-transparent outline-none" />
        </label>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm sm:col-span-3 2xl:col-span-3">
          <option value="all">Tous les statuts</option>
          <option value="new">Nouveau</option>
          <option value="pdf_sent">À contacter</option>
          <option value="contacted">Contacté</option>
          <option value="relance">À relancer</option>
          <option value="rdv">Rendez-vous</option>
          <option value="interested">Intéressé</option>
          <option value="not_interested">Non intéressé</option>
          <option value="client">Client</option>
          <option value="lost">Perdu</option>
        </select>
        <select value={sourceFilter} onChange={(event) => onSourceFilterChange(event.target.value)} className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm sm:col-span-3 2xl:col-span-3">
          <option value="all">Toutes les sources</option>
          <option value="SITE_WEB">Site Web</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="button" title="Réinitialiser les filtres" aria-label="Réinitialiser les filtres" onClick={() => { onSearchChange(''); onStatusFilterChange('all'); onSourceFilterChange('all'); }} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:col-span-1 2xl:col-span-1">
          <RotateCcw size={16} />
        </button>
      </div>

      {updateError && (
        <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">{updateError}</div>
      )}

      <div className="flex-1 overflow-x-auto bg-white">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">Chargement des leads…</div>
        ) : leads.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">Aucun lead correspondant.</div>
        ) : (
          <table className="w-full min-w-[1160px] table-fixed border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
              <tr>
                <th className="w-[27%] px-4 py-3">Lead</th>
                <th className="w-[22%] px-4 py-3">Coordonnées</th>
                <th className="w-[14%] px-4 py-3">Statut</th>
                <th className="w-[16%] px-4 py-3">Dernière activité</th>
                <th className="w-[18%] px-4 py-3">Prochaine action</th>
                <th className="w-[3%] px-2 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const isSelected = selectedLeadId === lead.id;
                const activity = getLastActivity(lead);
                const nextAction = getNextAction(lead);
                return (
                  <tr key={lead.id} className={`group transition ${isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50/80'}`}>
                    <td className={`border-b border-slate-100 px-4 py-4 align-middle ${isSelected ? 'border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}>
                      <button type="button" onClick={() => onSelectLead(lead)} className="flex w-full items-center gap-3 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                          {getInitials(lead.prenom, lead.nom)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-slate-900">{lead.prenom} {lead.nom}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{lead.societe || '—'}</p>
                        </div>
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 align-middle">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail size={14} className="text-slate-400" />
                          <span className="block max-w-[190px] truncate" title={lead.email}>{lead.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Phone size={14} className="text-slate-400" />
                          <span className="truncate">{lead.telephone || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 align-middle">
                      <select
                        aria-label={`Statut de ${lead.prenom} ${lead.nom}`}
                        value={getDisplayStatus(lead)}
                        disabled={updatingLeadId === lead.id}
                        onChange={(event) => void updateStatus(lead, event.target.value as LeadStatus)}
                        className={`w-full rounded-lg border px-2.5 py-2 text-xs font-semibold outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-wait disabled:opacity-60 ${getStatusSelectClass(getDisplayStatus(lead))}`}
                      >
                        <option value="NOUVEAU">Nouveau</option>
                        <option value="A_CONTACTER">À contacter</option>
                        <option value="CONTACTE">Contacté</option>
                        <option value="A_RELANCER">À relancer</option>
                        <option value="RDV_PLANIFIE">Rendez-vous</option>
                        <option value="INTERESSE">Intéressé</option>
                        <option value="NON_INTERESSE">Non intéressé</option>
                        <option value="CLIENT">Client</option>
                        <option value="PERDU">Perdu</option>
                      </select>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 align-middle">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-xs font-medium text-slate-500" title={activity.label}>{activity.label}</p>
                        <p className="whitespace-nowrap text-sm font-medium text-slate-700">{activity.value}</p>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 align-middle">
                      <div className="space-y-1.5">
                        <select
                          aria-label={`Prochaine action pour ${lead.prenom} ${lead.nom}`}
                          value={lead.nextAction || ''}
                          disabled={updatingLeadId === lead.id}
                          onChange={(event) => void updateNextAction(lead, event.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          <option value="">Aucune action</option>
                          <option value="Appeler">Appeler</option>
                          <option value="Envoyer un e-mail">Envoyer un e-mail</option>
                          <option value="Planifier un rendez-vous">Planifier un rendez-vous</option>
                          <option value="Contacter sur LinkedIn">Contacter sur LinkedIn</option>
                          <option value="Relancer">Relancer</option>
                          <option value="Envoyer une proposition">Envoyer une proposition</option>
                        </select>
                        <p className="text-xs text-slate-500">{nextAction.value}</p>
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-2 py-4 text-center align-middle">
                      <button type="button" aria-label={`Ouvrir la fiche de ${lead.prenom} ${lead.nom}`} onClick={() => onOpenMenu(lead)} className="rounded-full p-2 text-slate-400 opacity-60 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-1 py-4 text-sm text-slate-500">
        <span>{pageLabel}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrevPage} className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-100">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={onNextPage} className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-100">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
