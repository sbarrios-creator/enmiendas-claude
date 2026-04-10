import { useState } from 'react';
import type { Change, Step3Data, ResearcherChange } from '../types';

interface DefineChangesProps {
  selectedDocuments: string[];
  changes: Change[];
  onChangesUpdate: (changes: Change[]) => void;
  step3Data: Step3Data;
  onStep3DataChange: (data: Step3Data) => void;
  onNext: () => void;
  onBack: () => void;
}

const mockDocuments = [
  { id: '1', name: 'Presupuesto general del estudio', type: 'Presupuesto' },
  { id: '2', name: 'Cuestionario de salud general (SF-36)', type: 'Instrumento' },
  { id: '3', name: 'Cuestionario de calidad de vida', type: 'Instrumento' },
  { id: '4', name: 'Escala de evaluación clínica', type: 'Instrumento' },
  { id: '5', name: 'Formulario de consentimiento informado', type: 'Instrumento' },
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

export function DefineChanges({ selectedDocuments, changes, onChangesUpdate, step3Data, onStep3DataChange, onNext, onBack }: DefineChangesProps) {
  const [showAddChange, setShowAddChange] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
  const setOperativeUnitsData = (d: { units: string }) =>
    onStep3DataChange({ ...step3Data, operativeUnitsData: d });
  const setResearchers = (r: ResearcherChange[]) =>
    onStep3DataChange({ ...step3Data, researchers: r });

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
    setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', appliesTo: [], isGlobal: true });
  };

  const documents = mockDocuments.filter((doc) => selectedDocuments.includes(doc.id));
  // Cambios agrupados
  const globalChanges = changes.filter((c) => c.isGlobal);
  const getChangesForDoc = (docId: string) => changes.filter((c) => !c.isGlobal && c.appliesTo.includes(docId));
  const docHasChanges = (docId: string) => globalChanges.length > 0 || getChangesForDoc(docId).length > 0;
  const docsWithChanges = documents.filter((doc) => docHasChanges(doc.id)).length;
  const allDocsHaveChanges = documents.length > 0 && documents.every((doc) => docHasChanges(doc.id));

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
    if (!newChange.newValue || !newChange.justification) return;
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
          <div className="p-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Detalle de las nuevas unidades operativas</label>
              <textarea
                value={operativeUnitsData.units}
                onChange={(e) => setOperativeUnitsData({ ...operativeUnitsData, units: e.target.value })}
                placeholder="Describa las unidades operativas que serán modificadas o agregadas"
                rows={4}
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
              />
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
          {/* Header con progreso */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 m-0">Otros Cambios en Documentos</h3>
                <p className="text-sm text-gray-600 m-0 mt-0.5">Agregue al menos un cambio por documento seleccionado</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500 m-0">Documentos justificados</p>
                  <p className={`text-sm font-bold m-0 ${allDocsHaveChanges ? 'text-green-600' : 'text-amber-600'}`}>
                    {docsWithChanges} de {documents.length}
                  </p>
                </div>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${allDocsHaveChanges ? 'bg-green-500' : 'bg-amber-400'}`}
                    style={{ width: documents.length ? `${(docsWithChanges / documents.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">

            {/* Sección: cambios globales */}
            {globalChanges.length > 0 && (
              <div className="p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">Global</span>
                  <span className="text-sm font-semibold text-blue-900">Aplica a todos los documentos</span>
                </div>
                <div className="space-y-2">
                  {globalChanges.map((change) => (
                    <div key={change.id} className="bg-white border border-blue-200 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 m-0 mb-1">{change.field || '—'}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {change.oldValue && <span className="text-xs text-gray-400 line-through">{change.oldValue}</span>}
                          {change.oldValue && <span className="text-gray-300 text-xs">→</span>}
                          <span className="text-xs font-semibold text-green-700">{change.newValue}</span>
                        </div>
                        {change.justification && <p className="text-xs text-gray-500 m-0 mt-1">{change.justification}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleEditChange(change)} className="w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" title="Editar">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleRemoveChange(change.id)} className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors" title="Eliminar">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sección por documento */}
            {documents.map((doc) => {
              const docChanges = getChangesForDoc(doc.id);
              const hasChanges = docHasChanges(doc.id);
              return (
                <div key={doc.id} className="p-4">
                  {/* Cabecera del documento */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {hasChanges ? (
                        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      )}
                      <span className="text-sm font-semibold text-gray-900 truncate">{doc.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{doc.type}</span>
                      {globalChanges.length > 0 && (
                        <span className="text-xs text-blue-600 shrink-0">(+{globalChanges.length} global{globalChanges.length > 1 ? 'es' : ''})</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenAddForDoc(doc.id)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-xs font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Agregar
                    </button>
                  </div>

                  {/* Cambios específicos del documento */}
                  {docChanges.length > 0 ? (
                    <div className="space-y-2 ml-6">
                      {docChanges.map((change) => (
                        <div key={change.id} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 m-0 mb-1">{change.field || '—'}</p>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {change.oldValue && <span className="text-xs text-gray-400 line-through">{change.oldValue}</span>}
                              {change.oldValue && <span className="text-gray-300 text-xs">→</span>}
                              <span className="text-xs font-semibold text-green-700">{change.newValue}</span>
                            </div>
                            {change.justification && <p className="text-xs text-gray-500 m-0">{change.justification}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleEditChange(change)} className="w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" title="Editar">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleRemoveChange(change.id)} className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors" title="Eliminar">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !hasChanges && (
                      <p className="ml-6 text-xs text-amber-600 italic">Sin cambios registrados para este documento</p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Agregar / Editar cambio */}
      {showAddChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />

          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col">
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

              {/* Antes / Después */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Antes</label>
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
                  <label className="block mb-1.5 text-sm font-semibold text-gray-700">Después <span className="text-[#C41E3A]">*</span></label>
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
                  <button
                    onClick={() => setNewChange({ ...newChange, isGlobal: true, appliesTo: [] })}
                    className={`px-4 py-2 rounded border transition-all text-sm font-medium ${newChange.isGlobal ? 'border-[#C41E3A] bg-red-50 text-[#C41E3A]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}
                  >
                    Todos los documentos
                  </button>
                  <button
                    onClick={() => setNewChange({ ...newChange, isGlobal: false })}
                    className={`px-4 py-2 rounded border transition-all text-sm font-medium ${!newChange.isGlobal ? 'border-[#C41E3A] bg-red-50 text-[#C41E3A]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}
                  >
                    Documentos específicos
                  </button>
                </div>
              </div>

              {/* Selección de documentos específicos */}
              {!newChange.isGlobal && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 m-0">Documentos afectados</p>
                  <div className="space-y-1">
                    {documents.map((doc) => (
                      <label key={doc.id} className="flex items-center gap-3 p-2 rounded hover:bg-white cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={newChange.appliesTo.includes(doc.id)}
                          onChange={() => handleToggleDocument(doc.id)}
                          className="w-4 h-4 text-[#C41E3A] rounded"
                        />
                        <span className="text-sm text-gray-700">{doc.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 m-0">{newChange.appliesTo.length} de {documents.length} seleccionados</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={editingId ? handleSaveEdit : handleAddChange}
                disabled={!newChange.newValue || !newChange.justification || (!newChange.isGlobal && newChange.appliesTo.length === 0)}
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
          onClick={onNext}
          disabled={!allDocsHaveChanges}
          className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Continuar al resumen →
        </button>
      </div>
    </div>
  );
}
