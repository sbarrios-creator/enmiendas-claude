import type { Change } from '../types';

interface ModifiedDocumentsListProps {
  documents: { id: string; name: string }[];
  changes: Change[];
}

export function ModifiedDocumentsList({ documents, changes }: ModifiedDocumentsListProps) {
  const modifiedIds = new Set(changes.flatMap((c) => c.appliesTo));
  const modifiedDocuments = documents.filter((d) => modifiedIds.has(d.id));

  if (modifiedDocuments.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 m-0">Documentos modificados</h3>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#C41E3A] text-white">
          {modifiedDocuments.length}
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {modifiedDocuments.map((doc) => (
          <li key={doc.id} className="flex items-center gap-3 px-4 py-2.5">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-800">{doc.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
