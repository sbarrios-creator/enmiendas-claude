import { useState } from 'react';
import type { AddedDoc, Change, UploadStatus, ImpactAnalysis, Step3Data } from '../types';

interface SummaryProps {
  selectedDocuments: string[];
  addedDocs: AddedDoc[];
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

export function Summary({ selectedDocuments, addedDocs, changes, uploadStatuses, step3Data, onFinish, onBack }: SummaryProps) {
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

  // Group changes by section
  const groupedChanges = FIELD_GROUPS.map((g) => ({
    label: g.label,
    items: changes.filter((c) => g.fields.includes(c.field)),
  }))
    .concat([{ label: 'Otros', items: changes.filter((c) => getGroupLabel(c.field) === 'Otros') }])
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
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.currentRole || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.proposedRole || '—'}</td>
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
                      <td className="px-4 py-3 text-sm text-gray-600">{r.justification}</td>
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
        <div className="flex items-center justify-between mb-4">
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
          <div className="space-y-3">
            {groupedChanges.map(({ label, items }) => (
              <div key={label} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Accordion header */}
                <button
                  onClick={() => toggleGroup(label)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{label}</span>
                    <span className="px-2 py-0.5 bg-white border border-gray-300 text-gray-600 rounded-full text-xs font-medium">
                      {items.length}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${openGroups[label] ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Accordion body */}
                {openGroups[label] && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Campo</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Versión anterior</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Versión nueva</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Justificación</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos afectados</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {items.map((change) => (
                          <tr key={change.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-gray-900">{change.field}</td>
                            <td className="px-4 py-3">
                              {change.oldValue ? (
                                <span className="text-gray-400 line-through">{change.oldValue}</span>
                              ) : (
                                <span className="text-gray-300 italic">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-green-700">{change.newValue}</td>
                            <td className="px-4 py-3 text-gray-600">{change.justification || <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {(change.isGlobal ? documents : documents.filter((d) => change.appliesTo.includes(d.id))).map((doc) => (
                                  <span key={doc.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                                    {doc.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


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
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Tipo de documento</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre del archivo</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {addedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400 italic">
                      No se han agregado documentos nuevos
                    </td>
                  </tr>
                ) : (
                  addedDocs.map((doc, index) => (
                    <tr key={doc.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                      <td className="px-4 py-3 text-gray-700">{doc.type}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.fileName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { const url = URL.createObjectURL(doc.file); window.open(url, '_blank'); }}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                            title="Ver"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              const url = URL.createObjectURL(doc.file);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = doc.fileName;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
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
