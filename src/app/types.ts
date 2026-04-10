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

export interface AddedDoc {
  id: string;
  type: string;
  fileName: string;
  file: File;
}

export interface ImpactAnalysis {
  documentId: string;
  action: 'automatic' | 'review' | 'version' | 'blocked';
  reason: string;
}

export interface ResearcherChange {
  id: string;
  name: string;
  email: string;
  currentRole: string;
  proposedRole: string;
  changeType: 'add' | 'remove' | 'modify';
  justification: string;
}

export interface Step3Data {
  modifiesTitleOrSummary: 'NO' | 'SI' | null;
  titleSummaryData: { title: string; summary: string };
  modifiesOperativeUnits: 'NO' | 'SI' | null;
  operativeUnitsData: { units: string };
  modifiesResearchers: 'NO' | 'SI' | null;
  researchers: ResearcherChange[];
}
