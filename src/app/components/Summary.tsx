import { useState } from 'react';
import type { Change, UploadStatus, ImpactAnalysis, Step3Data } from '../types';

interface SummaryProps {
  selectedDocuments: string[];
  changes: Change[];
  uploadStatuses: Record<string, UploadStatus>;
  step3Data: Step3Data;
  onFinish: () => void;
  onBack: () => void;
}

const mockDocuments = [
  { id: '1', name: 'Presupuesto general del estudio', type: 'Presupuesto', status: 'Aprobado' },
  { id: '2', name: 'Cuestionario de salud general (SF-36)', type: 'Instrumento', status: 'Aprobado' },
  { id: '3', name: 'Cuestionario de calidad de vida', type: 'Instrumento', status: 'Aprobado' },
  { id: '4', name: 'Escala de evaluación clínica', type: 'Instrumento', status: 'Firmado' },
  { id: '5', name: 'Formulario de consentimiento informado', type: 'Instrumento', status: 'Aprobado' },
];

const FIELD_GROUPS: { label: string; fields: string[] }[] = [
  { label: 'Información General', fields: ['Nombre del estudio', 'Número de protocolo', 'Vigencia', 'Institución'] },
  { label: 'Equipo', fields: ['Investigador principal', 'Contacto de emergencia'] },
];

function getGroupLabel(field: string): string {
  for (const g of FIELD_GROUPS) {
    if (g.fields.includes(field)) return g.label;
  }
  return 'Otros';
}

export function Summary({ selectedDocuments, changes, uploadStatuses, step3Data, onFinish, onBack }: SummaryProps) {
  const documents = mockDocuments.filter((doc) => selectedDocuments.includes(doc.id));

  // Documentos nuevos
  const [newDocs, setNewDocs] = useState<Array<{ id: string; fileType: string; name: string }>>([]);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ fileType: '', name: '' });

  const handleAddDoc = () => {
    if (!newDocForm.fileType || !newDocForm.name) return;
    setNewDocs([...newDocs, { id: Date.now().toString(), ...newDocForm }]);
    setNewDocForm({ fileType: '', name: '' });
    setShowAddDoc(false);
  };

  const handleRemoveDoc = (id: string) => setNewDocs(newDocs.filter((d) => d.id !== id));

  // Comentarios adicionales
  const [comments, setComments] = useState('');

  // Accordion state: all groups open by default
  const allGroupLabels = Array.from(new Set(changes.map((c) => getGroupLabel(c.field))));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(allGroupLabels.map((l) => [l, true]))
  );

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  // Search & modals
  const [searchChanges, setSearchChanges] = useState('');
  const [expandedText, setExpandedText] = useState<{ label: string; text: string } | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<string[] | null>(null);

  const matchesSearch = (c: (typeof changes)[0]) => {
    if (!searchChanges) return true;
    const q = searchChanges.toLowerCase();
    return (
      c.field.toLowerCase().includes(q) ||
      c.oldValue.toLowerCase().includes(q) ||
      c.newValue.toLowerCase().includes(q) ||
      c.justification.toLowerCase().includes(q)
    );
  };

  // Group changes by section
  const groupedChanges = FIELD_GROUPS.map((g) => ({
    label: g.label,
    items: changes.filter((c) => g.fields.includes(c.field) && matchesSearch(c)),
  }))
    .concat([{ label: 'Otros', items: changes.filter((c) => getGroupLabel(c.field) === 'Otros' && matchesSearch(c)) }])
    .filter((g) => g.items.length > 0);

  // Analyze impact for each document
  const analyzeImpact = (docId: string): ImpactAnalysis => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return { documentId: docId, action: 'blocked', reason: 'Documento no encontrado' };

    // Blocked: signed documents
    if (doc.status === 'Firmado') {
      return {
        documentId: docId,
        action: 'blocked',
        reason: 'Documento firmado - no se puede modificar',
      };
    }

    // Check if changes apply to this document
    const applicableChanges = changes.filter((change) => change.appliesTo.includes(docId));

    // Review required: draft documents
    if (doc.status === 'Borrador') {
      return {
        documentId: docId,
        action: 'review',
        reason: 'Documento en borrador - requiere revisión manual',
      };
    }

    // Automatic: approved documents with global changes
    if (doc.status === 'Aprobado' && applicableChanges.length > 0) {
      const hasGlobalChange = applicableChanges.some((change) => change.isGlobal);
      if (hasGlobalChange) {
        return {
          documentId: docId,
          action: 'automatic',
          reason: 'Cambios globales aplicables - actualización automática',
        };
      }
    }

    // Version: approved documents with specific changes
    return {
      documentId: docId,
      action: 'version',
      reason: 'Generar nueva versión con cambios específicos',
    };
  };

  const impacts = selectedDocuments.map((docId) => analyzeImpact(docId));

  const stats = {
    automatic: impacts.filter((i) => i.action === 'automatic').length,
    review: impacts.filter((i) => i.action === 'review').length,
    version: impacts.filter((i) => i.action === 'version').length,
    blocked: impacts.filter((i) => i.action === 'blocked').length,
  };

  const getActionBadge = (action: ImpactAnalysis['action']) => {
    const styles = {
      automatic: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Automático' },
      review: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'Requiere revisión' },
      version: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Nueva versión' },
      blocked: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Bloqueado' },
    };
    const style = styles[action];
    return (
      <span className={`px-3 py-1 rounded-full text-sm ${style.bg} ${style.text} border ${style.border}`}>
        {style.label}
      </span>
    );
  };

  const getActionIcon = (action: ImpactAnalysis['action']) => {
    switch (action) {
      case 'automatic':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'review':
        return (
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'version':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'blocked':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Resumen de enmiendas</h3>
        <p className="text-sm text-gray-600 m-0">Revise el impacto de los cambios antes de confirmar</p>
      </div>

      {/* Step 3 Responses */}
      <div className="mb-6 space-y-3">
        <h4 className="mb-3">Cambios declarados</h4>

        {/* Título y Resumen */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="font-medium text-gray-800">Título y Resumen</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              step3Data.modifiesTitleOrSummary === 'SI'
                ? 'bg-[#C41E3A] text-white'
                : step3Data.modifiesTitleOrSummary === 'NO'
                ? 'bg-gray-200 text-gray-600'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {step3Data.modifiesTitleOrSummary ?? 'Sin respuesta'}
            </span>
          </div>
          {step3Data.modifiesTitleOrSummary === 'SI' && (
            <div className="p-4 space-y-3 bg-white">
              {step3Data.titleSummaryData.title && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nuevo título</p>
                  <p className="text-sm text-gray-900">{step3Data.titleSummaryData.title}</p>
                </div>
              )}
              {step3Data.titleSummaryData.summary && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nuevo resumen</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{step3Data.titleSummaryData.summary}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Unidades Operativas */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="font-medium text-gray-800">Unidades Operativas</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              step3Data.modifiesOperativeUnits === 'SI'
                ? 'bg-[#C41E3A] text-white'
                : step3Data.modifiesOperativeUnits === 'NO'
                ? 'bg-gray-200 text-gray-600'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {step3Data.modifiesOperativeUnits ?? 'Sin respuesta'}
            </span>
          </div>
          {step3Data.modifiesOperativeUnits === 'SI' && step3Data.operativeUnitsData.units && (
            <div className="p-4 bg-white">
              <p className="text-xs text-gray-500 mb-1">Detalle</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{step3Data.operativeUnitsData.units}</p>
            </div>
          )}
        </div>

        {/* Equipo de Investigación */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="font-medium text-gray-800">Equipo de Investigación</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              step3Data.modifiesResearchers === 'SI'
                ? 'bg-[#C41E3A] text-white'
                : step3Data.modifiesResearchers === 'NO'
                ? 'bg-gray-200 text-gray-600'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {step3Data.modifiesResearchers ?? 'Sin respuesta'}
            </span>
          </div>
          {step3Data.modifiesResearchers === 'SI' && step3Data.researchers.length > 0 && (
            <div className="bg-white overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Correo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rol actual</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rol propuesto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Justificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {step3Data.researchers.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-900 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.email}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.currentRole || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.proposedRole || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          r.changeType === 'add'
                            ? 'bg-green-100 text-green-800'
                            : r.changeType === 'remove'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {r.changeType === 'add' ? 'Agregar' : r.changeType === 'remove' ? 'Retirar' : 'Modificar'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.justification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Changes Summary */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="m-0">Cambios a aplicar en otros Documentos</h4>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-200">
            {changes.length} {changes.length === 1 ? 'cambio' : 'cambios'}
          </span>
        </div>

        {changes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200 text-sm">
            No se registraron cambios en documentos
          </div>
        ) : (
          <>
            {/* Buscador */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Buscar por campo, antes, después o justificación..."
                value={searchChanges}
                onChange={(e) => setSearchChanges(e.target.value)}
                className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchChanges && (
                <button
                  onClick={() => setSearchChanges('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {groupedChanges.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                No se encontraron resultados para la búsqueda.
              </div>
            ) : (
              <div className="space-y-3">
                {groupedChanges.map(({ label, items }) => {
                  const isOpen = searchChanges ? true : (openGroups[label] ?? true);
                  return (
                    <div key={label} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Accordion header */}
                      <button
                        onClick={() => !searchChanges && toggleGroup(label)}
                        className={`w-full flex items-center justify-between px-4 py-3 bg-gray-50 transition-colors text-left ${!searchChanges ? 'hover:bg-gray-100' : 'cursor-default'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{label}</span>
                          <span className="px-2 py-0.5 bg-white border border-gray-300 text-gray-600 rounded-full text-xs font-medium">
                            {items.length}
                          </span>
                        </div>
                        {!searchChanges && (
                          <svg
                            className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>

                      {/* Accordion body */}
                      {isOpen && (
                        <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10">
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Campo</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Antes</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Después</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Justificación</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos afectados</th>
                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Alcance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {items.map((change) => {
                                const affectedDocs = change.isGlobal
                                  ? documents
                                  : documents.filter((d) => change.appliesTo.includes(d.id));
                                return (
                                  <tr key={change.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-gray-900">{change.field}</td>

                                    {/* Antes */}
                                    <td className="px-4 py-3">
                                      {change.oldValue ? (
                                        <button onClick={() => setExpandedText({ label: 'Valor anterior', text: change.oldValue })} className="text-left text-xs" title="Ver completo">
                                          <span className="text-gray-400 line-through line-clamp-2">{change.oldValue}</span>
                                        </button>
                                      ) : (
                                        <span className="text-xs text-gray-300 italic">—</span>
                                      )}
                                    </td>

                                    {/* Después */}
                                    <td className="px-4 py-3">
                                      <button onClick={() => setExpandedText({ label: 'Valor nuevo', text: change.newValue })} className="text-left text-xs" title="Ver completo">
                                        <span className="font-semibold text-green-700 line-clamp-2">{change.newValue}</span>
                                      </button>
                                    </td>

                                    {/* Justificación */}
                                    <td className="px-4 py-3 text-gray-600">
                                      {change.justification ? (
                                        <button onClick={() => setExpandedText({ label: 'Justificación', text: change.justification })} className="text-left text-xs" title="Ver completo">
                                          <span className="line-clamp-2">{change.justification}</span>
                                        </button>
                                      ) : (
                                        <span className="text-xs text-gray-300">—</span>
                                      )}
                                    </td>

                                    {/* Documentos afectados */}
                                    <td className="px-4 py-3">
                                      {change.isGlobal ? (
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                                          Todos los documentos
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => setExpandedDocs(affectedDocs.map((d) => d.name))}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200 hover:bg-gray-200 transition-colors"
                                        >
                                          {affectedDocs.length} {affectedDocs.length === 1 ? 'documento' : 'documentos'}
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        </button>
                                      )}
                                    </td>

                                    {/* Alcance */}
                                    <td className="px-4 py-3 text-center">
                                      {change.isGlobal ? (
                                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                                          Global
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                                          Específico
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: texto completo */}
      {expandedText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setExpandedText(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 m-0">{expandedText.label}</h4>
              <button onClick={() => setExpandedText(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap m-0">{expandedText.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: documentos afectados */}
      {expandedDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setExpandedDocs(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 m-0">Documentos afectados ({expandedDocs.length})</h4>
              <button onClick={() => setExpandedDocs(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
              {expandedDocs.map((name, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}


{stats.review > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-amber-900 m-0 mb-1">Atención: Revisión manual requerida</h4>
              <p className="text-amber-700 m-0">
                {stats.review} documento(s) requieren revisión manual antes de aplicar los cambios.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Documentos Nuevos */}
      <div className="mb-6">
        <div className="mb-4">
          <h4 className="m-0">Documentos Nuevos</h4>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Tipo de archivo</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {newDocs.length === 0 && !showAddDoc ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400 italic">
                    No se han agregado documentos nuevos
                  </td>
                </tr>
              ) : (
                <>
                  {newDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700">{doc.fileType}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.name}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {showAddDoc && (
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3">
                        <select
                          value={newDocForm.fileType}
                          onChange={(e) => setNewDocForm({ ...newDocForm, fileType: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
                        >
                          <option value="">Seleccione tipo</option>
                          <option value="Presupuesto">Presupuesto</option>
                          <option value="Instrumento">Instrumento</option>
                          <option value="Protocolo">Protocolo</option>
                          <option value="Consentimiento">Consentimiento</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={newDocForm.name}
                          onChange={(e) => setNewDocForm({ ...newDocForm, name: e.target.value })}
                          placeholder="Nombre del documento"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={handleAddDoc}
                            disabled={!newDocForm.fileType || !newDocForm.name}
                            className="px-3 py-1.5 bg-[#C41E3A] text-white rounded-md text-xs font-medium hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => { setShowAddDoc(false); setNewDocForm({ fileType: '', name: '' }); }}
                            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comentarios adicionales */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="m-0">Comentarios adicionales</h4>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs border border-gray-200">Opcional</span>
        </div>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Ingrese cualquier comentario o información adicional relevante para esta enmienda..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
        />
        <p className="text-xs text-gray-400 mt-1.5 text-right">{comments.length} caracteres</p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-4 mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Volver
        </button>
        <button
          onClick={onFinish}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C41E3A] text-white rounded-md hover:bg-[#A01828] transition-colors text-sm font-semibold shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Finalizar
        </button>
      </div>
    </div>
  );
}
