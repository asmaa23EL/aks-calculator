'use client';

import { useState } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminLogoutButton from '@/components/AdminLogoutButton';
import { buildApiUrl } from '@/utils/api';
import {
  BarChart3,
  Download,
  LayoutDashboard,
  Mail,
  Users,
} from 'lucide-react';

type AdminView = 'dashboard' | 'leads' | 'emails' | 'stats';

function formatFrenchDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AdminDashboardPage() {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');

  const initialStats = {
    totalLeads: 0,
    leadsThisWeek: 0,
    leadsThisMonth: 0,
    contactedCount: 0,
    pdfSentCount: 0,
    pdfDownloadAttemptCount: 0,
    pdfDownloadAttemptTotal: 0,
    simulationsThisWeek: 0,
    visitsThisWeek: 0,
    conversionRate: null,
    emailsSentCount: 0,
  };

  return (
    <div className="min-h-screen bg-slate-100 p-2 md:p-4">
      <div className="mx-auto max-w-[1500px] rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-2rem)]">
          <aside className="w-full lg:w-72 bg-gradient-to-b from-[#0f2f66] to-[#0d2551] text-white p-6 flex flex-col">
            <div className="flex items-center gap-3 pb-6 border-b border-white/20">
              <img
                src="/logo.png"
                alt="CloudDev Fusion Logo"
                className="h-10 w-auto"
              />
              <div>
                <p className="text-lg font-semibold leading-tight">CloudDevFusion</p>
                <p className="text-[11px] text-blue-100">Excellence Azure & Cloud</p>
              </div>
            </div>

            <p className="text-sm font-semibold text-blue-100 mt-5 mb-2">CloudDevFusion</p>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-[#2f65f5] text-white font-medium shadow-sm'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <LayoutDashboard size={16} />
                Tableau de bord
              </button>
              <button
                type="button"
                onClick={() => setActiveView('leads')}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  activeView === 'leads'
                    ? 'bg-[#2f65f5] text-white font-medium shadow-sm'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Users size={16} />
                Leads
              </button>
              <button
                type="button"
                onClick={() => setActiveView('emails')}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  activeView === 'emails'
                    ? 'bg-[#2f65f5] text-white font-medium shadow-sm'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Mail size={16} />
                E-mails
              </button>
              <button
                type="button"
                onClick={() => setActiveView('stats')}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  activeView === 'stats'
                    ? 'bg-[#2f65f5] text-white font-medium shadow-sm'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <BarChart3 size={16} />
                Statistiques
              </button>
              <a
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-blue-100 hover:bg-white/10 transition-colors"
                href={buildApiUrl('/api/admin/leads/export?search=&status=all')}
              >
                <Download size={16} />
                Export CSV
              </a>
            </nav>

            <div className="mt-auto pt-6 border-t border-white/20 space-y-4">
              <AdminLogoutButton className="w-full rounded-lg border border-white/35 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors" />
              <p className="text-[11px] leading-relaxed text-blue-100/90">© 2025 CloudDevFusion<br />Tous droits réservés.</p>
            </div>
          </aside>

          <main className="flex-1 bg-slate-50 overflow-auto">
            <div className="h-14 border-b border-slate-200 bg-white px-5 md:px-8 flex items-center justify-end gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <div className="h-7 w-7 rounded-full bg-[#2f65f5] text-white flex items-center justify-center text-xs font-semibold">A</div>
                <span>Admin</span>
              </div>
            </div>
            <div className="p-5 md:p-8">
              <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6">
                <div>
                  <h1 className="text-[34px] leading-tight font-bold text-slate-900">
                    {activeView === 'dashboard' && 'Tableau de bord'}
                    {activeView === 'leads' && 'Leads'}
                    {activeView === 'emails' && 'E-mails envoyes'}
                    {activeView === 'stats' && 'Statistiques'}
                  </h1>
                  <p className="text-slate-600 mt-1">Bienvenue, Admin</p>
                </div>
                <p className="text-sm text-slate-500 capitalize">{formatFrenchDate()}</p>
              </header>
              <AdminDashboard activeView={activeView} initialLeads={[]} initialStats={initialStats} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
