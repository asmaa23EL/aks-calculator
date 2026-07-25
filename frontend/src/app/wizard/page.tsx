'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WIZARD_STEPS } from '@/data/questions';
import { FormAnswers } from '@/types';
import StepForm from '@/components/StepForm';
import ProgressBar from '@/components/ProgressBar';

export default function WizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Partial<FormAnswers>>({
    infrastructure: {} as any,
    deploiements: {} as any,
    incidents: {} as any,
    securite: {} as any,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentStepData = WIZARD_STEPS.find(s => s.id === currentStep)!;

  const handleAnswerChange = (questionId: string, value: any) => {
    const stepKey = getStepKey(currentStep);
    setAnswers(prev => ({
      ...prev,
      [stepKey]: {
        ...prev[stepKey],
        [questionId]: value,
      },
    }));
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[questionId];
      return newErrors;
    });
  };

  const getStepKey = (step: number): keyof FormAnswers => {
    switch (step) {
      case 1: return 'infrastructure';
      case 2: return 'deploiements';
      case 3: return 'incidents';
      case 4: return 'securite';
      default: return 'infrastructure';
    }
  };

  const validateCurrentStep = (): boolean => {
    const stepKey = getStepKey(currentStep);
    const stepAnswers = (answers[stepKey] || {}) as Record<string, unknown>;
    const newErrors: Record<string, string> = {};

    currentStepData.questions.forEach(question => {
      const value = stepAnswers[question.id];
      if (value === undefined || value === '' || value === null) {
        newErrors[question.id] = 'Ce champ est requis';
      } else if (question.type === 'number' || question.type === 'percentage') {
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
          newErrors[question.id] = 'La valeur doit être un nombre';
          return;
        }
        if (question.min !== undefined && numericValue < question.min) {
          newErrors[question.id] = `La valeur doit être supérieure ou égale à ${question.min}`;
        }
        if (question.max !== undefined && numericValue > question.max) {
          newErrors[question.id] = `La valeur doit être inférieure ou égale à ${question.max}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Stocker les réponses et naviguer vers les résultats
      localStorage.setItem('wizardAnswers', JSON.stringify(answers));
      router.push('/resultats');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const stepKey = getStepKey(currentStep);
  const currentAnswers = (answers[stepKey] || {}) as Record<string, unknown>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <ProgressBar currentStep={currentStep} totalSteps={WIZARD_STEPS.length} />

      <StepForm
        step={currentStepData}
        answers={currentAnswers}
        onAnswerChange={handleAnswerChange}
        errors={errors}
      />

      <div className="flex justify-between mt-8 max-w-3xl mx-auto">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>

        <button
          onClick={handleNext}
          className="btn-primary"
        >
          {currentStep === WIZARD_STEPS.length ? 'Voir les résultats' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
