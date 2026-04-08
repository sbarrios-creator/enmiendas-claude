import { useState } from 'react';
import type { Change } from '../types';

interface DefineChangesProps {
  selectedDocuments: string[];
  changes: Change[];
  onChangesUpdate: (changes: Change[]) => void;
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

export function DefineChanges({ selectedDocuments, changes, onChangesUpdate, onNext, onBack }: DefineChangesProps) {
  const [showAddChange, setShowAddChange] = useState(false);
  const [newChange, setNewChange] = useState({
    field: '',
    customField: '',
    oldValue: '',
    newValue: '',
    justification: '',
    appliesTo: [] as string[],
    isGlobal: true,
  });

  // Questions state
  const [modifiesTitleOrSummary, setModifiesTitleOrSummary] = useState<'NO' | 'SI' | null>(null);
  const [modifiesOperativeUnits, setModifiesOperativeUnits] = useState<'NO' | 'SI' | null>(null);
  const [modifiesResearchers, setModifiesResearchers] = useState<'NO' | 'SI' | null>(null);

  // Form data for each question
  const [titleSummaryData, setTitleSummaryData] = useState({ title: '', summary: '' });
  const [operativeUnitsData, setOperativeUnitsData] = useState({ units: '' });
  const [researchersData, setResearchersData] = useState({ researchers: '' });

  // Researchers list state
  const [researchers, setResearchers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    currentRole: string;
    proposedRole: string;
    changeType: 'add' | 'remove' | 'modify';
    justification: string;
  }>>([]);
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
    if (!newChange.newValue) return;

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
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Redacción de cambio</h2>
        <p className="text-gray-600 text-sm">
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
                <h3 className="text-lg font-semibold text-gray-900 m-0">Título y Resumen</h3>
                <p className="text-sm text-gray-600 m-0 mt-1">¿Modificará el título o resumen del estudio?</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModifiesTitleOrSummary('NO')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    modifiesTitleOrSummary === 'NO'
                      ? 'bg-[#C41E3A] text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  NO
                </button>
                <button
                  onClick={() => setModifiesTitleOrSummary('SI')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Nuevo resumen</label>
                <textarea
                  value={titleSummaryData.summary}
                  onChange={(e) => setTitleSummaryData({ ...titleSummaryData, summary: e.target.value })}
                  placeholder="Ingrese el nuevo resumen del estudio"
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
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
              <h3 className="text-lg font-semibold text-gray-900 m-0">Unidades Operativas</h3>
              <p className="text-sm text-gray-600 m-0 mt-1">¿Modificará las unidades operativas del estudio?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setModifiesOperativeUnits('NO')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  modifiesOperativeUnits === 'NO'
                    ? 'bg-[#C41E3A] text-white shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                NO
              </button>
              <button
                onClick={() => setModifiesOperativeUnits('SI')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
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
              <h3 className="text-lg font-semibold text-gray-900 m-0">Equipo de Investigación</h3>
              <p className="text-sm text-gray-600 m-0 mt-1">¿Modificará investigadores, tesistas, asesores o coasesores?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setModifiesResearchers('NO')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  modifiesResearchers === 'NO'
                    ? 'bg-[#C41E3A] text-white shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                NO
              </button>
              <button
                onClick={() => setModifiesResearchers('SI')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded-md hover:bg-[#A01828] transition-colors font-medium"
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">Correo electrónico *</label>
                      <input
                        type="email"
                        value={newResearcher.email}
                        onChange={(e) => setNewResearcher({ ...newResearcher, email: e.target.value })}
                        placeholder="ejemplo@upch.pe"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {newResearcher.changeType !== 'add' && (
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">Rol actual</label>
                      <select
                        value={newResearcher.currentRole}
                        onChange={(e) => setNewResearcher({ ...newResearcher, currentRole: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
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
                      className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddResearcher}
                      disabled={!newResearcher.name || !newResearcher.email || !newResearcher.justification || (newResearcher.changeType !== 'remove' && !newResearcher.proposedRole)}
                      className="flex-1 px-4 py-2.5 bg-[#C41E3A] text-white rounded-md hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
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
            <h3 className="text-lg font-semibold text-gray-900 m-0">Otros Cambios en Documentos</h3>
            <p className="text-sm text-gray-600 m-0 mt-1">Agregue cambios específicos para cada documento seleccionado</p>
          </div>

          <div className="p-4">
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r mb-4">
              <p className="text-sm text-gray-800 m-0">
                Para cada cambio, describa el valor anterior y el nuevo valor propuesto con su justificación correspondiente.
              </p>
            </div>

            {/* Existing Changes */}
            {changes.length > 0 && (
              <div className="space-y-3 mb-4">
                {changes.map((change) => (
                  <div key={change.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base font-semibold text-gray-900 m-0">{change.field}</h4>
                      {change.isGlobal ? (
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Global
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Específico
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-2">
                      {change.oldValue && (
                        <div>
                          <p className="text-xs text-gray-500 m-0 mb-1">Valor anterior:</p>
                          <p className="text-sm text-gray-700 m-0 line-through">{change.oldValue}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 m-0 mb-1">Valor nuevo:</p>
                        <p className="text-sm text-[#C41E3A] font-medium m-0">{change.newValue}</p>
                      </div>
                    </div>

                    {change.justification && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 m-0 mb-1">Justificación:</p>
                        <p className="text-sm text-gray-700 m-0">{change.justification}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>
                        {change.isGlobal ? 'Todos los documentos' : `${change.appliesTo.length} documentos`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveChange(change.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Change Button */}
        {!showAddChange && (
          <button
            onClick={() => setShowAddChange(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded-md hover:bg-[#A01828] transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar cambio
          </button>
        )}

        {/* Add New Change Form */}
        {showAddChange && (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-5">
            <h4 className="font-semibold text-gray-900 text-base mb-4 m-0">Nuevo cambio</h4>

            <div className="space-y-4">
              {/* Field Selection */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Campo a modificar *</label>
                <select
                  value={newChange.field}
                  onChange={(e) => setNewChange({ ...newChange, field: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white"
                >
                  <option value="">Seleccione un campo</option>
                  {commonFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Field */}
              {newChange.field === 'Otro (personalizado)' && (
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Especifique el campo *</label>
                  <input
                    type="text"
                    value={newChange.customField}
                    onChange={(e) => setNewChange({ ...newChange, customField: e.target.value })}
                    placeholder="Ej: Versión del protocolo"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Old Value */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Valor anterior</label>
                  <input
                    type="text"
                    value={newChange.oldValue}
                    onChange={(e) => setNewChange({ ...newChange, oldValue: e.target.value })}
                    placeholder="Ej: Estudio ABC-123"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                  />
                </div>

                {/* New Value */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">Valor nuevo *</label>
                  <input
                    type="text"
                    value={newChange.newValue}
                    onChange={(e) => setNewChange({ ...newChange, newValue: e.target.value })}
                    placeholder="Ej: Estudio XYZ-456"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Alcance del cambio *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewChange({ ...newChange, isGlobal: true })}
                    className={`px-4 py-3 rounded-md border-2 transition-all text-sm font-medium ${
                      newChange.isGlobal
                        ? 'border-[#C41E3A] bg-white text-[#C41E3A]'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Todos los documentos
                  </button>
                  <button
                    onClick={() => setNewChange({ ...newChange, isGlobal: false })}
                    className={`px-4 py-3 rounded-md border-2 transition-all text-sm font-medium ${
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
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                      >
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
                  </div>
                  <p className="text-xs text-gray-600 mt-3 m-0">
                    {newChange.appliesTo.length} de {documents.length} seleccionados
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddChange(false)}
                  className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddChange}
                  disabled={!newChange.newValue || !newChange.field || !newChange.justification || (!newChange.isGlobal && newChange.appliesTo.length === 0)}
                  className="flex-1 px-4 py-2.5 bg-[#C41E3A] text-white rounded-md hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Agregar cambio
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex justify-between gap-4 pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
        >
          ← Volver
        </button>
        <button
          onClick={onNext}
          disabled={changes.length === 0}
          className="px-8 py-3 bg-[#C41E3A] text-white rounded-md hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
        >
          Continuar al resumen →
        </button>
      </div>
    </div>
  );
}
