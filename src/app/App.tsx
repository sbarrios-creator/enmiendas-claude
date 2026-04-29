import { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { WizardSteps } from './components/WizardSteps';
import { SelectDocuments } from './components/SelectDocuments';
import { DefineChanges } from './components/DefineChanges';
import { Summary } from './components/Summary';
import type { Document, Change, UploadStatus, Step3Data } from './types';

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [newDocuments, setNewDocuments] = useState<Document[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
  const [changes, setChanges] = useState<Change[]>([]);
  const [step3Data, setStep3Data] = useState<Step3Data>({
    modifiesTitleOrSummary: 'NO',
    titleSummaryData: { title: '', summary: '' },
    modifiesOperativeUnits: 'NO',
    operativeUnitsData: { internalUnits: [], externalUnits: [] },
    modifiesResearchers: 'NO',
    researchers: [],
  });

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFinish = () => {
    alert('Enmiendas generadas exitosamente');
    setCurrentStep(1);
    setSelectedDocuments([]);
    setNewDocuments([]);
    setUploadStatuses({});
    setChanges([]);
    setStep3Data({
      modifiesTitleOrSummary: 'NO',
      titleSummaryData: { title: '', summary: '' },
      modifiesOperativeUnits: 'NO',
      operativeUnitsData: { internalUnits: [], externalUnits: [] },
      modifiesResearchers: 'NO',
      researchers: [],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col">
        <div className="max-w-screen-2xl mx-auto px-20 py-6 w-full flex flex-col gap-6">

          {/* Breadcrumb + título + wizard */}
          <div>
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
            <WizardSteps currentStep={currentStep} />
          </div>

          {/* Contenido del paso activo */}
          <div className={`bg-white shadow-sm border border-gray-200 rounded-sm p-4`}>
            {currentStep === 1 && (
              <SelectDocuments
                selectedDocuments={selectedDocuments}
                onSelectDocuments={setSelectedDocuments}
                newDocuments={newDocuments}
                onNewDocumentsChange={setNewDocuments}
                uploadStatuses={uploadStatuses}
                onUploadStatusChange={setUploadStatuses}
                onNext={handleNext}
              />
            )}

            {currentStep === 2 && (
              <DefineChanges
                selectedDocuments={selectedDocuments}
                newDocuments={newDocuments}
                changes={changes}
                onChangesUpdate={setChanges}
                onSelectedDocumentsUpdate={setSelectedDocuments}
                step3Data={step3Data}
                onStep3DataChange={setStep3Data}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 3 && (
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
