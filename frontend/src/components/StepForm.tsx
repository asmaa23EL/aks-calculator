'use client';

import { Step } from '@/types';
import Question from './Question';

interface StepFormProps {
  step: Step;
  answers: Record<string, any>;
  onAnswerChange: (questionId: string, value: any) => void;
  errors?: Record<string, string>;
}

export default function StepForm({ step, answers, onAnswerChange, errors }: StepFormProps) {
  return (
    <div className="card max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {step.title}
        </h2>
        <p className="text-gray-600">{step.description}</p>
      </div>

      <div className="space-y-6">
        {step.questions.map((question) => (
          <Question
            key={question.id}
            question={question}
            value={answers[question.id]}
            onChange={(value) => onAnswerChange(question.id, value)}
            error={errors?.[question.id]}
          />
        ))}
      </div>
    </div>
  );
}
