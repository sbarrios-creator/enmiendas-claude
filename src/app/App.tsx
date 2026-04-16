import { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { WizardSteps } from './components/WizardSteps';
import { SelectDocuments } from './components/SelectDocuments';
import { UploadDocuments } from './components/UploadDocuments';
import { DefineChanges } from './components/DefineChanges';
import { Summary } from './components/Summary';
import type { Document, Change, UploadStatus, Step3Data } from './types';

const initialNewDocuments: Document[] = [];

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [newDocuments, setNewDocuments] = useState<Document[]>(initialNewDocuments);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
  const [changes, setChanges] = useState<Change[]>([]);
  const [step3Data, setStep3Data] = useState<Step3Data>({
    modifiesTitleOrSummary: null,
    titleSummaryData: { title: '', summary: '' },
    modifiesOperativeUnits: null,
    operativeUnitsData: { internalUnits: [], externalUnits: [] },
    modifiesResearchers: null,
    researchers: [],
  });

  const canAdvanceFromStep2 =
    selectedDocuments.length > 0 &&
    selectedDocuments.every(
      (id) => uploadStatuses[id]?.controlChanges && uploadStatuses[id]?.finalVersion
    );

  const handleNext = () => {
    if (currentStep === 2 && !canAdvanceFromStep2) return;
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    alert('Enmiendas generadas exitosamente');
    // Reset wizard
    setCurrentStep(1);
    setSelectedDocuments([]);
    setNewDocuments(initialNewDocuments);
    setUploadStatuses({});
    setChanges([]);
    setStep3Data({
      modifiesTitleOrSummary: null,
      titleSummaryData: { title: '', summary: '' },
      modifiesOperativeUnits: null,
      operativeUnitsData: { internalUnits: [], externalUnits: [] },
      modifiesResearchers: null,
      researchers: [],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col">
        {/* Cabecera y pasos del wizard — siempre con margen lateral */}
        <div className="max-w-screen-2xl mx-auto px-6 pt-6 w-full">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <span>Asistente de registro de enmienda FI para proyectos que involucren seres humanos</span>
              <span>»</span>
              <span className="text-[#C41E3A]">SIDISI N° 212942</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="m-0">Gestión de Enmiendas</h1>
              <button className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors flex items-center gap-2 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Salir
              </button>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded">
              <span className="text-amber-800">Observaciones</span>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-sm">0</span>
            </div>
          </div>

          <WizardSteps currentStep={currentStep} />
        </div>

        {/* Contenido del paso */}
        <div className={currentStep === 1 ? 'max-w-screen-2xl mx-auto px-6 pb-6 w-full' : 'w-full pb-6'}>
          <div className={`bg-white shadow-sm border border-gray-200 mt-6 ${currentStep === 1 ? 'rounded-lg p-8' : 'p-8'}`}>
            {currentStep === 1 && (
              <SelectDocuments
                selectedDocuments={selectedDocuments}
                onSelectDocuments={setSelectedDocuments}
                newDocuments={newDocuments}
                onNewDocumentsChange={setNewDocuments}
                onNext={handleNext}
              />
            )}

            {currentStep === 2 && (
              <UploadDocuments
                selectedDocuments={selectedDocuments}
                newDocuments={newDocuments}
                uploadStatuses={uploadStatuses}
                onUploadStatusChange={setUploadStatuses}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <DefineChanges
                selectedDocuments={selectedDocuments}
                newDocuments={newDocuments}
                changes={changes}
                onChangesUpdate={setChanges}
                step3Data={step3Data}
                onStep3DataChange={setStep3Data}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 4 && (
              <Summary
                selectedDocuments={selectedDocuments}
                newDocuments={newDocuments}
                changes={changes}
                uploadStatuses={uploadStatuses}
                step3Data={step3Data}
                onFinish={handleFinish}
                onBack={handleBack}
              />
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
