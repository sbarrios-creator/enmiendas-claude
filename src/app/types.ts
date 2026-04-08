export interface Document {
  id: string;
  name: string;
  type: 'Presupuesto' | 'Instrumento' | 'Nuevo';
  status: 'Borrador' | 'Aprobado' | 'Firmado';
  version: string;
}

export interface UploadStatus {
  controlChanges: boolean;
  finalVersion: boolean;
}

export interface Change {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  justification: string;
  appliesTo: string[];
  isGlobal: boolean;
}

export interface ImpactAnalysis {
  documentId: string;
  action: 'automatic' | 'review' | 'version' | 'blocked';
  reason: string;
}
