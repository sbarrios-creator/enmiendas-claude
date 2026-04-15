import { useState } from 'react';
import type { Change, Document, Step3Data, ResearcherChange, OperativeUnit } from '../types';
import { baseDocuments } from '../data/documents';

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
  const [searchChange, setSearchChange] = useState('');
  const [searchDocument, setSearchDocument] = useState('');
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

  const allDocuments = [...baseDocuments, ...newDocuments];
  const documents = allDocuments.filter((doc) => selectedDocuments.includes(doc.id));

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
    setNewChange({
      field: change.field,
      customField: '',
      oldValue: change.oldValue,
      newValue: change.newValue,
      justification: change.justification,
      appliesTo: change.appliesTo,
      isGlobal: change.isGlobal,
    });
    setEditingId(change.id);
    setShowAddChange(true);
  };

  const handleSaveEdit = () => {
    const field = newChange.field;
    if (!field || !newChange.newValue || !editingId) return;
    const appliesTo = newChange.isGlobal ? selectedDocuments : newChange.appliesTo;
    onChangesUpdate(changes.map((c) =>
      c.id === editingId
        ? { ...c, field, oldValue: newChange.oldValue, newValue: newChange.newValue, justification: newChange.justification, appliesTo, isGlobal: newChange.isGlobal }
        : c
    ));
    setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', appliesTo: [], isGlobal: true });
                  setSearchDocument('');
    setEditingId(null);
    setShowAddChange(false);
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
          <div className="p-4 space-y-5">
            {/* Info block */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r">
              <p className="text-sm text-blue-900 m-0">
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
              <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                <div className="border border-gray-200 rounded-lg py-6 text-center text-sm text-gray-400 italic bg-white">
                  No se encontraron resultados
                </div>
              ) : (
                <div className="space-y-3">
                  {operativeUnitsData.externalUnits.map((unit) => (
                    <div key={unit.id} className="flex items-center gap-4 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                      {/* Icono */}
                      <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gray-100 rounded-full">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>

                      {/* Info */}
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

                      {/* Acciones */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { const url = URL.createObjectURL(unit.file); window.open(url, '_blank'); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors font-medium"
                          title="Ver documento"
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
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors font-medium"
                          title="Descargar documento"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Descargar
                        </button>
                        <button
                          onClick={() => handleRemoveExternalUnit(unit.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors font-medium"
                          title="Deshacer registro"
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
                              onClick={() => handleRemoveResearcher(researcher.id)}
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
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 m-0">Otros Cambios en Documentos</h3>
                <p className="text-sm text-gray-600 m-0 mt-1">Agregue cambios específicos para cada documento seleccionado</p>
              </div>
              {!showAddChange && (
                <button
                  onClick={() => setShowAddChange(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar cambio
                </button>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r mb-4">
              <p className="text-sm text-gray-800 m-0">
                Para cada cambio, describa el Versión Anterior y el nuevo valor propuesto con su justificación correspondiente.
              </p>
            </div>

            {/* Search */}
            {changes.length > 0 && (
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Buscar por campo, Versión Nueva o Versión Anterior..."
                  value={searchChange}
                  onChange={(e) => setSearchChange(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}

            {/* Existing Changes */}
            {changes.length > 0 && (
              <div className="space-y-3 mb-4 max-h-[700px] overflow-y-auto">
                {changes
                  .filter((c) =>
                    !searchChange ||
                    c.field.toLowerCase().includes(searchChange.toLowerCase()) ||
                    c.newValue.toLowerCase().includes(searchChange.toLowerCase()) ||
                    c.oldValue.toLowerCase().includes(searchChange.toLowerCase())
                  )
                  .map((change) => (
                  <div key={change.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base font-semibold text-gray-900 m-0">{change.field}</h4>
                      {/* {change.isGlobal ? (
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Global
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Específico
                        </span>
                      )} */}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-2">
                      {change.oldValue && (
                        <div>
                          <p className="text-xs text-gray-500 m-0 mb-1">Versión Anterior:</p>
                          <p className="text-sm text-gray-700 m-0 line-through">{change.oldValue}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 m-0 mb-1">Versión Nueva:</p>
                        <p className="text-sm text-[#C41E3A] font-medium m-0">{change.newValue}</p>
                      </div>
                      {change.justification && (
                        <div>
                          <p className="text-xs text-gray-500 m-0 mb-1">Justificación:</p>
                          <p className="text-sm text-gray-700 m-0">{change.justification}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>
                        {change.isGlobal
                        ? 'Todos los documentos'
                        : change.appliesTo
                            .map((id) => documents.find((d) => d.id === id)?.name)
                            .filter(Boolean)
                            .join(' · ')
                      }
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditChange(change)}
                      className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveChange(change.id)}
                      className="w-8 h-8 flex items-center justify-center bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
                {searchChange && !changes.some((c) =>
                  c.field.toLowerCase().includes(searchChange.toLowerCase()) ||
                  c.newValue.toLowerCase().includes(searchChange.toLowerCase()) ||
                  c.oldValue.toLowerCase().includes(searchChange.toLowerCase())
                ) && (
                  <p className="text-sm text-gray-500 text-center py-4">No se encontraron resultados para la búsqueda.</p>
                )}
          </div>
        )}

        </div>
      </div>
    </div>

      {/* Modal: Agregar / Editar cambio */}
      {showAddChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowAddChange(false);
              setEditingId(null);
              setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', appliesTo: [], isGlobal: true });
                  setSearchDocument('');
            }}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 text-sm m-0">
                {editingId ? 'Editar cambio' : 'Nuevo cambio'}
              </h4>
              <button
                onClick={() => {
                  setShowAddChange(false);
                  setEditingId(null);
                  setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', appliesTo: [], isGlobal: true });
                  setSearchDocument('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-4 py-3">
              <div className="space-y-3">
                {/* Campo a modificar */}
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Campo a modificar *</label>
                  <input
                    type="text"
                    value={newChange.field}
                    onChange={(e) => setNewChange({ ...newChange, field: e.target.value })}
                    placeholder="Campo a modificar *"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-700">Versión Anterior</label>
                    <textarea
                      value={newChange.oldValue}
                      onChange={(e) => setNewChange({ ...newChange, oldValue: e.target.value })}
                      placeholder="Ej: Estudio ABC-123"
                      rows={3}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-700">Versión Nueva *</label>
                    <textarea
                      value={newChange.newValue}
                      onChange={(e) => setNewChange({ ...newChange, newValue: e.target.value })}
                      placeholder="Ej: Estudio XYZ-456"
                      rows={3}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                {/* Justificación */}
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Justificación *</label>
                  <textarea
                    value={newChange.justification}
                    onChange={(e) => setNewChange({ ...newChange, justification: e.target.value })}
                    placeholder="Describa la justificación para este cambio"
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                  />
                </div>

                {/* Alcance */}
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Alcance del cambio *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewChange({ ...newChange, isGlobal: true })}
                      className={`px-3 py-1.5 rounded border transition-all text-xs font-medium ${
                        newChange.isGlobal
                          ? 'border-[#C41E3A] bg-white text-[#C41E3A]'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Todos los documentos
                    </button>
                    <button
                      onClick={() => setNewChange({ ...newChange, isGlobal: false })}
                      className={`px-3 py-1.5 rounded border transition-all text-xs font-medium ${
                        !newChange.isGlobal
                          ? 'border-[#C41E3A] bg-white text-[#C41E3A]'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Documentos específicos
                    </button>
                  </div>
                </div>

                {/* Selección de documentos agrupados */}
                {!newChange.isGlobal && (() => {
                  // Agrupar por categoría preservando orden
                  const grouped = documents.reduce<{ category: string; docs: typeof documents }[]>((acc, doc) => {
                    const cat = (doc as { category?: string }).category ?? (doc.type === 'Nuevo' ? 'Documentos Nuevos' : doc.type);
                    const existing = acc.find((g) => g.category === cat);
                    if (existing) existing.docs.push(doc);
                    else acc.push({ category: cat, docs: [doc] });
                    return acc;
                  }, []);

                  const filtered = grouped.map((g) => ({
                    ...g,
                    docs: g.docs.filter((d) => d.name.toLowerCase().includes(searchDocument.toLowerCase())),
                  })).filter((g) => g.docs.length > 0);

                  return (
                    <div className="border border-gray-300 rounded bg-white">
                      {/* Buscador + contador */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Buscar documento..."
                            value={searchDocument}
                            onChange={(e) => setSearchDocument(e.target.value)}
                            className="w-full px-3 py-1 pl-7 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                          />
                          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{newChange.appliesTo.length}/{documents.length}</span>
                      </div>

                      {/* Grupos */}
                      <div className="max-h-48 overflow-y-auto">
                        {filtered.length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-3 m-0">Sin resultados.</p>
                        )}
                        {filtered.map(({ category, docs: groupDocs }) => {
                          const allGroupSelected = groupDocs.every((d) => newChange.appliesTo.includes(d.id));
                          const someGroupSelected = groupDocs.some((d) => newChange.appliesTo.includes(d.id));
                          const toggleGroup = () => {
                            if (allGroupSelected) {
                              setNewChange((prev) => ({ ...prev, appliesTo: prev.appliesTo.filter((id) => !groupDocs.map((d) => d.id).includes(id)) }));
                            } else {
                              const toAdd = groupDocs.map((d) => d.id).filter((id) => !newChange.appliesTo.includes(id));
                              setNewChange((prev) => ({ ...prev, appliesTo: [...prev.appliesTo, ...toAdd] }));
                            }
                          };
                          return (
                            <div key={category}>
                              {/* Cabecera de grupo */}
                              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200 sticky top-0">
                                <span className="text-xs font-semibold text-gray-700">{category}</span>
                                <button
                                  onClick={toggleGroup}
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                                    allGroupSelected
                                      ? 'bg-[#C41E3A] text-white hover:bg-[#A01828]'
                                      : someGroupSelected
                                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                  }`}
                                >
                                  {allGroupSelected ? 'Quitar todos' : 'Agregar todos'}
                                </button>
                              </div>
                              {/* Filas de documentos */}
                              {groupDocs.map((doc) => (
                                <div
                                  key={doc.id}
                                  onClick={() => handleToggleDocument(doc.id)}
                                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${
                                    newChange.appliesTo.includes(doc.id) ? 'bg-green-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                                    newChange.appliesTo.includes(doc.id) ? 'bg-green-600 border-green-600' : 'border-gray-400'
                                  }`}>
                                    {newChange.appliesTo.includes(doc.id) && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-700 flex-1">{doc.name}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddChange(false);
                  setEditingId(null);
                  setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', appliesTo: [], isGlobal: true });
                  setSearchDocument('');
                }}
                className="flex-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={editingId ? handleSaveEdit : handleAddChange}
                disabled={
                  !(newChange.field === 'Otro (personalizado)' ? newChange.customField : newChange.field) ||
                  !newChange.newValue ||
                  !newChange.justification ||
                  (!newChange.isGlobal && newChange.appliesTo.length === 0)
                }
                className="flex-1 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs font-medium"
              >
                {editingId ? 'Guardar cambios' : 'Agregar cambio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar unidad operativa */}
      {unitModalType !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeUnitModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h4 className="font-semibold text-gray-900 text-base m-0">
                  Agregar unidad {unitModalType === 'internal' ? 'interna' : 'externa'}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5 m-0">Complete los campos requeridos para registrar la unidad</p>
              </div>
              <button onClick={closeUnitModal} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {unitModalType === 'internal' ? (
                /* ── INTERNA: dropdown con buscador ── */
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Unidad operativa <span className="text-[#C41E3A]">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setUnitDropdownOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent transition-colors"
                    >
                      <span className={selectedUnitName ? 'text-gray-900' : 'text-gray-400'}>
                        {selectedUnitName || 'Seleccione una unidad operativa'}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${unitDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {unitDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Buscar unidad..."
                              value={unitSearch}
                              onChange={(e) => setUnitSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                            />
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                        <ul className="max-h-48 overflow-y-auto py-1">
                          {mockOperativeUnits
                            .filter((u) => u.toLowerCase().includes(unitSearch.toLowerCase()))
                            .map((u) => (
                              <li key={u}>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedUnitName(u); setUnitDropdownOpen(false); setUnitSearch(''); }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedUnitName === u ? 'text-[#C41E3A] font-semibold bg-red-50' : 'text-gray-700'}`}
                                >
                                  {u}
                                </button>
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
                /* ── EXTERNA: texto libre + selector ── */
                <>
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Nombre de la unidad operativa <span className="text-[#C41E3A]">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={extUnitName}
                      onChange={(e) => setExtUnitName(e.target.value)}
                      placeholder="Ej: Laboratorio de Genómica"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      ¿Cuenta con carta de aprobación / declaración?
                    </label>
                    <div className="flex gap-2">
                      {(['SI', 'NO'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setExtHasCarta(opt); if (opt === 'NO') setUnitFile(null); }}
                          className={`px-5 py-2 rounded-md text-sm font-medium transition-all border ${
                            extHasCarta === opt
                              ? 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {opt === 'SI' ? 'Sí' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Drag & drop — visible siempre para interna; solo cuando SI para externa */}
              {(unitModalType === 'internal' || extHasCarta === 'SI') && (
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    {unitModalType === 'external'
                      ? 'Carta de aprobación / declaración'
                      : 'Carta de declaración del jefe de unidad operativa'}{' '}
                    <span className="text-[#C41E3A]">*</span>
                  </label>
                  {unitFile ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="flex-1 text-sm text-green-800 font-medium truncate">{unitFile.name}</span>
                      <button onClick={() => setUnitFile(null)} className="text-green-600 hover:text-red-600 transition-colors flex-shrink-0" title="Quitar archivo">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        isDraggingUnit ? 'border-[#C41E3A] bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingUnit(true); }}
                      onDragLeave={() => setIsDraggingUnit(false)}
                      onDrop={handleUnitFileDrop}
                    >
                      <svg className={`w-8 h-8 ${isDraggingUnit ? 'text-[#C41E3A]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 m-0">
                          <span className="font-semibold text-[#C41E3A]">Haz clic para subir</span> o arrastra el archivo aquí
                        </p>
                        <p className="text-xs text-gray-400 mt-1 m-0">PDF, DOC, DOCX — Máx. 200 MB</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUnitFile(f); }} />
                    </label>
                  )}
                </div>
              )}

              {/* Aviso cuando No tiene carta */}
              {unitModalType === 'external' && extHasCarta === 'NO' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-amber-800 m-0">
                    Para poder registrar la unidad es necesario adjuntar la carta de aprobación o declaración. Seleccione <strong>"Sí"</strong> y cargue el documento correspondiente.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeUnitModal}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUnit}
                disabled={
                  unitModalType === 'internal'
                    ? !selectedUnitName || !unitFile
                    : !extUnitName.trim() || extHasCarta === 'NO' || !unitFile
                }
                className="flex-1 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Agregar
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
          onClick={onNext}
          disabled={changes.length === 0}
          className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Continuar al resumen →
        </button>
      </div>
    </div>
  );
}
