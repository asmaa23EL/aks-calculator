'use client';

import { useState } from 'react';
import { CalculationResults, LeadFormData } from '@/types';
import { OPTIONS_ROLE } from '@/constants';
import { buildApiUrl } from '@/utils/api';

interface LeadFormModalProps {
  results: CalculationResults;
  onClose: () => void;
  mode?: 'lead-only' | 'lead-and-download';
}

function getInitialLeadData(): LeadFormData {
  try {
    const raw = localStorage.getItem('leadData');
    if (!raw) {
      return {
        nom: '',
        prenom: '',
        societe: '',
        email: '',
        role: '',
        telephone: '',
        consentementRGPD: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<LeadFormData>;
    return {
      nom: typeof parsed.nom === 'string' ? parsed.nom : '',
      prenom: typeof parsed.prenom === 'string' ? parsed.prenom : '',
      societe: typeof parsed.societe === 'string' ? parsed.societe : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      role: typeof parsed.role === 'string' ? parsed.role : '',
      telephone: typeof parsed.telephone === 'string' ? parsed.telephone : '',
      consentementRGPD: Boolean(parsed.consentementRGPD),
    };
  } catch {
    return {
      nom: '',
      prenom: '',
      societe: '',
      email: '',
      role: '',
      telephone: '',
      consentementRGPD: false,
    };
  }
}

function downloadPdfFromBase64(pdfBase64: string, filename: string) {
  const binary = atob(pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Ouvre aussi le PDF dans un nouvel onglet pour contourner les blocages de telechargement auto.
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 10000);
}

async function downloadPdfFromApi(lead: LeadFormData, results: CalculationResults, fallbackFilename: string) {
  const response = await fetch(buildApiUrl('/api/generate-pdf'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lead,
      resultats: results,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const errorMessage = payload && typeof payload.error === 'string'
      ? payload.error
      : 'Generation PDF indisponible';
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error('PDF vide');
  }

  const contentDisposition = response.headers.get('Content-Disposition') || '';
  const matched = /filename="?([^\"]+)"?/i.exec(contentDisposition);
  const filename = matched?.[1] || fallbackFilename;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 10000);
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  return fallback;
}

export default function LeadFormModal({
  results,
  onClose,
  mode = 'lead-only',
}: LeadFormModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    ...getInitialLeadData(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pdfFilename, setPdfFilename] = useState(`rapport-roi-aks-${Date.now()}.pdf`);
  const [isRetryDownloading, setIsRetryDownloading] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est requis';
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
    if (!formData.societe.trim()) newErrors.societe = 'La société est requise';
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    if (!formData.role) newErrors.role = 'Le rôle est requis';
    if (!formData.consentementRGPD) {
      newErrors.consentementRGPD = 'Vous devez accepter la politique de confidentialité';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const requestBody = {
        lead: formData,
        results: results,
        answers: JSON.parse(localStorage.getItem('wizardAnswers') || 'null'),
        downloadPdf: mode === 'lead-and-download',
        timestamp: new Date().toISOString(),
      };

      let payload: {
        emailSent?: boolean;
        emailError?: string | null;
        pdfBase64?: string;
        pdfFilename?: string;
      } | null = null;

      const externalResponse = await fetch(buildApiUrl('/api/leads'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }).catch(() => null);

      if (externalResponse?.ok) {
        payload = (await externalResponse.json().catch(() => null)) as
          | {
              emailSent?: boolean;
              emailError?: string | null;
              pdfBase64?: string;
              pdfFilename?: string;
            }
          | null;
      } else {
        const fallbackResponse = await fetch('/api/submit-lead', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!fallbackResponse.ok) {
          const externalError = externalResponse
            ? await parseErrorMessage(externalResponse, 'Erreur lors de l\'envoi')
            : 'API principale indisponible';
          const fallbackError = await parseErrorMessage(fallbackResponse, 'Erreur lors de l\'envoi local');
          throw new Error(`${fallbackError} (${externalError})`);
        }

        payload = (await fallbackResponse.json().catch(() => null)) as
          | {
              emailSent?: boolean;
              emailError?: string | null;
              pdfBase64?: string;
              pdfFilename?: string;
            }
          | null;
      }

      {

        if (mode === 'lead-and-download') {
          const fallbackFilename = payload?.pdfFilename || `rapport-roi-aks-${Date.now()}.pdf`;
          setPdfFilename(fallbackFilename);

          if (payload?.pdfBase64) {
            setPdfDataUrl(`data:application/pdf;base64,${payload.pdfBase64}`);
            downloadPdfFromBase64(payload.pdfBase64, fallbackFilename);
          } else {
            await downloadPdfFromApi(formData, results, fallbackFilename);
          }
        }

        if (payload && payload.emailSent === false) {
          alert(
            payload.emailError
              ? `Votre demande est enregistree, mais l'email n'a pas pu etre envoye (${payload.emailError}).`
              : "Votre demande est enregistree, mais l'email n'a pas pu etre envoye."
          );
        }

        // Sauvegarder les données lead pour la génération PDF
        localStorage.setItem('leadData', JSON.stringify(formData));
        setIsSuccess(true);

        if (mode !== 'lead-and-download') {
          // Fermer automatiquement uniquement en mode "email uniquement".
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      const message = error instanceof Error && error.message
        ? error.message
        : 'Une erreur est survenue. Veuillez reessayer.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryDownload = async () => {
    setIsRetryDownloading(true);
    try {
      await downloadPdfFromApi(formData, results, pdfFilename);
    } catch (error) {
      console.error('Erreur telechargement manuel:', error);
      alert('Le telechargement du PDF a echoue. Veuillez reessayer.');
    } finally {
      setIsRetryDownloading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Merci !</h3>
          <p className="text-gray-600">
            {mode === 'lead-and-download'
              ? 'Votre PDF est en cours de telechargement et votre rapport est envoye par email.'
              : 'Votre rapport détaillé vous sera envoyé par email dans quelques instants.'}
          </p>
          {mode === 'lead-and-download' && (
            <>
              <button
                type="button"
                onClick={retryDownload}
                disabled={isRetryDownloading}
                className="mt-6 w-full btn-primary disabled:opacity-50"
              >
                {isRetryDownloading ? 'Telechargement en cours...' : 'Telecharger le PDF maintenant'}
              </button>
              {pdfDataUrl && (
                <a
                  href={pdfDataUrl}
                  download={pdfFilename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block w-full btn-secondary text-center"
                >
                  Ouvrir / telecharger le PDF
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full btn-secondary"
              >
                Fermer
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Recevez votre rapport détaillé
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            {mode === 'lead-and-download'
              ? 'Formulaire obligatoire avant telechargement du PDF.'
              : 'Remplissez ce formulaire pour recevoir votre analyse complète par email'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                className={`input-field ${errors.prenom ? 'border-red-500' : ''}`}
                placeholder="Jean"
              />
              {errors.prenom && (
                <p className="mt-1 text-sm text-red-600">{errors.prenom}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className={`input-field ${errors.nom ? 'border-red-500' : ''}`}
                placeholder="Dupont"
              />
              {errors.nom && (
                <p className="mt-1 text-sm text-red-600">{errors.nom}</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Société <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="societe"
              value={formData.societe}
              onChange={handleChange}
              className={`input-field ${errors.societe ? 'border-red-500' : ''}`}
              placeholder="Nom de votre entreprise"
            />
            {errors.societe && (
              <p className="mt-1 text-sm text-red-600">{errors.societe}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email professionnel <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                placeholder="jean.dupont@entreprise.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                className="input-field"
                placeholder="+33 6 12 34 56 78"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rôle <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`input-field ${errors.role ? 'border-red-500' : ''}`}
            >
              <option value="">Sélectionnez votre rôle</option>
              {OPTIONS_ROLE.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="flex items-start">
              <input
                type="checkbox"
                name="consentementRGPD"
                checked={formData.consentementRGPD}
                onChange={handleChange}
                className="mt-1 mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">
                J&apos;accepte que CloudDev Fusion utilise mes données pour m&apos;envoyer le rapport 
                et me contacter concernant mes besoins en migration cloud. 
                <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.consentementRGPD && (
              <p className="mt-1 text-sm text-red-600">{errors.consentementRGPD}</p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Envoi en cours...'
                : mode === 'lead-and-download'
                  ? 'Confirmer et telecharger le PDF'
                  : 'Recevoir le rapport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
