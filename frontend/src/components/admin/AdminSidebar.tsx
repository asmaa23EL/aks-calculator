import { BarChart3, LayoutDashboard, LogOut, Sparkles, Users, ShieldCheck } from 'lucide-react';

type AdminSidebarProps = {
  activeView: 'dashboard' | 'leads' | 'emails' | 'stats';
  onChangeView: (view: 'dashboard' | 'leads' | 'emails' | 'stats') => void;
  onLogout?: () => void;
};

const items = [
  { key: 'dashboard' as const, label: 'Tableau de bord', icon: LayoutDashboard },
  { key: 'leads' as const, label: 'Leads', icon: Users },
  { key: 'emails' as const, label: 'Activités', icon: Sparkles },
  { key: 'stats' as const, label: 'Statistiques', icon: BarChart3 },
];

export default function AdminSidebar({ activeView, onChangeView, onLogout }: AdminSidebarProps) {
  return (
    <aside className="flex w-full flex-col border-b border-slate-800 bg-[linear-gradient(180deg,_#061b3d_0%,_#03275b_55%,_#061b3d_100%)] p-5 text-slate-100 lg:w-[270px] lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
        <div className="flex h-12 w-[72px] items-center justify-center rounded-xl bg-white/95 px-2 shadow-lg shadow-blue-950/30">
          <img src="/logo.png" alt="CloudDev Fusion" className="h-9 w-full object-contain" />
        </div>
        <div>
          <p className="text-base font-semibold">CloudDevFusion</p>
          <p className="text-xs text-blue-50/80">ROI AKS • Admin</p>
        </div>
      </div>

      <nav className="mt-6 space-y-2">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = activeView === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChangeView(key)}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/25' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <span className="flex items-center gap-3">
                <Icon size={16} />
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <ShieldCheck size={15} className="text-emerald-300" /> Accès sécurisé
          </div>
          <p className="mt-1 text-xs text-blue-50/80">Administrateur certifié</p>
        </div>
        {onLogout ? (
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm text-blue-50/90 transition hover:bg-white/10 hover:text-white">
            <LogOut size={16} /> Déconnexion
          </button>
        ) : null}
      </div>
    </aside>
  );
}
