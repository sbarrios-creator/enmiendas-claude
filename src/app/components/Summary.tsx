import { useState } from 'react';
import type { Document, Change, UploadStatus, ImpactAnalysis, Step3Data } from '../types';

interface SummaryProps {
  selectedDocuments: string[];
  newDocuments: Document[];
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

export function Summary({ selectedDocuments, newDocuments, changes, uploadStatuses, step3Data, onFinish, onBack }: SummaryProps) {
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

  // Accordion por documento (cambios)
  const [openDocs, setOpenDocs] = useState<Record<string, boolean>>(
    () => Object.fromEntries(selectedDocuments.map((id) => [id, true]))
  );
  const toggleDoc = (docId: string) =>
    setOpenDocs((prev) => ({ ...prev, [docId]: !prev[docId] }));

  // Accordion por documento (versiones modificadas)
  const [openModified, setOpenModified] = useState<Record<string, boolean>>(
    () => Object.fromEntries(selectedDocuments.map((id) => [id, true]))
  );
  const toggleModified = (docId: string) =>
    setOpenModified((prev) => ({ ...prev, [docId]: !prev[docId] }));

  // Cambios agrupados por documento
  const changesByDoc = documents.map((doc) => ({
    doc,
    items: changes.filter((c) => c.isGlobal || c.appliesTo.includes(doc.id)),
  })).filter((g) => g.items.length > 0);

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
            {changesByDoc.map(({ doc, items }) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden">

                {/* Acordeón header — siempre visible */}
                <button
                  onClick={() => toggleDoc(doc.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-semibold text-gray-800 text-sm truncate">{doc.name}</span>
                    <span className="px-2 py-0.5 bg-white border border-gray-300 text-gray-500 rounded-full text-xs font-medium shrink-0">
                      {items.length} {items.length === 1 ? 'cambio' : 'cambios'}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ml-2 ${openDocs[doc.id] ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Acordeón body con scroll interno */}
                {openDocs[doc.id] && (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-white border-b border-gray-200">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Versión anterior</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Versión nueva</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Justificación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {items.map((change) => (
                          <tr key={change.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              {change.oldValue ? (
                                <span className="inline-block px-2 py-0.5 bg-red-50 border border-red-200 rounded text-red-700 line-through text-sm">
                                  {change.oldValue}
                                </span>
                              ) : (
                                <span className="text-gray-300 italic text-sm">Sin valor previo</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-block px-2 py-0.5 bg-green-50 border border-green-200 rounded text-green-700 font-medium text-sm">
                                {change.newValue}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-sm">
                              {change.justification || <span className="text-gray-300 italic">—</span>}
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

      {/* Jerarquía de documentos modificados */}
      {documents.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-4 m-0">Documentos modificados</h4>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden">

                {/* Acordeón header — siempre visible */}
                <button
                  onClick={() => toggleModified(doc.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-semibold text-gray-800 text-sm truncate">{doc.name}</span>
                    <span className="px-2 py-0.5 bg-white border border-gray-300 text-gray-500 rounded-full text-xs font-medium shrink-0">
                      3 versiones
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ml-2 ${openModified[doc.id] ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Acordeón body con scroll interno */}
                {openModified[doc.id] && (
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">

                    {/* Nivel 1: Documento vigente (referencia) */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-center w-6 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-xs shrink-0">
                          Vigente · Referencia
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors" title="Ver">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" title="Descargar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Nivel 2: Documento con cambios (principal) */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100/60 transition-colors">
                      <div className="flex items-center justify-center w-6 shrink-0 pl-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-700 truncate">{doc.name} (con cambios)</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs shrink-0">
                          En revisión · Principal
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors" title="Ver">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" title="Descargar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors" title="Cambiar nombre">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Nivel 3: Versión final */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100/60 transition-colors">
                      <div className="flex items-center justify-center w-6 shrink-0 pl-6">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-700 truncate">{doc.name} (versión final)</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full text-xs shrink-0">
                          Versión final
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors" title="Ver">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" title="Descargar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors" title="Cambiar nombre">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos Nuevos */}
      <div className="mb-6">
        <div className="mb-4">
          <h4 className="m-0">Documentos Nuevos</h4>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Tipo de archivo</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {newDocuments.length === 0 && newDocs.length === 0 && !showAddDoc ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400 italic">
                    No se han agregado documentos nuevos
                  </td>
                </tr>
              ) : (
                <>
                  {/* Documentos agregados en el Paso 1 */}
                  {newDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700">{doc.type}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                            title="Ver"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                  ))}
                  {/* Documentos agregados localmente en el Paso 4 */}
                  {newDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700">{doc.fileType}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                            title="Ver"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
