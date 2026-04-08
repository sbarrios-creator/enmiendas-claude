interface WizardStepsProps {
  currentStep: number;
}

const steps = [
  { number: 1, title: 'Seleccionar Documentos', description: 'Elija los documentos a modificar' },
  { number: 2, title: 'Subir Documentos', description: 'Cargue los archivos necesarios' },
  { number: 3, title: 'Redacción de Cambio', description: 'Defina las modificaciones' },
  { number: 4, title: 'Resumen', description: 'Revise y confirme los cambios' },
];

export function WizardSteps({ currentStep }: WizardStepsProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.number} className="flex-1 flex items-center">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                step.number === currentStep
                  ? 'bg-[#C41E3A] text-white shadow-lg scale-110'
                  : step.number < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.number < currentStep ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{step.number}</span>
              )}
            </div>
            <div className="mt-3 text-center">
              <p className={`m-0 ${step.number === currentStep ? 'text-[#C41E3A]' : 'text-gray-700'}`}>
                {step.title}
              </p>
              <p className="text-sm text-gray-500 m-0">{step.description}</p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-1 flex-1 mx-4 mb-12 transition-all ${
                step.number < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
