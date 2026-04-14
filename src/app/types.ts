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

export interface ResearcherChange {
  id: string;
  name: string;
  email: string;
  currentRole: string;
  proposedRole: string;
  changeType: 'add' | 'remove' | 'modify';
  justification: string;
}

export interface InternalOperativeUnit {
  id: string;
  name: string;        // selected from dropdown or custom value when "Otros"
  isOther: boolean;    // true when user selected "Otros"
  managementUnit: string; // free-text unit when isOther is true
  registrationDate?: string; // ISO date string
  declarationFileName?: string; // carta de declaración del jefe de unidad
}

export interface ExternalOperativeUnit {
  id: string;
  name: string;
  registrationDate: string; // ISO date string
  hasApprovalLetter: boolean;
  approvalFileName?: string;
}

export interface Step3Data {
  modifiesTitleOrSummary: 'NO' | 'SI' | null;
  titleSummaryData: { title: string; summary: string };
  modifiesOperativeUnits: 'NO' | 'SI' | null;
  operativeUnitsData: {
    internalUnits: InternalOperativeUnit[];
    externalUnits: ExternalOperativeUnit[];
  };
  modifiesResearchers: 'NO' | 'SI' | null;
  researchers: ResearcherChange[];
}
