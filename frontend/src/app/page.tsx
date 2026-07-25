'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle, TrendingUp, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></span>
            Outil gratuit • 100% confidentiel • Résultats immédiats
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Calculez vos économies en migrant <br />
            <span className="text-primary-600">vers Azure Kubernetes Service</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Découvrez en <strong>5 minutes</strong> combien vous pourriez économiser en migrant votre infrastructure 
            vers Azure AKS. Obtenez un <strong>ROI précis</strong> et un <strong>rapport détaillé</strong>.
          </p>
          <Link 
            href="/wizard"
            className="inline-flex items-center gap-2 btn-primary text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-shadow"
          >
            Commencer l&apos;évaluation gratuite
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-6 flex items-center justify-center gap-6 flex-wrap">
            <span className="flex items-center gap-2">⏱️ 5 minutes</span>
            <span className="flex items-center gap-2">📊 Résultats instantanés</span>
            <span className="flex items-center gap-2">📄 Rapport PDF détaillé</span>
          </p>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>500+ entreprises</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Certifié Microsoft</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>RGPD compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bénéfices */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Pourquoi migrer vers Azure AKS ?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <TrendingUp className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Réduction des coûts</h3>
            <p className="text-gray-600">
              Jusqu&apos;à 60% d&apos;économies sur l&apos;infrastructure grâce à l&apos;autoscaling
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Zap className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Déploiements rapides</h3>
            <p className="text-gray-600">
              Automatisation complète avec GitOps pour des releases sans friction
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <Shield className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sécurité renforcée</h3>
            <p className="text-gray-600">
              Scans automatiques, chiffrement natif et conformité RGPD
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Haute disponibilité</h3>
            <p className="text-gray-600">
              Auto-healing et monitoring avancé pour réduire les incidents
            </p>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Répondez aux questions</h3>
              <p className="text-gray-600">
                En 4 étapes simples, décrivez votre infrastructure actuelle
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Obtenez vos résultats</h3>
              <p className="text-gray-600">
                Visualisez instantanément vos économies potentielles et votre ROI
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Recevez le rapport</h3>
              <p className="text-gray-600">
                Rapport PDF complet envoyé par email avec analyse détaillée
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Ce que disent nos clients
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                JD
              </div>
              <div>
                <div className="font-semibold">Jean Dupont</div>
                <div className="text-sm text-gray-500">CTO, TechCorp</div>
              </div>
            </div>
            <p className="text-gray-600 italic">
              &quot;Grâce à CloudDev Fusion, nous avons migré vers AKS en 3 mois et réduit nos coûts de 45%.
              Le calculateur ROI était très précis !&quot;
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                SM
              </div>
              <div>
                <div className="font-semibold">Sophie Martin</div>
                <div className="text-sm text-gray-500">DevOps Lead, InnovaCloud</div>
              </div>
            </div>
            <p className="text-gray-600 italic">
              &quot;Un outil indispensable pour convaincre notre direction. Les chiffres parlent d&apos;eux-mêmes.
              Accompagnement top niveau !&quot;
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                PL
              </div>
              <div>
                <div className="font-semibold">Pierre Leroux</div>
                <div className="text-sm text-gray-500">Directeur IT, MegaRetail</div>
              </div>
            </div>
            <p className="text-gray-600 italic">
              &quot;ROI atteint en 8 mois. CloudDev Fusion a géré la migration de A à Z.
              Je recommande à 100% !&quot;
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Prêt à découvrir vos économies potentielles ?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Commencez votre évaluation gratuite dès maintenant. Sans engagement.
          </p>
          <Link 
            href="/wizard"
            className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg"
          >
            Démarrer le calculateur
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-primary-200 mt-6">
            ✓ Aucune carte bancaire requise • ✓ Résultats en 5 minutes • ✓ Données sécurisées
          </p>
        </div>
      </section>
    </div>
  );
}
