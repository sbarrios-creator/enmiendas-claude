import { useState } from 'react';
import type { Change, Document, Step3Data, ResearcherChange, InternalOperativeUnit, ExternalOperativeUnit } from '../types';
import { baseDocuments } from '../data/documents';
import { ConfirmDialog } from './ConfirmDialog';

interface DefineChangesProps {
  selectedDocuments: string[];
  newDocuments: Document[];
  changes: Change[];
  onChangesUpdate: (changes: Change[]) => void;
  step3Data: Step3Data;
  onStep3DataChange: (data: Step3Data) => void;
  onNext: () => void;
  onBack: () => void;
}

const commonFields = [
  'Nombre del estudio',
  'Investigador principal',
  'Institución',
  'Contacto de emergencia',
  'Número de protocolo',
  'Vigencia',
  'Otro (personalizado)',
];

export function DefineChanges({ selectedDocuments, newDocuments, changes, onChangesUpdate, step3Data, onStep3DataChange, onNext, onBack }: DefineChangesProps) {
  const [showAddChange, setShowAddChange] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [docPickerSearch, setDocPickerSearch] = useState('');
  const [newChange, setNewChange] = useState({
    field: '',
    customField: '',
    oldValue: '',
    newValue: '',
    justification: '',
    appliesTo: [] as string[],
    isGlobal: true,
  });

  // Aliases para legibilidad
  const modifiesTitleOrSummary = step3Data.modifiesTitleOrSummary;
  const modifiesOperativeUnits = step3Data.modifiesOperativeUnits;
  const modifiesResearchers = step3Data.modifiesResearchers;
  const titleSummaryData = step3Data.titleSummaryData;
  const operativeUnitsData = step3Data.operativeUnitsData;
  const researchers = step3Data.researchers;

  const setModifiesTitleOrSummary = (v: 'NO' | 'SI') =>
    onStep3DataChange({ ...step3Data, modifiesTitleOrSummary: v });
  const setModifiesOperativeUnits = (v: 'NO' | 'SI') =>
    onStep3DataChange({ ...step3Data, modifiesOperativeUnits: v });
  const setModifiesResearchers = (v: 'NO' | 'SI') =>
    onStep3DataChange({ ...step3Data, modifiesResearchers: v });
  const setTitleSummaryData = (d: { title: string; summary: string }) =>
    onStep3DataChange({ ...step3Data, titleSummaryData: d });
  const setOperativeUnitsData = (d: { internalUnits: InternalOperativeUnit[]; externalUnits: ExternalOperativeUnit[] }) =>
    onStep3DataChange({ ...step3Data, operativeUnitsData: d });
  const setResearchers = (r: ResearcherChange[]) =>
    onStep3DataChange({ ...step3Data, researchers: r });

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

  // Estado para modal de cambios por documento
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const handleOpenAddForDoc = (docId: string) => {
    setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', appliesTo: [docId], isGlobal: false });
    setActiveDocId(docId);
    setEditingId(null);
    setShowAddChange(true);
  };

  const handleCloseModal = () => {
    setShowAddChange(false);
    setEditingId(null);
    setActiveDocId(null);
    setDocPickerSearch('');
    setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', appliesTo: [], isGlobal: true });
  };

  const CATEGORY_ORDER = [
    'Presupuesto del estudio',
    'Proyecto de investigación',
    'Consentimiento informado',
    'Asentimientos',
    'Instrumentos del proyecto',
  ];

  const allDocuments = [
    ...baseDocuments,
    ...newDocuments.map((d) => ({ ...d, category: 'Instrumentos del proyecto' })),
  ];
  const documents = allDocuments.filter((doc) => selectedDocuments.includes(doc.id));

  const getDocCategory = (doc: (typeof allDocuments)[number]) =>
    (doc as { category?: string }).category || 'Instrumentos del proyecto';

  // Documentos disponibles agrupados por las 5 categorías
  const groupedAvailable = (filtered: typeof documents) =>
    CATEGORY_ORDER.map((cat) => ({
      category: cat,
      docs: filtered.filter((d) => getDocCategory(d) === cat),
    })).filter((g) => g.docs.length > 0);
  // Cambios agrupados
  const globalChanges = changes.filter((c) => c.isGlobal);
  const getChangesForDoc = (docId: string) => changes.filter((c) => !c.isGlobal && c.appliesTo.includes(docId));
  const docHasChanges = (docId: string) => globalChanges.length > 0 || getChangesForDoc(docId).length > 0;
  const docsWithChanges = documents.filter((doc) => docHasChanges(doc.id)).length;
  const allDocsHaveChanges = documents.length > 0 && documents.every((doc) => docHasChanges(doc.id));

  // Operative units form state
  const [showAddInternal, setShowAddInternal] = useState(false);
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [newInternal, setNewInternal] = useState({ name: '', isOther: false, managementUnit: '', declarationFileName: '' });
  const [internalSearch, setInternalSearch] = useState('');
  const [internalDropdownOpen, setInternalDropdownOpen] = useState(false);
  const [newExternal, setNewExternal] = useState({ name: '', approvalFileName: '' });
  const [externalSearch, setExternalSearch] = useState('');
  const [externalDropdownOpen, setExternalDropdownOpen] = useState(false);

  const openAssignInternalModal = () => {
    setNewInternal({ name: '', isOther: false, managementUnit: '', declarationFileName: '' });
    setInternalSearch('');
    setInternalDropdownOpen(false);
    setShowAddInternal(true);
  };

  const closeAssignInternalModal = () => {
    setShowAddInternal(false);
    setNewInternal({ name: '', isOther: false, managementUnit: '', declarationFileName: '' });
    setInternalSearch('');
    setInternalDropdownOpen(false);
  };

  const openAssignExternalModal = (prefillName = '') => {
    setNewExternal({ name: prefillName, approvalFileName: '' });
    setExternalSearch('');
    setExternalDropdownOpen(false);
    setShowAddExternal(true);
  };

  const closeAssignExternalModal = () => {
    setShowAddExternal(false);
    setNewExternal({ name: '', approvalFileName: '' });
    setExternalSearch('');
    setExternalDropdownOpen(false);
  };

  const INTERNAL_UNIT_OPTIONS = [
    'Unidad de Gestión Central',
    'Facultad de Medicina Alberto Hurtado',
    'Facultad de Ciencias de la Salud',
    'Instituto de Medicina Tropical',
    'Centro de Investigación Clínica',
    'Hospital Nacional Cayetano Heredia',
    'Otros',
  ];

  const internalFilterTerm = internalSearch || newInternal.name;
  const filteredInternalOptions = INTERNAL_UNIT_OPTIONS.filter((opt) =>
    opt.toLowerCase().includes(internalFilterTerm.toLowerCase())
  );

  const handleAddInternalUnit = () => {
    const name = newInternal.isOther ? newInternal.managementUnit : newInternal.name;
    if (!name || !newInternal.declarationFileName) return;
    const unit: InternalOperativeUnit = {
      id: Date.now().toString(),
      name,
      isOther: newInternal.isOther,
      managementUnit: newInternal.isOther ? newInternal.managementUnit : '',
      registrationDate: new Date().toISOString().split('T')[0],
      declarationFileName: newInternal.declarationFileName,
    };
    setOperativeUnitsData({
      ...operativeUnitsData,
      internalUnits: [...operativeUnitsData.internalUnits, unit],
    });
    closeAssignInternalModal();
  };

  const handleRemoveInternalUnit = (id: string) => {
    setOperativeUnitsData({
      ...operativeUnitsData,
      internalUnits: operativeUnitsData.internalUnits.filter((u) => u.id !== id),
    });
  };

  const EXTERNAL_UNIT_OPTIONS = [
    'Hospital Nacional Edgardo Rebagliati Martins',
    'Hospital Nacional Guillermo Almenara Irigoyen',
    'Hospital Nacional Arzobispo Loayza',
    'Hospital Nacional Dos de Mayo',
    'Instituto Nacional de Enfermedades Neoplásicas',
    'Instituto Nacional de Salud del Niño',
    'Instituto Nacional de Salud',
    'Hospital Regional de Ica',
    'Hospital Regional de Cusco',
    'Hospital Regional de Arequipa',
    'Hospital Regional de Trujillo',
    'Hospital Regional de Piura',
  ];

  const externalFilterTerm = externalSearch || newExternal.name;
  const filteredExternalOptions = EXTERNAL_UNIT_OPTIONS.filter((opt) =>
    opt.toLowerCase().includes(externalFilterTerm.toLowerCase())
  );

  const handleAddExternalUnit = () => {
    if (!newExternal.name || !newExternal.approvalFileName) return;
    const unit: ExternalOperativeUnit = {
      id: Date.now().toString(),
      name: newExternal.name,
      registrationDate: new Date().toISOString().split('T')[0],
      hasApprovalLetter: true,
      approvalFileName: newExternal.approvalFileName,
    };
    setOperativeUnitsData({
      ...operativeUnitsData,
      externalUnits: [...operativeUnitsData.externalUnits, unit],
    });
    setNewExternal({ name: '', approvalFileName: '' });
    setExternalSearch('');
    setExternalDropdownOpen(false);
    setShowAddExternal(false);
  };

  const handleRemoveExternalUnit = (id: string) => {
    setOperativeUnitsData({
      ...operativeUnitsData,
      externalUnits: operativeUnitsData.externalUnits.filter((u) => u.id !== id),
    });
  };

  // Researchers form state (local, no necesita persistir)
  const [showAddResearcher, setShowAddResearcher] = useState(false);
  const [newResearcher, setNewResearcher] = useState({
    name: '',
    email: '',
    currentRole: '',
    proposedRole: '',
    changeType: 'add' as 'add' | 'remove' | 'modify',
    justification: '',
  });


  const handleAddChange = () => {
    if (!newChange.field || !newChange.newValue || !newChange.justification) return;
    if (!newChange.isGlobal && newChange.appliesTo.length === 0) return;

    const field = newChange.field === 'Otro (personalizado)' ? newChange.customField : newChange.field;
    const appliesTo = newChange.isGlobal ? selectedDocuments : newChange.appliesTo;

    const change: Change = {
      id: Date.now().toString(),
      field,
      oldValue: newChange.oldValue,
      newValue: newChange.newValue,
      justification: newChange.justification,
      appliesTo,
      isGlobal: newChange.isGlobal,
    };

    onChangesUpdate([...changes, change]);
    setNewChange({
      field: '',
      customField: '',
      oldValue: '',
      newValue: '',
      justification: '',
      appliesTo: [],
      isGlobal: true,
    });
    setShowAddChange(false);
  };

  const handleRemoveChange = (id: string) => {
    onChangesUpdate(changes.filter((change) => change.id !== id));
  };

  const handleEditChange = (change: Change) => {
    const isCustomField = !commonFields.slice(0, -1).includes(change.field);
    setNewChange({
      field: isCustomField ? 'Otro (personalizado)' : change.field,
      customField: isCustomField ? change.field : '',
      oldValue: change.oldValue,
      newValue: change.newValue,
      justification: change.justification,
      appliesTo: change.appliesTo,
      isGlobal: change.isGlobal,
    });
    setEditingId(change.id);
    setActiveDocId(null);
    setShowAddChange(true);
  };

  const handleSaveEdit = () => {
    if (!newChange.newValue || !editingId) return;
    const field = newChange.field === 'Otro (personalizado)' ? newChange.customField : newChange.field;
    const appliesTo = newChange.isGlobal ? selectedDocuments : newChange.appliesTo;
    onChangesUpdate(changes.map((c) =>
      c.id === editingId
        ? { ...c, field, oldValue: newChange.oldValue, newValue: newChange.newValue, justification: newChange.justification, appliesTo, isGlobal: newChange.isGlobal }
        : c
    ));
    handleCloseModal();
  };

  const handleToggleDocument = (docId: string) => {
    if (newChange.appliesTo.includes(docId)) {
      setNewChange({
        ...newChange,
        appliesTo: newChange.appliesTo.filter((id) => id !== docId),
      });
    } else {
      setNewChange({
        ...newChange,
        appliesTo: [...newChange.appliesTo, docId],
      });
    }
  };

  const handleAddResearcher = () => {
    if (!newResearcher.name || !newResearcher.email) return;

    const researcher = {
      id: Date.now().toString(),
      name: newResearcher.name,
      email: newResearcher.email,
      currentRole: newResearcher.currentRole,
      proposedRole: newResearcher.proposedRole,
      changeType: newResearcher.changeType,
      justification: newResearcher.justification,
    };

    setResearchers([...researchers, researcher]);
    setNewResearcher({
      name: '',
      email: '',
      currentRole: '',
      proposedRole: '',
      changeType: 'add',
      justification: '',
    });
    setShowAddResearcher(false);
  };

  const handleRemoveResearcher = (id: string) => {
    setResearchers(researchers.filter((r) => r.id !== id));
  };

  const researcherRoles = [
    'Investigador Principal',
    'Co-investigador',
    'Investigador Secundario',
    'Asesor',
    'Co-asesor',
    'Tesista',
    'Asistente de Investigación',
    'Coordinador de Proyecto',
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Redacción de cambio</h2>
        <p className="text-sm text-gray-600">
          Complete las secciones según los cambios que desee realizar en su enmienda
        </p>
      </div>

      {/* Questions Section - Card Layout */}
      <div className="mb-6 space-y-4">
        {/* Card 1: Título y Resumen */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 m-0">Título y Resumen</h3>
                <p className="text-sm text-gray-600 m-0 mt-1">¿Modificará el título o resumen del estudio?</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModifiesTitleOrSummary('NO')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    modifiesTitleOrSummary === 'NO'
                      ? 'bg-[#C41E3A] text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  NO
                </button>
                <button
                  onClick={() => setModifiesTitleOrSummary('SI')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    modifiesTitleOrSummary === 'SI'
                      ? 'bg-[#C41E3A] text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  SÍ
                </button>
              </div>
            </div>
          </div>

          {modifiesTitleOrSummary === 'SI' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Nuevo título</label>
                <input
                  type="text"
                  value={titleSummaryData.title}
                  onChange={(e) => setTitleSummaryData({ ...titleSummaryData, title: e.target.value })}
                  placeholder="Ingrese el nuevo título del estudio"
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Nuevo resumen</label>
                <textarea
                  value={titleSummaryData.summary}
                  onChange={(e) => setTitleSummaryData({ ...titleSummaryData, summary: e.target.value })}
                  placeholder="Ingrese el nuevo resumen del estudio"
                  rows={4}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Unidades Operativas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 m-0">Unidades Operativas</h3>
                <p className="text-sm text-gray-600 m-0 mt-1">¿Modificará las unidades operativas del estudio?</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModifiesOperativeUnits('NO')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    modifiesOperativeUnits === 'NO'
                      ? 'bg-[#C41E3A] text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  NO
                </button>
                <button
                  onClick={() => setModifiesOperativeUnits('SI')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    modifiesOperativeUnits === 'SI'
                      ? 'bg-[#C41E3A] text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  SÍ
                </button>
              </div>
            </div>
          </div>

        {modifiesOperativeUnits === 'SI' && (
          <div className="p-4 space-y-6">

            {/* ── Unidades Internas ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800 m-0">Unidades Internas</h4>
                {!showAddInternal && (
                  <button
                    onClick={openAssignInternalModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-xs font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Agregar
                  </button>
                )}
              </div>

              {/* Modal: asignar unidad operativa interna al proyecto */}
              {showAddInternal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#C41E3A] px-5 py-4 flex items-center justify-between">
                      <h3 className="text-white text-base font-semibold m-0">Asignar unidad operativa interna</h3>
                      <button
                        onClick={closeAssignInternalModal}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-5">

                      {/* Search / select internal unit */}
                      <div className="relative">
                        <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                          Buscar unidad operativa por su nombre
                        </label>
                        <div
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded cursor-pointer bg-white hover:border-[#C41E3A] focus-within:ring-2 focus-within:ring-[#C41E3A] focus-within:border-transparent"
                          onClick={() => setInternalDropdownOpen(true)}
                        >
                          <input
                            type="text"
                            value={newInternal.name && !newInternal.isOther ? newInternal.name : internalSearch}
                            onChange={(e) => {
                              setInternalSearch(e.target.value);
                              setNewInternal({ ...newInternal, name: '', isOther: false, managementUnit: '' });
                              setInternalDropdownOpen(true);
                            }}
                            onFocus={() => setInternalDropdownOpen(true)}
                            placeholder="Buscar unidad operativa por su nombre ▼"
                            className="flex-1 outline-none text-sm text-gray-700 bg-transparent placeholder-gray-400"
                          />
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>

                        {internalDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredInternalOptions.length > 0 ? (
                              filteredInternalOptions.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    if (opt === 'Otros') {
                                      setNewInternal({ ...newInternal, name: 'Otros', isOther: true, managementUnit: '' });
                                    } else {
                                      setNewInternal({ ...newInternal, name: opt, isOther: false, managementUnit: '' });
                                    }
                                    setInternalSearch('');
                                    setInternalDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-[#C41E3A] transition-colors"
                                >
                                  {opt}
                                </button>
                              ))
                            ) : (
                              internalSearch.trim() && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setNewInternal({ ...newInternal, name: internalSearch.trim(), isOther: false, managementUnit: '' });
                                    setInternalSearch('');
                                    setInternalDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 italic"
                                >
                                  Usar "{internalSearch.trim()}"
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* Custom name when "Otros" selected */}
                      {newInternal.isOther && (
                        <div>
                          <label className="block mb-1.5 text-sm font-semibold text-gray-700">Especifique la unidad de gestión *</label>
                          <input
                            type="text"
                            value={newInternal.managementUnit}
                            onChange={(e) => setNewInternal({ ...newInternal, managementUnit: e.target.value })}
                            placeholder="Nombre de la unidad de gestión"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                          />
                        </div>
                      )}

                      {/* File upload */}
                      <div>
                        <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                          Carta de declaración del jefe de unidad operativa
                        </label>
                        {newInternal.declarationFileName ? (
                          <div className="flex items-center gap-3 bg-green-50 border border-green-300 rounded-lg px-4 py-3">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="text-sm text-green-800 font-medium flex-1 truncate">{newInternal.declarationFileName}</span>
                            <button
                              onClick={() => setNewInternal({ ...newInternal, declarationFileName: '' })}
                              className="text-green-600 hover:text-red-600 flex-shrink-0 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : (
                          <label
                            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-[#C41E3A] hover:bg-red-50 transition-colors group"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files?.[0];
                              if (f) setNewInternal({ ...newInternal, declarationFileName: f.name });
                            }}
                          >
                            <svg className="w-8 h-8 text-gray-400 group-hover:text-[#C41E3A] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <span className="text-sm text-gray-500 group-hover:text-[#C41E3A] transition-colors text-center">
                              Arrastra el archivo aquí o{' '}
                              <span className="font-semibold underline">haz clic para subir</span>
                            </span>
                            <span className="text-xs text-gray-400">PDF, DOCX — máx. 200 MB</span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setNewInternal({ ...newInternal, declarationFileName: f.name });
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 pb-5 flex gap-3">
                      <button
                        onClick={closeAssignInternalModal}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddInternalUnit}
                        disabled={!(newInternal.isOther ? newInternal.managementUnit : newInternal.name) || !newInternal.declarationFileName}
                        className="flex-1 px-4 py-2 bg-[#C41E3A] text-white rounded-lg hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Internal units list */}
              {operativeUnitsData.internalUnits.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Unidad</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha de registro</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase w-48">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {operativeUnitsData.internalUnits.map((unit) => (
                        <tr key={unit.id} className="bg-white hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800">{unit.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {unit.registrationDate
                              ? new Date(unit.registrationDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-3">
                              <button onClick={() => alert('Ver: ' + unit.name)} className="text-xs text-gray-500 hover:text-gray-800 underline">Ver</button>
                              <button onClick={() => alert('Descargando: ' + unit.name)} className="text-xs text-gray-500 hover:text-gray-800 underline">Descargar</button>
                              <button onClick={() => openConfirm({ title: 'Eliminar unidad interna', message: `¿Desea eliminar la unidad "${unit.name}"? Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleRemoveInternalUnit(unit.id); closeConfirm(); } })} className="text-xs text-red-500 hover:text-red-700 underline">Deshacer</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-5 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  No se han agregado unidades internas
                </div>
              )}
            </div>

            {/* ── Unidades Externas ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800 m-0">Unidades Externas</h4>
                {!showAddExternal && (
                  <button
                    onClick={() => openAssignExternalModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-xs font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Agregar
                  </button>
                )}
              </div>

              {/* Modal: asignar unidad operativa al proyecto */}
              {showAddExternal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#C41E3A] px-5 py-4 flex items-center justify-between">
                      <h3 className="text-white text-base font-semibold m-0">Asignar unidad operativa al proyecto</h3>
                      <button
                        onClick={closeAssignExternalModal}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-5">

                      {/* Search / select unit */}
                      <div className="relative">
                        <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                          Buscar unidad operativa por su nombre
                        </label>
                        <div
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded cursor-pointer bg-white hover:border-[#C41E3A] focus-within:ring-2 focus-within:ring-[#C41E3A] focus-within:border-transparent"
                          onClick={() => setExternalDropdownOpen(true)}
                        >
                          <input
                            type="text"
                            value={newExternal.name || externalSearch}
                            onChange={(e) => {
                              setExternalSearch(e.target.value);
                              setNewExternal({ ...newExternal, name: '' });
                              setExternalDropdownOpen(true);
                            }}
                            onFocus={() => setExternalDropdownOpen(true)}
                            placeholder="Buscar unidad operativa por su nombre ▼"
                            className="flex-1 outline-none text-sm text-gray-700 bg-transparent placeholder-gray-400"
                          />
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>

                        {externalDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredExternalOptions.length > 0 ? (
                              filteredExternalOptions.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setNewExternal({ ...newExternal, name: opt });
                                    setExternalSearch('');
                                    setExternalDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-[#C41E3A] transition-colors"
                                >
                                  {opt}
                                </button>
                              ))
                            ) : (
                              externalSearch.trim() && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setNewExternal({ ...newExternal, name: externalSearch.trim() });
                                    setExternalSearch('');
                                    setExternalDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 italic"
                                >
                                  Usar "{externalSearch.trim()}"
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* File upload */}
                      <div>
                        <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                          Carta de declaración del jefe de unidad operativa
                        </label>
                        {newExternal.approvalFileName ? (
                          <div className="flex items-center gap-3 bg-green-50 border border-green-300 rounded-lg px-4 py-3">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="text-sm text-green-800 font-medium flex-1 truncate">{newExternal.approvalFileName}</span>
                            <button
                              onClick={() => setNewExternal({ ...newExternal, approvalFileName: '' })}
                              className="text-green-600 hover:text-red-600 flex-shrink-0 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : (
                          <label
                            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-[#C41E3A] hover:bg-red-50 transition-colors group"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files?.[0];
                              if (f) setNewExternal({ ...newExternal, approvalFileName: f.name });
                            }}
                          >
                            <svg className="w-8 h-8 text-gray-400 group-hover:text-[#C41E3A] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <span className="text-sm text-gray-500 group-hover:text-[#C41E3A] transition-colors text-center">
                              Arrastra el archivo aquí o{' '}
                              <span className="font-semibold underline">haz clic para subir</span>
                            </span>
                            <span className="text-xs text-gray-400">PDF, DOCX — máx. 200 MB</span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setNewExternal({ ...newExternal, approvalFileName: f.name });
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 pb-5 flex gap-3">
                      <button
                        onClick={closeAssignExternalModal}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddExternalUnit}
                        disabled={!newExternal.name || !newExternal.approvalFileName}
                        className="flex-1 px-4 py-2 bg-[#C41E3A] text-white rounded-lg hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* External units list */}
              {operativeUnitsData.externalUnits.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Unidad</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha de registro</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase w-48">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {operativeUnitsData.externalUnits.map((unit) => (
                        <tr key={unit.id} className="bg-white hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800">{unit.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(unit.registrationDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-3">
                              <button onClick={() => alert('Ver: ' + unit.name)} className="text-xs text-gray-500 hover:text-gray-800 underline">Ver</button>
                              <button onClick={() => alert('Descargando: ' + unit.name)} className="text-xs text-gray-500 hover:text-gray-800 underline">Descargar</button>
<button onClick={() => openConfirm({ title: 'Eliminar unidad externa', message: `¿Desea eliminar la unidad "${unit.name}"? Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleRemoveExternalUnit(unit.id); closeConfirm(); } })} className="text-xs text-red-500 hover:text-red-700 underline">Deshacer</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-5 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  No se han agregado unidades externas
                </div>
              )}
            </div>

          </div>
        )}
      </div>

        {/* Card 3: Investigadores */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 m-0">Equipo de Investigación</h3>
                <p className="text-sm text-gray-600 m-0 mt-1">¿Modificará investigadores, tesistas, asesores o coasesores?</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModifiesResearchers('NO')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    modifiesResearchers === 'NO'
                      ? 'bg-[#C41E3A] text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  NO
                </button>
                <button
                  onClick={() => setModifiesResearchers('SI')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    modifiesResearchers === 'SI'
                      ? 'bg-[#C41E3A] text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  SÍ
                </button>
              </div>
            </div>
          </div>

        {modifiesResearchers === 'SI' && (
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r">
              <p className="text-sm text-blue-900 m-0">
                <strong>Nota:</strong> Agregue cada modificación haciendo clic en el botón "+ Agregar".
              </p>
            </div>

            {/* Existing Researchers List */}
            {researchers.length > 0 && (
              <div>
                <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rol actual</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rol propuesto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {researchers.map((researcher, index) => (
                        <tr key={researcher.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{researcher.name}</div>
                            <div className="text-xs text-gray-500">{researcher.email}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {researcher.currentRole || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {researcher.proposedRole || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              researcher.changeType === 'add'
                                ? 'bg-green-100 text-green-800'
                                : researcher.changeType === 'remove'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {researcher.changeType === 'add' ? 'Agregar' : researcher.changeType === 'remove' ? 'Retirar' : 'Modificar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openConfirm({ title: 'Eliminar investigador', message: `¿Desea eliminar a "${researcher.name}" del equipo de investigación?`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleRemoveResearcher(researcher.id); closeConfirm(); } })}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Add Researcher Button */}
            {!showAddResearcher && (
              <button
                  onClick={() => setShowAddResearcher(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              )}

              {/* Add Researcher Form */}
              {showAddResearcher && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-5 space-y-4">
                  <h4 className="font-semibold text-gray-900 text-base m-0">Agregar cambio en equipo</h4>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">Tipo de cambio *</label>
                    <select
                      value={newResearcher.changeType}
                      onChange={(e) => setNewResearcher({ ...newResearcher, changeType: e.target.value as 'add' | 'remove' | 'modify' })}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
                    >
                      <option value="add">Agregar nuevo investigador</option>
                      <option value="modify">Modificar rol de investigador</option>
                      <option value="remove">Retirar investigador</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">Nombre completo *</label>
                      <input
                        type="text"
                        value={newResearcher.name}
                        onChange={(e) => setNewResearcher({ ...newResearcher, name: e.target.value })}
                        placeholder="Ej: Juan Pérez García"
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">Correo electrónico *</label>
                      <input
                        type="email"
                        value={newResearcher.email}
                        onChange={(e) => setNewResearcher({ ...newResearcher, email: e.target.value })}
                        placeholder="ejemplo@upch.pe"
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {newResearcher.changeType !== 'add' && (
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">Rol actual</label>
                      <select
                        value={newResearcher.currentRole}
                        onChange={(e) => setNewResearcher({ ...newResearcher, currentRole: e.target.value })}
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
                      >
                        <option value="">Seleccione rol actual</option>
                        {researcherRoles.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {newResearcher.changeType !== 'remove' && (
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">Rol propuesto *</label>
                      <select
                        value={newResearcher.proposedRole}
                        onChange={(e) => setNewResearcher({ ...newResearcher, proposedRole: e.target.value })}
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
                      >
                        <option value="">Seleccione rol propuesto</option>
                        {researcherRoles.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">Justificación *</label>
                    <textarea
                      value={newResearcher.justification}
                      onChange={(e) => setNewResearcher({ ...newResearcher, justification: e.target.value })}
                      placeholder="Describa la justificación para este cambio"
                      rows={3}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowAddResearcher(false);
                        setNewResearcher({
                          name: '',
                          email: '',
                          currentRole: '',
                          proposedRole: '',
                          changeType: 'add',
                          justification: '',
                        });
                      }}
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddResearcher}
                      disabled={!newResearcher.name || !newResearcher.email || !newResearcher.justification || (newResearcher.changeType !== 'remove' && !newResearcher.proposedRole)}
                      className="flex-1 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Agregar a la lista
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 4: Otros Cambios en Documentos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header con progreso */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 m-0">Otros Cambios en Documentos</h3>
                <p className="text-sm text-gray-600 m-0 mt-0.5">Agregue al menos un cambio por documento seleccionado</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 m-0">Cambios registrados</p>
                <p className={`text-sm font-bold m-0 ${changes.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {changes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Buscador + Botón agregar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cambio..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />
              </div>
              <button
                onClick={() => {
                  setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', appliesTo: [], isGlobal: true });
                  setEditingId(null);
                  setActiveDocId(null);
                  setShowAddChange(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar cambio
              </button>
            </div>

            {/* Tabla unificada */}
            {changes.length > 0 && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Cambio</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Valor Anterior</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Valor Nuevo</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Justificación</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Documentos</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-600 w-20">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(searchQuery
                        ? changes.filter((c) => {
                            const q = searchQuery.toLowerCase();
                            return c.field.toLowerCase().includes(q) || c.oldValue.toLowerCase().includes(q) || c.newValue.toLowerCase().includes(q) || c.justification.toLowerCase().includes(q);
                          })
                        : changes
                      ).map((change, idx) => (
                        <tr key={change.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 max-w-[140px]">
                            <p className="truncate text-gray-800 font-medium m-0" title={change.field}>{change.field || '—'}</p>
                          </td>
                          <td className="px-3 py-2 max-w-[120px]">
                            <p className="truncate text-gray-500 line-through m-0" title={change.oldValue}>{change.oldValue || '—'}</p>
                          </td>
                          <td className="px-3 py-2 max-w-[120px]">
                            <p className="truncate text-green-700 font-semibold m-0" title={change.newValue}>{change.newValue}</p>
                          </td>
                          <td className="px-3 py-2 max-w-[160px]">
                            <p className="truncate text-gray-500 m-0" title={change.justification}>{change.justification || '—'}</p>
                          </td>
                          <td className="px-3 py-2 max-w-[200px]">
                            {(() => {
                              const names = change.appliesTo
                                .map(id => documents.find(d => d.id === id)?.name)
                                .filter(Boolean) as string[];
                              if (names.length === 0) return <span className="text-gray-400 text-xs">—</span>;
                              return (
                                <ul className="space-y-1 m-0 p-0 list-none">
                                  {names.map((name, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C41E3A] shrink-0" />
                                      <span className="text-xs text-gray-700 leading-snug">{name}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleEditChange(change)} className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" title="Editar">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => openConfirm({ title: 'Eliminar cambio', message: `¿Desea eliminar el cambio en el campo "${change.field}"? Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleRemoveChange(change.id); closeConfirm(); } })} className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors" title="Eliminar">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {changes.length === 0 && (
              <p className="text-sm text-gray-400 italic">Aún no hay cambios registrados. Usa el botón para agregar.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Agregar / Editar cambio */}
      {showAddChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />

          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h4 className="font-semibold text-gray-900 text-base m-0">
                  {editingId ? 'Editar cambio' : 'Nuevo cambio'}
                </h4>
                {activeDocId && !editingId && (
                  <p className="text-xs text-gray-500 m-0 mt-0.5">
                    Documento: <span className="font-medium text-gray-700">{documents.find(d => d.id === activeDocId)?.name}</span>
                  </p>
                )}
                {editingId && (
                  <p className="text-xs text-gray-500 m-0 mt-0.5">
                    Alcance: <span className="font-medium text-gray-700">{newChange.isGlobal ? 'Todos los documentos' : `${newChange.appliesTo.length} documento(s)`}</span>
                  </p>
                )}
              </div>
              <button onClick={handleCloseModal} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* Cambio a Realizar */}
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">Cambio a Realizar <span className="text-[#C41E3A]">*</span></label>
                <p className="text-xs text-gray-400 mb-2 m-0">Nombre o descripción del cambio que se realizará</p>
                <input
                  type="text"
                  value={newChange.field === 'Otro (personalizado)' ? newChange.customField : newChange.field}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (commonFields.slice(0, -1).includes(val)) {
                      setNewChange({ ...newChange, field: val, customField: '' });
                    } else {
                      setNewChange({ ...newChange, field: 'Otro (personalizado)', customField: val });
                    }
                  }}
                  placeholder="Ej: Cambio de investigador principal"
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />
              </div>

              {/* Valor Anterior / Valor Nuevo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Valor Anterior</label>
                  <p className="text-xs text-gray-400 mb-2 m-0">Texto o valor actual en el documento</p>
                  <input
                    type="text"
                    value={newChange.oldValue}
                    onChange={(e) => setNewChange({ ...newChange, oldValue: e.target.value })}
                    placeholder="Ej: Dr. Juan Pérez"
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Valor Nuevo <span className="text-[#C41E3A]">*</span></label>
                  <p className="text-xs text-gray-400 mb-2 m-0">Texto o valor que reemplazará al anterior</p>
                  <input
                    type="text"
                    value={newChange.newValue}
                    onChange={(e) => setNewChange({ ...newChange, newValue: e.target.value })}
                    placeholder="Ej: Dra. María García"
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Justificación */}
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">Justificación <span className="text-[#C41E3A]">*</span></label>
                <p className="text-xs text-gray-400 mb-2 m-0">Explique el motivo del cambio. Ej: El investigador principal cambió de institución y fue reemplazado formalmente.</p>
                <textarea
                  value={newChange.justification}
                  onChange={(e) => setNewChange({ ...newChange, justification: e.target.value })}
                  placeholder="Ej: Se actualiza el nombre del investigador principal debido a su designación oficial mediante resolución N° 123-2025."
                  rows={3}
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />
              </div>

              {/* Alcance */}
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-gray-700">Alcance del cambio <span className="text-[#C41E3A]">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Lista disponible */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 m-0 mb-1.5">Disponibles</p>
                      {newChange.appliesTo.length === 0 && (
                        <div className="relative">
                          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Buscar..."
                            value={docPickerSearch}
                            onChange={(e) => setDocPickerSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      {(() => {
                        const available = documents.filter(
                          (doc) =>
                            !newChange.appliesTo.includes(doc.id) &&
                            doc.name.toLowerCase().includes(docPickerSearch.toLowerCase())
                        );
                        const groups = groupedAvailable(available);
                        if (groups.length === 0 && docPickerSearch.trim())
                          return <p className="px-3 py-3 text-xs text-gray-400 text-center m-0">Sin resultados</p>;
                        if (groups.length === 0)
                          return null;
                        return groups.map((group) => (
                          <div key={group.category} className="border-b border-gray-100">
                            <div className="px-3 py-1.5 bg-gray-100 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">{group.category}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const toAdd = group.docs.map((d) => d.id).filter((id) => !newChange.appliesTo.includes(id));
                                  setNewChange({ ...newChange, isGlobal: false, appliesTo: [...newChange.appliesTo, ...toAdd] });
                                }}
                                className="shrink-0 text-[10px] text-[#C41E3A] hover:underline font-medium"
                              >
                                Agregar todos
                              </button>
                            </div>
                            {group.docs.map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => setNewChange({ ...newChange, isGlobal: false, appliesTo: [...newChange.appliesTo, doc.id] })}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-red-50 hover:text-[#C41E3A] transition-colors border-t border-gray-100"
                              >
                                {doc.name}
                              </button>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="bg-gray-50 border-t border-gray-200 px-3 py-1.5 flex justify-between items-center">
                      <span className="text-xs text-gray-500">{documents.length - newChange.appliesTo.length} disponibles</span>
                      {documents.length - newChange.appliesTo.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewChange({ ...newChange, isGlobal: true, appliesTo: documents.map(d => d.id) })}
                          className="text-xs text-[#C41E3A] hover:underline font-medium"
                        >
                          Agregar todos
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista seleccionados */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 m-0">Seleccionados</p>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      {newChange.appliesTo.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-gray-400 text-center m-0">Ninguno seleccionado</p>
                      ) : (
                        groupedAvailable(documents.filter((d) => newChange.appliesTo.includes(d.id))).map((group) => (
                          <div key={group.category} className="border-b border-gray-100">
                            <div className="px-3 py-1.5 bg-gray-100 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">{group.category}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const toRemove = group.docs.map((d) => d.id);
                                  setNewChange({ ...newChange, isGlobal: false, appliesTo: newChange.appliesTo.filter((id) => !toRemove.includes(id)) });
                                }}
                                className="shrink-0 text-[10px] text-red-600 hover:underline font-medium"
                              >
                                Quitar todos
                              </button>
                            </div>
                            {group.docs.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100">
                                <span className="text-xs text-gray-700 truncate flex-1">{doc.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setNewChange({ ...newChange, isGlobal: false, appliesTo: newChange.appliesTo.filter((a) => a !== doc.id) })}
                                  className="shrink-0 w-4 h-4 flex items-center justify-center rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="bg-gray-50 border-t border-gray-200 px-3 py-1.5 flex justify-between items-center">
                      <span className="text-xs text-gray-500">{newChange.appliesTo.length} seleccionados</span>
                      {newChange.appliesTo.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewChange({ ...newChange, isGlobal: false, appliesTo: [] })}
                          className="text-xs text-red-600 hover:underline font-medium"
                        >
                          Quitar todos
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={editingId ? handleSaveEdit : handleAddChange}
                disabled={!newChange.field || (newChange.field === 'Otro (personalizado)' && !newChange.customField) || !newChange.newValue || !newChange.justification || (!newChange.isGlobal && newChange.appliesTo.length === 0)}
                className="flex-1 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {editingId ? 'Guardar cambios' : 'Agregar cambio'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              title: 'Continuar al resumen',
              message: 'Ha definido los cambios de la enmienda. ¿Desea continuar al resumen final?',
              confirmLabel: 'Continuar',
              variant: 'primary',
              onConfirm: () => { closeConfirm(); onNext(); },
            })
          }
          disabled={!allDocsHaveChanges}
          className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Continuar al resumen →
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
