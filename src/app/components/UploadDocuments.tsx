import { useState } from 'react';
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

  const applyFilter = (docs: typeof documents, withSearch = false) =>
    docs.filter((doc) => {
      const status = uploadStatuses[doc.id];
      const isComplete = status?.controlChanges && status?.finalVersion;
      if (statusFilter === 'completed' && !isComplete) return false;
      if (statusFilter === 'pending' && isComplete) return false;
      if (withSearch && searchQuery.trim() && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  // Agrupar documentos por categoría preservando el orden de aparición
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

  const canContinue = selectedDocuments.length > 0 &&
    selectedDocuments.every((docId) => {
      const status = uploadStatuses[docId];
      return status?.controlChanges && status?.finalVersion;
    });

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

      {/* Filtro global */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded text-sm transition-colors ${statusFilter === 'all' ? 'bg-[#C41E3A] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Todos ({documents.length})
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-4 py-2 rounded text-sm transition-colors ${statusFilter === 'completed' ? 'bg-[#C41E3A] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Completos ({documents.filter(d => uploadStatuses[d.id]?.controlChanges && uploadStatuses[d.id]?.finalVersion).length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2 rounded text-sm transition-colors ${statusFilter === 'pending' ? 'bg-[#C41E3A] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Pendientes ({documents.filter(d => !uploadStatuses[d.id]?.controlChanges || !uploadStatuses[d.id]?.finalVersion).length})
        </button>
      </div>

      {/* Documentos agrupados por categoría */}
      {groupedDocuments.map(({ category, docs }) => {
        const isInstrumentos = category === 'Instrumentos del proyecto';
        const filteredDocs = applyFilter(docs, isInstrumentos);
        if (filteredDocs.length === 0 && !(isInstrumentos && searchQuery)) return null;
        return (
          <div key={category} className="mb-6 border border-gray-300 rounded overflow-hidden">
            {/* Cabecera de categoría */}
            <div className="bg-[#C41E3A] px-4 py-3 flex items-center justify-between gap-4">
              <h4 className="m-0 text-white text-base font-normal">{category}</h4>
              {isInstrumentos && (
                <div className="relative w-64">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar instrumento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-sm bg-white/20 text-white placeholder-white/60 border border-white/30 rounded focus:outline-none focus:bg-white/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Documentos dentro de la categoría — scrollbar si hay más de 5 */}
            <div className={filteredDocs.length > 5 ? 'max-h-[480px] overflow-y-auto' : ''}>
            {filteredDocs.length === 0 && isInstrumentos && searchQuery ? (
              <div className="py-6 text-center text-gray-500 bg-white text-sm">
                Sin resultados para <span className="font-medium">"{searchQuery}"</span>
              </div>
            ) : filteredDocs.map((doc) => {
          const docFiles = files[doc.id] || { controlChanges: null, finalVersion: null };
          const status = uploadStatuses[doc.id] || { controlChanges: false, finalVersion: false };
          const isComplete = status.controlChanges && status.finalVersion;
          const isPending = !status.controlChanges || !status.finalVersion;
          const allCategoryComplete = isComplete;

          return (
          <div key={doc.id} className="border-t border-gray-200">
            {/* Subencabezado por documento */}
            <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
              <span className="text-sm font-medium text-gray-800">{doc.name}</span>
              {isComplete && (
                <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Completo
                </span>
              )}
            </div>

            {/* Columnas de carga */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-white">
              {/* Columna: Control de cambios */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Archivo control de cambios</p>
                  {docFiles.controlChanges ? (
                    allCategoryComplete ? (
                      <div className="bg-white border border-gray-300 rounded px-3 py-2">
                        <div className="text-sm text-[#C41E3A] font-medium mb-1 underline">
                          {docFiles.controlChanges.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openConfirm({ title: 'Eliminar archivo', message: `¿Desea eliminar "${docFiles.controlChanges?.name}"?`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleFileRemove(doc.id, 'controlChanges'); closeConfirm(); } })} className="text-xs text-gray-600 hover:text-gray-800 underline">Eliminar</button>
                          <span className="text-gray-400">|</span>
                          <button onClick={() => alert('Ver archivo: ' + docFiles.controlChanges?.name)} className="text-xs text-gray-600 hover:text-gray-800 underline">Ver</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#D4EDDA] border border-[#28A745] rounded px-3 py-2">
                        <svg className="w-4 h-4 text-[#28A745] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-[#155724] flex-1 truncate font-medium">{docFiles.controlChanges.name}</span>
                        <button onClick={() => openConfirm({ title: 'Eliminar archivo', message: `¿Desea eliminar "${docFiles.controlChanges?.name}"?`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleFileRemove(doc.id, 'controlChanges'); closeConfirm(); } })} className="text-gray-500 hover:text-red-600 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-300 rounded px-3 py-2 cursor-pointer hover:bg-gray-100">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-sm text-gray-500">Cargar archivo...</span>
                        <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(doc.id, 'controlChanges', f.name); }} />
                      </label>
                      <button onClick={() => handleFileSelect(doc.id, 'controlChanges', `${doc.name}_cc.docx`)} className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm">Subir</button>
                    </div>
                  )}
              </div>

              {/* Columna: Versión final */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Archivo versión final <span className="normal-case font-normal text-gray-400">(con cambios aceptados)</span></p>
                  {docFiles.finalVersion ? (
                    allCategoryComplete ? (
                      <div className="bg-white border border-gray-300 rounded px-3 py-2">
                        <div className="text-sm text-[#C41E3A] font-medium mb-1 underline">{docFiles.finalVersion.name}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openConfirm({ title: 'Eliminar archivo', message: `¿Desea eliminar "${docFiles.finalVersion?.name}"?`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleFileRemove(doc.id, 'finalVersion'); closeConfirm(); } })} className="text-xs text-gray-600 hover:text-gray-800 underline">Eliminar</button>
                          <span className="text-gray-400">|</span>
                          <button onClick={() => alert('Ver archivo: ' + docFiles.finalVersion?.name)} className="text-xs text-gray-600 hover:text-gray-800 underline">Ver</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#D4EDDA] border border-[#28A745] rounded px-3 py-2">
                        <svg className="w-4 h-4 text-[#28A745] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-sm text-[#155724] flex-1 truncate font-medium">{docFiles.finalVersion.name}</span>
                        <button onClick={() => openConfirm({ title: 'Eliminar archivo', message: `¿Desea eliminar "${docFiles.finalVersion?.name}"?`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleFileRemove(doc.id, 'finalVersion'); closeConfirm(); } })} className="text-gray-500 hover:text-red-600 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2">
                      {isPending && !docFiles.controlChanges ? (
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-300 rounded px-3 py-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <span className="text-sm text-gray-500">Cargar archivo...</span>
                        </div>
                      ) : (
                        <label className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-300 rounded px-3 py-2 cursor-pointer hover:bg-gray-100">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <span className="text-sm text-gray-500">Cargar archivo...</span>
                          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(doc.id, 'finalVersion', f.name); }} />
                        </label>
                      )}
                      <button onClick={() => handleFileSelect(doc.id, 'finalVersion', `${doc.name}_final.docx`)} className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm">Subir</button>
                    </div>
                  )}
              </div>
            </div>
          </div>
          );
        })}
            </div>
          </div>
        );
      })}

      {applyFilter(documents, false).length === 0 && (
        <div className="py-8 text-center text-gray-500 bg-gray-50 rounded border border-gray-200 text-sm">
          No se encontraron documentos con el filtro seleccionado
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between gap-4 mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Volver
        </button>
        <button
          onClick={() =>
            openConfirm({
              title: 'Continuar al paso 3',
              message: 'Ha cargado los archivos requeridos. ¿Desea continuar a la definición de cambios?',
              confirmLabel: 'Continuar',
              variant: 'primary',
              onConfirm: () => { closeConfirm(); onNext(); },
            })
          }
          disabled={!canContinue}
          className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Continuar
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
