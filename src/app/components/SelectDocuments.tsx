import { useState } from 'react';
import type { Document } from '../types';

interface SelectDocumentsProps {
  selectedDocuments: string[];
  onSelectDocuments: (ids: string[]) => void;
  onNext: () => void;
}

interface DocumentSection {
  title: string;
  documents: Document[];
}

const mockDocuments: Document[] = [
  { id: '1', name: 'Presupuesto general del estudio', type: 'Presupuesto', status: 'Aprobado', version: '1' },
  { id: '2', name: 'Cuestionario de salud general (SF-36)', type: 'Instrumento', status: 'Aprobado', version: '1' },
  { id: '3', name: 'Cuestionario de calidad de vida', type: 'Instrumento', status: 'Aprobado', version: '3' },
  { id: '4', name: 'Escala de evaluación clínica', type: 'Instrumento', status: 'Aprobado', version: '2' },
  { id: '5', name: 'Formulario de consentimiento informado', type: 'Instrumento', status: 'Aprobado', version: '1' },
  { id: '6', name: 'Ficha de recolección de datos', type: 'Instrumento', status: 'Aprobado', version: '1' },
  { id: '7', name: 'Cuestionario de seguimiento', type: 'Instrumento', status: 'Aprobado', version: '2' },
  { id: '8', name: 'Escala de dolor (EVA)', type: 'Instrumento', status: 'Aprobado', version: '1' },
  { id: '9', name: 'Inventario de depresión de Beck', type: 'Instrumento', status: 'Aprobado', version: '1' },
  { id: '10', name: 'Test de adherencia al tratamiento', type: 'Instrumento', status: 'Aprobado', version: '1' },
  { id: '11', name: 'Registro de eventos adversos', type: 'Instrumento', status: 'Aprobado', version: '2' },
];

export function SelectDocuments({ selectedDocuments, onSelectDocuments, onNext }: SelectDocumentsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 5;

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
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      onSelectDocuments(newSelection);
    }
  };

  const handleSelectAll = () => {
    const allIds = mockDocuments.map((doc) => doc.id);
    const allSelected = allIds.every((id) => selectedDocuments.includes(id));

    if (allSelected) {
      onSelectDocuments([]);
    } else {
      onSelectDocuments(allIds);
    }
  };

  // Group documents by type
  const sections: DocumentSection[] = [
    {
      title: 'Presupuesto del estudio',
      documents: mockDocuments.filter((doc) => doc.type === 'Presupuesto'),
    },
    {
      title: 'Instrumentos del proyecto',
      documents: mockDocuments.filter((doc) => doc.type === 'Instrumento'),
    },
    {
      title: 'Documentos Nuevos',
      documents: mockDocuments.filter((doc) => doc.type === 'Nuevo'),
    },
  ];

  // Filter documents for "Instrumentos del proyecto" based on search term
  const filteredInstrumentos = sections
    .find((s) => s.title === 'Instrumentos del proyecto')
    ?.documents.filter((doc) => doc.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  // Calculate pagination for "Instrumentos del proyecto"
  const totalPages = Math.ceil(filteredInstrumentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInstrumentos = filteredInstrumentos.slice(startIndex, endIndex);

  // Update sections with paginated data
  const displaySections: DocumentSection[] = sections.map((section) => {
    if (section.title === 'Instrumentos del proyecto') {
      return { ...section, documents: paginatedInstrumentos };
    }
    return section;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="m-0">Documentos aprobados y vigentes de la investigación</h3>
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {mockDocuments.every((doc) => selectedDocuments.includes(doc.id))
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </span>
          </button>
        </div>
        <p className="text-gray-600 m-0">
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
        {displaySections.map((section) => {
          const sectionIds = section.documents.map((doc) => doc.id);
          const allSelected = sectionIds.every((id) => selectedDocuments.includes(id));
          const someSelected = sectionIds.some((id) => selectedDocuments.includes(id));
          const isInstrumentos = section.title === 'Instrumentos del proyecto';

          return (
            <div key={section.title} className="border border-gray-300 rounded overflow-hidden mb-6">
              {/* Section Header */}
              <div className="bg-[#C41E3A] px-4 py-3">
                <h4 className="m-0 text-white text-base font-normal">{section.title}</h4>
              </div>

              {/* Search bar for Instrumentos */}
              {isInstrumentos && (
                <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-end">
                  <div className="relative w-80">
                    <input
                      type="text"
                      placeholder="Buscar instrumento..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                    />
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {/* Section Table */}
              {section.documents.length > 0 ? (
                <>
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-white text-xs font-medium uppercase tracking-wide w-32">
                          REEMPLAZAR
                        </th>
                        <th className="px-4 py-3 text-left text-white text-xs font-medium uppercase tracking-wide">
                          ARCHIVO
                        </th>
                        <th className="px-4 py-3 text-center text-white text-xs font-medium uppercase tracking-wide w-28">
                          VERSIÓN
                        </th>
                        <th className="px-4 py-3 text-center text-white text-xs font-medium uppercase tracking-wide w-40">
                          ACCIONES
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {section.documents.map((doc, index) => {
                        const isSelected = selectedDocuments.includes(doc.id);

                        return (
                          <tr
                            key={doc.id}
                            className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100 transition-colors`}
                          >
                            <td className="px-4 py-3 border-t border-gray-200">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleDocument(doc.id)}
                                className="w-4 h-4 text-[#C41E3A] rounded cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 border-t border-gray-200">
                              <span className="text-gray-700 text-sm">
                                {doc.name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center border-t border-gray-200">
                              <span className="text-gray-700 text-sm">{doc.version}</span>
                            </td>
                            <td className="px-4 py-3 text-center border-t border-gray-200">
                              <div className="flex gap-2 justify-center">
                                <button
                                  className="w-8 h-8 flex items-center justify-center bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors"
                                  title="Eliminar"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                                <button
                                  className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  title="Descargar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

                  {/* Pagination for Instrumentos */}
                  {isInstrumentos && filteredInstrumentos.length > 0 && (
                    <div className="bg-white px-4 py-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        {/* Showing info */}
                        <div className="text-sm text-gray-700">
                          Mostrando {startIndex + 1}–{Math.min(endIndex, filteredInstrumentos.length)} de{' '}
                          {filteredInstrumentos.length} registros
                        </div>

                        {/* Pagination controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                          >
                            Anterior
                          </button>

                          <div className="flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded text-sm transition-colors ${
                                  page === currentPage
                                    ? 'bg-[#C41E3A] text-white font-medium'
                                    : 'border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white">
                  <table className="w-full">
                    <thead className="bg-gray-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">TIPO ARCHIVO</th>
                        <th className="px-4 py-3 text-left">NOMBRE</th>
                        <th className="px-4 py-3 text-left">ACCIONES</th>
                      </tr>
                    </thead>
                  </table>
                  <div className="py-8 text-center text-gray-500">
                    {isInstrumentos && searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No se encontraron resultados'}
                  </div>
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-blue-900">
                <span className="font-medium">{selectedDocuments.length}</span>{' '}
                {selectedDocuments.length === 1 ? 'documento seleccionado' : 'documentos seleccionados'} para enmendar
              </span>
            </div>
            <button
              onClick={() => onSelectDocuments([])}
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
          onClick={onNext}
          disabled={selectedDocuments.length === 0}
          className="px-8 py-3 bg-[#C41E3A] text-white rounded-lg hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <span>Siguiente</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
