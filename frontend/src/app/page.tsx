'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle, TrendingUp, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="bg-[linear-gradient(180deg,_#F8FAFD_0%,_#F4F9FF_100%)]">
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(2,32,74,0.08)]">
          <div className="grid gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-16">
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary-600" />
                Outil gratuit • 100% confidentiel • Résultats immédiats
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Calculez vos économies en migrant{' '}
                <span className="text-primary-600">vers Azure Kubernetes Service</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Découvrez en <strong>5 minutes</strong> combien vous pourriez économiser en migrer votre infrastructure vers Azure AKS. Obtenez un <strong>ROI précis</strong> et un <strong>rapport détaillé</strong> prêt à partager.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/wizard"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:-translate-y-0.5 hover:bg-primary-700"
                >
                  Commencer l&apos;évaluation gratuite
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Résultats instantanés • Rapport PDF • Sans engagement
                </div>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span>500+ entreprises</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span>Certifié Microsoft</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span>RGPD compliant</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,_#001F4D_0%,_#0969F9_100%)] p-8 text-white shadow-inner">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Vision rapide</p>
                <h2 className="mt-3 text-2xl font-semibold">Une migration AKS pilotée par les chiffres</h2>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-white/15 p-4">
                    <p className="text-sm text-blue-100">Économies estimées</p>
                    <p className="mt-1 text-3xl font-semibold">+45%</p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-4">
                    <p className="text-sm text-blue-100">ROI moyen</p>
                    <p className="mt-1 text-3xl font-semibold">8 mois</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-700">Pourquoi migrer ?</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Une plateforme plus performante, plus sûre et plus rentable
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Réduction des coûts', text: 'Jusqu’à 60% d’économies sur l’infrastructure grâce à l’autoscaling.', icon: TrendingUp },
            { title: 'Déploiements rapides', text: 'Automatisation complète avec GitOps pour des releases sans friction.', icon: Zap },
            { title: 'Sécurité renforcée', text: 'Scans automatiques, chiffrement natif et conformité RGPD.', icon: Shield },
            { title: 'Haute disponibilité', text: 'Auto-healing et monitoring avancé pour réduire les incidents.', icon: CheckCircle },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-700">Comment ça marche</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Un parcours simple, rapide et clair</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '1', title: 'Répondez aux questions', text: 'En 4 étapes simples, décrivez votre infrastructure actuelle.' },
              { step: '2', title: 'Obtenez vos résultats', text: 'Visualisez instantanément vos économies potentielles et votre ROI.' },
              { step: '3', title: 'Recevez le rapport', text: 'Un rapport PDF complet vous est envoyé avec une analyse détaillée.' },
            ].map((item) => (
              <div key={item.step} className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-2xl font-semibold text-white">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-700">Témoignages</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Ce que disent nos clients</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { initials: 'JD', name: 'Jean Dupont', role: 'CTO, TechCorp', quote: 'Grâce à CloudDev Fusion, nous avons migré vers AKS en 3 mois et réduit nos coûts de 45%. Le calculateur ROI était très précis.' },
            { initials: 'SM', name: 'Sophie Martin', role: 'DevOps Lead, InnovaCloud', quote: 'Un outil indispensable pour convaincre notre direction. Les chiffres parlent d’eux-mêmes. Accompagnement top niveau.' },
            { initials: 'PL', name: 'Pierre Leroux', role: 'Directeur IT, MegaRetail', quote: 'ROI atteint en 8 mois. CloudDev Fusion a géré la migration de A à Z. Je recommande à 100%.' },
          ].map((item) => (
            <div key={item.name} className="rounded-[24px] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
                  {item.initials}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-sm text-slate-500">{item.role}</div>
                </div>
              </div>
              <p className="text-sm leading-7 text-slate-600">“{item.quote}”</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,_#001F4D_0%,_#0969F9_100%)] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Prêt à découvrir vos économies potentielles ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
            Commencez votre évaluation gratuite dès maintenant. Sans engagement et avec un rapport prêt à partager.
          </p>
          <Link
            href="/wizard"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-primary-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            Démarrer le calculateur
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-6 text-sm text-blue-100">
            ✓ Aucune carte bancaire requise • ✓ Résultats en 5 minutes • ✓ Données sécurisées
          </p>
        </div>
      </section>
    </div>
  );
}
