'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { FormAnswers, CalculationResults } from '@/types';
import { calculerROI, formatEuros, formatPourcentage } from '@/utils/calculations';
import { buildApiUrl } from '@/utils/api';
import LeadFormModal from '@/components/LeadFormModal';
import { Share2, TrendingUp, Award, CheckCircle, Calendar, FileText } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function ResultatsPage() {
  const router = useRouter();
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadFormMode, setLeadFormMode] = useState<'lead-only' | 'lead-and-download'>('lead-only');
  const [isVisible, setIsVisible] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [loadError, setLoadError] = useState('');

  const normalizeResults = (input: CalculationResults): CalculationResults => {
    const coutActuelTotal =
      Number(input.coutActuel.infrastructure || 0) +
      Number(input.coutActuel.deploiements || 0) +
      Number(input.coutActuel.incidents || 0) +
      Number(input.coutActuel.securite || 0);

    const coutAksTotal =
      Number(input.coutAKS.infrastructure || 0) +
      Number(input.coutAKS.deploiements || 0) +
      Number(input.coutAKS.incidents || 0) +
      Number(input.coutAKS.securite || 0);

    const economiesMensuelles =
      Number.isFinite(Number(input.economiesMensuelles)) && Number(input.economiesMensuelles) !== 0
        ? Number(input.economiesMensuelles)
        : Math.max(coutActuelTotal - coutAksTotal, 0);

    const investissementInitial = Number(input.investissementInitial || 15000);
    const roi12Mois =
      Number.isFinite(Number(input.roi12Mois)) && Number(input.roi12Mois) !== 0
        ? Number(input.roi12Mois)
        : investissementInitial > 0
          ? ((economiesMensuelles * 12 - investissementInitial) / investissementInitial) * 100
          : 0;

    const paybackMois =
      Number.isFinite(Number(input.paybackMois)) && Number(input.paybackMois) > 0
        ? Number(input.paybackMois)
        : economiesMensuelles > 0
          ? investissementInitial / economiesMensuelles
          : Number.POSITIVE_INFINITY;

    return {
      ...input,
      coutActuel: {
        ...input.coutActuel,
        total: coutActuelTotal,
      },
      coutAKS: {
        ...input.coutAKS,
        total: coutAksTotal,
      },
      economiesMensuelles,
      roi12Mois,
      paybackMois,
      investissementInitial,
    };
  };

  const hasWizardSections = (value: unknown): value is FormAnswers => {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const record = value as Record<string, unknown>;
    return (
      !!record.infrastructure && typeof record.infrastructure === 'object' &&
      !!record.deploiements && typeof record.deploiements === 'object' &&
      !!record.incidents && typeof record.incidents === 'object' &&
      !!record.securite && typeof record.securite === 'object'
    );
  };

  useEffect(() => {
    let isMounted = true;

    const loadResults = async () => {
      const answersJson = localStorage.getItem('wizardAnswers');
      if (!answersJson) {
        router.push('/wizard');
        return;
      }

      try {
        const parsed = JSON.parse(answersJson) as unknown;
        if (!hasWizardSections(parsed)) {
          localStorage.removeItem('wizardAnswers');
          router.push('/wizard');
          return;
        }

        const answers = parsed;
        let computedResults: CalculationResults | null = null;

        try {
          const response = await fetch(buildApiUrl('/api/calculate-roi'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ answers }),
          });

          const payload = (await response.json().catch(() => null)) as
            | { resultats?: CalculationResults; error?: string }
            | null;

          if (!response.ok || !payload?.resultats) {
            if (payload?.error === 'Payload answers invalide') {
              localStorage.removeItem('wizardAnswers');
              router.push('/wizard');
              return;
            }
            throw new Error(payload?.error || 'Calcul backend indisponible');
          }

          computedResults = payload.resultats;
        } catch (apiError) {
          // Fallback: garantit l'affichage des resultats si l'API externe est indisponible.
          console.warn('API calcul indisponible, fallback local active:', apiError);
          computedResults = calculerROI(answers);
        }

        if (!isMounted) {
          return;
        }

      setResults(normalizeResults(computedResults));
        setLoadError('');
      
      // Animation d'entrée
      setTimeout(() => setIsVisible(true), 100);
      
      // Générer un lien de partage unique
      const uniqueId = Math.random().toString(36).substring(7);
      setShareLink(`${window.location.origin}/resultats/${uniqueId}`);
    } catch (error) {
      console.error('Erreur lors du calcul:', error);
        if (!isMounted) {
          return;
        }
        setLoadError('Impossible de calculer les resultats pour le moment.');
    }
    };

    void loadResults();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Fonction de partage
  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Lien copié dans le presse-papier !');
  };

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Calcul de vos economies en cours...</p>
          {loadError && <p className="text-red-600 mt-4">{loadError}</p>}
          {loadError && (
            <button
              type="button"
              onClick={() => router.push('/wizard')}
              className="mt-4 btn-secondary"
            >
              Retour au wizard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Données pour le graphique ROI sur 3 ans
  const roiChartData = {
    labels: ['Année 1', 'Année 2', 'Année 3'],
    datasets: [
      {
        label: 'ROI cumulé (%)',
        data: [
          results.roi12Mois,
          ((results.economiesMensuelles * 24 - 15000) / 15000) * 100,
          ((results.economiesMensuelles * 36 - 15000) / 15000) * 100,
        ],
        borderColor: 'rgb(6, 182, 212)',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const roiChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Évolution du ROI sur 3 ans',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `ROI: ${context.parsed.y.toFixed(1)}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    },
  };

  const economiesBarData = {
    labels: ['Infrastructure', 'Deploiements', 'Incidents', 'Securite'],
    datasets: [
      {
        label: 'Economies mensuelles (€)',
        data: [
          results.economiesParAxe.infrastructure,
          results.economiesParAxe.deploiements,
          results.economiesParAxe.incidents,
          results.economiesParAxe.securite,
        ],
        backgroundColor: ['#0ea5e9', '#06b6d4', '#22c55e', '#a855f7'],
        borderRadius: 8,
      },
    ],
  };

  const economiesBarOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Economies par axe (€/mois)',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return formatEuros(Number(context.parsed.y || 0));
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatEuros(Number(value));
          },
        },
      },
    },
  };

  // Générer des recommandations personnalisées
  const generateRecommandations = () => {
    const recommandations = [];
    
    if (results.economiesParAxe.infrastructure > results.economiesMensuelles * 0.3) {
      recommandations.push({
        icon: '💰',
        title: 'Optimisation Infrastructure',
        desc: 'Forte opportunité d\'économies sur l\'infrastructure avec l\'autoscaling AKS'
      });
    }
    
    if (results.economiesParAxe.deploiements > results.economiesMensuelles * 0.25) {
      recommandations.push({
        icon: '🚀',
        title: 'Automatisation GitOps',
        desc: 'Déploiements automatisés recommandés pour maximiser l\'efficacité'
      });
    }
    
    if (results.roi12Mois > 100) {
      recommandations.push({
        icon: '📈',
        title: 'ROI Exceptionnel',
        desc: 'Votre ROI dépasse 100%, migration hautement rentable'
      });
    }
    
    if (results.paybackMois < 12) {
      recommandations.push({
        icon: '⚡',
        title: 'Retour Rapide',
        desc: `Investissement rentabilisé en moins de ${Math.ceil(results.paybackMois)} mois`
      });
    }

    return recommandations;
  };

  const recommandations = generateRecommandations();

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className={`max-w-6xl mx-auto px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* En-tête avec actions */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Vos Résultats
          </h1>
          <div className="flex items-center justify-center gap-4 mb-6">
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              Partager
            </button>
            <a 
              href="https://calendly.com/clouddevfusion"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium"
            >
              <Calendar className="w-4 h-4" />
              Planifier un appel
            </a>
          </div>
        </div>

        {/* Badges de performance */}
        <div className="flex justify-center gap-4 mb-8">
          {results.roi12Mois > 100 && (
            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
              <TrendingUp className="w-4 h-4" />
              ROI Élevé
            </div>
          )}
          {results.paybackMois < 12 && (
            <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold">
              <Award className="w-4 h-4" />
              Retour Rapide
            </div>
          )}
          {results.economiesMensuelles > 10000 && (
            <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              Économies Élevées
            </div>
          )}
        </div>

        {/* KPI principaux */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-10">
          <div className="text-center bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <p className="text-sm font-semibold text-gray-700">Coût actuel</p>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">
              {formatEuros(results.coutActuel.total)}
            </p>
            <p className="text-sm text-gray-500">/ mois</p>
          </div>

          <div className="text-center bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <p className="text-sm font-semibold text-gray-700">Coût AKS</p>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">
              {formatEuros(results.coutAKS.total)}
            </p>
            <p className="text-sm text-gray-500">/ mois</p>
          </div>

          <div className="text-center bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
              <p className="text-sm font-semibold text-gray-700">Économies</p>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">
              {formatEuros(results.economiesMensuelles)}
            </p>
            <p className="text-sm text-gray-500">/ mois</p>
          </div>

          <div className="text-center bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <p className="text-sm font-semibold text-gray-700">ROI 12 mois</p>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">
              {formatPourcentage(results.roi12Mois)}
            </p>
            <p className="text-sm text-gray-500">retour annuel</p>
          </div>

          <div className="text-center bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <p className="text-sm font-semibold text-gray-700">Payback</p>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">
              {Number.isFinite(results.paybackMois) ? results.paybackMois.toFixed(1) : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">mois</p>
          </div>
        </div>

        {/* Section principale avec graphiques et tableau */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Colonne gauche - Graphiques */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            {/* Comparatif des coûts */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Comparatif des coûts</h3>
              <div className="flex items-end justify-center gap-16 h-56">
                <div className="flex flex-col items-center">
                  <div className="w-20 bg-blue-900 rounded-t-lg" style={{height: '200px'}}></div>
                  <p className="text-sm text-gray-700 mt-3 font-medium">Actuel</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-20 bg-cyan-500 rounded-t-lg" style={{height: `${(results.coutAKS.total / results.coutActuel.total) * 200}px`}}></div>
                  <p className="text-sm text-gray-700 mt-3 font-medium">AKS</p>
                </div>
              </div>
            </div>

            {/* Graphique barres des economies par axe */}
            <div>
              <Bar data={economiesBarData} options={economiesBarOptions} />
            </div>
          </div>

          {/* Colonne droite - Tableau et ROI */}
          <div className="space-y-6">
            {/* Tableau des coûts */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Axe</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actuel</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">AKS</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Gain mensuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">Infrastructure</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatEuros(results.coutActuel.infrastructure)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatEuros(results.coutAKS.infrastructure)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatEuros(results.economiesParAxe.infrastructure)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">
                      Déploiements<br/>
                      <span className="text-xs text-gray-500">automatisés</span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatEuros(results.coutActuel.deploiements)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatEuros(results.coutAKS.deploiements)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatEuros(results.economiesParAxe.deploiements)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">Incidents</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatEuros(results.coutActuel.incidents)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatEuros(results.coutAKS.incidents)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatEuros(results.economiesParAxe.incidents)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">Sécurité</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatEuros(results.coutActuel.securite)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatEuros(results.coutAKS.securite)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatEuros(results.economiesParAxe.securite)}</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold">
                    <td className="py-3 px-4 text-gray-900">Total</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatEuros(results.coutActuel.total)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatEuros(results.coutAKS.total)}</td>
                    <td className="py-3 px-4 text-right text-cyan-600 font-bold">{formatEuros(results.economiesMensuelles)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ROI Circle et action rapport */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="relative w-28 h-28">
                    <svg className="transform -rotate-90 w-28 h-28">
                      <circle cx="56" cy="56" r="50" stroke="#e5e7eb" strokeWidth="10" fill="transparent"/>
                      <circle cx="56" cy="56" r="50" stroke="#06b6d4" strokeWidth="10" fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - Math.min(results.roi12Mois, 500) / 500)}`}
                        strokeLinecap="round"/>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-gray-900">ROI</span>
                      <span className="text-lg font-bold text-cyan-600">{formatPourcentage(results.roi12Mois)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 leading-tight">
                    Recevez votre rapport PDF<br/>par email
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Cliquez sur le bouton ci-dessous pour ouvrir le formulaire et recevoir votre rapport.
                  </p>
                  <button
                    onClick={() => {
                      setLeadFormMode('lead-and-download');
                      setShowLeadForm(true);
                    }}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 rounded text-sm transition-colors"
                  >
                    Recevoir mon rapport PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique ROI sur 3 ans */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <Line data={roiChartData} options={roiChartOptions} />
        </div>

        {/* Recommandations personnalisées */}
        {recommandations.length > 0 && (
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg p-6 text-white mb-8">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-6 h-6" />
              Recommandations Personnalisées
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {recommandations.map((rec, index) => (
                <div key={index} className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{rec.icon}</span>
                    <div>
                      <h4 className="font-semibold text-lg mb-1">{rec.title}</h4>
                      <p className="text-sm text-white/90">{rec.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges de confiance */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Ils nous font confiance</h3>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 mb-2">
                <div className="text-3xl font-bold">500+</div>
              </div>
              <p className="text-sm text-gray-600">Entreprises migrées</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 mb-2">
                <div className="text-3xl font-bold">95%</div>
              </div>
              <p className="text-sm text-gray-600">Satisfaction client</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 mb-2">
                <div className="text-3xl font-bold">47%</div>
              </div>
              <p className="text-sm text-gray-600">Économie moyenne</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-4 mb-2">
                <div className="text-3xl font-bold">24/7</div>
              </div>
              <p className="text-sm text-gray-600">Support expert</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <Award className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Microsoft Partner</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Azure Expert MSP</span>
            </div>
            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-900">ISO 27001</span>
            </div>
          </div>
        </div>

        {/* Timeline de migration */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Timeline de Migration Recommandée</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Audit & Analyse</h4>
                <p className="text-sm text-gray-600">Semaines 1-2 : Audit complet de l&apos;infrastructure existante</p>
              </div>
              <span className="text-sm text-gray-500">2 semaines</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Conception & Planning</h4>
                <p className="text-sm text-gray-600">Semaines 3-4 : Architecture AKS et stratégie de migration</p>
              </div>
              <span className="text-sm text-gray-500">2 semaines</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Migration & Tests</h4>
                <p className="text-sm text-gray-600">Semaines 5-8 : Migration progressive avec environnement de test</p>
              </div>
              <span className="text-sm text-gray-500">4 semaines</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">✓</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Production & Support</h4>
                <p className="text-sm text-gray-600">Semaine 9+ : Mise en production et accompagnement 24/7</p>
              </div>
              <span className="text-sm text-gray-500">Continu</span>
            </div>
          </div>
        </div>

        {/* Note de bas de page */}
        <div className="text-center text-xs text-gray-500 mt-6 bg-white rounded-lg p-4 shadow-sm">
          <p>Les résultats sont estimatifs, basés sur vos réponses</p>
          <p>et nos hypothèses AKS (autoscaling, GitOps, monitoring, etc.)</p>
        </div>
      </div>

      {/* Modal de partage */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Partager vos résultats</h3>
            <p className="text-sm text-gray-600 mb-4">Partagez ce lien pour retrouver vos résultats :</p>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={shareLink} 
                readOnly 
                className="flex-1 px-3 py-2 border rounded text-sm bg-gray-50"
              />
              <button 
                onClick={copyShareLink}
                className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors text-sm font-medium"
              >
                Copier
              </button>
            </div>
            <button 
              onClick={() => setShowShareModal(false)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal formulaire lead */}
      {showLeadForm && (
        <LeadFormModal
          results={results}
          mode={leadFormMode}
          onClose={() => setShowLeadForm(false)}
        />
      )}
    </div>
  );
}
