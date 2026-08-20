'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '@/utils/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(buildApiUrl('/api/admin/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error || 'Connexion impossible');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch (requestError) {
      console.error('Erreur de connexion admin:', requestError);
      setError('Erreur réseau, veuillez réessayer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.28),_transparent_35%),linear-gradient(135deg,_#001F4D_0%,_#0969F9_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl overflow-hidden rounded-[28px] border border-white/30 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur">
        <div className="brand-gradient hidden w-[42%] flex-col justify-between p-8 text-white lg:flex">
          <div>
            <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]">
              Administration
            </div>
            <h1 className="mt-6 text-3xl font-semibold leading-tight">Accédez au tableau de bord CloudDev Fusion</h1>
            <p className="mt-3 max-w-sm text-sm text-blue-50">Gérez vos leads, relances et performances depuis un espace clair et sécurisé.</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-blue-50">
            <p className="font-medium text-white">Connexion sécurisée</p>
            <p className="mt-1">Identifiants réservés à l’équipe administratrice.</p>
          </div>
        </div>

        <div className="flex-1 p-6 sm:p-8 lg:p-10">
          <div className="mb-8 flex items-center gap-3">
            <img src="/logo.png" alt="CloudDev Fusion" className="h-11 w-20 object-contain" />
            <div>
              <p className="text-lg font-semibold text-slate-900">CloudDev Fusion</p>
              <p className="text-sm text-slate-500">Portail administrateur</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900">Connexion administrateur</h2>
          <p className="mt-2 text-sm text-slate-600">Connectez-vous avec votre email et votre mot de passe.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field focus:border-primary-500 focus:ring-primary-500"
                placeholder="admin@votre-domaine.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field focus:border-primary-500 focus:ring-primary-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50">
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
