import { useState } from 'react';
import type { UploadStatus } from '../types';

interface UploadDocumentsProps {
  selectedDocuments: string[];
  uploadStatuses: Record<string, UploadStatus>;
  onUploadStatusChange: (statuses: Record<string, UploadStatus>) => void;
  onNext: () => void;
  onBack: () => void;
}

const mockDocuments = [
  { id: '1', name: 'Presupuesto general del estudio', type: 'Presupuesto', category: 'Presupuesto del estudio' },
  { id: '2', name: 'Cuestionario de salud general (SF-36)', type: 'Instrumento', category: 'Instrumentos del proyecto' },
  { id: '3', name: 'Cuestionario de calidad de vida', type: 'Instrumento', category: 'Instrumentos del proyecto' },
  { id: '4', name: 'Escala de evaluación clínica', type: 'Instrumento', category: 'Instrumentos del proyecto' },
  { id: '5', name: 'Formulario de consentimiento informado', type: 'Instrumento', category: 'Instrumentos del proyecto' },
  { id: '6', name: 'Ficha de recolección de datos', type: 'Instrumento', category: 'Instrumentos del proyecto' },
  { id: '7', name: 'Cuestionario de seguimiento', type: 'Instrumento', category: 'Instrumentos del proyecto' },
  { id: '8', name: 'Escala de dolor (EVA)', type: 'Instrumento', category: 'Instrumentos del proyecto' },
  { id: '9', name: 'Inventario de depresión de Beck', type: 'Instrumento', category: 'Instrumentos del proyecto' },
  { id: '10', name: 'Test de adherencia al tratamiento', type: 'Instrumento', category: 'Instrumentos del proyecto' },
  { id: '11', name: 'Registro de eventos adversos', type: 'Instrumento', category: 'Instrumentos del proyecto' },
];

interface FileUpload {
  name: string;
  uploaded: boolean;
}

export function UploadDocuments({
  selectedDocuments,
  uploadStatuses,
  onUploadStatusChange,
  onNext,
  onBack,
}: UploadDocumentsProps) {
  const [files, setFiles] = useState<Record<string, { controlChanges: FileUpload | null; finalVersion: FileUpload | null }>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const documents = mockDocuments.filter((doc) => selectedDocuments.includes(doc.id));

  const handleFileSelect = (docId: string, type: 'controlChanges' | 'finalVersion', fileName: string) => {
    setFiles(prev => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        [type]: { name: fileName, uploaded: true }
      }
    }));

    // Update upload status
    const newStatuses = { ...uploadStatuses };
    if (!newStatuses[docId]) {
      newStatuses[docId] = { controlChanges: false, finalVersion: false };
    }
    newStatuses[docId][type] = true;
    onUploadStatusChange(newStatuses);
  };

  const handleFileRemove = (docId: string, type: 'controlChanges' | 'finalVersion') => {
    setFiles(prev => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        [type]: null
      }
    }));

    // Update upload status
    const newStatuses = { ...uploadStatuses };
    if (newStatuses[docId]) {
      newStatuses[docId][type] = false;
      onUploadStatusChange(newStatuses);
    }
  };

  const getProgress = () => {
    const total = selectedDocuments.length;
    const completed = Object.values(uploadStatuses).filter(
      (status) => status.controlChanges && status.finalVersion
    ).length;
    const pending = total - completed;
    return { completed, total, pending, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const progress = getProgress();

  // Group documents by category
  const groupedDocuments = documents.reduce((acc, doc) => {
    const category = doc.category || doc.type;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  // Get instruments
  const instrumentos = groupedDocuments['Instrumentos del proyecto'] || [];

  // Filter by status
  const filteredInstrumentos = instrumentos.filter((doc) => {
    const status = uploadStatuses[doc.id];
    const isComplete = status?.controlChanges && status?.finalVersion;
    if (statusFilter === 'completed') return isComplete;
    if (statusFilter === 'pending') return !isComplete;
    return true;
  });

  const displayGroupedDocuments = {
    ...groupedDocuments,
    'Instrumentos del proyecto': filteredInstrumentos,
  };

  const canContinue = Object.keys(uploadStatuses).length === selectedDocuments.length &&
    Object.values(uploadStatuses).every((status) => status.controlChanges && status.finalVersion);

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Subir documentos modificados</h3>
        <p className="text-sm text-gray-600 m-0">Cargue el archivo con control de cambios y la versión final de cada documento</p>
      </div>

      {/* Information Box */}
      <div className="mb-4 border-l-4 border-amber-500 bg-amber-50 p-4 rounded">
        <p className="text-sm text-gray-700 m-0">
          Por cada documento cargue 2 versiones: con control de cambios activos y con control de cambios aceptados. Peso máximo: 200 MB.
        </p>
      </div>

      {/* Header Row */}
      <div className="grid grid-cols-[1.5fr_3fr_3fr] gap-4 mb-4 px-4">
        <div className="text-sm font-semibold text-gray-700 uppercase">Tipo archivo</div>
        <div className="text-sm font-semibold text-gray-700 uppercase">Archivo control de cambios</div>
        <div className="text-sm font-semibold text-gray-700 uppercase">
          Archivo versión final
          <div className="text-xs font-normal normal-case text-gray-500">(Con control de cambios aceptado)</div>
        </div>
      </div>

      {/* Grouped Documents */}
      {Object.entries(displayGroupedDocuments).map(([category, docs]) => {
        const isInstrumentos = category === 'Instrumentos del proyecto';

        return (
          <div key={category} className="mb-6">
            {/* Category Header */}
            <div className="bg-[#C41E3A] px-4 py-3 rounded-t">
              <h4 className="m-0 text-white text-base font-normal">{category}</h4>
            </div>

            {/* Filter buttons for Instrumentos */}
            {isInstrumentos && instrumentos.length > 0 && (
              <div className="bg-white px-4 py-3 border-x border-gray-300 flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded text-sm transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-[#C41E3A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos ({instrumentos.length})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-4 py-2 rounded text-sm transition-colors ${
                    statusFilter === 'completed'
                      ? 'bg-[#C41E3A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Completos ({instrumentos.filter(doc => {
                    const status = uploadStatuses[doc.id];
                    return status?.controlChanges && status?.finalVersion;
                  }).length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-4 py-2 rounded text-sm transition-colors ${
                    statusFilter === 'pending'
                      ? 'bg-[#C41E3A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pendientes ({instrumentos.filter(doc => {
                    const status = uploadStatuses[doc.id];
                    return !status?.controlChanges || !status?.finalVersion;
                  }).length})
                </button>
              </div>
            )}

            {/* Documents */}
            <div className="border-x border-b border-gray-300">
              {docs.length > 0 ? (
                <div className={isInstrumentos ? 'max-h-80 overflow-y-auto' : ''}><>
                  {docs.map((doc) => {
                    const docFiles = files[doc.id] || { controlChanges: null, finalVersion: null };
                    const status = uploadStatuses[doc.id] || { controlChanges: false, finalVersion: false };
                    const isComplete = status.controlChanges && status.finalVersion;
                    const isPending = !status.controlChanges || !status.finalVersion;

                    // Check if all documents in this category are complete
                    const allCategoryComplete = docs.every(d => {
                      const s = uploadStatuses[d.id];
                      return s?.controlChanges && s?.finalVersion;
                    });

                    return (
                      <div key={doc.id} className="grid grid-cols-[1.5fr_3fr_3fr] gap-4 p-4 border-b border-gray-200 last:border-b-0 bg-white">
                        {/* Document Name */}
                        <div className="flex items-start py-2">
                          <div className="text-gray-700 text-sm">{doc.name}</div>
                        </div>

                        {/* Control de Cambios Column */}
                        <div>
                          {docFiles.controlChanges ? (
                            allCategoryComplete ? (
                              <div className="bg-white border border-gray-300 rounded px-3 py-2">
                                <div className="text-sm text-[#C41E3A] font-medium mb-1 underline">
                                  {docFiles.controlChanges.name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleFileRemove(doc.id, 'controlChanges')}
                                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                                  >
                                    Eliminar
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => alert('Ver archivo: ' + docFiles.controlChanges?.name)}
                                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                                  >
                                    Ver
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-[#D4EDDA] border border-[#28A745] rounded px-3 py-2">
                                <svg className="w-4 h-4 text-[#28A745] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm text-[#155724] flex-1 truncate font-medium">{docFiles.controlChanges.name}</span>
                                <button
                                  onClick={() => handleFileRemove(doc.id, 'controlChanges')}
                                  className="text-gray-500 hover:text-red-600 flex-shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-2">
                              <label className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-300 rounded px-3 py-2 cursor-pointer hover:bg-gray-100">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-gray-500">Cargar archivo...</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(doc.id, 'controlChanges', file.name);
                                  }}
                                />
                              </label>
                              <button
                                onClick={() => handleFileSelect(doc.id, 'controlChanges', `${doc.name}_cc.docx`)}
                                className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm"
                              >
                                Subir
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Versión Final Column */}
                        <div>
                          {docFiles.finalVersion ? (
                            allCategoryComplete ? (
                              <div className="bg-white border border-gray-300 rounded px-3 py-2">
                                <div className="text-sm text-[#C41E3A] font-medium mb-1 underline">
                                  {docFiles.finalVersion.name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleFileRemove(doc.id, 'finalVersion')}
                                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                                  >
                                    Eliminar
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => alert('Ver archivo: ' + docFiles.finalVersion?.name)}
                                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                                  >
                                    Ver
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-[#D4EDDA] border border-[#28A745] rounded px-3 py-2">
                                <svg className="w-4 h-4 text-[#28A745] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm text-[#155724] flex-1 truncate font-medium">{docFiles.finalVersion.name}</span>
                                <button
                                  onClick={() => handleFileRemove(doc.id, 'finalVersion')}
                                  className="text-gray-500 hover:text-red-600 flex-shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-2">
                              {isPending && !docFiles.controlChanges ? (
                                <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-300 rounded px-3 py-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm text-gray-500">Cargar archivo...</span>
                                </div>
                              ) : (
                                <label className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-300 rounded px-3 py-2 cursor-pointer hover:bg-gray-100">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm text-gray-500">Cargar archivo...</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileSelect(doc.id, 'finalVersion', file.name);
                                    }}
                                  />
                                </label>
                              )}
                              <button
                                onClick={() => handleFileSelect(doc.id, 'finalVersion', `${doc.name}_final.docx`)}
                                className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm"
                              >
                                Subir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                </></div>
              ) : (
                <div className="py-8 text-center text-gray-500 bg-white">
                  No se encontraron documentos con el filtro seleccionado
                </div>
              )}
          </div>
        </div>
      );
      })}

      {/* Action Buttons */}
      <div className="flex justify-between gap-4 mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Volver
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
