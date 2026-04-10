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
  const setOperativeUnitsData = (d: { units: string }) =>
    onStep3DataChange({ ...step3Data, operativeUnitsData: d });
  const setResearchers = (r: ResearcherChange[]) =>
    onStep3DataChange({ ...step3Data, researchers: r });

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

  const documents = mockDocuments.filter((doc) => selectedDocuments.includes(doc.id));

  const handleAddChange = () => {
    if (!newChange.field || !newChange.newValue || !newChange.justification) return;

    const field = newChange.field;
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
    if (!newChange.field || !newChange.newValue || !editingId) return;
    const field = newChange.field;
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
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 m-0">Otros Cambios en Documentos</h3>
                  <p className="text-sm text-gray-600 m-0 mt-1">Agregue cambios específicos para cada documento seleccionado</p>
                </div>
                {changes.length > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C41E3A] text-white text-xs font-bold">
                    {changes.length}
                  </span>
                )}
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
                Para cada cambio, describa el valor anterior y el nuevo valor propuesto con su justificación correspondiente.
              </p>
            </div>

            {/* Search */}
            {changes.length > 0 && (
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Buscar por campo, valor nuevo o valor anterior..."
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
              <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-[460px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cambio</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valor Anterior</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valor Nuevo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Justificación</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {changes
                        .filter((c) =>
                          !searchChange ||
                          c.field.toLowerCase().includes(searchChange.toLowerCase()) ||
                          c.newValue.toLowerCase().includes(searchChange.toLowerCase()) ||
                          c.oldValue.toLowerCase().includes(searchChange.toLowerCase())
                        )
                        .map((change, index) => (
                          <tr key={change.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 font-medium text-gray-900">{change.field}</td>
                            <td className="px-4 py-3 text-gray-500 line-through">
                              {change.oldValue || <span className="no-underline text-gray-300 not-italic">—</span>}
                            </td>
                            <td className="px-4 py-3 text-[#C41E3A] font-medium">{change.newValue}</td>
                            <td className="px-4 py-3 text-gray-700 max-w-[320px]">
                              <p className="m-0 line-clamp-3" title={change.justification}>{change.justification}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-2">
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
                            </td>
                          </tr>
                        ))}
                      {searchChange && !changes.some((c) =>
                        c.field.toLowerCase().includes(searchChange.toLowerCase()) ||
                        c.newValue.toLowerCase().includes(searchChange.toLowerCase()) ||
                        c.oldValue.toLowerCase().includes(searchChange.toLowerCase())
                      ) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                            No se encontraron resultados para la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 text-base m-0">
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <div className="space-y-4">
                {/* Cambio a realizar */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Cambio a realizar *</label>
                  <input
                    type="text"
                    value={newChange.field}
                    onChange={(e) => setNewChange({ ...newChange, field: e.target.value })}
                    placeholder="Ej: Nombre del estudio"
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">Valor anterior</label>
                    <input
                      type="text"
                      value={newChange.oldValue}
                      onChange={(e) => setNewChange({ ...newChange, oldValue: e.target.value })}
                      placeholder="Ej: Estudio ABC-123"
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">Valor nuevo *</label>
                    <input
                      type="text"
                      value={newChange.newValue}
                      onChange={(e) => setNewChange({ ...newChange, newValue: e.target.value })}
                      placeholder="Ej: Estudio XYZ-456"
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Justification */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Justificación *</label>
                  <textarea
                    value={newChange.justification}
                    onChange={(e) => setNewChange({ ...newChange, justification: e.target.value })}
                    placeholder="Describa la justificación para este cambio"
                    rows={3}
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                  />
                </div>

                {/* Scope Selection */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Alcance del cambio *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setNewChange({ ...newChange, isGlobal: true })}
                      className={`px-4 py-2 rounded border transition-all text-sm font-medium ${
                        newChange.isGlobal
                          ? 'border-[#C41E3A] bg-white text-[#C41E3A]'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Todos los documentos
                    </button>
                    <button
                      onClick={() => setNewChange({ ...newChange, isGlobal: false })}
                      className={`px-4 py-2 rounded border transition-all text-sm font-medium ${
                        !newChange.isGlobal
                          ? 'border-[#C41E3A] bg-white text-[#C41E3A]'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Documentos específicos
                    </button>
                  </div>
                </div>

                {/* Document Selection */}
                {!newChange.isGlobal && (
                  <div className="border border-gray-300 rounded-lg p-4 bg-white">
                    <p className="text-sm font-semibold text-gray-700 mb-3 m-0">Seleccione los documentos:</p>

                    {/* Buscador */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        placeholder="Buscar documento..."
                        value={searchDocument}
                        onChange={(e) => setSearchDocument(e.target.value)}
                        className="w-full px-4 py-2 pl-9 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                      />
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {/* Lista con scroll */}
                    <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                      {documents
                        .filter((doc) => doc.name.toLowerCase().includes(searchDocument.toLowerCase()))
                        .map((doc) => (
                          <div key={doc.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                            <button
                              onClick={() => handleToggleDocument(doc.id)}
                              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                                newChange.appliesTo.includes(doc.id)
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {newChange.appliesTo.includes(doc.id) ? '✓ Seleccionado' : 'Seleccionar'}
                            </button>
                            <span className="text-sm text-gray-700">{doc.name}</span>
                          </div>
                        ))}
                      {searchDocument && !documents.some((doc) => doc.name.toLowerCase().includes(searchDocument.toLowerCase())) && (
                        <p className="text-sm text-gray-500 text-center py-3 m-0">No se encontraron documentos.</p>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 mt-3 m-0">
                      {newChange.appliesTo.length} de {documents.length} seleccionados
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddChange(false);
                  setEditingId(null);
                  setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', appliesTo: [], isGlobal: true });
                  setSearchDocument('');
                }}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={editingId ? handleSaveEdit : handleAddChange}
                disabled={!newChange.field || !newChange.newValue || !newChange.justification || (!newChange.isGlobal && newChange.appliesTo.length === 0)}
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
          disabled={changes.length === 0}
          className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Continuar al resumen →
        </button>
      </div>
    </div>
  );
}
