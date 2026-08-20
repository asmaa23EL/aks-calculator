'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { BadgeCheck, BarChart3, FileText, TrendingUp, Users2 } from 'lucide-react';
import LeadsTable from '@/components/admin/LeadsTable';
import LeadDetailsPanel from '@/components/admin/LeadDetailsPanel';
import StatusBadge from '@/components/admin/StatusBadge';
import { buildApiUrl } from '@/utils/api';

export type LeadStatus = 'NOUVEAU' | 'A_CONTACTER' | 'CONTACTE' | 'A_RELANCER' | 'RDV_PLANIFIE' | 'INTERESSE' | 'NON_INTERESSE' | 'CLIENT' | 'PERDU';

type LeadStatusFilter = 'all' | 'new' | 'pdf_sent' | 'contacted' | 'relance' | 'rdv' | 'interested' | 'not_interested' | 'client' | 'lost';

type AdminLead = {
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

type AdminStats = {
  totalLeads: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  contactedCount: number;
  pdfSentCount: number;
  pdfDownloadAttemptCount: number;
  pdfDownloadAttemptTotal: number;
  simulationsThisWeek: number;
  visitsThisWeek: number;
  conversionRate: number | null;
  emailsSentCount: number;
};

type AdminDashboardProps = {
  activeView: 'dashboard' | 'leads' | 'emails' | 'stats';
  initialLeads: AdminLead[];
  initialStats: AdminStats;
};

type LeadDetailTab = 'informations' | 'activites' | 'simulation' | 'pdf';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export default function AdminDashboard({ activeView, initialLeads, initialStats }: AdminDashboardProps) {
  const [leads, setLeads] = useState<AdminLead[]>(initialLeads);
  const [stats, setStats] = useState<AdminStats>(initialStats);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(initialLeads[0]?.id ?? null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadDetailTab>('informations');
  const [pageIndex, setPageIndex] = useState(1);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activityForm, setActivityForm] = useState({ type: 'APPEL', note: '', nextAction: '', nextActionDate: '' });
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [addLeadError, setAddLeadError] = useState('');
  const [addLeadForm, setAddLeadForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    societe: '',
    role: '',
    telephone: '',
    note: '',
    status: 'NOUVEAU' as string,
  });

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) || null, [leads, selectedLeadId]);
  const leadsPerPage = 6;
  const pageCount = Math.max(1, Math.ceil(leads.length / leadsPerPage));
  const visibleLeads = useMemo(
    () => leads.slice((pageIndex - 1) * leadsPerPage, pageIndex * leadsPerPage),
    [leads, pageIndex],
  );

  useEffect(() => {
    if (pageIndex > pageCount) setPageIndex(pageCount);
  }, [pageCount, pageIndex]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter !== 'all') {
        const statusMap: Record<LeadStatusFilter, string> = {
          all: 'all',
          new: 'new',
          pdf_sent: 'pdf_sent',
          contacted: 'contacted',
          relance: 'relance',
          rdv: 'rdv',
          interested: 'interested',
          not_interested: 'not_interested',
          client: 'client',
          lost: 'lost',
        };
        query.set('status', statusMap[statusFilter]);
      }
      if (sourceFilter !== 'all') query.set('source', sourceFilter);

      const [leadsResponse, statsResponse] = await Promise.all([
        fetch(buildApiUrl(`/api/admin/leads?${query.toString()}`), { credentials: 'include', headers: { Accept: 'application/json' } }),
        fetch(buildApiUrl('/api/admin/stats'), { credentials: 'include', headers: { Accept: 'application/json' } }),
      ]);

      const leadsPayload = (await leadsResponse.json().catch(() => null)) as { leads?: AdminLead[]; error?: string } | null;
      const statsPayload = (await statsResponse.json().catch(() => null)) as { stats?: AdminStats; error?: string } | null;

      const normalizedLeads = Array.isArray(leadsPayload?.leads)
        ? leadsPayload.leads
        : Array.isArray((leadsPayload as { data?: AdminLead[] } | null)?.data)
          ? (leadsPayload as { data?: AdminLead[] }).data ?? []
          : [];

      const normalizedStats = statsPayload?.stats ?? (statsPayload as { data?: AdminStats } | null)?.data ?? null;

      if (!leadsResponse.ok || !statsResponse.ok) {
        const fallbackLeads = normalizedLeads.length > 0 ? normalizedLeads : initialLeads;
        const fallbackStats = normalizedStats ?? initialStats;
        setLeads(fallbackLeads);
        setStats(fallbackStats);
        if (!fallbackLeads.some((lead) => lead.id === selectedLeadId)) {
          setSelectedLeadId(fallbackLeads[0]?.id ?? null);
        }
        if (!fallbackLeads.length && !fallbackStats.totalLeads) {
          setError('Aucune donnée disponible pour l’instant');
        }
        return;
      }

      if (!normalizedLeads.length && !normalizedStats) {
        setError('Aucune donnée disponible pour l’instant');
        return;
      }

      setLeads(normalizedLeads);
      setStats(normalizedStats ?? initialStats);
      if (!normalizedLeads.some((lead) => lead.id === selectedLeadId)) {
        setSelectedLeadId(normalizedLeads[0]?.id ?? null);
      }
    } catch {
      setError('Erreur réseau pendant le chargement');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedLeadId, sourceFilter, statusFilter]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleSelectLead = (lead: AdminLead) => {
    setSelectedLeadId(lead.id);
    setIsPanelOpen(true);
    setActiveTab('informations');
  };

  const handleOpenAddLead = () => {
    setAddLeadError('');
    setAddLeadForm({
      prenom: '',
      nom: '',
      email: '',
      societe: '',
      role: '',
      telephone: '',
      note: '',
      status: 'NOUVEAU',
    });
    setIsAddLeadOpen(true);
  };

  const handleOpenActivity = () => {
    setActivityError('');
    setActivityForm({ type: 'APPEL', note: '', nextAction: selectedLead?.nextAction || '', nextActionDate: selectedLead?.nextActionDate?.slice(0, 10) || '' });
    setIsActivityOpen(true);
  };

  const handleActivitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLead) return;
    setIsSavingActivity(true);
    setActivityError('');
    try {
      const activityLabels: Record<string, string> = {
        APPEL: 'Appel', EMAIL: 'E-mail', RENDEZ_VOUS: 'Rendez-vous', LINKEDIN: 'LinkedIn', NOTE: 'Note', AUTRE: 'Autre',
      };
      await handleUpdateLead(selectedLead.id, {
        statusNote: `${activityLabels[activityForm.type]} : ${activityForm.note}`,
        contacted: ['APPEL', 'EMAIL', 'RENDEZ_VOUS', 'LINKEDIN'].includes(activityForm.type) ? true : selectedLead.contacted,
        nextAction: activityForm.nextAction || null,
        nextActionDate: activityForm.nextActionDate || null,
      });
      setIsActivityOpen(false);
      setActiveTab('activites');
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : 'Impossible d’enregistrer l’activité');
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleAddLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAddingLead(true);
    setAddLeadError('');

    try {
      const response = await fetch(buildApiUrl('/api/admin/leads'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prenom: addLeadForm.prenom,
          nom: addLeadForm.nom,
          email: addLeadForm.email,
          societe: addLeadForm.societe,
          role: addLeadForm.role,
          telephone: addLeadForm.telephone,
          note: addLeadForm.note,
          status: addLeadForm.status,
        }),
      });

      const payload = await response.json().catch(() => null) as { error?: string; success?: boolean } | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Impossible d’ajouter le lead');
      }

      setIsAddLeadOpen(false);
      await loadDashboard();
    } catch (requestError) {
      setAddLeadError(requestError instanceof Error ? requestError.message : 'Impossible d’ajouter le lead');
    } finally {
      setIsAddingLead(false);
    }
  };

  const handleUpdateLead = async (leadId: number, updates: Partial<AdminLead>) => {
    const response = await fetch(buildApiUrl(`/api/admin/leads/${leadId}`), {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Impossible de mettre à jour le lead');
    }

    setLeads((currentLeads) => currentLeads.map((lead) => {
      if (lead.id !== leadId) {
        return lead;
      }

      return {
        ...lead,
        ...updates,
        status: updates.status ?? lead.status,
        note: typeof updates.note === 'undefined' ? lead.note : updates.note,
        nextActionDate: typeof updates.nextActionDate === 'undefined' ? lead.nextActionDate : updates.nextActionDate,
        nextAction: typeof updates.nextAction === 'undefined' ? lead.nextAction : updates.nextAction,
      };
    }));
  };

  const handleOpenMenu = (lead: AdminLead) => {
    setSelectedLeadId(lead.id);
    setIsPanelOpen(true);
    setActiveTab('informations');
  };

  const handleEmailLead = () => {
    if (!selectedLead) return;
    const subject = encodeURIComponent('Suivi de votre simulation ROI AKS');
    const body = encodeURIComponent(`Bonjour ${selectedLead.prenom},\n\nJe reviens vers vous à la suite de votre simulation ROI AKS. Souhaitez-vous échanger sur vos résultats et les économies potentielles identifiées ?\n\nBien cordialement,\nCloudDev Fusion`);
    window.location.href = `mailto:${selectedLead.email}?subject=${subject}&body=${body}`;
  };

  const handleViewPdf = () => {
    if (!selectedLead) return;
    window.open(buildApiUrl(`/api/admin/leads/${selectedLead.id}/pdf`), '_blank');
  };

  const overviewCards = [
    { label: 'Leads totaux', value: formatNumber(stats.totalLeads), note: `+ ${formatNumber(stats.leadsThisMonth)} ce mois`, icon: Users2, accent: 'bg-[linear-gradient(135deg,_#EAF3FF_0%,_#DCEEFF_100%)] text-primary-700' },
    { label: 'PDF envoyés', value: formatNumber(stats.pdfSentCount), note: `${Math.round((stats.pdfSentCount / Math.max(stats.totalLeads, 1)) * 100)}% du total`, icon: FileText, accent: 'bg-[linear-gradient(135deg,_#E6F4E9_0%,_#DDF5E5_100%)] text-emerald-700' },
    { label: 'Synchronisés au CRM', value: formatNumber(stats.contactedCount), note: `${formatNumber(Math.max(stats.totalLeads - stats.contactedCount, 0))} en attente`, icon: BadgeCheck, accent: 'bg-[linear-gradient(135deg,_#F1E9FF_0%,_#E8D9FF_100%)] text-violet-700' },
    { label: 'Taux de conversion', value: stats.conversionRate !== null ? `${stats.conversionRate}%` : '0%', note: 'Métrique globale', icon: TrendingUp, accent: 'bg-[linear-gradient(135deg,_#FFF4DB_0%,_#FFEBCF_100%)] text-amber-700' },
  ];

  const pipelineItems = [
    { label: 'Nouveaux', statuses: ['NOUVEAU'], color: 'bg-blue-500', text: 'text-blue-700', surface: 'bg-blue-50' },
    { label: 'À contacter', statuses: ['A_CONTACTER', 'A_RELANCER'], color: 'bg-amber-500', text: 'text-amber-700', surface: 'bg-amber-50' },
    { label: 'En discussion', statuses: ['CONTACTE', 'RDV_PLANIFIE', 'INTERESSE'], color: 'bg-violet-500', text: 'text-violet-700', surface: 'bg-violet-50' },
    { label: 'Clients', statuses: ['CLIENT'], color: 'bg-emerald-500', text: 'text-emerald-700', surface: 'bg-emerald-50' },
  ].map((item) => ({ ...item, count: leads.filter((lead) => item.statuses.includes(lead.status)).length }));

  const recentLeads = [...leads]
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
    .slice(0, 5);

  if (activeView === 'dashboard') {
    return (
      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{item.value}</p>
                  </div>
                  <div className={`inline-flex rounded-xl ${item.accent} p-2.5`}><Icon size={18} /></div>
                </div>
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">{item.note}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="font-semibold text-slate-900">Pipeline commercial</h3>
              <p className="mt-1 text-sm text-slate-500">Répartition actuelle de vos leads</p>
            </div>
            <div className="mt-5 space-y-4">
              {pipelineItems.map((item) => {
                const percentage = stats.totalLeads ? Math.round((item.count / stats.totalLeads) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.surface} ${item.text}`}>{item.count} lead{item.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${percentage}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h3 className="font-semibold text-slate-900">Derniers leads</h3><p className="mt-1 text-sm text-slate-500">Prospects reçus récemment</p></div>
              <Users2 size={19} className="text-blue-600" />
            </div>
            <div className="divide-y divide-slate-100">
              {recentLeads.length ? recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{lead.prenom?.[0]}{lead.nom?.[0]}</div>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{lead.prenom} {lead.nom}</p><p className="truncate text-xs text-slate-500">{lead.societe || lead.email}</p></div>
                  </div>
                  <div className="text-right"><StatusBadge status={lead.status} compact /><p className="mt-1 text-xs text-slate-400">{new Date(lead.submittedAt).toLocaleDateString('fr-FR')}</p></div>
                </div>
              )) : <p className="px-5 py-10 text-center text-sm text-slate-500">Aucun lead pour le moment.</p>}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (activeView === 'stats') {
    return (
      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={`inline-flex rounded-2xl ${item.accent} p-2`}>
                  <Icon size={16} />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                <p className="mt-1 text-sm text-slate-500">{item.note}</p>
              </div>
            );
          })}
        </section>

        <section>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BarChart3 size={16} className="text-primary-600" /> Indicateurs de performance
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Leads cette semaine', value: formatNumber(stats.leadsThisWeek) },
                { label: 'Visites cette semaine', value: formatNumber(stats.visitsThisWeek) },
                { label: 'Simulations cette semaine', value: formatNumber(stats.simulationsThisWeek) },
                { label: 'Emails envoyés', value: formatNumber(stats.emailsSentCount) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </section>
      </div>
    );
  }

  if (activeView === 'emails') {
    return (
      <div className="space-y-4">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Centre d’activités</p>
              <p className="text-sm text-slate-500">Historique des communications et suivis associés</p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">À jour</div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { label: 'Relances à envoyer', value: '12' },
              { label: 'Emails envoyés', value: formatNumber(stats.emailsSentCount) },
              { label: 'PDF partagés', value: formatNumber(stats.pdfSentCount) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,_#F8FAFD_0%,_#F4F9FF_100%)] p-5 text-sm leading-7 text-slate-600 shadow-sm">
          Le journal d’activité est prêt à recevoir les prochains événements et suivis de communication.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      {error ? <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      {isActivityOpen && selectedLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={handleActivitySubmit} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Nouvelle activité</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedLead.prenom} {selectedLead.nom}</h3>
              </div>
              <button type="button" onClick={() => setIsActivityOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Type d’activité
                <select value={activityForm.type} onChange={(event) => setActivityForm((current) => ({ ...current, type: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option value="APPEL">Appel</option><option value="EMAIL">E-mail</option><option value="RENDEZ_VOUS">Rendez-vous</option><option value="LINKEDIN">LinkedIn</option><option value="NOTE">Note</option><option value="AUTRE">Autre</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Compte rendu
                <textarea required rows={4} value={activityForm.note} onChange={(event) => setActivityForm((current) => ({ ...current, note: event.target.value }))} placeholder="Ex. Appel sans réponse, message laissé…" className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-medium text-slate-700">Prochaine action
                <select value={activityForm.nextAction} onChange={(event) => setActivityForm((current) => ({ ...current, nextAction: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500">
                  <option value="">Aucune</option><option value="Appeler">Appeler</option><option value="Envoyer un e-mail">Envoyer un e-mail</option><option value="Planifier un rendez-vous">Planifier un rendez-vous</option><option value="Contacter sur LinkedIn">Contacter sur LinkedIn</option><option value="Relancer">Relancer</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Date prévue
                <input type="date" value={activityForm.nextActionDate} onChange={(event) => setActivityForm((current) => ({ ...current, nextActionDate: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500" />
              </label>
            </div>
            {activityError && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{activityError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsActivityOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
              <button type="submit" disabled={isSavingActivity} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSavingActivity ? 'Enregistrement…' : 'Enregistrer l’activité'}</button>
            </div>
          </form>
        </div>
      ) : null}
      {isAddLeadOpen ? (
        <div className="mb-4 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Ajouter un lead</h3>
              <p className="mt-1 text-sm text-slate-500">Créez rapidement un nouveau prospect avec ses coordonnées de base.</p>
            </div>
            <button type="button" onClick={() => setIsAddLeadOpen(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
              ✕
            </button>
          </div>

          <form onSubmit={handleAddLeadSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-medium">Prénom</span>
              <input required value={addLeadForm.prenom} onChange={(event) => setAddLeadForm((current) => ({ ...current, prenom: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500" />
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-medium">Nom</span>
              <input required value={addLeadForm.nom} onChange={(event) => setAddLeadForm((current) => ({ ...current, nom: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500" />
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-medium">Email</span>
              <input required type="email" value={addLeadForm.email} onChange={(event) => setAddLeadForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500" />
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-medium">Société</span>
              <input value={addLeadForm.societe} onChange={(event) => setAddLeadForm((current) => ({ ...current, societe: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500" />
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-medium">Rôle</span>
              <input value={addLeadForm.role} onChange={(event) => setAddLeadForm((current) => ({ ...current, role: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500" />
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-medium">Téléphone</span>
              <input value={addLeadForm.telephone} onChange={(event) => setAddLeadForm((current) => ({ ...current, telephone: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500" />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              <span className="mb-1 block font-medium">Statut</span>
              <select value={addLeadForm.status} onChange={(event) => setAddLeadForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500">
                <option value="NOUVEAU">Nouveau</option>
                <option value="A_RELANCER">À relancer</option>
                <option value="CONTACTE">Contacté</option>
                <option value="CLIENT">Client</option>
              </select>
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              <span className="mb-1 block font-medium">Note</span>
              <textarea rows={3} value={addLeadForm.note} onChange={(event) => setAddLeadForm((current) => ({ ...current, note: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-primary-500" />
            </label>

            {addLeadError ? <p className="md:col-span-2 text-sm text-rose-600">{addLeadError}</p> : null}

            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={isAddingLead} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
                {isAddingLead ? 'Ajout en cours…' : 'Créer le lead'}
              </button>
              <button type="button" onClick={() => setIsAddLeadOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <div className={`grid h-full min-h-0 w-full ${isPanelOpen && selectedLead ? 'xl:grid-cols-[minmax(0,1.65fr)_minmax(380px,1fr)]' : 'grid-cols-1'}`}>
        <div className="min-h-0 min-w-0 p-4 xl:p-5">
          <LeadsTable
            leads={visibleLeads}
            selectedLeadId={selectedLeadId}
            onSelectLead={handleSelectLead}
            onOpenAddLead={handleOpenAddLead}
            onOpenMenu={handleOpenMenu}
            onUpdateLead={handleUpdateLead}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={(value) => setStatusFilter(value as LeadStatusFilter)}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            isLoading={isLoading}
            pageLabel={leads.length ? `${(pageIndex - 1) * leadsPerPage + 1}–${Math.min(pageIndex * leadsPerPage, leads.length)} sur ${leads.length} leads` : '0 lead'}
            onPrevPage={() => setPageIndex((value) => Math.max(1, value - 1))}
            onNextPage={() => setPageIndex((value) => Math.min(pageCount, value + 1))}
          />
        </div>
        <LeadDetailsPanel
          lead={selectedLead}
          isOpen={isPanelOpen}
          activeTab={activeTab}
          onClose={() => setIsPanelOpen(false)}
          onTabChange={setActiveTab}
          onAddActivity={handleOpenActivity}
          onEmailLead={handleEmailLead}
          onViewPdf={handleViewPdf}
        />
      </div>
    </div>
  );
}
