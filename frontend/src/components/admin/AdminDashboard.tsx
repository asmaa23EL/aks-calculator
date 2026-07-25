'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildApiUrl } from '@/utils/api';
import {
  CalendarDays,
  CircleUserRound,
  Download,
  FileText,
  Mail,
  MessageSquare,
  MoreHorizontal,
  PhoneCall,
  Search,
  TrendingUp,
  UserRound,
} from 'lucide-react';

type LeadStatusFilter = 'all' | 'new' | 'pdf_sent' | 'contacted';

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

function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return '-';
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('fr-FR');
}

function formatShortDate(dateValue: string | null): string {
  if (!dateValue) {
    return '-';
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function getStatusBadge(lead: AdminLead): { text: string; className: string } {
  if (lead.contacted) {
    return {
      text: 'Contacte',
      className: 'bg-green-100 text-green-800 border-green-300',
    };
  }
  if (lead.pdfSent) {
    return {
      text: 'PDF envoye',
      className: 'bg-blue-100 text-blue-800 border-blue-300',
    };
  }
  return {
    text: 'Nouveau',
    className: 'bg-amber-100 text-amber-800 border-amber-300',
  };
}

function getCurrentStatus(lead: AdminLead): string {
  if (lead.contacted) {
    return 'Contacte';
  }
  if (lead.pdfSent) {
    return 'PDF envoye';
  }
  return 'Nouveau';
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export default function AdminDashboard({ activeView, initialLeads, initialStats }: AdminDashboardProps) {
  const [leads, setLeads] = useState<AdminLead[]>(initialLeads);
  const [stats, setStats] = useState<AdminStats>(initialStats);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(initialLeads[0]?.id ?? null);
  const [editingNote, setEditingNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

  const emailedLeads = useMemo(() => leads.filter((lead) => lead.emailCount > 0), [leads]);
  const totalEmailsSent = useMemo(() => stats.emailsSentCount || emailedLeads.reduce((total, lead) => total + lead.emailCount, 0), [emailedLeads, stats.emailsSentCount]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const query = new URLSearchParams();
      if (search.trim()) {
        query.set('search', search.trim());
      }
      if (statusFilter !== 'all') {
        query.set('status', statusFilter);
      }

      const [leadsResponse, statsResponse] = await Promise.all([
        fetch(buildApiUrl(`/api/admin/leads?${query.toString()}`), { credentials: 'include' }),
        fetch(buildApiUrl('/api/admin/stats'), { credentials: 'include' }),
      ]);

      const leadsPayload = (await leadsResponse.json().catch(() => null)) as
        | { leads?: AdminLead[]; error?: string }
        | null;
      const statsPayload = (await statsResponse.json().catch(() => null)) as
        | { stats?: AdminStats; error?: string }
        | null;

      if (!leadsResponse.ok || !statsResponse.ok || !leadsPayload?.leads || !statsPayload?.stats) {
        setError(leadsPayload?.error || statsPayload?.error || 'Chargement impossible');
        return;
      }

      const nextLeads = leadsPayload.leads;
      const nextStats = statsPayload.stats;

      setLeads(nextLeads);
      setStats(nextStats);
      setSelectedLeadId((previous) =>
        nextLeads.some((lead) => lead.id === previous) ? previous || null : nextLeads[0]?.id ?? null
      );
    } catch (requestError) {
      console.error('Dashboard load error:', requestError);
      setError('Erreur reseau pendant le chargement');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    setEditingNote(selectedLead?.statusNote || '');
  }, [selectedLeadId, selectedLead?.statusNote]);

  useEffect(() => {
    if (initialLeads.length === 0) {
      void loadDashboard();
    }
  }, [initialLeads.length, loadDashboard]);

  const updateLead = async (leadId: number, payload: { pdfSent?: boolean; contacted?: boolean; statusNote?: string | null }) => {
    const response = await fetch(buildApiUrl(`/api/admin/leads/${leadId}`), {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || 'Mise a jour impossible');
    }
  };

  const handleTogglePdf = async (lead: AdminLead) => {
    try {
      await updateLead(lead.id, { pdfSent: !lead.pdfSent });
      await loadDashboard();
      setSuccessMessage('Statut PDF mis a jour');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Erreur';
      setError(message);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedLead) {
      return;
    }
    setIsSavingNote(true);
    try {
      await updateLead(selectedLead.id, { statusNote: editingNote || null });
      await loadDashboard();
      setSuccessMessage('Note enregistree avec succes');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Erreur';
      setError(message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handlePrepareEmail = (lead: AdminLead) => {
    setSelectedLeadId(lead.id);
    setEmailSubject(`Suivi de votre simulation ROI AKS - ${lead.societe || lead.nom}`);
    setEmailBody(
      `Bonjour ${lead.prenom},\n\nMerci pour votre simulation ROI AKS. Souhaitez-vous planifier un echange de 20 minutes pour analyser vos resultats et vos gains potentiels ?\n\nBien cordialement,\nCloudDev Fusion`
    );
  };

  const selectLeadAndShowDetails = (lead: AdminLead) => {
    handlePrepareEmail(lead);
    setEditingNote(lead.statusNote || '');
    requestAnimationFrame(() => {
      const panel = document.getElementById('lead-details-section');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleSendEmail = async () => {
    if (!selectedLead || !emailSubject.trim() || !emailBody.trim()) {
      setError('Sujet et contenu e-mail requis');
      return;
    }
    setIsSendingEmail(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(buildApiUrl(`/api/admin/leads/${selectedLead.id}/email`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          body: emailBody,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error || 'Envoi impossible');
        return;
      }
      await loadDashboard();
      setSuccessMessage('Relance e-mail envoyee');
    } catch (requestError) {
      console.error('Manual email error:', requestError);
      setError('Erreur reseau pendant la relance e-mail');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const showDashboard = activeView === 'dashboard';
  const showLeads = activeView === 'leads';
  const showEmails = activeView === 'emails';
  const showStats = activeView === 'stats';

  return (
    <div className="space-y-4">
      {(showDashboard || showStats) && (
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserRound size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Leads totaux</p>
              <p className="text-3xl font-semibold leading-tight text-slate-900">{formatNumber(stats.totalLeads)}</p>
              <p className="text-[11px] text-emerald-600">+ {formatNumber(stats.leadsThisMonth)} ce mois</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500">PDF envoyes</p>
              <p className="text-3xl font-semibold leading-tight text-slate-900">{formatNumber(stats.pdfSentCount)}</p>
              <p className="text-[11px] text-emerald-600">
                {stats.totalLeads > 0 ? `${Math.round((stats.pdfSentCount / stats.totalLeads) * 100)}% du total` : '0% du total'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Synchronises au CRM</p>
              <p className="text-3xl font-semibold leading-tight text-slate-900">{formatNumber(stats.contactedCount)}</p>
              <p className="text-[11px] text-amber-600">
                {formatNumber(Math.max(stats.totalLeads - stats.contactedCount, 0))} en attente
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Taux de conversion</p>
              <p className="text-3xl font-semibold leading-tight text-slate-900">
                {stats.conversionRate !== null ? `${stats.conversionRate}%` : '0%'}
              </p>
              <p className="text-[11px] text-blue-600">0% depuis le debut</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {(showDashboard || showLeads) && (
      <section className="bg-white rounded-xl border border-slate-200 shadow-[0_8px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-900">Derniers leads</h2>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher..."
                  className="h-10 w-full md:w-56 rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as LeadStatusFilter)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="new">Nouveaux</option>
                <option value="pdf_sent">PDF envoye</option>
                <option value="contacted">Contacte</option>
              </select>
              <button
                type="button"
                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={loadDashboard}
                disabled={isLoading}
              >
                {isLoading ? 'Chargement...' : 'Filtrer'}
              </button>
              <a
                href={buildApiUrl(`/api/admin/leads/export?search=${encodeURIComponent(search)}&status=${encodeURIComponent(
                  statusFilter
                )}`)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <Download size={14} />
                Exporter CSV
              </a>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Societe</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const badge = getStatusBadge(lead);
                const isSelected = selectedLeadId === lead.id;
                return (
                  <tr key={lead.id} className={`border-t border-slate-100 ${isSelected ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className={`text-left font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-800 hover:text-blue-700'}`}
                        onClick={() => selectLeadAndShowDetails(lead)}
                      >
                        {lead.prenom} {lead.nom}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{lead.societe || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.email}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.role || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${badge.className}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatShortDate(lead.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-8 rounded-md border border-blue-300 bg-blue-50 px-3 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          onClick={() => selectLeadAndShowDetails(lead)}
                        >
                          Voir le lead
                        </button>
                        <button
                          type="button"
                          className="h-8 w-8 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 transition-colors inline-flex items-center justify-center"
                          onClick={() => selectLeadAndShowDetails(lead)}
                          aria-label="Plus d'actions"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-md border border-blue-300 bg-blue-50 px-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          onClick={() => handleTogglePdf(lead)}
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {leads.length === 0 && <p className="text-slate-600 px-4 py-8">Aucun lead correspondant.</p>}
        </div>
      </section>
      )}

      {(showDashboard || showLeads) && (
      <section id="lead-details-section" className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <article className="xl:col-span-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Informations du lead</h3>
          {!selectedLead && <p className="text-sm text-slate-600">Selectionnez un lead.</p>}
          {selectedLead && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  {selectedLead.prenom.charAt(0)}{selectedLead.nom.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedLead.prenom} {selectedLead.nom}</p>
                  <p className="text-xs text-slate-500">{selectedLead.societe || '-'}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <p className="flex items-center gap-2"><CircleUserRound size={14} className="text-slate-400" /> Role: {selectedLead.role || '-'}</p>
                <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> E-mail: {selectedLead.email}</p>
                <p className="flex items-center gap-2"><PhoneCall size={14} className="text-slate-400" /> Telephone: {selectedLead.telephone || '-'}</p>
                <p className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" /> Date de soumission: {formatDate(selectedLead.submittedAt)}</p>
                <p className="flex items-center gap-2"><TrendingUp size={14} className="text-slate-400" /> Statut actuel: {getCurrentStatus(selectedLead)}</p>
                <p className="flex items-center gap-2"><MessageSquare size={14} className="text-slate-400" /> Relances: {selectedLead.emailCount}</p>
                <p className="flex items-center gap-2"><Download size={14} className="text-slate-400" /> Tentatives PDF: {selectedLead.pdfDownloadCount}</p>
              </div>
            </div>
          )}
        </article>

        <article className="xl:col-span-8 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Relance et notes</h3>
          {!selectedLead && <p className="text-sm text-slate-600">Selectionnez un lead.</p>}
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sujet de l&apos;e-mail</label>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    placeholder="Sujet de la relance"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Derniere relance</label>
                  <p className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 flex items-center">
                    {formatDate(selectedLead.lastEmailAt)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[110px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={emailBody}
                  onChange={(event) => setEmailBody(event.target.value)}
                  placeholder="Contenu de l'e-mail"
                />
                <button
                  type="button"
                  className="mt-2 w-full h-10 rounded-lg bg-gradient-to-r from-[#2f65f5] to-[#1e55ea] text-white text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? 'Envoi...' : 'Envoyer la relance'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note commerciale</label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={editingNote}
                  onChange={(event) => setEditingNote(event.target.value)}
                  placeholder="Ajoutez une note commerciale..."
                />
                <button
                  type="button"
                  className="mt-2 h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                >
                  {isSavingNote ? 'Sauvegarde...' : 'Enregistrer la note'}
                </button>
              </div>

            </div>
          )}
        </article>
      </section>
      )}

      {showEmails && (
        <section className="space-y-4">
          <article className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Tous les e-mails envoyes sont suivis ici. Total envoye: {formatNumber(totalEmailsSent)}.
          </article>

          <article className="bg-white rounded-xl border border-slate-200 shadow-[0_8px_20px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100">
              <h2 className="text-2xl font-semibold text-slate-900">Historique des e-mails envoyes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Lead</th>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">Nb relances</th>
                    <th className="px-4 py-3 font-medium">Dernier envoi</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {emailedLeads.map((lead) => (
                    <tr key={lead.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{lead.prenom} {lead.nom}</td>
                      <td className="px-4 py-3 text-slate-700">{lead.email}</td>
                      <td className="px-4 py-3 text-slate-700">{formatNumber(lead.emailCount)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(lead.lastEmailAt)}</td>
                      <td className="px-4 py-3 text-slate-700">{getCurrentStatus(lead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {emailedLeads.length === 0 && (
                <p className="text-slate-600 px-4 py-8">Aucun e-mail envoye pour le moment.</p>
              )}
            </div>
          </article>
        </section>
      )}

      {showStats && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            <p className="text-sm text-slate-500">Personnes ayant essaye de telecharger le PDF</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{formatNumber(stats.pdfDownloadAttemptCount)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {formatNumber(stats.pdfDownloadAttemptTotal)} tentative(s) au total
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            <p className="text-sm text-slate-500">Total e-mails envoyes</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{formatNumber(totalEmailsSent)}</p>
            <p className="text-xs text-slate-500 mt-1">Tous leads confondus</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            <p className="text-sm text-slate-500">Leads avec au moins un e-mail</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{formatNumber(emailedLeads.length)}</p>
            <p className="text-xs text-slate-500 mt-1">Suivi commercial actif</p>
          </article>
        </section>
      )}

      {successMessage && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </section>
      )}
    </div>
  );
}
