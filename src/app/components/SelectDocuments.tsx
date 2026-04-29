import { useState } from "react";
import type { Document } from "../types";
import { baseDocuments } from "../data/documents";
import { ConfirmDialog } from "./ConfirmDialog";

interface SelectDocumentsProps {
  selectedDocuments: string[];
  onSelectDocuments: (ids: string[]) => void;
  newDocuments: Document[];
  onNewDocumentsChange: (docs: Document[]) => void;
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

export function SelectDocuments({
  selectedDocuments,
  onSelectDocuments,
  newDocuments,
  onNewDocumentsChange,
  onNext,
}: SelectDocumentsProps) {
  const [sectionSearches, setSectionSearches] = useState<
    Record<string, string>
  >({});
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "",
    file: null as File | null,
  });

  // ✅ Estado para el tab activo
  const [activeTab, setActiveTab] = useState<string>("Presupuesto del estudio");

  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "warning" | "primary";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const openConfirm = (opts: Omit<typeof confirm, "isOpen">) =>
    setConfirm({ isOpen: true, ...opts });
  const closeConfirm = () =>
    setConfirm((c) => ({ ...c, isOpen: false }));

  const documents = [...baseDocuments, ...newDocuments];

  const handleModalSave = () => {
    if (!modalForm.name) return;
    const newDoc: Document = {
      id: Date.now().toString(),
      name: modalForm.name,
      type: "Nuevo",
      status: "Aprobado",
      version: "1",
    };
    onNewDocumentsChange([...newDocuments, newDoc]);
    setShowModal(false);
    setModalForm({ name: "", file: null });
  };

  const handleModalClose = () => {
    setShowModal(false);
    setModalForm({ name: "", file: null });
  };

  const handleToggleDocument = (id: string) => {
    if (selectedDocuments.includes(id)) {
      onSelectDocuments(
        selectedDocuments.filter((docId) => docId !== id),
      );
    } else {
      onSelectDocuments([...selectedDocuments, id]);
    }
  };

  const handleToggleSection = (sectionDocs: Document[]) => {
    const sectionIds = sectionDocs.map((doc) => doc.id);
    const allSelected = sectionIds.every((id) =>
      selectedDocuments.includes(id),
    );
    if (allSelected) {
      onSelectDocuments(
        selectedDocuments.filter(
          (id) => !sectionIds.includes(id),
        ),
      );
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
    const allSelected = allIds.every((id) =>
      selectedDocuments.includes(id),
    );
    if (allSelected) {
      onSelectDocuments([]);
    } else {
      onSelectDocuments(allIds);
    }
  };

  const getCategory = (doc: Document) =>
    (doc as { category?: string }).category ?? "";

  const sections: DocumentSection[] = [
    {
      title: "Presupuesto del estudio",
      documents: documents.filter(
        (doc) => getCategory(doc) === "Presupuesto del estudio",
      ),
    },
    {
      title: "Proyecto de investigación",
      documents: documents.filter(
        (doc) =>
          getCategory(doc) === "Proyecto de investigación",
      ),
    },
    {
      title: "Consentimiento informado",
      documents: documents.filter(
        (doc) =>
          getCategory(doc) === "Consentimiento informado",
      ),
    },
    {
      title: "Asentimientos",
      documents: documents.filter(
        (doc) => getCategory(doc) === "Asentimientos",
      ),
    },
    {
      title: "Instrumentos del proyecto",
      documents: documents.filter(
        (doc) =>
          getCategory(doc) === "Instrumentos del proyecto",
      ),
    },
    {
      title: "Documentos Nuevos",
      documents: documents.filter(
        (doc) => doc.type === "Nuevo",
      ),
    },
  ];

  // ✅ Secciones filtradas según el tab activo
  const visibleSections =
    activeTab === "Resumen"
      ? sections.filter((s) => s.documents.length > 0)
      : sections.filter(
          (s) => s.title === activeTab && s.documents.length > 0,
        );

  // ✅ Total de documentos seleccionados
  const totalSelected = selectedDocuments.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 m-0">
          Documentos aprobados y vigentes de la investigación
        </h3>
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{documents.every((doc) => selectedDocuments.includes(doc.id)) ? "Deseleccionar todos" : "Seleccionar todos"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={() => setActiveTab("Resumen")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "Resumen"
              ? "bg-[#C41E3A] text-white"
              : "border border-gray-300 text-gray-500 hover:bg-gray-50"
          }`}
        >
          Resumen
          <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
            activeTab === "Resumen"
              ? "bg-white/20 text-white"
              : totalSelected > 0
                ? "bg-[#C41E3A]/10 text-[#C41E3A]"
                : "bg-gray-100 text-gray-400"
          }`}>
            {totalSelected}/{documents.length}
          </span>
        </button>
        {sections
          .filter((s) => s.documents.length > 0)
          .map((section) => {
            const sectionSelected = section.documents.filter(
              (d) => selectedDocuments.includes(d.id),
            ).length;
            const isActive = activeTab === section.title;
            return (
              <button
                key={section.title}
                onClick={() => setActiveTab(section.title)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#C41E3A] text-white"
                    : "border border-gray-300 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {section.title}
                {sectionSelected > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#C41E3A]/10 text-[#C41E3A]"
                  }`}>
                    {sectionSelected}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* Tab "Todos": resumen por categoría */}
      {activeTab === "Resumen" && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {sections.filter((s) => s.documents.length > 0).map((section) => {
            const selected = section.documents.filter((d) => selectedDocuments.includes(d.id));
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
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selected.length > 0 ? 'bg-[#C41E3A]/10 text-[#C41E3A]' : 'bg-gray-100 text-gray-400'}`}>
                    {selected.length}/{total}
                  </span>
                </div>
                {selected.length > 0 ? (
                  <ul className="space-y-0.5">
                    {selected.slice(0, 3).map((d) => (
                      <li key={d.id} className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C41E3A] shrink-0" />
                        {d.name}
                      </li>
                    ))}
                    {selected.length > 3 && (
                      <li className="text-xs text-[#C41E3A] font-medium">+{selected.length - 3} más</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 italic m-0">Sin selección — clic para explorar</p>
                )}
                {allSel && selected.length > 0 && (
                  <p className="text-xs text-[#C41E3A] font-medium mt-1 m-0 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Todos seleccionados
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Document Sections filtradas por tab */}
      <div className="space-y-3">
        {activeTab !== "Resumen" && visibleSections.map((section) => {
          const isNuevos =
            section.title === "Documentos Nuevos";
          const showSearch = section.documents.length > 10;
          const searchValue =
            sectionSearches[section.title] ?? "";
          const displayDocuments = showSearch
            ? section.documents.filter((doc) =>
                doc.name
                  .toLowerCase()
                  .includes(searchValue.toLowerCase()),
              )
            : section.documents;

          if (section.documents.length === 0 && !isNuevos)
            return null;

          const allSectionSelected =
            section.documents.length > 0 &&
            section.documents.every((d) =>
              selectedDocuments.includes(d.id),
            );
          const someSectionSelected = section.documents.some(
            (d) => selectedDocuments.includes(d.id),
          );

          return (
            <div
              key={section.title}
              className="border border-gray-200 rounded-sm overflow-hidden"
            >
              {/* Section Header */}
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between gap-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {!isNuevos && (
                    <input
                      type="checkbox"
                      checked={allSectionSelected}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            someSectionSelected &&
                            !allSectionSelected;
                      }}
                      onChange={() =>
                        handleToggleSection(section.documents)
                      }
                      className="w-4 h-4 accent-[#C41E3A] cursor-pointer shrink-0"
                      title={
                        allSectionSelected
                          ? "Deseleccionar todos"
                          : "Seleccionar todos"
                      }
                    />
                  )}
                  <h4 className="m-0 text-[#C41E3A] text-sm font-semibold">
                    {section.title}
                  </h4>
                </div>
                {isNuevos && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Agregar Documentos
                  </button>
                )}
                {showSearch && (
                  <div className="relative w-72">
                    <input
                      type="text"
                      placeholder={`Buscar en ${section.title.toLowerCase()}...`}
                      value={searchValue}
                      onChange={(e) =>
                        setSectionSearches((prev) => ({
                          ...prev,
                          [section.title]: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-1.5 pl-9 text-sm border border-[#C41E3A]/20 rounded bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/40 focus:border-[#C41E3A]"
                    />
                    <svg
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
                )}
              </div>

              {/* Section Table */}
              {displayDocuments.length > 0 ? (
                <div
                  className={
                    showSearch ? "max-h-72 overflow-y-auto" : ""
                  }
                >
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {!isNuevos && (
                          <th className="px-3 py-1 text-left text-gray-400 text-xs font-medium uppercase tracking-wide w-10">
                          </th>
                        )}
                        <th className="px-3 py-1 text-left text-gray-400 text-xs font-medium uppercase tracking-wide">
                          ARCHIVO
                        </th>
                        <th className="px-3 py-1 text-center text-gray-400 text-xs font-medium uppercase tracking-wide w-20">
                          VERSIÓN
                        </th>
                        <th className="px-3 py-1 text-center text-gray-400 text-xs font-medium uppercase tracking-wide w-20">
                          ACCIONES
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {displayDocuments.map((doc, index) => {
                        const isSelected =
                          selectedDocuments.includes(doc.id);
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => !isNuevos && handleToggleDocument(doc.id)}
                            className={`bg-white ${!isNuevos ? "hover:bg-[#C41E3A]/5 cursor-pointer" : ""} transition-colors`}
                          >
                            {!isNuevos && (
                              <td className="px-3 py-1.5 border-t border-gray-200">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleDocument(doc.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 accent-[#C41E3A] rounded cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="px-3 py-1.5 border-t border-gray-200">
                              <span className={`text-sm ${isSelected ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                                {doc.name}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center border-t border-gray-200">
                              <span className="text-gray-500 text-xs">{doc.version}</span>
                            </td>
                            <td className="px-3 py-1.5 text-center border-t border-gray-200">
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openConfirm({ title: "Eliminar documento", message: `¿Desea eliminar "${doc.name}"? Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", variant: "danger", onConfirm: () => { onNewDocumentsChange(newDocuments.filter((d) => d.id !== doc.id)); closeConfirm(); } }); }}
                                  className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                  aria-label="Eliminar"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                  aria-label="Descargar"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
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
                  {searchValue
                    ? "No se encontraron resultados para tu búsqueda"
                    : "No se han agregado documentos nuevos"}
                </div>
              )}
            </div>
          );
        })}
        </div>

      {/* Selection Summary 
      {selectedDocuments.length > 0 && (
        <div className="mt-3 p-2.5 bg-[#C41E3A]/5 border border-[#C41E3A]/20 rounded-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#C41E3A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-900 font-medium">
                {selectedDocuments.length} {selectedDocuments.length === 1 ? "documento seleccionado" : "documentos seleccionados"}
              </span>
            </div>
            <button
              onClick={() => openConfirm({ title: "Limpiar selección", message: "¿Desea deseleccionar todos los documentos?", confirmLabel: "Limpiar", variant: "warning", onConfirm: () => { onSelectDocuments([]); closeConfirm(); } })}
              className="text-xs text-[#C41E3A] hover:text-[#A01828] underline"
            >
              Limpiar selección
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sections.filter((s) => s.documents.some((d) => selectedDocuments.includes(d.id))).map((section) => {
              const count = section.documents.filter((d) => selectedDocuments.includes(d.id)).length;
              const total = section.documents.length;
              return (
                <span key={section.title} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-[#C41E3A]/20 rounded text-xs text-gray-600">
                  <span className="font-medium text-[#C41E3A]">{count}/{total}</span>
                  {section.title}
                </span>
              );
            })}
          </div>
        </div>
      )}*/}

      {/* Action Buttons */}
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
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleModalClose}
          />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 text-base m-0">
                Agregar Documento
              </h4>
              <button
                onClick={handleModalClose}
                aria-label="Cerrar"
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                  Tipo de documento{" "}
                  <span className="text-[#C41E3A]">*</span>
                </label>
                <select
                  value={modalForm.name}
                  onChange={(e) =>
                    setModalForm({
                      ...modalForm,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
                >
                  <option value="">
                    Seleccione un tipo de documento
                  </option>
                  {documentNameOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                  Archivo
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-sm p-6 text-center hover:border-[#C41E3A] transition-colors cursor-pointer"
                  onClick={() =>
                    document
                      .getElementById("modal-file-input")
                      ?.click()
                  }
                >
                  {modalForm.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm text-gray-700 m-0">
                        {modalForm.file.name}
                      </p>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="w-8 h-8 text-gray-400 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm text-gray-500 m-0">
                        Arrastra un archivo aquí o{" "}
                        <span className="text-[#C41E3A] font-medium">
                          haz clic para seleccionar
                        </span>
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="modal-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    setModalForm({
                      ...modalForm,
                      file: e.target.files?.[0] ?? null,
                    })
                  }
                />
              </div>
            </div>

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