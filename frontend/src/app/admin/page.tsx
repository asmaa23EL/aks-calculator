'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminSidebar from '@/components/admin/AdminSidebar';

type AdminView = 'dashboard' | 'leads' | 'emails' | 'stats';

function formatFrenchDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const viewLabels: Record<AdminView, string> = {
  dashboard: 'Tableau de bord',
  leads: 'Leads',
  emails: 'Activités',
  stats: 'Statistiques',
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<AdminView>('leads');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/admin/me', { credentials: 'include', cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          router.replace('/admin/login');
          return;
        }
        if (isMounted) setIsAuthenticated(true);
      })
      .catch(() => router.replace('/admin/login'));

    return () => {
      isMounted = false;
    };
  }, [router]);

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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        Vérification de votre session…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-2 md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <AdminSidebar activeView={activeView} onChangeView={setActiveView} onLogout={() => router.replace('/admin/login')} />
        <main className="min-w-0 flex-1 overflow-auto bg-slate-50/70">
          {activeView !== 'leads' && <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Administration</p>
              <p className="text-sm text-slate-600">Vue {viewLabels[activeView].toLowerCase()}</p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">A</div>
              <span className="font-medium">Admin</span>
            </div>
          </div>}
          <div className={activeView === 'leads' ? 'h-full p-0' : 'p-5 md:p-8'}>
            {activeView !== 'leads' && <header className="mb-6 flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Espace de pilotage</p>
                <h1 className="mt-1 text-[24px] font-semibold leading-tight text-slate-900">{viewLabels[activeView]}</h1>
                <p className="mt-1 text-sm text-slate-600">Bienvenue, Admin. Gérez les leads et suivez l’activité commerciale de façon claire.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {formatFrenchDate()}
              </div>
            </header>}
            <AdminDashboard activeView={activeView} initialLeads={[]} initialStats={initialStats} />
          </div>
        </main>
      </div>
    </div>
  );
}
