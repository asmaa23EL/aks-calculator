'use client';

import { Question as QuestionType } from '@/types';

interface QuestionProps {
  question: QuestionType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export default function Question({ question, value, onChange, error }: QuestionProps) {
  const renderInput = () => {
    switch (question.type) {
      case 'number':
      case 'percentage':
        return (
          <div className="relative">
            <input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
              placeholder={question.placeholder}
              min={question.min}
              max={question.max}
              className={`input-field ${error ? 'border-red-500' : ''}`}
            />
            {question.unit && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                {question.unit}
              </span>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div className="flex gap-4">
            {question.options?.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onChange(option.value)}
                className={`flex-1 py-3 px-6 rounded-lg border-2 font-medium transition-all ${
                  value === option.value
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-lg font-medium text-gray-900 mb-3">
        {question.text}
      </label>
      {renderInput()}
      {question.helpText && (
        <p className="mt-2 text-sm text-gray-500">{question.helpText}</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
