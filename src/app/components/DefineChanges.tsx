import { useEffect, useRef, useState } from 'react';
import type { Change, Document, Step3Data, ResearcherChange, OperativeUnit } from '../types';
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


const mockOperativeUnits = [
  'Cardiología', 'Endocrinología', 'Gastroenterología', 'Hematología',
  'Infectología', 'Medicina Interna', 'Nefrología', 'Neurología',
  'Neumología', 'Oncología', 'Pediatría', 'Reumatología',
  'Traumatología', 'Unidad de Investigación Clínica', 'Unidad de Cuidados Intensivos',
  'Laboratorio Central', 'Farmacia', 'Radiología', 'Estadística e Informática', 'Otro',
];


export function DefineChanges({ selectedDocuments, newDocuments, changes, onChangesUpdate, step3Data, onStep3DataChange, onNext, onBack }: DefineChangesProps) {
  const inlineEditRowRef = useRef<HTMLTableRowElement | null>(null);
  const [showAddChange, setShowAddChange] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditDocId, setInlineEditDocId] = useState<string | null>(null);
  const [inlineEditData, setInlineEditData] = useState<{ field: string; pageNumber: string; oldValue: string; newValue: string; justification: string }>({ field: '', pageNumber: '', oldValue: '', newValue: '', justification: '' });
  const [inlineAddDocId, setInlineAddDocId] = useState<string | null>(null);
  const [inlineAddData, setInlineAddData] = useState({ field: '', pageNumber: '', oldValue: '', newValue: '', justification: '', isGlobal: true, appliesTo: [] as string[] });
  const [confirm, setConfirm] = useState<{
    isOpen: boolean; title: string; message: string;
    confirmLabel?: string; variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const openConfirm = (opts: Omit<typeof confirm, 'isOpen'>) => setConfirm({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirm((c) => ({ ...c, isOpen: false }));
  const [searchDocument, setSearchDocument] = useState('');
  const [docPages, setDocPages] = useState<Record<string, number>>({});
  const [docPickerSearch, setDocPickerSearch] = useState('');
  // ✅ CAMBIADO: categoryFilter ahora usa "Todos" como valor por defecto
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [showPreview, setShowPreview] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showChangePreview, setShowChangePreview] = useState(false);
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());
  const toggleExpandChange = (id: string) =>
    setExpandedChanges((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const [newChange, setNewChange] = useState({
    field: '',
    customField: '',
    oldValue: '',
    newValue: '',
    justification: '',
    pageNumber: '',
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
  const setOperativeUnitsData = (d: { internalUnits: OperativeUnit[]; externalUnits: OperativeUnit[] }) =>
    onStep3DataChange({ ...step3Data, operativeUnitsData: d });
  const setResearchers = (r: ResearcherChange[]) =>
    onStep3DataChange({ ...step3Data, researchers: r });

  // Operative units modal state
  const [unitModalType, setUnitModalType] = useState<'internal' | 'external' | null>(null);
  // internal modal
  const [unitSearch, setUnitSearch] = useState('');
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [selectedUnitName, setSelectedUnitName] = useState('');
  // external modal
  const [extUnitName, setExtUnitName] = useState('');
  const [extHasCarta, setExtHasCarta] = useState<'SI' | 'NO'>('SI');
  // shared
  const [unitFile, setUnitFile] = useState<File | null>(null);
  const [isDraggingUnit, setIsDraggingUnit] = useState(false);

  const closeUnitModal = () => {
    setUnitModalType(null);
    setUnitSearch('');
    setUnitDropdownOpen(false);
    setSelectedUnitName('');
    setExtUnitName('');
    setExtHasCarta('SI');
    setUnitFile(null);
    setIsDraggingUnit(false);
  };

  const handleConfirmUnit = () => {
    const name = unitModalType === 'external' ? extUnitName.trim() : selectedUnitName;
    if (!name || !unitFile) return;
    const now = new Date();
    const registeredAt = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const unit: OperativeUnit = { id: Date.now().toString(), name, fileName: unitFile.name, file: unitFile, registeredAt };
    if (unitModalType === 'internal') {
      setOperativeUnitsData({ ...step3Data.operativeUnitsData, internalUnits: [...step3Data.operativeUnitsData.internalUnits, unit] });
    } else {
      setOperativeUnitsData({ ...step3Data.operativeUnitsData, externalUnits: [...step3Data.operativeUnitsData.externalUnits, unit] });
    }
    closeUnitModal();
  };

  const handleRemoveInternalUnit = (id: string) => {
    setOperativeUnitsData({ ...step3Data.operativeUnitsData, internalUnits: step3Data.operativeUnitsData.internalUnits.filter((u) => u.id !== id) });
  };

  const handleRemoveExternalUnit = (id: string) => {
    setOperativeUnitsData({ ...step3Data.operativeUnitsData, externalUnits: step3Data.operativeUnitsData.externalUnits.filter((u) => u.id !== id) });
  };

  const handleUnitFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingUnit(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setUnitFile(file);
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

  const groupedAvailable = (filtered: typeof documents) =>
    CATEGORY_ORDER.map((cat) => ({
      category: cat,
      docs: filtered.filter((d) => getDocCategory(d) === cat),
    })).filter((g) => g.docs.length > 0);

  const handleAddChange = () => {
    const field = newChange.field;
    if (!field || !newChange.newValue || !newChange.justification) return;
    const appliesTo = newChange.isGlobal ? selectedDocuments : newChange.appliesTo;

    const change: Change = {
      id: Date.now().toString(),
      field,
      oldValue: newChange.oldValue,
      newValue: newChange.newValue,
      justification: newChange.justification,
      pageNumber: newChange.pageNumber,
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
      pageNumber: '',
      appliesTo: [],
      isGlobal: true,
    });
    setModalStep(1);
    setShowAddChange(false);
  };

  const handleRemoveChange = (id: string) => {
    onChangesUpdate(changes.filter((change) => change.id !== id));
  };

  const startInlineEdit = (change: Change, docId: string) => {
    setInlineEditId(change.id);
    setInlineEditDocId(docId);
    setInlineEditData({
      field: change.field,
      pageNumber: change.pageNumber || '',
      oldValue: change.oldValue,
      newValue: change.newValue,
      justification: change.justification,
    });
  };

  const closeInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditDocId(null);
  };

  const saveInlineEdit = () => {
    if (!inlineEditId || !inlineEditDocId) return false;
    if (!inlineEditData.field || !inlineEditData.newValue || !inlineEditData.justification || !inlineEditData.pageNumber) return false;

    const activeChange = changes.find((change) => change.id === inlineEditId);
    if (!activeChange) return false;

    updateChangeForSingleDocument(activeChange, inlineEditDocId, {
      field: inlineEditData.field,
      pageNumber: inlineEditData.pageNumber,
      oldValue: inlineEditData.oldValue,
      newValue: inlineEditData.newValue,
      justification: inlineEditData.justification,
    });
    closeInlineEdit();
    return true;
  };

  useEffect(() => {
    if (!inlineEditId || !inlineEditDocId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (inlineEditRowRef.current?.contains(target)) return;
      saveInlineEdit();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeInlineEdit();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [changes, inlineEditData, inlineEditDocId, inlineEditId]);

  const buildChangeForDoc = (
    source: Change,
    docId: string,
    overrides: Partial<Change> = {},
  ): Change => ({
    ...source,
    ...overrides,
    id: overrides.id ?? Date.now().toString(),
    appliesTo: [docId],
    isGlobal: false,
  });

  const updateChangeForSingleDocument = (
    source: Change,
    docId: string,
    overrides: Partial<Change>,
  ) => {
    const appliesToDoc =
      source.isGlobal || source.appliesTo.includes(docId);
    if (!appliesToDoc) return;

    const remainingDocIds = source.isGlobal
      ? selectedDocuments.filter((id) => id !== docId)
      : source.appliesTo.filter((id) => id !== docId);

    const updatedForDoc = buildChangeForDoc(source, docId, overrides);

    if (source.isGlobal || source.appliesTo.length > 1) {
      const nextChanges = changes.flatMap((change) => {
        if (change.id !== source.id) return [change];
        if (remainingDocIds.length === 0) return [updatedForDoc];
        return [
          {
            ...change,
            appliesTo: remainingDocIds,
            isGlobal: false,
          },
          updatedForDoc,
        ];
      });
      onChangesUpdate(nextChanges);
      return;
    }

    onChangesUpdate(
      changes.map((change) =>
        change.id === source.id ? updatedForDoc : change,
      ),
    );
  };

  const handleInlineAdd = () => {
    if (!inlineAddData.field || !inlineAddData.newValue) return;
    const appliesTo = inlineAddData.isGlobal ? selectedDocuments : inlineAddData.appliesTo;
    if (!inlineAddData.isGlobal && appliesTo.length === 0) return;
    onChangesUpdate([...changes, {
      id: Date.now().toString(),
      field: inlineAddData.field,
      oldValue: inlineAddData.oldValue,
      newValue: inlineAddData.newValue,
      justification: inlineAddData.justification,
      pageNumber: inlineAddData.pageNumber,
      appliesTo,
      isGlobal: inlineAddData.isGlobal,
    }]);
    setInlineAddDocId(null);
    setInlineAddData({ field: '', pageNumber: '', oldValue: '', newValue: '', justification: '', isGlobal: true, appliesTo: [] });
  };

  const handleEditChange = (change: Change, docId?: string) => {
    setNewChange({
      field: change.field,
      customField: '',
      oldValue: change.oldValue,
      newValue: change.newValue,
      justification: change.justification,
      pageNumber: change.pageNumber || '',
      appliesTo: change.appliesTo,
      isGlobal: change.isGlobal,
    });
    setEditingId(change.id);
    setEditingDocId(docId ?? null);
    setModalStep(1);
    setShowAddChange(true);
  };

  const handleSaveEdit = () => {
    const field = newChange.field;
    if (!field || !newChange.newValue || !editingId) return;

    const editingChange = changes.find((c) => c.id === editingId);
    if (!editingChange) return;

    if (editingDocId) {
      updateChangeForSingleDocument(editingChange, editingDocId, {
        field,
        oldValue: newChange.oldValue,
        newValue: newChange.newValue,
        justification: newChange.justification,
        pageNumber: newChange.pageNumber,
      });
      setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', pageNumber: '', appliesTo: [], isGlobal: true });
      setSearchDocument('');
      setModalStep(1);
      setEditingId(null);
      setEditingDocId(null);
      setShowAddChange(false);
      return;
    }

    const appliesTo = editingDocId
      ? [editingDocId]
      : newChange.isGlobal
      ? selectedDocuments
      : newChange.appliesTo;

    onChangesUpdate(changes.map((c) =>
      c.id === editingId
        ? { ...c, field, oldValue: newChange.oldValue, newValue: newChange.newValue, justification: newChange.justification, pageNumber: newChange.pageNumber, appliesTo, isGlobal: editingDocId ? false : newChange.isGlobal }
        : c
    ));
    setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', pageNumber: '', appliesTo: [], isGlobal: true });
    setSearchDocument('');
    setModalStep(1);
    setEditingId(null);
    setEditingDocId(null);
    setShowAddChange(false);
  };

  const exportToExcel = () => {
    const headers = ['Documento', 'Categoría', 'Campo', 'N° Página', 'Versión Anterior', 'Versión Nueva', 'Justificación', 'Aplica a'];
    const rows = changes.flatMap((change) => {
      const docsQueAplica = change.isGlobal
        ? documents
        : documents.filter((d) => change.appliesTo.includes(d.id));
      return docsQueAplica.map((doc) => [
        doc.name,
        getDocCategory(doc),
        change.field,
        change.pageNumber || '',
        change.oldValue || '',
        change.newValue,
        change.justification,
        change.isGlobal ? 'Global' : 'Específico',
      ]);
    });
    const escape = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(','),
      ...rows.map((row) => row.map(escape).join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cambios_enmienda.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleDocument = (docId: string) => {
    if (newChange.appliesTo.includes(docId)) {
      setNewChange({ ...newChange, appliesTo: newChange.appliesTo.filter((id) => id !== docId) });
    } else {
      setNewChange({ ...newChange, appliesTo: [...newChange.appliesTo, docId] });
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
    setNewResearcher({ name: '', email: '', currentRole: '', proposedRole: '', changeType: 'add', justification: '' });
    setShowAddResearcher(false);
  };

  const handleRemoveResearcher = (id: string) => {
    setResearchers(researchers.filter((r) => r.id !== id));
  };

  const researcherRoles = [
    'Investigador Principal', 'Co-investigador', 'Investigador Secundario',
    'Asesor', 'Co-asesor', 'Tesista', 'Asistente de Investigación', 'Coordinador de Proyecto',
  ];

  // ✅ Categorías disponibles según documentos seleccionados
  const availableCategories = CATEGORY_ORDER.filter(cat =>
    documents.some(d => getDocCategory(d) === cat)
  );

  // ✅ Documentos filtrados según tab activo
  const filteredDocuments = categoryFilter === 'Todos'
    ? documents
    : documents.filter(doc => getDocCategory(doc) === categoryFilter);

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
        <div className="border border-gray-300 rounded overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 m-0">Título y Resumen</h3>
                <p className="text-sm text-gray-600 m-0 mt-1">¿Modificará el título o resumen del estudio?</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModifiesTitleOrSummary('NO')}
                  className={`px-6 py-2 rounded text-sm font-medium transition-all ${
                    modifiesTitleOrSummary === 'NO'
                      ? 'bg-[#C41E3A] text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  NO
                </button>
                <button
                  onClick={() => setModifiesTitleOrSummary('SI')}
                  className={`px-6 py-2 rounded text-sm font-medium transition-all ${
                    modifiesTitleOrSummary === 'SI'
                      ? 'bg-[#C41E3A] text-white'
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
        <div className="border border-gray-300 rounded overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 m-0">Unidades Operativas</h3>
              <p className="text-sm text-gray-600 m-0 mt-1">¿Modificará las unidades operativas del estudio?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setModifiesOperativeUnits('NO')}
                className={`px-6 py-2 rounded text-sm font-medium transition-all ${
                  modifiesOperativeUnits === 'NO'
                    ? 'bg-[#C41E3A] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                NO
              </button>
              <button
                onClick={() => setModifiesOperativeUnits('SI')}
                className={`px-6 py-2 rounded text-sm font-medium transition-all ${
                  modifiesOperativeUnits === 'SI'
                    ? 'bg-[#C41E3A] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                SÍ
              </button>
            </div>
          </div>
        </div>

        {modifiesOperativeUnits === 'SI' && (
          <div className="p-4 space-y-5">
            <div className="bg-red-50/50 border-l-4 border-red-200 p-4 rounded-r">
              <p className="text-sm text-[#C41E3A] m-0">
                <strong>Instrucciones:</strong> Agregue las unidades operativas que serán modificadas. Puede registrar unidades internas (dentro de la institución) y unidades externas (fuera de la institución) de forma independiente. Cada unidad requiere adjuntar la carta de declaración del jefe de unidad.
              </p>
            </div>

            {/* Unidades Internas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800 m-0">Unidades Internas</h4>
                <button
                  onClick={() => setUnitModalType('internal')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              </div>
              <div className="border border-gray-300 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidad</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Carta de declaración</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {operativeUnitsData.internalUnits.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400 italic">
                          No se encontraron resultados
                        </td>
                      </tr>
                    ) : (
                      operativeUnitsData.internalUnits.map((unit) => (
                        <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-900 font-medium">{unit.name}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {unit.fileName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemoveInternalUnit(unit.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors font-medium"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unidades Externas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800 m-0">Unidades Externas</h4>
                <button
                  onClick={() => setUnitModalType('external')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              </div>

              {operativeUnitsData.externalUnits.length === 0 ? (
                <div className="border border-gray-300 rounded py-6 text-center text-sm text-gray-400 italic bg-white">
                  No se encontraron resultados
                </div>
              ) : (
                <div className="space-y-3">
                  {operativeUnitsData.externalUnits.map((unit) => (
                    <div key={unit.id} className="flex items-center gap-4 px-4 py-3 bg-white border border-gray-300 rounded hover:border-gray-400 transition-colors">
                      <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gray-100 rounded-full">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{unit.name}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Será agregada al proyecto
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 m-0">Registrada el {unit.registeredAt}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { const url = URL.createObjectURL(unit.file); window.open(url, '_blank'); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors font-medium"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver
                        </button>
                        <button
                          onClick={() => {
                            const url = URL.createObjectURL(unit.file);
                            const a = document.createElement('a');
                            a.href = url; a.download = unit.fileName; a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#C41E3A] border border-red-200 rounded hover:bg-red-50 transition-colors font-medium"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Descargar
                        </button>
                        <button
                          onClick={() => handleRemoveExternalUnit(unit.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors font-medium"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Deshacer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

        {/* Card 3: Investigadores */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 m-0">Equipo de Investigación</h3>
              <p className="text-sm text-gray-600 m-0 mt-1">¿Modificará investigadores, tesistas, asesores o coasesores?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setModifiesResearchers('NO')}
                className={`px-6 py-2 rounded text-sm font-medium transition-all ${
                  modifiesResearchers === 'NO'
                    ? 'bg-[#C41E3A] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                NO
              </button>
              <button
                onClick={() => setModifiesResearchers('SI')}
                className={`px-6 py-2 rounded text-sm font-medium transition-all ${
                  modifiesResearchers === 'SI'
                    ? 'bg-[#C41E3A] text-white'
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
            <div className="bg-red-50/50 border-l-4 border-red-200 p-4 rounded-r">
              <p className="text-sm text-[#C41E3A] m-0">
                <strong>Nota:</strong> Agregue cada modificación haciendo clic en el botón "+ Agregar".
              </p>
            </div>

            {researchers.length > 0 && (
              <div>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#C41E3A]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Rol actual</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Rol propuesto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider w-24">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {researchers.map((researcher, index) => (
                        <tr key={researcher.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{researcher.name}</div>
                            <div className="text-xs text-gray-500">{researcher.email}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{researcher.currentRole || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{researcher.proposedRole || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              researcher.changeType === 'add' ? 'bg-green-100 text-green-800'
                              : researcher.changeType === 'remove' ? 'bg-red-100 text-red-800'
                              : 'bg-red-100 text-[#C41E3A]'
                            }`}>
                              {researcher.changeType === 'add' ? 'Agregar' : researcher.changeType === 'remove' ? 'Retirar' : 'Modificar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleRemoveResearcher(researcher.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">
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

            {showAddResearcher && (
              <div className="bg-gray-50 border border-gray-300 rounded p-5 space-y-4">
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
                    <input type="text" value={newResearcher.name} onChange={(e) => setNewResearcher({ ...newResearcher, name: e.target.value })} placeholder="Ej: Juan Pérez García" className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">Correo electrónico *</label>
                    <input type="email" value={newResearcher.email} onChange={(e) => setNewResearcher({ ...newResearcher, email: e.target.value })} placeholder="ejemplo@upch.pe" className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent" />
                  </div>
                </div>
                {newResearcher.changeType !== 'add' && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">Rol actual</label>
                    <select value={newResearcher.currentRole} onChange={(e) => setNewResearcher({ ...newResearcher, currentRole: e.target.value })} className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white">
                      <option value="">Seleccione rol actual</option>
                      {researcherRoles.map((role) => (<option key={role} value={role}>{role}</option>))}
                    </select>
                  </div>
                )}
                {newResearcher.changeType !== 'remove' && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">Rol propuesto *</label>
                    <select value={newResearcher.proposedRole} onChange={(e) => setNewResearcher({ ...newResearcher, proposedRole: e.target.value })} className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white">
                      <option value="">Seleccione rol propuesto</option>
                      {researcherRoles.map((role) => (<option key={role} value={role}>{role}</option>))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Justificación *</label>
                  <textarea value={newResearcher.justification} onChange={(e) => setNewResearcher({ ...newResearcher, justification: e.target.value })} placeholder="Describa la justificación para este cambio" rows={3} className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowAddResearcher(false); setNewResearcher({ name: '', email: '', currentRole: '', proposedRole: '', changeType: 'add', justification: '' }); }} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">
                    Cancelar
                  </button>
                  <button onClick={handleAddResearcher} disabled={!newResearcher.name || !newResearcher.email || !newResearcher.justification || (newResearcher.changeType !== 'remove' && !newResearcher.proposedRole)} className="flex-1 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                    Agregar a la lista
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

        {/* Card 4: Otros Cambios en Documentos */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <div className="bg-[#C41E3A] px-4 py-3">
            <h3 className="text-base font-normal text-white m-0">Otros Cambios en Documentos</h3>
            <p className="text-sm text-white/80 m-0 mt-1">Seleccione un instrumento y defina el campo que desea modificar</p>
          </div>

          <div className="p-4 space-y-5">
            <div>
              {/* Header con botones Agregar y Exportar */}
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-800 m-0 whitespace-nowrap">Cambios registrados</h4>
                  {changes.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-[#C41E3A] rounded text-xs font-semibold">{changes.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditingDocId(null);
                      setSubmitAttempted(false);
                      setSearchDocument('');
                      setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', pageNumber: '', appliesTo: [], isGlobal: true });
                      setShowAddChange(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-semibold shadow-sm whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar
                  </button>
                </div>
              </div>

              {/* ✅ TABS por categoría - ESTILO BORDE INFERIOR */}
              {documents.length > 0 && availableCategories.length > 0 && (
                <div className="flex flex-wrap gap-0 mb-4 border-b border-gray-200">
                  {/* Tab Todos */}
                  <button
                    onClick={() => setCategoryFilter('Todos')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
                      categoryFilter === 'Todos'
                        ? 'border-[#C41E3A] text-[#C41E3A]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Todos
                    <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                      {documents.length}
                    </span>
                  </button>

                  {/* Tab por categoría */}
                  {availableCategories.map(cat => {
                    const count = documents.filter(d => getDocCategory(d) === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
                          categoryFilter === cat
                            ? 'border-[#C41E3A] text-[#C41E3A]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {cat}
                        <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Panel inline global */}
              {inlineAddDocId === '__global__' && (
                <div className="border border-red-200 rounded bg-red-50/50 p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#C41E3A]">Nuevo cambio</span>
                  </div>
                  <div className="grid grid-cols-[1.4fr_1fr_1fr_1.4fr_40px] gap-2 items-start">
                    <div className="flex flex-col gap-1">
                      <input autoFocus type="text" placeholder="Campo *" value={inlineAddData.field} onChange={(e) => setInlineAddData((p) => ({ ...p, field: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white" />
                      <input type="text" placeholder="N° página" value={inlineAddData.pageNumber} onChange={(e) => setInlineAddData((p) => ({ ...p, pageNumber: e.target.value }))} className="w-full px-2 py-1 text-[10px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white text-[#C41E3A]/80" />
                    </div>
                    <textarea rows={3} placeholder="Versión anterior" value={inlineAddData.oldValue} onChange={(e) => setInlineAddData((p) => ({ ...p, oldValue: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white resize-none" />
                    <textarea rows={3} placeholder="Versión nueva *" value={inlineAddData.newValue} onChange={(e) => setInlineAddData((p) => ({ ...p, newValue: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white resize-none" />
                    <textarea rows={3} placeholder="Justificación" value={inlineAddData.justification} onChange={(e) => setInlineAddData((p) => ({ ...p, justification: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white resize-none" />
                    <div className="flex flex-col gap-1">
                      <button onClick={handleInlineAdd} className="w-7 h-7 flex items-center justify-center bg-green-600 text-white rounded hover:bg-green-700 transition-colors" title="Guardar">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </button>
                      <button onClick={() => setInlineAddDocId(null)} className="w-7 h-7 flex items-center justify-center bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors" title="Cancelar">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                  {/* Fila de alcance */}
                  <div className="flex items-start gap-3 mt-2 pt-2 border-t border-red-200">
                    <span className="text-[10px] text-gray-500 font-medium mt-1 shrink-0">Alcance:</span>
                    <button
                      onClick={() => setInlineAddData((p) => ({ ...p, isGlobal: !p.isGlobal, appliesTo: !p.isGlobal ? selectedDocuments : [] }))}
                      className={`px-2.5 py-0.5 text-[10px] rounded border font-medium transition-colors shrink-0 ${inlineAddData.isGlobal ? 'bg-[#C41E3A] text-white border-[#C41E3A]' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                    >
                      {inlineAddData.isGlobal ? 'Global' : 'Específico'}
                    </button>
                    {!inlineAddData.isGlobal && (
                      <div className="flex items-start gap-3">
                        {/* Picker */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden min-w-[320px]">
                          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                            <span className="text-xs font-semibold text-gray-600 tabular-nums">{inlineAddData.appliesTo.length} de {documents.length} seleccionados</span>
                          </div>
                          <div className="overflow-y-auto max-h-56">
                            {groupedAvailable(documents).map((group) => {
                              const allChecked = group.docs.every((d) => inlineAddData.appliesTo.includes(d.id));
                              const someChecked = group.docs.some((d) => inlineAddData.appliesTo.includes(d.id));
                              return (
                                <div key={group.category}>
                                  <div className="px-3 py-2 bg-[#C41E3A] flex items-center gap-2.5 cursor-pointer select-none" onClick={() => { const ids = group.docs.map((d) => d.id); if (allChecked) { setInlineAddData((p) => ({ ...p, appliesTo: p.appliesTo.filter((id) => !ids.includes(id)) })); } else { const toAdd = ids.filter((id) => !inlineAddData.appliesTo.includes(id)); setInlineAddData((p) => ({ ...p, appliesTo: [...p.appliesTo, ...toAdd] })); } }}>
                                    <span className="shrink-0 w-3.5 h-3.5 border-2 border-white rounded-sm flex items-center justify-center" style={{ backgroundColor: allChecked ? 'white' : someChecked ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
                                      {allChecked && <svg className="w-2.5 h-2.5 text-[#C41E3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                      {!allChecked && someChecked && <span className="block w-1.5 h-0.5 bg-white rounded-full" />}
                                    </span>
                                    <span className="text-xs font-bold text-white uppercase tracking-wide flex-1">{group.category}</span>
                                  </div>
                                  {group.docs.map((d) => (
                                    <label key={d.id} className="flex items-center gap-2.5 pl-8 pr-3 py-2 text-xs text-gray-700 hover:bg-[#C41E3A]/5 cursor-pointer border-t border-gray-100 select-none">
                                      <input type="checkbox" checked={inlineAddData.appliesTo.includes(d.id)} onChange={() => setInlineAddData((p) => ({ ...p, appliesTo: p.appliesTo.includes(d.id) ? p.appliesTo.filter((id) => id !== d.id) : [...p.appliesTo, d.id] }))} className="accent-[#C41E3A] w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{d.name}</span>
                                    </label>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Resumen */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden min-w-[200px] max-w-[240px]">
                          <div className="bg-[#C41E3A] px-3 py-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wide">Seleccionados</span>
                            {inlineAddData.appliesTo.length > 0 && (
                              <span className="bg-white/25 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0">{inlineAddData.appliesTo.length}</span>
                            )}
                          </div>
                          <div className="overflow-y-auto max-h-56 bg-white">
                            {inlineAddData.appliesTo.length === 0 ? (
                              <p className="text-[10px] text-gray-400 italic px-3 py-3 m-0">Ningún documento seleccionado.</p>
                            ) : (
                              <div>
                                {groupedAvailable(documents).map((group) => {
                                  const selected = group.docs.filter((d) => inlineAddData.appliesTo.includes(d.id));
                                  if (selected.length === 0) return null;
                                  const allInGroup = selected.length === group.docs.length;
                                  return (
                                    <div key={group.category} className="border-b border-gray-100 last:border-b-0">
                                      <div className="px-3 py-1.5 bg-[#C41E3A]/8 flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold text-[#C41E3A] uppercase tracking-wide truncate flex-1">{group.category}</span>
                                        <span className="text-[10px] font-semibold tabular-nums shrink-0 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: allInGroup ? '#C41E3A' : 'rgba(196,30,58,0.12)', color: allInGroup ? 'white' : '#C41E3A' }}>
                                          {allInGroup ? `Todos (${selected.length})` : selected.length}
                                        </span>
                                      </div>
                                      {!allInGroup && (
                                        <ul className="p-0 m-0 list-none">
                                          {selected.map((doc) => (
                                            <li key={doc.id} className="flex items-start gap-2 pl-5 pr-3 py-1.5 border-t border-gray-50">
                                              <span className="mt-1.5 w-1 h-1 rounded-full bg-[#C41E3A]/50 shrink-0" />
                                              <span className="text-[10px] text-gray-600 leading-snug">{doc.name}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cards por documento */}
              {documents.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No hay documentos seleccionados.</p>
              ) : (
                <div className="max-h-[600px] overflow-y-auto space-y-4 pr-1">
                  {filteredDocuments.map((doc) => {
                    const docChanges = changes.filter(
                      (c) => c.isGlobal || c.appliesTo.includes(doc.id)
                    );
                    const ITEMS_PER_PAGE = 5;
                    const currentPage = docPages[doc.id] ?? 1;
                    const totalPages = Math.max(1, Math.ceil(docChanges.length / ITEMS_PER_PAGE));
                    const paginatedChanges = docChanges.slice(
                      (currentPage - 1) * ITEMS_PER_PAGE,
                      currentPage * ITEMS_PER_PAGE
                    );
                    const setPage = (page: number) =>
                      setDocPages((prev) => ({ ...prev, [doc.id]: page }));

                    return (
                      <div key={doc.id} className="border border-gray-300 rounded overflow-hidden">
                        {/* Card header */}
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800 m-0">{doc.name}</p>
                            <p className="text-xs text-gray-500 m-0 mt-0.5">({getDocCategory(doc)})</p>
                          </div>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingDocId(null);
                              setSubmitAttempted(false);
                              setSearchDocument('');
                              setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', pageNumber: '', appliesTo: [doc.id], isGlobal: false });
                              setShowAddChange(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-xs font-medium flex-shrink-0"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar cambio
                          </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs table-fixed">
                            <colgroup>
                              <col className="w-[22%]" />
                              <col className="w-[18%]" />
                              <col className="w-[18%]" />
                              <col className="w-[26%]" />
                              <col className="w-[16%]" />
                            </colgroup>
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Cambio - N° Página</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Versión Anterior</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Versión Nueva</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Justificación</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {paginatedChanges.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-3 py-4 text-center text-gray-400 italic text-xs">
                                    Sin cambios registrados para este documento.
                                  </td>
                                </tr>
                              ) : (
                                paginatedChanges.map((change, idx) => {
                                  const isInline = inlineEditId === change.id && inlineEditDocId === doc.id;
                                  return (
                                  <tr
                                    key={change.id}
                                    ref={isInline ? inlineEditRowRef : null}
                                    onDoubleClick={() => {
                                      if (!isInline) startInlineEdit(change, doc.id);
                                    }}
                                    className={`${isInline ? 'bg-red-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${!isInline ? 'cursor-pointer' : ''}`}
                                  >
                                    <td className="px-2 py-2">
                                      {isInline ? (
                                        <div className="flex flex-col gap-1">
                                          <input autoFocus type="text" value={inlineEditData.field} onChange={(e) => setInlineEditData({ ...inlineEditData, field: e.target.value })} placeholder="Cambio" className="w-full px-2 py-1 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white" />
                                          <input type="text" value={inlineEditData.pageNumber} onChange={(e) => setInlineEditData({ ...inlineEditData, pageNumber: e.target.value })} placeholder="N° página" className="w-full px-2 py-1 text-[10px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white text-[#C41E3A]/80" />
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-gray-800 font-medium block truncate" title={change.field}>{change.field || '—'}</span>
                                          {change.pageNumber && <span className="text-[10px] text-[#C41E3A]/70 font-medium">Pág. {change.pageNumber}</span>}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-2 py-2">
                                      {isInline
                                        ? <textarea rows={3} value={inlineEditData.oldValue} onChange={(e) => setInlineEditData({ ...inlineEditData, oldValue: e.target.value })} className="w-full px-2 py-1 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white resize-none" />
                                        : <p className="truncate text-gray-500 line-through m-0" title={change.oldValue}>{change.oldValue || '—'}</p>
                                      }
                                    </td>
                                    <td className="px-2 py-2">
                                      {isInline
                                        ? <textarea rows={3} value={inlineEditData.newValue} onChange={(e) => setInlineEditData({ ...inlineEditData, newValue: e.target.value })} className="w-full px-2 py-1 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white resize-none" />
                                        : <p className="truncate text-green-700 font-semibold m-0" title={change.newValue}>{change.newValue || '—'}</p>
                                      }
                                    </td>
                                    <td className="px-2 py-2">
                                      {isInline
                                        ? <textarea rows={3} value={inlineEditData.justification} onChange={(e) => setInlineEditData({ ...inlineEditData, justification: e.target.value })} className="w-full px-2 py-1 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white resize-none" />
                                        : <p className="truncate text-gray-500 m-0" title={change.justification}>{change.justification || '—'}</p>
                                      }
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex gap-1 justify-center">
                                        {isInline ? (
                                          <>
                                            <button
                                              onClick={saveInlineEdit}
                                              className="w-6 h-6 flex items-center justify-center bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                              title="Guardar"
                                            >
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                            <button
                                              onClick={closeInlineEdit}
                                              className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                                              title="Cancelar"
                                            >
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => handleEditChange(change, doc.id)}
                                              className="w-6 h-6 flex items-center justify-center bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors"
                                              title="Editar"
                                            >
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button
                                              onClick={() => openConfirm({ title: 'Eliminar cambio', message: `¿Desea eliminar el cambio "${change.field}"? Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleRemoveChange(change.id); closeConfirm(); } })}
                                              className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                              title="Eliminar"
                                            >
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  );
                                })
                              )}
                              {/* Fila inline de agregar */}
                              {inlineAddDocId === doc.id && (
                                <tr className="bg-red-50/50 border-b-0">
                                  <td className="px-2 py-2">
                                    <div className="flex flex-col gap-1">
                                      <input autoFocus type="text" placeholder="Campo *" value={inlineAddData.field} onChange={(e) => setInlineAddData((p) => ({ ...p, field: e.target.value }))} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-transparent bg-white" />
                                      <input type="text" placeholder="N° página" value={inlineAddData.pageNumber} onChange={(e) => setInlineAddData((p) => ({ ...p, pageNumber: e.target.value }))} className="w-full px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A]/50 bg-white text-[#C41E3A]/80" />
                                    </div>
                                  </td>
                                  <td className="px-2 py-2">
                                    <textarea rows={3} placeholder="Versión anterior" value={inlineAddData.oldValue} onChange={(e) => setInlineAddData((p) => ({ ...p, oldValue: e.target.value }))} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-transparent bg-white resize-none" />
                                  </td>
                                  <td className="px-2 py-2">
                                    <textarea rows={3} placeholder="Versión nueva *" value={inlineAddData.newValue} onChange={(e) => setInlineAddData((p) => ({ ...p, newValue: e.target.value }))} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-transparent bg-white resize-none" />
                                  </td>
                                  <td className="px-2 py-2">
                                    <textarea rows={3} placeholder="Justificación" value={inlineAddData.justification} onChange={(e) => setInlineAddData((p) => ({ ...p, justification: e.target.value }))} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-transparent bg-white resize-none" />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex flex-col gap-1 items-center">
                                      <button onClick={handleInlineAdd} className="w-6 h-6 flex items-center justify-center bg-green-600 text-white rounded hover:bg-green-700 transition-colors" title="Guardar">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                      </button>
                                      <button onClick={() => setInlineAddDocId(null)} className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors" title="Cancelar">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              {/* Fila de alcance (Global / Específico) */}
                              {inlineAddDocId === doc.id && (
                                <tr className="bg-red-50/30">
                                  <td colSpan={5} className="px-3 py-2 border-t border-red-100">
                                    <div className="flex items-start gap-3">
                                      <span className="text-[10px] text-gray-500 font-medium mt-1 shrink-0">Alcance:</span>
                                      <button
                                        onClick={() => setInlineAddData((p) => ({ ...p, isGlobal: !p.isGlobal, appliesTo: !p.isGlobal ? selectedDocuments : [doc.id] }))}
                                        className={`px-2.5 py-0.5 text-[10px] rounded border font-medium transition-colors shrink-0 ${inlineAddData.isGlobal ? 'bg-[#C41E3A] text-white border-[#C41E3A]' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                                      >
                                        {inlineAddData.isGlobal ? 'Global' : 'Específico'}
                                      </button>
                                      {!inlineAddData.isGlobal && (
                                        <div className="flex items-start gap-3">
                                          {/* Picker */}
                                          <div className="border border-gray-200 rounded-lg overflow-hidden min-w-[320px]">
                                            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                              <span className="text-xs font-semibold text-gray-600 tabular-nums">{inlineAddData.appliesTo.length} de {documents.length} seleccionados</span>
                                            </div>
                                            <div className="overflow-y-auto max-h-56">
                                              {groupedAvailable(documents).map((group) => {
                                                const allChecked = group.docs.every((d) => inlineAddData.appliesTo.includes(d.id));
                                                const someChecked = group.docs.some((d) => inlineAddData.appliesTo.includes(d.id));
                                                return (
                                                  <div key={group.category}>
                                                    <div className="px-3 py-2 bg-[#C41E3A] flex items-center gap-2.5 cursor-pointer select-none" onClick={() => { const ids = group.docs.map((d) => d.id); if (allChecked) { setInlineAddData((p) => ({ ...p, appliesTo: p.appliesTo.filter((id) => !ids.includes(id)) })); } else { const toAdd = ids.filter((id) => !inlineAddData.appliesTo.includes(id)); setInlineAddData((p) => ({ ...p, appliesTo: [...p.appliesTo, ...toAdd] })); } }}>
                                                      <span className="shrink-0 w-3.5 h-3.5 border-2 border-white rounded-sm flex items-center justify-center" style={{ backgroundColor: allChecked ? 'white' : someChecked ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
                                                        {allChecked && <svg className="w-2.5 h-2.5 text-[#C41E3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                        {!allChecked && someChecked && <span className="block w-1.5 h-0.5 bg-white rounded-full" />}
                                                      </span>
                                                      <span className="text-xs font-bold text-white uppercase tracking-wide flex-1">{group.category}</span>
                                                    </div>
                                                    {group.docs.map((d) => (
                                                      <label key={d.id} className="flex items-center gap-2.5 pl-8 pr-3 py-2 text-xs text-gray-700 hover:bg-[#C41E3A]/5 cursor-pointer border-t border-gray-100 select-none">
                                                        <input type="checkbox" checked={inlineAddData.appliesTo.includes(d.id)} onChange={() => setInlineAddData((p) => ({ ...p, appliesTo: p.appliesTo.includes(d.id) ? p.appliesTo.filter((id) => id !== d.id) : [...p.appliesTo, d.id] }))} className="accent-[#C41E3A] w-3.5 h-3.5 shrink-0" />
                                                        <span className="truncate">{d.name}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          {/* Resumen */}
                                          <div className="border border-gray-200 rounded-lg overflow-hidden min-w-[200px] max-w-[240px]">
                                            <div className="bg-[#C41E3A] px-3 py-2 flex items-center justify-between gap-2">
                                              <span className="text-xs font-bold text-white uppercase tracking-wide">Seleccionados</span>
                                              {inlineAddData.appliesTo.length > 0 && (
                                                <span className="bg-white/25 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0">{inlineAddData.appliesTo.length}</span>
                                              )}
                                            </div>
                                            <div className="overflow-y-auto max-h-56 bg-white">
                                              {inlineAddData.appliesTo.length === 0 ? (
                                                <p className="text-[10px] text-gray-400 italic px-3 py-3 m-0">Ningún documento seleccionado.</p>
                                              ) : (
                                                <div>
                                                  {groupedAvailable(documents).map((group) => {
                                                    const selected = group.docs.filter((d) => inlineAddData.appliesTo.includes(d.id));
                                                    if (selected.length === 0) return null;
                                                    const allInGroup = selected.length === group.docs.length;
                                                    return (
                                                      <div key={group.category} className="border-b border-gray-100 last:border-b-0">
                                                        <div className="px-3 py-1.5 bg-[#C41E3A]/8 flex items-center justify-between gap-2">
                                                          <span className="text-[10px] font-bold text-[#C41E3A] uppercase tracking-wide truncate flex-1">{group.category}</span>
                                                          <span className="text-[10px] font-semibold tabular-nums shrink-0 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: allInGroup ? '#C41E3A' : 'rgba(196,30,58,0.12)', color: allInGroup ? 'white' : '#C41E3A' }}>
                                                            {allInGroup ? `Todos (${selected.length})` : selected.length}
                                                          </span>
                                                        </div>
                                                        {!allInGroup && (
                                                          <ul className="p-0 m-0 list-none">
                                                            {selected.map((doc) => (
                                                              <li key={doc.id} className="flex items-start gap-2 pl-5 pr-3 py-1.5 border-t border-gray-50">
                                                                <span className="mt-1.5 w-1 h-1 rounded-full bg-[#C41E3A]/50 shrink-0" />
                                                                <span className="text-[10px] text-gray-600 leading-snug">{doc.name}</span>
                                                              </li>
                                                            ))}
                                                          </ul>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Paginador */}
                        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {docChanges.length === 0
                              ? '0 resultados'
                              : `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, docChanges.length)} de ${docChanges.length} resultado${docChanges.length !== 1 ? 's' : ''}`}
                          </span>
                          {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              </button>
                              <span className="text-xs text-gray-600 px-1">{currentPage} / {totalPages}</span>
                              <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Agregar / Editar cambio */}
      {showAddChange && (() => {
        const closeModal = () => {
          setShowAddChange(false);
          setEditingId(null);
          setSubmitAttempted(false);
          setShowChangePreview(false);
          setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', pageNumber: '', appliesTo: [], isGlobal: true });
          setSearchDocument('');
        };
        const activeField = newChange.field;
        const isValid = !!activeField && !!newChange.newValue && !!newChange.justification && !!newChange.pageNumber && (newChange.isGlobal || newChange.appliesTo.length > 0);
        const err = {
          field: submitAttempted && !activeField,
          newValue: submitAttempted && !newChange.newValue,
          justification: submitAttempted && !newChange.justification,
          pageNumber: submitAttempted && !newChange.pageNumber,
          appliesTo: submitAttempted && !newChange.isGlobal && newChange.appliesTo.length === 0,
        };
        const handleSubmit = () => {
          setSubmitAttempted(true);
          if (!isValid) return;
          if (editingId) handleSaveEdit(); else handleAddChange();
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
            <div className="relative bg-white rounded shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h4 className="font-semibold text-gray-900 text-base m-0">{editingId ? 'Editar cambio' : 'Nuevo cambio'}</h4>
                  <p className="text-xs text-gray-400 m-0 mt-0.5">Los campos con <span className="text-[#C41E3A]">*</span> son obligatorios</p>
                </div>
                <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                <div>
                  <div className="flex items-start gap-4">
                    <div className="w-36 flex-shrink-0 pt-2">
                      <label className="text-sm font-semibold text-gray-700">Cambio a Realizar <span className="text-[#C41E3A]">*</span></label>
                    </div>
                    <input autoFocus type="text" value={newChange.field} onChange={(e) => { setNewChange({ ...newChange, field: e.target.value }); setSubmitAttempted(false); }} placeholder="Describa el cambio a realizar..." className={`flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${err.field ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-[#C41E3A]'}`} />
                  </div>
                  {err.field && <p className="mt-1 text-xs text-red-500 flex items-center gap-1 m-0"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Campo requerido</p>}
                </div>

                <div>
                  <div className="flex items-center gap-4">
                    <div className="w-36 flex-shrink-0">
                      <label className="text-sm font-semibold text-gray-700">N° de página <span className="text-[#C41E3A]">*</span></label>
                    </div>
                    <input type="text" value={newChange.pageNumber} onChange={(e) => { setNewChange({ ...newChange, pageNumber: e.target.value }); setSubmitAttempted(false); }} placeholder="Ej: 5, 12-14, 20" className={`flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${err.pageNumber ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-[#C41E3A]'}`} />
                  </div>
                  {err.pageNumber ? <p className="mt-1 text-xs text-red-500 flex items-center gap-1 m-0"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Campo requerido</p> : <p className="mt-1 text-xs text-gray-400 m-0">Indique la página o rango de páginas donde se realiza este cambio.</p>}
                </div>

                <div>
                  <div className="flex items-start gap-4">
                    <div className="w-36 flex-shrink-0 pt-2">
                      <label className="text-sm font-semibold text-gray-700">Versión Anterior</label>
                      <span className="block px-1.5 py-0.5 bg-gray-100 text-gray-400 text-xs rounded font-normal mt-1">opcional</span>
                    </div>
                    <textarea rows={3} value={newChange.oldValue} onChange={(e) => setNewChange({ ...newChange, oldValue: e.target.value })} placeholder="Ingrese el valor que se reemplazará" className="flex-1 px-3 py-1.5 text-sm border border-dashed border-gray-300 rounded bg-gray-50 text-gray-600 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors resize-none" />
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-4">
                    <div className="w-36 flex-shrink-0 pt-2">
                      <label className="text-sm font-semibold text-gray-700">Versión Nueva <span className="text-[#C41E3A]">*</span></label>
                    </div>
                    <textarea rows={3} value={newChange.newValue} onChange={(e) => { setNewChange({ ...newChange, newValue: e.target.value }); setSubmitAttempted(false); }} placeholder="Ingrese el nuevo valor o texto corregido" className={`flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:border-transparent transition-colors resize-none ${err.newValue ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-[#C41E3A]'}`} />
                  </div>
                  {err.newValue && <p className="mt-1 text-xs text-red-500 flex items-center gap-1 m-0"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Campo requerido</p>}
                </div>

                <div>
                  <div className="flex items-start gap-4">
                    <div className="w-36 flex-shrink-0 pt-2">
                      <label className="text-sm font-semibold text-gray-700">Justificación <span className="text-[#C41E3A]">*</span></label>
                      {newChange.justification && <span className="block text-xs text-gray-400 mt-1">{newChange.justification.length} car.</span>}
                    </div>
                    <textarea value={newChange.justification} onChange={(e) => setNewChange({ ...newChange, justification: e.target.value })} placeholder="Describa la razón técnica o científica de este cambio" rows={3} className={`flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-colors ${err.justification ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-[#C41E3A]'}`} />
                  </div>
                  {err.justification && <p className="mt-1 text-xs text-red-500 flex items-center gap-1 m-0"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Campo requerido</p>}
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Alcance del cambio <span className="text-[#C41E3A]">*</span></label>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-300 rounded">
                    <button onClick={() => setNewChange({ ...newChange, isGlobal: true })} className={`px-4 py-3 rounded border-2 transition-all text-sm font-medium text-left ${newChange.isGlobal ? 'border-[#C41E3A] bg-red-50 text-[#C41E3A]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${newChange.isGlobal ? 'border-[#C41E3A]' : 'border-gray-300'}`}>{newChange.isGlobal && <div className="w-2 h-2 rounded-full bg-[#C41E3A]" />}</div>
                        <span>Todos los docs.</span>
                      </div>
                      <p className="text-xs text-gray-400 m-0 ml-6">Aplica a los {documents.length} docs.</p>
                    </button>
                    <button onClick={() => setNewChange({ ...newChange, isGlobal: false })} className={`px-4 py-3 rounded border-2 transition-all text-sm font-medium text-left ${!newChange.isGlobal ? 'border-[#C41E3A] bg-red-50 text-[#C41E3A]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${!newChange.isGlobal ? 'border-[#C41E3A]' : 'border-gray-300'}`}>{!newChange.isGlobal && <div className="w-2 h-2 rounded-full bg-[#C41E3A]" />}</div>
                        <span>Específicos</span>
                      </div>
                      <p className="text-xs text-gray-400 m-0 ml-6">Selecciona cuáles</p>
                    </button>
                  </div>
                </div>

                {!newChange.isGlobal && (
                  <div className="border border-gray-300 rounded p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-sm font-semibold text-gray-700 m-0">Seleccione los documentos</p>
                      <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${err.appliesTo ? 'bg-red-100 text-[#C41E3A]' : 'bg-red-100 text-[#C41E3A]'}`}>{newChange.appliesTo.length} / {documents.length}</span>
                      {err.appliesTo && <span className="text-xs text-red-500 flex items-center gap-1"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Seleccione al menos uno</span>}
                    </div>
                    <div className="flex gap-2 mb-3">
                      <div className="relative flex-1">
                        <input type="text" placeholder="Buscar documento..." value={searchDocument} onChange={(e) => setSearchDocument(e.target.value)} className="w-full px-4 py-2 pl-9 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white" />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                      <button onClick={() => { const allIds = documents.map((d) => d.id); const allSelected = allIds.every((id) => newChange.appliesTo.includes(id)); setNewChange({ ...newChange, appliesTo: allSelected ? [] : allIds }); }} className="px-3 py-2 text-xs font-semibold text-[#C41E3A] border border-red-200 rounded hover:bg-red-50 transition-colors whitespace-nowrap bg-white flex-shrink-0">
                        {documents.every((d) => newChange.appliesTo.includes(d.id)) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {groupedAvailable(documents.filter((doc) => doc.name.toLowerCase().includes(searchDocument.toLowerCase()))).map((group) => (
                        <div key={group.category}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide m-0">{group.category}</p>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { const toAdd = group.docs.map((d) => d.id).filter((id) => !newChange.appliesTo.includes(id)); setNewChange({ ...newChange, appliesTo: [...newChange.appliesTo, ...toAdd] }); }} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>todos</button>
                              <button type="button" onClick={() => { const toRemove = group.docs.map((d) => d.id); setNewChange({ ...newChange, appliesTo: newChange.appliesTo.filter((id) => !toRemove.includes(id)) }); }} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>todos</button>
                            </div>
                          </div>
                          {group.docs.map((doc) => {
                            const selected = newChange.appliesTo.includes(doc.id);
                            return (
                              <button key={doc.id} onClick={() => { setNewChange({ ...newChange, appliesTo: selected ? newChange.appliesTo.filter((id) => id !== doc.id) : [...newChange.appliesTo, doc.id] }); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-left transition-colors mb-1 ${selected ? 'bg-red-50/50 border border-red-200 text-[#C41E3A]' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-[#C41E3A] border-[#C41E3A]' : 'border-gray-300'}`}>{selected && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>
                                <span className="flex-1 truncate">{doc.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                      {searchDocument && documents.filter((doc) => doc.name.toLowerCase().includes(searchDocument.toLowerCase())).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-3 m-0">No se encontraron documentos.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 flex-shrink-0">
                <div className="flex gap-3 px-6 py-3">
                  <button onClick={closeModal} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">Cancelar</button>
                  <button onClick={handleSubmit} className="flex-1 px-5 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-semibold">{editingId ? 'Guardar cambios' : 'Agregar cambio'}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Agregar unidad operativa */}
      {unitModalType !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeUnitModal} />
          <div className="relative bg-white rounded shadow-xl w-full max-w-lg mx-4 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h4 className="font-semibold text-gray-900 text-base m-0">Agregar unidad {unitModalType === 'internal' ? 'interna' : 'externa'}</h4>
                <p className="text-xs text-gray-500 mt-0.5 m-0">Complete los campos requeridos para registrar la unidad</p>
              </div>
              <button onClick={closeUnitModal} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {unitModalType === 'internal' ? (
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Unidad operativa <span className="text-[#C41E3A]">*</span></label>
                  <div className="relative">
                    <button type="button" onClick={() => setUnitDropdownOpen((prev) => !prev)} className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent transition-colors">
                      <span className={selectedUnitName ? 'text-gray-900' : 'text-gray-400'}>{selectedUnitName || 'Seleccione una unidad operativa'}</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${unitDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {unitDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <input type="text" autoFocus placeholder="Buscar unidad..." value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent" />
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          </div>
                        </div>
                        <ul className="max-h-48 overflow-y-auto py-1">
                          {mockOperativeUnits.filter((u) => u.toLowerCase().includes(unitSearch.toLowerCase())).map((u) => (
                            <li key={u}>
                              <button type="button" onClick={() => { setSelectedUnitName(u); setUnitDropdownOpen(false); setUnitSearch(''); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedUnitName === u ? 'text-[#C41E3A] font-semibold bg-red-50' : 'text-gray-700'}`}>{u}</button>
                            </li>
                          ))}
                          {mockOperativeUnits.filter((u) => u.toLowerCase().includes(unitSearch.toLowerCase())).length === 0 && (
                            <li className="px-4 py-3 text-sm text-gray-400 italic text-center">Sin resultados</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">Nombre de la unidad operativa <span className="text-[#C41E3A]">*</span></label>
                    <input type="text" autoFocus value={extUnitName} onChange={(e) => setExtUnitName(e.target.value)} placeholder="Ej: Laboratorio de Genómica" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">¿Cuenta con carta de aprobación / declaración?</label>
                    <div className="flex gap-2">
                      {(['SI', 'NO'] as const).map((opt) => (
                        <button key={opt} type="button" onClick={() => { setExtHasCarta(opt); if (opt === 'NO') setUnitFile(null); }} className={`px-5 py-2 rounded text-sm font-medium transition-all border ${extHasCarta === opt ? 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                          {opt === 'SI' ? 'Sí' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {(unitModalType === 'internal' || extHasCarta === 'SI') && (
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    {unitModalType === 'external' ? 'Carta de aprobación / declaración' : 'Carta de declaración del jefe de unidad operativa'}{' '}
                    <span className="text-[#C41E3A]">*</span>
                  </label>
                  {unitFile ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-300 rounded">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="flex-1 text-sm text-green-800 font-medium truncate">{unitFile.name}</span>
                      <button onClick={() => setUnitFile(null)} className="text-green-600 hover:text-red-600 transition-colors flex-shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded cursor-pointer transition-colors ${isDraggingUnit ? 'border-[#C41E3A] bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}`} onDragOver={(e) => { e.preventDefault(); setIsDraggingUnit(true); }} onDragLeave={() => setIsDraggingUnit(false)} onDrop={handleUnitFileDrop}>
                      <svg className={`w-8 h-8 ${isDraggingUnit ? 'text-[#C41E3A]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 m-0"><span className="font-semibold text-[#C41E3A]">Haz clic para subir</span> o arrastra el archivo aquí</p>
                        <p className="text-xs text-gray-400 mt-1 m-0">PDF, DOC, DOCX — Máx. 200 MB</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUnitFile(f); }} />
                    </label>
                  )}
                </div>
              )}

              {unitModalType === 'external' && extHasCarta === 'NO' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs text-amber-800 m-0">Para poder registrar la unidad es necesario adjuntar la carta de aprobación o declaración. Seleccione <strong>"Sí"</strong> y cargue el documento correspondiente.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closeUnitModal} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">Cancelar</button>
              <button onClick={handleConfirmUnit} disabled={unitModalType === 'internal' ? !selectedUnitName || !unitFile : !extUnitName.trim() || extHasCarta === 'NO' || !unitFile} className="flex-1 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between gap-4 pt-4 border-t border-gray-200">
        <button onClick={onBack} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">← Volver</button>
        <button onClick={onNext} disabled={changes.length === 0} className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium">Continuar al resumen →</button>
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
};
