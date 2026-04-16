import { useState } from 'react';
import type { Document, Change, UploadStatus, ImpactAnalysis, Step3Data } from '../types';
import { baseDocuments } from '../data/documents';
import { ConfirmDialog } from './ConfirmDialog';

interface SummaryProps {
  selectedDocuments: string[];
  newDocuments: Document[];
  changes: Change[];
  uploadStatuses: Record<string, UploadStatus>;
  step3Data: Step3Data;
  onFinish: () => void;
  onBack: () => void;
}

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

const CATEGORY_ORDER = [
  'Presupuesto del estudio',
  'Proyecto de investigación',
  'Consentimiento informado',
  'Asentimientos',
  'Instrumentos del proyecto',
];

const getDocCategory = (doc: { category?: string; type?: string }) =>
  doc.category || 'Instrumentos del proyecto';

export function Summary({ selectedDocuments, newDocuments, changes, uploadStatuses, step3Data, onFinish, onBack }: SummaryProps) {
  const allDocuments = [
    ...baseDocuments,
    ...newDocuments.map((d) => ({ ...d, category: 'Instrumentos del proyecto' })),
  ];
  const documents = allDocuments.filter((doc) => selectedDocuments.includes(doc.id));

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

  // Comentarios adicionales
  const [comments, setComments] = useState('');

  // Accordion por documento (cambios) — colapsado si tiene 1 solo cambio
  const [openDocs, setOpenDocs] = useState<Record<string, boolean>>(
    () => Object.fromEntries(selectedDocuments.map((id) => {
      const count = changes.filter((c) => c.isGlobal || c.appliesTo.includes(id)).length;
      return [id, count > 1];
    }))
  );
  const toggleDoc = (docId: string) =>
    setOpenDocs((prev) => ({ ...prev, [docId]: !prev[docId] }));

  // Página activa por documento en la sección de cambios
  const [activeChangeIndex, setActiveChangeIndex] = useState<Record<string, number>>({});

  // Accordion por documento (versiones modificadas)
  const [openModified, setOpenModified] = useState<Record<string, boolean>>(
    () => Object.fromEntries(selectedDocuments.map((id) => [id, true]))
  );
  const toggleModified = (docId: string) =>
    setOpenModified((prev) => ({ ...prev, [docId]: !prev[docId] }));

  // Cambios agrupados por documento
  const changesByDoc = documents.map((doc) => ({
    doc,
    items: changes
      .filter((c) => c.isGlobal || c.appliesTo.includes(doc.id))
      .slice()
      .reverse(),
  })).filter((g) => g.items.length > 0);

  // Cambios agrupados por categoría → por documento
  const changesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    groups: changesByDoc.filter((g) => getDocCategory(g.doc as { category?: string; type?: string }) === cat),
  })).filter((c) => c.groups.length > 0);

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
      automatic: { bg: 'bg-green-100', text: 'text-green-800', label: 'Automático' },
      review: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Requiere revisión' },
      version: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Nueva versión' },
      blocked: { bg: 'bg-red-100', text: 'text-red-800', label: 'Bloqueado' },
    };
    const style = styles[action];
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
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
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Resumen de enmiendas</h3>
        <p className="text-sm text-gray-600 m-0">Revise el impacto de los cambios antes de confirmar</p>
      </div>

      {/* Step 3 Responses */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#C41E3A] px-4 py-3">
          <h3 className="text-white text-base font-normal m-0">Cambios declarados</h3>
        </div>
        <div className="p-4 space-y-3">

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
          {step3Data.modifiesOperativeUnits === 'SI' && (step3Data.operativeUnitsData.internalUnits.length > 0 || step3Data.operativeUnitsData.externalUnits.length > 0) && (
            <div className="p-4 bg-white">
              <p className="text-xs text-gray-500 mb-1">Detalle</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {[
                  ...step3Data.operativeUnitsData.internalUnits.map((u) => u.name),
                  ...step3Data.operativeUnitsData.externalUnits.map((u) => u.name),
                ].join(', ')}
              </p>
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
      </div>

      {/* Changes Summary */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#C41E3A] px-4 py-3 flex items-center justify-between">
          <h3 className="text-white text-base font-normal m-0">Cambios a aplicar en otros Documentos</h3>
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs">Total de cambios:</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-[#C41E3A]">
              {changesByDoc.reduce((acc, { items }) => acc + items.length, 0)}
            </span>
          </div>
        </div>
        <div className="p-4">

        {changes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200 text-sm">
            No se registraron cambios en documentos
          </div>
        ) : (
          <div className="space-y-5">
            {changesByCategory.map(({ category, groups }) => (
              <div key={category}>
                {/* Cabecera de categoría */}
                <div className="mb-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{category}</span>
                </div>
                <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                {groups.map(({ doc, items }) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden">

                {/* Acordeón header — siempre visible */}
                <button
                  onClick={() => toggleDoc(doc.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-semibold text-gray-800 text-sm truncate">{doc.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${doc.type === 'Presupuesto' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {doc.type}
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-gray-300 text-gray-500 rounded-full text-xs font-medium shrink-0">
                      {items.length} {items.length === 1 ? 'cambio' : 'cambios'}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ml-2 ${openDocs[doc.id] ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Acordeón body */}
                {openDocs[doc.id] && (() => {
                  const idx = activeChangeIndex[doc.id] ?? 0;
                  const change = items[idx];
                  const changeNum = items.length - idx;
                  const ccId = `${change.field || changeNum}-CC-v${changeNum}`;
                  const eyeIcon = (
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  );
                  const downloadIcon = (
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  );
                  const editIcon = (
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  );
                  return (
                    <div className="bg-white divide-y divide-gray-200">

                      {/* Fila superior: 4 columnas */}
                      <div className="px-4 py-3 bg-gray-50 grid grid-cols-4 gap-3 items-start">

                        {/* Campo modificado + página */}
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide m-0">Campo - N° Pág</p>
                          <p className="text-sm font-semibold text-gray-800 m-0 mt-0.5">
                            {change.field}
                            {change.pageNumber && change.pageNumber.length > 0 && (
                              <span className="text-gray-400 font-normal"> - {change.pageNumber.join(', ')}</span>
                            )}
                          </p>
                          {items.length > 1 && (
                            <span className="text-[10px] text-gray-400 font-medium tabular-nums mt-1">{idx + 1} de {items.length}</span>
                          )}
                        </div>

                        {/* Versión anterior */}
                        <div className="border-l border-gray-200 pl-3 flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide m-0">Versión anterior</p>
                          {change.oldValue ? (
                            <span className="inline-block px-2 py-1 bg-red-50 border border-red-200 rounded text-red-700 line-through text-xs leading-relaxed">
                              {change.oldValue}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Sin valor previo</span>
                          )}
                        </div>

                        {/* Versión nueva */}
                        <div className="border-l border-gray-200 pl-3 flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide m-0">Versión nueva</p>
                          <span className="inline-block px-2 py-1 bg-green-50 border border-green-200 rounded text-green-700 font-medium text-xs leading-relaxed">
                            {change.newValue}
                          </span>
                        </div>

                        {/* Justificación */}
                        <div className="border-l border-gray-200 pl-3 flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide m-0">Justificación</p>
                          <span className="text-xs text-gray-600 leading-relaxed">
                            {change.justification || <span className="text-gray-400 italic">—</span>}
                          </span>
                        </div>

                      </div>

                      {/* DOCUMENTOS — fila de 3 columnas */}
                      <div className="px-4 py-3 grid grid-cols-3 gap-3">

                        {/* DOCUMENTO VIGENTE APROBADO */}
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide m-0">Documento vigente aprobado</p>
                          <p className="text-[11px] text-gray-400 italic m-0">El siguiente documento es el que será reemplazado</p>
                          <p className="text-xs text-gray-700 m-0 truncate" title={doc.name}>{doc.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">{eyeIcon} Ver</button>
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">{downloadIcon} Descargar</button>
                          </div>
                        </div>

                        {/* DOCUMENTO DE CONTROL DE CAMBIOS */}
                        <div className="flex flex-col gap-1.5 border-l border-gray-200 pl-3">
                          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide m-0">Documento de control de cambios</p>
                          <p className="text-xs text-gray-700 m-0 truncate" title={ccId}>{ccId}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">{eyeIcon} Ver</button>
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">{downloadIcon} Descargar</button>
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors">{editIcon} Cambiar nombre</button>
                          </div>
                        </div>

                        {/* VERSIÓN FINAL */}
                        <div className="flex flex-col gap-1.5 border-l border-gray-200 pl-3">
                          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide m-0">Versión final</p>
                          <p className="text-xs text-gray-700 m-0 truncate" title={`${doc.name} — versión final`}>{doc.name} — versión final</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">{eyeIcon} Ver</button>
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">{downloadIcon} Descargar</button>
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors">{editIcon} Cambiar nombre</button>
                          </div>
                        </div>

                      </div>

                      {/* Paginación — solo si hay más de un cambio */}
                      {items.length > 1 && (
                        <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
                          <button
                            disabled={idx === 0}
                            onClick={() => setActiveChangeIndex((prev) => ({ ...prev, [doc.id]: idx - 1 }))}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            ← Anterior
                          </button>
                          <span className="text-xs text-gray-500 font-medium tabular-nums">{idx + 1} / {items.length}</span>
                          <button
                            disabled={idx === items.length - 1}
                            onClick={() => setActiveChangeIndex((prev) => ({ ...prev, [doc.id]: idx + 1 }))}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Siguiente →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
                </div> {/* fin grupos de categoría */}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {stats.review > 0 && (
        <div className="mb-6 border-l-4 border-amber-400 bg-amber-50 p-4 rounded">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-900 m-0 mb-1">Atención: Revisión manual requerida</p>
              <p className="text-sm text-gray-700 m-0">
                {stats.review} documento(s) requieren revisión manual antes de aplicar los cambios.
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Documentos Nuevos */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#C41E3A] px-4 py-3">
          <h3 className="text-white text-base font-normal m-0">Documentos Nuevos</h3>
        </div>

        <div className="border-t border-gray-200 overflow-hidden">
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
                            className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                            title="Ver"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                  ))}
                  {/* Documentos agregados localmente en el Paso 4 */}
                  {newDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700">{doc.fileType}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                            title="Ver"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                          <button
                            onClick={() =>
                              openConfirm({
                                title: 'Eliminar documento',
                                message: `¿Desea eliminar "${doc.name}"? Esta acción no se puede deshacer.`,
                                confirmLabel: 'Eliminar',
                                variant: 'danger',
                                onConfirm: () => { handleRemoveDoc(doc.id); closeConfirm(); },
                              })
                            }
                            className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            title="Eliminar"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                            onClick={() =>
                              openConfirm({
                                title: 'Guardar documento',
                                message: `¿Desea agregar "${newDocForm.name}" a la lista de documentos nuevos?`,
                                confirmLabel: 'Guardar',
                                variant: 'primary',
                                onConfirm: () => { handleAddDoc(); closeConfirm(); },
                              })
                            }
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
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#C41E3A] px-4 py-3 flex items-center gap-2">
          <h3 className="text-white text-base font-normal m-0">Comentarios adicionales</h3>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white">Opcional</span>
        </div>
        <div className="p-4">
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Ingrese cualquier comentario o información adicional relevante para esta enmienda..."
            rows={4}
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1.5 text-right m-0">{comments.length} caracteres</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-4 pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          ← Volver
        </button>
        <button
          onClick={() =>
            openConfirm({
              title: 'Enviar enmienda',
              message: '¿Está seguro de que desea finalizar y enviar la enmienda? Esta acción no se puede deshacer.',
              confirmLabel: 'Finalizar',
              variant: 'primary',
              onConfirm: () => { closeConfirm(); onFinish(); },
            })
          }
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Finalizar
        </button>
      </div>

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
