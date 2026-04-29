import { Fragment } from 'react';

interface WizardStepsProps {
  currentStep: number;
}

const steps = [
  { number: 1, title: 'Seleccionar Documentos' },
  { number: 2, title: 'Redacción de Cambio' },
  { number: 3, title: 'Resumen' },
];

export function WizardSteps({ currentStep }: WizardStepsProps) {
  return (
    <div className="flex items-center mx-auto w-full">
      {steps.map((step, index) => (
        <Fragment key={step.number}>
          {/* Círculo + etiqueta */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm ${
                step.number === currentStep
                  ? 'bg-[#C41E3A] text-white shadow scale-110'
                  : step.number < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.number < currentStep ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{step.number}</span>
              )}
            </div>
            <p className={`mt-1.5 m-0 text-center text-xs w-24 ${step.number === currentStep ? 'text-[#C41E3A] font-semibold' : 'text-gray-500'}`}>
              {step.title}
            </p>
          </div>

          {/* Línea conectora entre pasos */}
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-px mx-2 mb-5 transition-all ${
                step.number < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
