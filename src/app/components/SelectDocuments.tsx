import { useState } from "react";
import type { Document, UploadStatus } from "../types";
import { baseDocuments } from "../data/documents";
import { ConfirmDialog } from "./ConfirmDialog";

interface SelectDocumentsProps {
  selectedDocuments: string[];
  onSelectDocuments: (ids: string[]) => void;
  newDocuments: Document[];
  onNewDocumentsChange: (docs: Document[]) => void;
  uploadStatuses: Record<string, UploadStatus>;
  onUploadStatusChange: (statuses: Record<string, UploadStatus>) => void;
  onNext: () => void;
}

const documentNameOptions = [
  "Consentimiento informado",
  "Asentimiento informado",
  "Protocolo de investigación",
  "Brochure del investigador",
  "Manual de procedimientos",
  "Formulario de recolección de datos",
  "Carta de aprobación institucional",
  "Declaración de confidencialidad",
  "Acuerdo de transferencia de material",
  "Plan de manejo de datos",
  "Otro",
];

interface DocumentSection {
  title: string;
  documents: Document[];
}

interface FileUpload {
  name: string;
  uploaded: boolean;
}

export function SelectDocuments({
  selectedDocuments,
  onSelectDocuments,
  newDocuments,
  onNewDocumentsChange,
  uploadStatuses,
  onUploadStatusChange,
  onNext,
}: SelectDocumentsProps) {
  const [sectionSearches, setSectionSearches] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({ name: "", file: null as File | null });
  const [activeTab, setActiveTab] = useState<string>("Presupuesto del estudio");
  const [files, setFiles] = useState<Record<string, { controlChanges: FileUpload | null; finalVersion: FileUpload | null }>>({});
  const [dragOver, setDragOver] = useState<{ docId: string; type: "controlChanges" | "finalVersion" } | null>(null);

  const [confirm, setConfirm] = useState<{
    isOpen: boolean; title: string; message: string;
    confirmLabel?: string; variant?: "danger" | "warning" | "primary";
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const openConfirm = (opts: Omit<typeof confirm, "isOpen">) => setConfirm({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirm((c) => ({ ...c, isOpen: false }));

  const documents = [...baseDocuments, ...newDocuments];

  // — Upload handlers —
  const handleFileSelect = (docId: string, type: "controlChanges" | "finalVersion", fileName: string) => {
    setFiles(prev => ({ ...prev, [docId]: { ...prev[docId], [type]: { name: fileName, uploaded: true } } }));
    const next = { ...uploadStatuses };
    if (!next[docId]) next[docId] = { controlChanges: false, finalVersion: false };
    next[docId][type] = true;
    onUploadStatusChange(next);
  };

  const handleFileRemove = (docId: string, type: "controlChanges" | "finalVersion") => {
    setFiles(prev => ({ ...prev, [docId]: { ...prev[docId], [type]: null } }));
    const next = { ...uploadStatuses };
    if (next[docId]) { next[docId][type] = false; onUploadStatusChange(next); }
  };

  const handleDragOver = (e: React.DragEvent, docId: string, type: "controlChanges" | "finalVersion") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ docId, type });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, docId: string, type: "controlChanges" | "finalVersion") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(docId, type, file.name);
  };

  // — Selection handlers —
  const handleModalSave = () => {
    if (!modalForm.name) return;
    const newDoc: Document = { id: Date.now().toString(), name: modalForm.name, type: "Nuevo", status: "Aprobado", version: "1" };
    onNewDocumentsChange([...newDocuments, newDoc]);
    setShowModal(false);
    setModalForm({ name: "", file: null });
  };

  const handleModalClose = () => { setShowModal(false); setModalForm({ name: "", file: null }); };

  const handleToggleDocument = (id: string) => {
    if (selectedDocuments.includes(id)) {
      onSelectDocuments(selectedDocuments.filter((docId) => docId !== id));
    } else {
      onSelectDocuments([...selectedDocuments, id]);
    }
  };

  const handleToggleSection = (sectionDocs: Document[]) => {
    const ids = sectionDocs.map((d) => d.id);
    const allSel = ids.every((id) => selectedDocuments.includes(id));
    if (allSel) {
      onSelectDocuments(selectedDocuments.filter((id) => !ids.includes(id)));
    } else {
      const next = [...selectedDocuments];
      ids.forEach((id) => { if (!next.includes(id)) next.push(id); });
      onSelectDocuments(next);
    }
  };

  const getCategory = (doc: Document) => (doc as { category?: string }).category ?? "";

  const sections: DocumentSection[] = [
    { title: "Presupuesto del estudio",       documents: documents.filter((d) => getCategory(d) === "Presupuesto del estudio") },
    { title: "Proyecto de investigación",      documents: documents.filter((d) => getCategory(d) === "Proyecto de investigación") },
    { title: "Consentimiento informado",       documents: documents.filter((d) => getCategory(d) === "Consentimiento informado") },
    { title: "Asentimientos",                  documents: documents.filter((d) => getCategory(d) === "Asentimientos") },
    { title: "Instrumentos del proyecto",      documents: documents.filter((d) => getCategory(d) === "Instrumentos del proyecto") },
    { title: "Documentos Nuevos",              documents: documents.filter((d) => d.type === "Nuevo") },
  ];

  const visibleSections =
    activeTab === "Resumen"
      ? sections.filter((s) => s.documents.length > 0)
      : sections.filter((s) => s.title === activeTab && s.documents.length > 0);

  const totalSelected = selectedDocuments.length;
  const completedCount = documents.filter(
    (d) => selectedDocuments.includes(d.id) && uploadStatuses[d.id]?.controlChanges && uploadStatuses[d.id]?.finalVersion
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 m-0">Documentos aprobados y vigentes de la investigación</h3>
        <div className="flex items-center gap-3">
          {totalSelected > 0 && (
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-[#C41E3A]">{completedCount}</span>/{totalSelected} con archivos
            </span>
          )}
          <button
            onClick={() => {
              const allIds = documents.map((d) => d.id);
              const allSel = allIds.every((id) => selectedDocuments.includes(id));
              onSelectDocuments(allSel ? [] : allIds);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {documents.every((d) => selectedDocuments.includes(d.id)) ? "Deseleccionar todos" : "Seleccionar todos"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={() => setActiveTab("Resumen")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === "Resumen" ? "bg-[#C41E3A] text-white" : "bg-white border border-gray-300 text-gray-500 hover:bg-gray-50"}`}
        >
          Resumen
          <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${activeTab === "Resumen" ? "bg-white/20 text-white" : totalSelected > 0 ? "bg-[#C41E3A]/10 text-[#C41E3A]" : "bg-gray-100 text-gray-400"}`}>
            {totalSelected}/{documents.length}
          </span>
        </button>
        {sections.filter((s) => s.documents.length > 0).map((section) => {
          const sectionSelected = section.documents.filter((d) => selectedDocuments.includes(d.id)).length;
          const isActive = activeTab === section.title;
          return (
            <button
              key={section.title}
              onClick={() => setActiveTab(section.title)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${isActive ? "bg-[#C41E3A] text-white" : "bg-white border border-gray-300 text-gray-500 hover:bg-gray-50"}`}
            >
              {section.title}
              {sectionSelected > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${isActive ? "bg-white/20 text-white" : "bg-[#C41E3A]/10 text-[#C41E3A]"}`}>
                  {sectionSelected}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Resumen: grid de categorías */}
      {activeTab === "Resumen" && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {sections.filter((s) => s.documents.length > 0).map((section) => {
            const selected = section.documents.filter((d) => selectedDocuments.includes(d.id));
            const complete = selected.filter((d) => uploadStatuses[d.id]?.controlChanges && uploadStatuses[d.id]?.finalVersion).length;
            const total = section.documents.length;
            const allSel = selected.length === total;
            return (
              <div
                key={section.title}
                className="border border-gray-200 rounded-sm p-2.5 cursor-pointer hover:border-[#C41E3A]/30 hover:bg-[#C41E3A]/5 transition-colors"
                onClick={() => setActiveTab(section.title)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700">{section.title}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selected.length > 0 ? "bg-[#C41E3A]/10 text-[#C41E3A]" : "bg-gray-100 text-gray-400"}`}>
                    {selected.length}/{total}
                  </span>
                </div>
                {selected.length > 0 ? (
                  <>
                    <ul className="space-y-0.5 mb-1">
                      {selected.slice(0, 3).map((d) => (
                        <li key={d.id} className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C41E3A] shrink-0" />
                          {d.name}
                        </li>
                      ))}
                      {selected.length > 3 && <li className="text-xs text-[#C41E3A] font-medium">+{selected.length - 3} más</li>}
                    </ul>
                    {complete > 0 && (
                      <p className="text-xs text-green-600 font-medium m-0 flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        {complete}/{selected.length} con archivos
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 italic m-0">Sin selección — clic para explorar</p>
                    {allSel && selected.length > 0 && (
                      <p className="text-xs text-[#C41E3A] font-medium mt-1 m-0 flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        Todos seleccionados
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla por categoría */}
      {activeTab !== "Resumen" && (
        <div className="space-y-3">
          {visibleSections.map((section) => {
            const isNuevos = section.title === "Documentos Nuevos";
            const showSearch = section.documents.length > 10;
            const searchValue = sectionSearches[section.title] ?? "";
            const displayDocuments = showSearch
              ? section.documents.filter((doc) => doc.name.toLowerCase().includes(searchValue.toLowerCase()))
              : section.documents;

            if (section.documents.length === 0 && !isNuevos) return null;

            const allSectionSelected = section.documents.length > 0 && section.documents.every((d) => selectedDocuments.includes(d.id));
            const someSectionSelected = section.documents.some((d) => selectedDocuments.includes(d.id));

            return (
              <div key={section.title} className="border border-gray-200 rounded-sm overflow-hidden">
                {/* Section header */}
                <div className="bg-gray-50 px-3 py-2 flex items-center justify-between gap-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {!isNuevos && (
                      <input
                        type="checkbox"
                        checked={allSectionSelected}
                        ref={(el) => { if (el) el.indeterminate = someSectionSelected && !allSectionSelected; }}
                        onChange={() => handleToggleSection(section.documents)}
                        className="w-4 h-4 accent-[#C41E3A] cursor-pointer shrink-0"
                        title={allSectionSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                      />
                    )}
                    <h4 className="m-0 text-[#C41E3A] text-sm font-semibold">{section.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {isNuevos && (
                      <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-xs font-medium"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Agregar
                      </button>
                    )}
                    {showSearch && (
                      <div className="relative w-56">
                        <input
                          type="text"
                          placeholder={`Buscar en ${section.title.toLowerCase()}...`}
                          value={searchValue}
                          onChange={(e) => setSectionSearches((prev) => ({ ...prev, [section.title]: e.target.value }))}
                          className="w-full px-3 py-1 pl-8 text-xs border border-gray-300 rounded bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/40 focus:border-[#C41E3A]"
                        />
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla */}
                {displayDocuments.length > 0 ? (
                  <div className={showSearch ? "max-h-72 overflow-y-auto" : ""}>
                    <table className="w-full text-sm table-fixed">
                      <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                        <tr>
                          {!isNuevos && <th className="px-3 py-1.5 w-10" />}
                          <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[35%]">Archivo</th>
                          <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide w-14">Versión</th>
                          <th className="px-3 py-1.5 text-left text-xs font-medium text-amber-600 uppercase tracking-wide w-[22%]">Control de cambios</th>
                          <th className="px-3 py-1.5 text-left text-xs font-medium text-green-700 uppercase tracking-wide w-[22%]">Versión final</th>
                          <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Estado</th>
                          {isNuevos && <th className="px-3 py-1.5 w-10" />}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {displayDocuments.map((doc) => {
                          const isSelected = selectedDocuments.includes(doc.id);
                          const docFiles = files[doc.id] || { controlChanges: null, finalVersion: null };
                          const status = uploadStatuses[doc.id] || { controlChanges: false, finalVersion: false };
                          const isComplete = status.controlChanges && status.finalVersion;
                          const uploadDisabled = !isSelected;

                          return (
                            <tr
                              key={doc.id}
                              className={`transition-colors ${!isNuevos ? "cursor-pointer hover:bg-[#C41E3A]/5" : ""} ${isSelected ? "" : "opacity-60"}`}
                              onClick={() => !isNuevos && handleToggleDocument(doc.id)}
                            >
                              {!isNuevos && (
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleDocument(doc.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 accent-[#C41E3A] rounded cursor-pointer"
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2">
                                <span className={`text-sm ${isSelected ? "text-gray-900 font-medium" : "text-gray-500"}`}>{doc.name}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-gray-400 text-xs">{doc.version}</span>
                              </td>

                              {/* Control de cambios */}
                              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                {docFiles.controlChanges ? (
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="text-xs text-gray-700 truncate max-w-[140px]" title={docFiles.controlChanges.name}>{docFiles.controlChanges.name}</span>
                                    <button
                                      onClick={() => openConfirm({ title: "Eliminar archivo", message: `¿Desea eliminar "${docFiles.controlChanges?.name}"?`, confirmLabel: "Eliminar", variant: "danger", onConfirm: () => { handleFileRemove(doc.id, "controlChanges"); closeConfirm(); } })}
                                      className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                ) : uploadDisabled ? (
                                  <span className="text-xs text-gray-300">—</span>
                                ) : (
                                  <label
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-all border border-dashed ${
                                      dragOver?.docId === doc.id && dragOver?.type === "controlChanges"
                                        ? "bg-amber-100 border-amber-400 text-amber-800"
                                        : "bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100 hover:border-amber-400"
                                    }`}
                                    onDragOver={(e) => handleDragOver(e, doc.id, "controlChanges")}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, doc.id, "controlChanges")}
                                  >
                                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <span>Soltar o seleccionar</span>
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(doc.id, "controlChanges", f.name); e.currentTarget.value = ""; }} />
                                  </label>
                                )}
                              </td>

                              {/* Versión final */}
                              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                {docFiles.finalVersion ? (
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="text-xs text-gray-700 truncate max-w-[140px]" title={docFiles.finalVersion.name}>{docFiles.finalVersion.name}</span>
                                    <button
                                      onClick={() => openConfirm({ title: "Eliminar archivo", message: `¿Desea eliminar "${docFiles.finalVersion?.name}"?`, confirmLabel: "Eliminar", variant: "danger", onConfirm: () => { handleFileRemove(doc.id, "finalVersion"); closeConfirm(); } })}
                                      className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                ) : uploadDisabled ? (
                                  <span className="text-xs text-gray-300">—</span>
                                ) : (
                                  <label
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-all border border-dashed ${
                                      dragOver?.docId === doc.id && dragOver?.type === "finalVersion"
                                        ? "bg-green-100 border-green-500 text-green-800"
                                        : "bg-green-50 border-green-300 text-green-600 hover:bg-green-100 hover:border-green-400"
                                    }`}
                                    onDragOver={(e) => handleDragOver(e, doc.id, "finalVersion")}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, doc.id, "finalVersion")}
                                  >
                                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <span>Soltar o seleccionar</span>
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(doc.id, "finalVersion", f.name); e.currentTarget.value = ""; }} />
                                  </label>
                                )}
                              </td>

                              {/* Estado */}
                              <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                {!isSelected ? (
                                  <span className="text-xs text-gray-300">—</span>
                                ) : isComplete ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded text-xs font-medium">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Listo
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-xs">Pendiente</span>
                                )}
                              </td>

                              {isNuevos && (
                                <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => openConfirm({ title: "Eliminar documento", message: `¿Desea eliminar "${doc.name}"?`, confirmLabel: "Eliminar", variant: "danger", onConfirm: () => { onNewDocumentsChange(newDocuments.filter((d) => d.id !== doc.id)); closeConfirm(); } })}
                                    className="w-6 h-6 flex items-center justify-center bg-red-50 text-red-400 rounded hover:bg-red-100 hover:text-red-600 transition-colors mx-auto"
                                    aria-label="Eliminar"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white py-8 text-center text-gray-500 text-sm">
                    {searchValue ? "No se encontraron resultados" : "No se han agregado documentos nuevos"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Botón siguiente */}
      <div className="flex justify-end gap-4 mt-4">
        <button
          onClick={onNext}
          disabled={selectedDocuments.length === 0}
          className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Siguiente →
        </button>
      </div>

      {/* Modal: Agregar Documento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleModalClose} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 text-base m-0">Agregar Documento</h4>
              <button onClick={handleModalClose} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                  Tipo de documento <span className="text-[#C41E3A]">*</span>
                </label>
                <select
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/40 focus:border-[#C41E3A] bg-white"
                >
                  <option value="">Seleccione un tipo de documento</option>
                  {documentNameOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">Archivo</label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-sm p-6 text-center hover:border-[#C41E3A] transition-colors cursor-pointer"
                  onClick={() => document.getElementById("modal-file-input")?.click()}
                >
                  {modalForm.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-sm text-gray-700 m-0">{modalForm.file.name}</p>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <p className="text-sm text-gray-500 m-0">Arrastra un archivo o <span className="text-[#C41E3A] font-medium">haz clic para seleccionar</span></p>
                    </>
                  )}
                </div>
                <input id="modal-file-input" type="file" className="hidden" onChange={(e) => setModalForm({ ...modalForm, file: e.target.files?.[0] ?? null })} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={handleModalClose} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">Cerrar</button>
              <button onClick={handleModalSave} disabled={!modalForm.name.trim()} className="flex-1 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium">Guardar</button>
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
