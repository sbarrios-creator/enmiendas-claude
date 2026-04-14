import { useState } from 'react';
import type { Document } from '../types';
import { baseDocuments } from '../data/documents';
import { ConfirmDialog } from './ConfirmDialog';

interface SelectDocumentsProps {
  selectedDocuments: string[];
  onSelectDocuments: (ids: string[]) => void;
  newDocuments: Document[];
  onNewDocumentsChange: (docs: Document[]) => void;
  onNext: () => void;
}

const documentNameOptions = [
  'Consentimiento informado',
  'Asentimiento informado',
  'Protocolo de investigación',
  'Brochure del investigador',
  'Manual de procedimientos',
  'Formulario de recolección de datos',
  'Carta de aprobación institucional',
  'Declaración de confidencialidad',
  'Acuerdo de transferencia de material',
  'Plan de manejo de datos',
  'Otro',
];

interface DocumentSection {
  title: string;
  documents: Document[];
}


export function SelectDocuments({ selectedDocuments, onSelectDocuments, newDocuments, onNewDocumentsChange, onNext }: SelectDocumentsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({ name: '', file: null as File | null });

  // Confirm dialog state
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const openConfirm = (opts: Omit<typeof confirm, 'isOpen'>) =>
    setConfirm({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirm((c) => ({ ...c, isOpen: false }));

  // Lista completa = documentos base + nuevos agregados por el usuario
  const documents = [...baseDocuments, ...newDocuments];

  const handleModalSave = () => {
    if (!modalForm.name) return;
    const newDoc: Document = {
      id: Date.now().toString(),
      name: modalForm.name,
      type: 'Nuevo',
      status: 'Aprobado',
      version: '1',
    };
    onNewDocumentsChange([...newDocuments, newDoc]);
    setShowModal(false);
    setModalForm({ name: '', file: null });
  };

  const handleModalClose = () => {
    setShowModal(false);
    setModalForm({ name: '', file: null });
  };

  const handleToggleDocument = (id: string) => {
    if (selectedDocuments.includes(id)) {
      onSelectDocuments(selectedDocuments.filter((docId) => docId !== id));
    } else {
      onSelectDocuments([...selectedDocuments, id]);
    }
  };

  const handleToggleSection = (sectionDocs: Document[]) => {
    const sectionIds = sectionDocs.map((doc) => doc.id);
    const allSelected = sectionIds.every((id) => selectedDocuments.includes(id));

    if (allSelected) {
      onSelectDocuments(selectedDocuments.filter((id) => !sectionIds.includes(id)));
    } else {
      const newSelection = [...selectedDocuments];
      sectionIds.forEach((id) => {
        if (!newSelection.includes(id)) newSelection.push(id);
      });
      onSelectDocuments(newSelection);
    }
  };

  const handleSelectAll = () => {
    const allIds = documents.map((doc) => doc.id);
    const allSelected = allIds.every((id) => selectedDocuments.includes(id));
    if (allSelected) {
      onSelectDocuments([]);
    } else {
      onSelectDocuments(allIds);
    }
  };

  const PROYECTO_IDS = ['1'];
  const CONSENTIMIENTO_IDS = ['2'];
  const ASENTIMIENTO_IDS = ['3', '4'];

  const sections: DocumentSection[] = [
    {
      title: 'Presupuesto del estudio',
      documents: documents.filter((doc) => doc.type === 'Presupuesto'),
    },
    {
      title: 'Proyecto de investigación',
      documents: documents.filter((doc) => PROYECTO_IDS.includes(doc.id)),
    },
    {
      title: 'Consentimiento informado',
      documents: documents.filter((doc) => CONSENTIMIENTO_IDS.includes(doc.id)),
    },
    {
      title: 'Asentimientos',
      documents: documents.filter((doc) => ASENTIMIENTO_IDS.includes(doc.id)),
    },
    {
      title: 'Instrumentos del proyecto',
      documents: documents.filter(
        (doc) =>
          doc.type === 'Instrumento' &&
          !PROYECTO_IDS.includes(doc.id) &&
          !CONSENTIMIENTO_IDS.includes(doc.id) &&
          !ASENTIMIENTO_IDS.includes(doc.id)
      ),
    },
    {
      title: 'Documentos Nuevos',
      documents: documents.filter((doc) => doc.type === 'Nuevo'),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 m-0">Documentos aprobados y vigentes de la investigación</h3>
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {documents.every((doc) => selectedDocuments.includes(doc.id))
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </span>
          </button>
        </div>
        <p className="text-sm text-gray-600 m-0">
          A continuación, se enlistan los documentos aprobados y vigentes de su investigación. Seleccione los
          documentos que desea enmendar. Tenga en cuenta que si su enmienda incluye cambios en el presupuesto o
          instrumento(s), debe seleccionar también el proyecto de investigación.
        </p>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded">
        <p className="text-sm text-gray-700 m-0">
          En caso tenga dudas o problemas con el uso de la plataforma SIDISI, puede comunicarse al correo{' '}
          <a href="mailto:sidisi@oficinas-upch.pe" className="text-[#C41E3A] hover:underline">
            sidisi@oficinas-upch.pe
          </a>
        </p>
      </div>

      {/* Document Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const isInstrumentos = section.title === 'Instrumentos del proyecto';
          const isNuevos = section.title === 'Documentos Nuevos';

          const displayDocuments = isInstrumentos
            ? section.documents.filter((doc) =>
                doc.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
            : section.documents;

          if (displayDocuments.length === 0 && !isNuevos && !isInstrumentos) return null;

          return (
            <div key={section.title} className="border border-gray-300 rounded overflow-hidden mb-6">
              {/* Section Header */}
              <div className="bg-[#C41E3A] px-4 py-3 flex items-center justify-between">
                <h4 className="m-0 text-white text-base font-normal">{section.title}</h4>
                {section.title === 'Documentos Nuevos' && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#C41E3A] rounded hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Documentos
                  </button>
                )}
                {isInstrumentos && (
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Buscar instrumento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-1.5 pl-9 text-sm border border-gray-300 rounded bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <svg
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Section Table */}
              {displayDocuments.length > 0 ? (
                <div className={isInstrumentos ? 'max-h-72 overflow-y-auto' : ''}>
                  <table className="w-full">
                    <thead className="bg-gray-900 sticky top-0 z-10">
                      <tr>
                        {!isNuevos && <th className="px-4 py-3 text-left text-white text-xs font-medium uppercase tracking-wide w-32">REEMPLAZAR</th>}
                        <th className="px-4 py-3 text-left text-white text-xs font-medium uppercase tracking-wide">ARCHIVO</th>
                        <th className="px-4 py-3 text-center text-white text-xs font-medium uppercase tracking-wide w-28">VERSIÓN</th>
                        <th className="px-4 py-3 text-center text-white text-xs font-medium uppercase tracking-wide w-40">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {displayDocuments.map((doc, index) => {
                        const isSelected = selectedDocuments.includes(doc.id);
                        return (
                          <tr
                            key={doc.id}
                            className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100 transition-colors`}
                          >
                            {!isNuevos && (
                              <td className="px-4 py-3 border-t border-gray-200">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleDocument(doc.id)}
                                  className="w-4 h-4 text-[#C41E3A] rounded cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 border-t border-gray-200">
                              <span className="text-gray-700 text-sm">{doc.name}</span>
                            </td>
                            <td className="px-4 py-3 text-center border-t border-gray-200">
                              <span className="text-gray-700 text-sm">{doc.version}</span>
                            </td>
                            <td className="px-4 py-3 text-center border-t border-gray-200">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() =>
                                    openConfirm({
                                      title: 'Eliminar documento',
                                      message: `¿Desea eliminar "${doc.name}"? Esta acción no se puede deshacer.`,
                                      confirmLabel: 'Eliminar',
                                      variant: 'danger',
                                      onConfirm: () => {
                                        onNewDocumentsChange(newDocuments.filter((d) => d.id !== doc.id));
                                        closeConfirm();
                                      },
                                    })
                                  }
                                  className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                  title="Eliminar"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                                <button
                                  className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  title="Descargar"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white py-8 text-center text-gray-500">
                  {isInstrumentos && searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No se encontraron resultados'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedDocuments.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-900">
                <span className="font-medium">{selectedDocuments.length}</span>{' '}
                {selectedDocuments.length === 1 ? 'documento seleccionado' : 'documentos seleccionados'} para enmendar
              </span>
            </div>
            <button
              onClick={() =>
                openConfirm({
                  title: 'Limpiar selección',
                  message: '¿Desea deseleccionar todos los documentos?',
                  confirmLabel: 'Limpiar',
                  variant: 'warning',
                  onConfirm: () => { onSelectDocuments([]); closeConfirm(); },
                })
              }
              className="text-sm text-blue-700 hover:text-blue-900 underline"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={() =>
            openConfirm({
              title: 'Continuar al paso 2',
              message: `Ha seleccionado ${selectedDocuments.length} ${selectedDocuments.length === 1 ? 'documento' : 'documentos'}. ¿Desea continuar?`,
              confirmLabel: 'Siguiente',
              variant: 'primary',
              onConfirm: () => { closeConfirm(); onNext(); },
            })
          }
          disabled={selectedDocuments.length === 0}
          className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <span>Siguiente</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Modal: Agregar Documento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleModalClose} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 text-base m-0">Agregar Documento</h4>
              <button onClick={handleModalClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">Tipo de documento <span className="text-[#C41E3A]">*</span></label>
                <select
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
                >
                  <option value="">Seleccione un tipo de documento</option>
                  {documentNameOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">Archivo</label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#C41E3A] transition-colors cursor-pointer"
                  onClick={() => document.getElementById('modal-file-input')?.click()}
                >
                  {modalForm.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-gray-700 m-0">{modalForm.file.name}</p>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-500 m-0">Arrastra un archivo aquí o <span className="text-[#C41E3A] font-medium">haz clic para seleccionar</span></p>
                    </>
                  )}
                </div>
                <input
                  id="modal-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => setModalForm({ ...modalForm, file: e.target.files?.[0] ?? null })}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleModalClose}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={handleModalSave}
                disabled={!modalForm.name.trim()}
                className="flex-1 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        variant={confirm.variant}
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
