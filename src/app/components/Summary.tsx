import type { Change, UploadStatus, ImpactAnalysis } from '../types';

interface SummaryProps {
  selectedDocuments: string[];
  changes: Change[];
  uploadStatuses: Record<string, UploadStatus>;
  onFinish: () => void;
  onBack: () => void;
}

const mockDocuments = [
  { id: '1', name: 'Presupuesto general del estudio', type: 'Presupuesto', status: 'Aprobado' },
  { id: '2', name: 'Cuestionario de salud general (SF-36)', type: 'Instrumento', status: 'Aprobado' },
  { id: '3', name: 'Cuestionario de calidad de vida', type: 'Instrumento', status: 'Aprobado' },
  { id: '4', name: 'Escala de evaluación clínica', type: 'Instrumento', status: 'Firmado' },
  { id: '5', name: 'Formulario de consentimiento informado', type: 'Instrumento', status: 'Aprobado' },
];

export function Summary({ selectedDocuments, changes, uploadStatuses, onFinish, onBack }: SummaryProps) {
  const documents = mockDocuments.filter((doc) => selectedDocuments.includes(doc.id));

  // Analyze impact for each document
  const analyzeImpact = (docId: string): ImpactAnalysis => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return { documentId: docId, action: 'blocked', reason: 'Documento no encontrado' };

    // Blocked: signed documents
    if (doc.status === 'Firmado') {
      return {
        documentId: docId,
        action: 'blocked',
        reason: 'Documento firmado - no se puede modificar',
      };
    }

    // Check if changes apply to this document
    const applicableChanges = changes.filter((change) => change.appliesTo.includes(docId));

    // Review required: draft documents
    if (doc.status === 'Borrador') {
      return {
        documentId: docId,
        action: 'review',
        reason: 'Documento en borrador - requiere revisión manual',
      };
    }

    // Automatic: approved documents with global changes
    if (doc.status === 'Aprobado' && applicableChanges.length > 0) {
      const hasGlobalChange = applicableChanges.some((change) => change.isGlobal);
      if (hasGlobalChange) {
        return {
          documentId: docId,
          action: 'automatic',
          reason: 'Cambios globales aplicables - actualización automática',
        };
      }
    }

    // Version: approved documents with specific changes
    return {
      documentId: docId,
      action: 'version',
      reason: 'Generar nueva versión con cambios específicos',
    };
  };

  const impacts = selectedDocuments.map((docId) => analyzeImpact(docId));

  const stats = {
    automatic: impacts.filter((i) => i.action === 'automatic').length,
    review: impacts.filter((i) => i.action === 'review').length,
    version: impacts.filter((i) => i.action === 'version').length,
    blocked: impacts.filter((i) => i.action === 'blocked').length,
  };

  const getActionBadge = (action: ImpactAnalysis['action']) => {
    const styles = {
      automatic: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Automático' },
      review: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'Requiere revisión' },
      version: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Nueva versión' },
      blocked: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Bloqueado' },
    };
    const style = styles[action];
    return (
      <span className={`px-3 py-1 rounded-full text-sm ${style.bg} ${style.text} border ${style.border}`}>
        {style.label}
      </span>
    );
  };

  const getActionIcon = (action: ImpactAnalysis['action']) => {
    switch (action) {
      case 'automatic':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'review':
        return (
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'version':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'blocked':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Resumen de enmiendas</h3>
        <p className="text-sm text-gray-600 m-0">Revise el impacto de los cambios antes de confirmar</p>
      </div>

      {/* Impact Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-green-300 rounded-lg p-4 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 m-0">Automáticos</p>
              <p className="text-green-900 m-0">{stats.automatic}</p>
            </div>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <div className="border border-amber-300 rounded-lg p-4 bg-amber-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 m-0">Revisión</p>
              <p className="text-amber-900 m-0">{stats.review}</p>
            </div>
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </div>

        <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 m-0">Nueva versión</p>
              <p className="text-blue-900 m-0">{stats.version}</p>
            </div>
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        </div>

        <div className="border border-red-300 rounded-lg p-4 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 m-0">Bloqueados</p>
              <p className="text-red-900 m-0">{stats.blocked}</p>
            </div>
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Changes Summary */}
      <div className="mb-6 border border-gray-200 rounded-lg p-5 bg-gray-50">
        <h4 className="mb-3">Cambios a aplicar</h4>
        <div className="space-y-3">
          {changes.map((change) => (
            <div key={change.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="m-0">{change.field}</h4>
                    {change.isGlobal && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">Global</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {change.oldValue && (
                      <>
                        <span className="text-gray-500 line-through">{change.oldValue}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                    <span className="text-[#C41E3A]">{change.newValue}</span>
                  </div>
                </div>
                <span className="text-sm text-gray-600 ml-4">{change.appliesTo.length} docs</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documents Impact Table */}
      <div className="mb-6">
        <h4 className="mb-3">Impacto por documento</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left"></th>
                <th className="px-4 py-3 text-left">Documento</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Estado actual</th>
                <th className="px-4 py-3 text-left">Acción</th>
                <th className="px-4 py-3 text-left">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {impacts.map((impact) => {
                const doc = documents.find((d) => d.id === impact.documentId);
                if (!doc) return null;

                return (
                  <tr key={impact.documentId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">{getActionIcon(impact.action)}</td>
                    <td className="px-4 py-4">{doc.name}</td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{doc.type}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{doc.status}</span>
                    </td>
                    <td className="px-4 py-4">{getActionBadge(impact.action)}</td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{impact.reason}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warnings */}
      {stats.blocked > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-red-900 m-0 mb-1">Advertencia: Documentos bloqueados</h4>
              <p className="text-red-700 m-0">
                {stats.blocked} documento(s) no pueden modificarse porque están firmados. Se omitirán al generar las
                enmiendas.
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.review > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-amber-900 m-0 mb-1">Atención: Revisión manual requerida</h4>
              <p className="text-amber-700 m-0">
                {stats.review} documento(s) requieren revisión manual antes de aplicar los cambios.
              </p>
            </div>
          </div>
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
        <div className="flex gap-3">
          {stats.automatic > 0 && (
            <button
              onClick={onFinish}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Aplicar cambios automáticos ({stats.automatic})
            </button>
          )}
          {stats.version > 0 && (
            <button
              onClick={onFinish}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Generar nuevas versiones ({stats.version})
            </button>
          )}
          {stats.review > 0 && (
            <button
              onClick={onFinish}
              className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              Enviar a revisión ({stats.review})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
