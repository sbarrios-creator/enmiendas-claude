import { useState, Fragment } from 'react';
import type { Document, UploadStatus } from '../types';
import { baseDocuments } from '../data/documents';
import { ConfirmDialog } from './ConfirmDialog';

interface UploadDocumentsProps {
  selectedDocuments: string[];
  newDocuments: Document[];
  uploadStatuses: Record<string, UploadStatus>;
  onUploadStatusChange: (statuses: Record<string, UploadStatus>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface FileUpload {
  name: string;
  uploaded: boolean;
}

export function UploadDocuments({
  selectedDocuments,
  newDocuments,
  uploadStatuses,
  onUploadStatusChange,
  onNext,
  onBack,
}: UploadDocumentsProps) {
  const [files, setFiles] = useState<Record<string, { controlChanges: FileUpload | null; finalVersion: FileUpload | null }>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const toggleCategory = (cat: string) => setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

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

  const allDocuments = [
    ...baseDocuments,
    ...newDocuments.map((d) => ({ ...d, category: 'Instrumentos del proyecto' })),
  ];
  const documents = allDocuments.filter((doc) => selectedDocuments.includes(doc.id));

  const handleFileSelect = (docId: string, type: 'controlChanges' | 'finalVersion', fileName: string) => {
    setFiles(prev => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        [type]: { name: fileName, uploaded: true }
      }
    }));

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

    const newStatuses = { ...uploadStatuses };
    if (newStatuses[docId]) {
      newStatuses[docId][type] = false;
      onUploadStatusChange(newStatuses);
    }
  };

  const applyFilter = (docs: typeof documents, withSearch = false) =>
    docs.filter((doc) => {
      const status = uploadStatuses[doc.id];
      const isComplete = status?.controlChanges && status?.finalVersion;
      if (statusFilter === 'completed' && !isComplete) return false;
      if (statusFilter === 'pending' && isComplete) return false;
      if (withSearch && searchQuery.trim() && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  const groupedDocuments = documents.reduce<{ category: string; docs: typeof documents }[]>((acc, doc) => {
    const cat = (doc as { category?: string }).category || doc.type;
    const existing = acc.find((g) => g.category === cat);
    if (existing) {
      existing.docs.push(doc);
    } else {
      acc.push({ category: cat, docs: [doc] });
    }
    return acc;
  }, []);

  const canContinue = selectedDocuments.length > 0;
  const completedCount = documents.filter(
    (d) => uploadStatuses[d.id]?.controlChanges && uploadStatuses[d.id]?.finalVersion
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 m-0">Subir documentos modificados</h3>
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-[#C41E3A]">{completedCount}</span>/{documents.length} documentos completos
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-3 m-0">
        Por cada documento cargue 2 versiones: con control de cambios activos y con cambios aceptados. Máx. 200 MB.
      </p>

      {/* Filtros */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded text-sm transition-colors ${statusFilter === 'all' ? 'bg-[#C41E3A] text-white' : 'border border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
          Todos ({documents.length})
        </button>
        <button onClick={() => setStatusFilter('completed')} className={`px-3 py-1.5 rounded text-sm transition-colors ${statusFilter === 'completed' ? 'bg-[#C41E3A] text-white' : 'border border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
          Completos ({completedCount})
        </button>
        <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1.5 rounded text-sm transition-colors ${statusFilter === 'pending' ? 'bg-[#C41E3A] text-white' : 'border border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
          Pendientes ({documents.length - completedCount})
        </button>
      </div>

      {/* Tabla */}
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Documento</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-amber-600 uppercase tracking-wide w-56">Control de cambios</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase tracking-wide w-56">Versión final</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Estado</th>
            </tr>
          </thead>
          <tbody>
            {groupedDocuments.map(({ category, docs }) => {
              const isInstrumentos = category === 'Instrumentos del proyecto';
              const filteredDocs = applyFilter(docs, isInstrumentos);
              if (filteredDocs.length === 0 && !(isInstrumentos && searchQuery)) return null;
              const isCollapsed = collapsedCategories[category] !== false;
              const categoryComplete = docs.every(
                (d) => uploadStatuses[d.id]?.controlChanges && uploadStatuses[d.id]?.finalVersion
              );
              return (
                <Fragment key={category}>
                  <tr
                    className="bg-gray-50 border-t border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-[#C41E3A] uppercase tracking-wide">
                      <div className="flex items-center gap-2">
                        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span>{category}</span>
                        {categoryComplete && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-medium normal-case tracking-normal">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Completo
                          </span>
                        )}
                        {isInstrumentos && docs.length > 5 && !isCollapsed && (
                          <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-2 px-2 py-0.5 text-xs border border-gray-300 rounded text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/40 focus:border-[#C41E3A] font-normal normal-case tracking-normal"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                  {!isCollapsed && filteredDocs.length === 0 && isInstrumentos && searchQuery ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-400">
                        Sin resultados para <span className="font-medium">"{searchQuery}"</span>
                      </td>
                    </tr>
                  ) : !isCollapsed && filteredDocs.map((doc) => {
                    const docFiles = files[doc.id] || { controlChanges: null, finalVersion: null };
                    const status = uploadStatuses[doc.id] || { controlChanges: false, finalVersion: false };
                    const isComplete = status.controlChanges && status.finalVersion;

                    return (
                      <tr key={doc.id} className="border-t border-gray-200 hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-2 text-sm text-gray-700">{doc.name}</td>

                        {/* Control de cambios */}
                        <td className="px-3 py-2">
                          {docFiles.controlChanges ? (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs text-gray-700 truncate max-w-[160px]" title={docFiles.controlChanges.name}>{docFiles.controlChanges.name}</span>
                              <button
                                onClick={() => openConfirm({ title: 'Eliminar archivo', message: `¿Desea eliminar "${docFiles.controlChanges?.name}"?`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleFileRemove(doc.id, 'controlChanges'); closeConfirm(); } })}
                                aria-label="Eliminar control de cambios"
                                className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded text-xs cursor-pointer hover:bg-amber-100 transition-colors">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Cargar
                              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(doc.id, 'controlChanges', f.name); }} />
                            </label>
                          )}
                        </td>

                        {/* Versión final */}
                        <td className="px-3 py-2">
                          {docFiles.finalVersion ? (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs text-gray-700 truncate max-w-[160px]" title={docFiles.finalVersion.name}>{docFiles.finalVersion.name}</span>
                              <button
                                onClick={() => openConfirm({ title: 'Eliminar archivo', message: `¿Desea eliminar "${docFiles.finalVersion?.name}"?`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleFileRemove(doc.id, 'finalVersion'); closeConfirm(); } })}
                                aria-label="Eliminar versión final"
                                className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : docFiles.controlChanges ? (
                            <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded text-xs cursor-pointer hover:bg-green-100 transition-colors">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Cargar
                              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(doc.id, 'finalVersion', f.name); }} />
                            </label>
                          ) : (
                            <span className="text-xs text-gray-300 italic">— sube primero el control</span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-3 py-2 text-center">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Completo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-xs">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
            {applyFilter(documents, false).length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-400">
                  No se encontraron documentos con el filtro seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-4 mt-4">
        <button onClick={onBack} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">
          ← Volver
        </button>
        <button onClick={onNext} disabled={!canContinue} className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium">
          Siguiente →
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
