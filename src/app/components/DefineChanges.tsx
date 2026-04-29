import { Fragment, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import type { Change, Document, Step3Data, ResearcherChange, OperativeUnit } from '../types';
import { baseDocuments } from '../data/documents';
import { ConfirmDialog } from './ConfirmDialog';

interface DefineChangesProps {
  selectedDocuments: string[];
  newDocuments: Document[];
  changes: Change[];
  onChangesUpdate: (changes: Change[]) => void;
  onSelectedDocumentsUpdate: (ids: string[]) => void;
  step3Data: Step3Data;
  onStep3DataChange: (data: Step3Data) => void;
  onNext: () => void;
  onBack: () => void;
}

interface ParsedPasteRow {
  rowNumber: number;
  field: string;
  pageNumber: string;
  oldValue: string;
  newValue: string;
  justification: string;
  isValid: boolean;
  error?: string;
}

interface ParsedWordRow {
  rowNumber: number;
  tableTitle: string;
  documentName: string;
  changeNumber: string;
  field: string;
  oldValue: string;
  newValue: string;
  justification: string;
}

const LEGACY_PASTE_HEADER_ALIASES = [
  'campo',
  'cambio',
  'pagina',
  'página',
  'n.pagina',
  'n pagina',
  'npagina',
  'version anterior',
  'versión anterior',
  'version nueva',
  'versión nueva',
  'justificacion',
  'justificación',
];

const HEADER_ALIASES = {
  field: ['campo', 'cambio', 'campo modificado', 'campo a modificar'],
  pageNumber: ['pagina', 'página', 'n.pagina', 'n pagina', 'npagina', 'nro pagina', 'nro. pagina', 'numero de pagina', 'numero pagina'],
  oldValue: ['version anterior', 'versión anterior', 'valor anterior', 'texto anterior', 'valor actual', 'texto actual', 'version actual', 'contenido actual', 'texto vigente', 'valor vigente', 'anterior'],
  newValue: ['version nueva', 'versión nueva', 'valor nuevo', 'texto nuevo', 'nuevo texto'],
  justification: ['justificacion', 'justificación', 'sustento', 'motivo', 'observacion', 'observación'],
} as const;

const PASTE_HEADER_ALIASES = Object.values(HEADER_ALIASES).flat();

const normalizePasteCell = (value: string) =>
  value
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const parseDelimitedLine = (line: string, delimiter: string) => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const detectDelimiter = (lines: string[]) => {
  const candidates = ['\t', ';', ','];
  let bestDelimiter = '\t';
  let bestScore = -1;

  candidates.forEach((candidate) => {
    const score = lines
      .slice(0, 5)
      .reduce((total, line) => total + parseDelimitedLine(line, candidate).length, 0);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = candidate;
    }
  });

  return bestDelimiter;
};

const trimOuterEmptyCells = (cells: string[]) => {
  let start = 0;
  let end = cells.length;

  while (start < end && cells[start].trim() === '') start += 1;
  while (end > start && cells[end - 1].trim() === '') end -= 1;

  return cells.slice(start, end);
};

const countHeaderMatches = (cells: string[]) =>
  cells
    .map(normalizePasteCell)
    .filter((cell) => PASTE_HEADER_ALIASES.includes(cell)).length;

const headerMatchesAlias = (cell: string, alias: string) => {
  const normalizedCell = normalizePasteCell(cell);
  const normalizedAlias = normalizePasteCell(alias);
  return (
    normalizedCell === normalizedAlias ||
    normalizedCell.includes(normalizedAlias) ||
    normalizedAlias.includes(normalizedCell)
  );
};

const findHeaderIndex = (
  headerCells: string[],
  aliases: readonly string[],
) => headerCells.findIndex((cell) => aliases.some((alias) => headerMatchesAlias(cell, alias)));

const extractRowByHeader = (
  headerCells: string[],
  cells: string[],
) => {
  const fieldIndex = findHeaderIndex(headerCells, HEADER_ALIASES.field);
  const pageIndex = findHeaderIndex(headerCells, HEADER_ALIASES.pageNumber);
  const oldValueIndex = findHeaderIndex(headerCells, HEADER_ALIASES.oldValue);
  const newValueIndex = findHeaderIndex(headerCells, HEADER_ALIASES.newValue);
  const justificationIndex = findHeaderIndex(headerCells, HEADER_ALIASES.justification);

  return {
    field: fieldIndex >= 0 ? cells[fieldIndex] ?? '' : '',
    pageNumber: pageIndex >= 0 ? cells[pageIndex] ?? '' : '',
    oldValue: oldValueIndex >= 0 ? cells[oldValueIndex] ?? '' : '',
    newValue: newValueIndex >= 0 ? cells[newValueIndex] ?? '' : '',
    justification: justificationIndex >= 0 ? cells[justificationIndex] ?? '' : '',
    hasRequiredHeaders: fieldIndex >= 0 && pageIndex >= 0 && newValueIndex >= 0 && justificationIndex >= 0,
  };
};

const looksLikeHeaderRow = (cells: string[], nextRow?: string[]) => {
  if (cells.length < 4) return false;

  const normalized = cells.map(normalizePasteCell);
  const aliasMatches = countHeaderMatches(cells);
  if (aliasMatches >= Math.min(2, cells.length)) return true;

  const hasOnlyShortLabels = cells.every((cell) => cell.length > 0 && cell.length <= 40);
  const hasFewDigits = normalized.every((cell) => !/\d{2,}/.test(cell));
  const nextRowHasExpectedWidth = !!nextRow && nextRow.length >= 4;

  if (!hasOnlyShortLabels || !hasFewDigits || !nextRowHasExpectedWidth) return false;

  const currentJoined = normalized.join(' ');
  const nextJoined = nextRow.map(normalizePasteCell).join(' ');

  return currentJoined !== nextJoined;
};

const normalizeSpreadsheetCell = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const parseSpreadsheetRows = (rows: unknown[][]): ParsedPasteRow[] => {
  const normalizedRows = rows
    .map((row) => trimOuterEmptyCells((row ?? []).map(normalizeSpreadsheetCell)))
    .filter((cells) => cells.some((cell) => cell.length > 0));

  if (normalizedRows.length === 0) return [];

  const looksLikeHeader = looksLikeHeaderRow(normalizedRows[0], normalizedRows[1]);
  const headerCells = looksLikeHeader ? normalizedRows[0] : null;

  const dataRows = looksLikeHeader ? normalizedRows.slice(1) : normalizedRows;

  return dataRows.map((cells, index) => {
    const rowNumber = index + 1 + (looksLikeHeader ? 1 : 0);
    let field = '';
    let pageNumber = '';
    let oldValue = '';
    let newValue = '';
    let justification = '';

    if (headerCells) {
      const extracted = extractRowByHeader(headerCells, cells);

      if (!extracted.hasRequiredHeaders) {
        return {
          rowNumber,
          field: '',
          pageNumber: '',
          oldValue: '',
          newValue: '',
          justification: '',
          isValid: false,
          error: 'No se encontraron los encabezados requeridos en el Excel.',
        };
      }

      field = extracted.field;
      pageNumber = extracted.pageNumber;
      oldValue = extracted.oldValue;
      newValue = extracted.newValue;
      justification = extracted.justification;
    } else {
      if (cells.length < 4) {
        return {
          rowNumber,
          field: cells[0] ?? '',
          pageNumber: cells[1] ?? '',
          oldValue: '',
          newValue: cells[2] ?? '',
          justification: cells[3] ?? '',
          isValid: false,
          error: 'La fila debe tener al menos 4 columnas.',
        };
      }

      const [first, second, third, fourth, fifth] = cells;

      if (cells.length === 4) {
        pageNumber = first ?? '';
        oldValue = second ?? '';
        newValue = third ?? '';
        justification = fourth ?? '';
        field = pageNumber ? `Cambio importado (página ${pageNumber})` : 'Cambio importado';
      } else {
        field = first ?? '';
        pageNumber = second ?? '';
        oldValue = third ?? '';
        newValue = fourth ?? '';
        justification = fifth ?? '';
      }
    }

    if (!field || !pageNumber || !newValue || !justification) {
      return {
        rowNumber,
        field: field ?? '',
        pageNumber: pageNumber ?? '',
        oldValue,
        newValue,
        justification,
        isValid: false,
        error: 'Faltan campos obligatorios: Campo, Página, Versión nueva o Justificación.',
      };
    }

    return {
      rowNumber,
      field,
      pageNumber,
      oldValue,
      newValue,
      justification,
      isValid: true,
    };
  });
};

const parseExcelPaste = (raw: string): ParsedPasteRow[] => {
  const trimmed = raw.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return [];

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const rows = lines
    .map((line) => trimOuterEmptyCells(parseDelimitedLine(line, delimiter)))
    .filter((cells) => cells.some((cell) => cell.length > 0));

  return parseSpreadsheetRows(rows);
};

const cleanWordCellText = (value: string) =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const getWordCellLines = (cell: Element) => {
  const paragraphLines = Array.from(cell.querySelectorAll('p'))
    .map((paragraph) => (paragraph.textContent ?? '').trim())
    .filter(Boolean);

  if (paragraphLines.length > 0) {
    return cleanWordCellText(paragraphLines.join('\n'));
  }

  return cleanWordCellText(cell.textContent ?? '');
};

const extractWordFieldDetails = (lines: string[]) => {
  const documentLineIndex = lines.findIndex((line) => /^documento\s*:/i.test(line));
  const changeLineIndex = lines.findIndex((line) => /^cambio\s*n/i.test(line));

  let documentName = '';
  if (documentLineIndex >= 0) {
    const currentLine = lines[documentLineIndex];
    const inlineValue = currentLine.replace(/^documento\s*:/i, '').trim();
    if (inlineValue) {
      documentName = inlineValue;
    } else if (lines[documentLineIndex + 1] && (changeLineIndex < 0 || documentLineIndex + 1 < changeLineIndex)) {
      documentName = lines[documentLineIndex + 1].trim();
    }
  }

  let changeNumber = '';
  if (changeLineIndex >= 0) {
    const match = lines[changeLineIndex].match(/cambio\s*n[^0-9]*([0-9]+)/i);
    changeNumber = match?.[1] ?? '';
  }

  const excludedIndexes = new Set<number>();
  if (documentLineIndex >= 0) {
    excludedIndexes.add(documentLineIndex);
    if (!lines[documentLineIndex].replace(/^documento\s*:/i, '').trim() && lines[documentLineIndex + 1]) {
      excludedIndexes.add(documentLineIndex + 1);
    }
  }
  if (changeLineIndex >= 0) {
    excludedIndexes.add(changeLineIndex);
  }

  const field = lines
    .filter((_, index) => !excludedIndexes.has(index))
    .join(' ')
    .trim();

  return {
    documentName,
    changeNumber,
    field,
  };
};

const parseWordTableHtml = (html: string): ParsedWordRow[] => {
  if (!html.trim()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = Array.from(doc.querySelectorAll('table'));

  return tables.flatMap((table, tableIndex) => {
    const rows = Array.from(table.querySelectorAll('tr'));
    const tableTitle = getWordCellLines(rows[0]?.querySelector('th, td') ?? table)[0] ?? `Tabla ${tableIndex + 1}`;

    return rows
      .map((row, index) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        if (cells.length < 4) return null;

        const normalizedCells = cells.map((cell) => getWordCellLines(cell));
        const joinedRow = normalizedCells.flat().join(' ').toLowerCase();

        if (
          joinedRow.includes('cambio a realizar') &&
          joinedRow.includes('version anterior') &&
          joinedRow.includes('version nueva') &&
          joinedRow.includes('justificacion')
        ) {
          return null;
        }

        const [fieldCellLines, oldValueLines, newValueLines, justificationLines] = normalizedCells;
        const { documentName, changeNumber, field } = extractWordFieldDetails(fieldCellLines);
        const oldValue = oldValueLines.join(' ').trim();
        const newValue = newValueLines.join(' ').trim();
        const justification = justificationLines.join(' ').trim();

        if (!field && !documentName && !oldValue && !newValue && !justification) {
          return null;
        }

        return {
          rowNumber: index + 1,
          tableTitle,
          documentName,
          changeNumber,
          field,
          oldValue,
          newValue,
          justification,
        };
      })
      .filter((row): row is ParsedWordRow => row !== null);
  });
};


const parseExcelCellDoc = (text: string): { documentName: string; field: string } | null => {
  if (!/documento\s*:/i.test(text)) return null;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, ' ').trim())
    .filter(Boolean);

  let documentName = '';
  let fieldParts: string[] = [];
  let docDone = false;
  let collectField = false;

  for (const line of lines) {
    if (!docDone && /^documento\s*:/i.test(line)) {
      const afterColon = line.replace(/^documento\s*:\s*/i, '').trim();
      if (afterColon) { documentName = afterColon; docDone = true; }
      continue;
    }
    if (!docDone) { documentName = line; docDone = true; continue; }
    if (/^cambio\s*n/i.test(line)) {
      collectField = true;
      const afterColon = line.replace(/^cambio\s*n[^:]*:\s*/i, '').trim();
      if (afterColon) fieldParts.push(afterColon);
      continue;
    }
    if (collectField) fieldParts.push(line);
  }

  if (!documentName) return null;
  return { documentName, field: fieldParts.join(' ').trim() };
};

const parseExcelDocumentSections = (workbook: import('xlsx').WorkBook): ParsedWordRow[] => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  const results: ParsedWordRow[] = [];

  const cell = (r: number, c: number) => {
    const node = sheet[XLSX.utils.encode_cell({ r, c })];
    return node ? String(node.v ?? '').trim() : '';
  };

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const text = cell(r, c);
      if (!text) continue;
      const parsed = parseExcelCellDoc(text);
      if (!parsed) continue;
      const oldValue = cell(r, c + 1);
      const newValue = cell(r, c + 2);
      const justification = cell(r, c + 3);
      if (!newValue) continue;
      results.push({
        rowNumber: r * 10000 + c,
        tableTitle: parsed.documentName,
        documentName: parsed.documentName,
        changeNumber: '',
        field: parsed.field || 'Cambio importado',
        oldValue,
        newValue,
        justification,
      });
    }
  }

  return results;
};

const mockOperativeUnits = [
  'Cardiología', 'Endocrinología', 'Gastroenterología', 'Hematología',
  'Infectología', 'Medicina Interna', 'Nefrología', 'Neurología',
  'Neumología', 'Oncología', 'Pediatría', 'Reumatología',
  'Traumatología', 'Unidad de Investigación Clínica', 'Unidad de Cuidados Intensivos',
  'Laboratorio Central', 'Farmacia', 'Radiología', 'Estadística e Informática', 'Otro',
];


export function DefineChanges({ selectedDocuments, newDocuments, changes, onChangesUpdate, onSelectedDocumentsUpdate, step3Data, onStep3DataChange, onNext, onBack }: DefineChangesProps) {
  const inlineEditRowRef = useRef<HTMLTableRowElement | null>(null);
  const newRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const wordInputRef = useRef<HTMLInputElement | null>(null);
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
  const [docListSearch, setDocListSearch] = useState('');
  const [docChangeSearch, setDocChangeSearch] = useState<Record<string, string>>({});
  const [openCards, setOpenCards] = useState({ card1: true, card2: true, card3: true, card4: true });
  const toggleCard = (card: keyof typeof openCards) => setOpenCards((p) => ({ ...p, [card]: !p[card] }));
  const [docPickerSearch, setDocPickerSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [resumeCollapsed, setResumeCollapsed] = useState<Record<string, boolean>>({});
  const [openQuestionsSection, setOpenQuestionsSection] = useState(false);
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
  const [xlsEditCell, setXlsEditCell] = useState<{ id: string; col: string } | null>(null);
  const [xlsNewDocRow, setXlsNewDocRow] = useState<Record<string, { field: string; pageNumber: string; oldValue: string; newValue: string; justification: string }>>({});
  const [focusedNewRowDocId, setFocusedNewRowDocId] = useState<string | null>(null);
  const [inlineEditHeight, setInlineEditHeight] = useState<number | null>(null);
  const [newRowHeights, setNewRowHeights] = useState<Record<string, number | null>>({});
  const [xlsModalDocId, setXlsModalDocId] = useState<string | null>(null);
  const [xlsModalEditCell, setXlsModalEditCell] = useState<{ id: string; col: string } | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);
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
  const [pasteTargetDocId, setPasteTargetDocId] = useState<string | null>(null);
  const [pasteRaw, setPasteRaw] = useState('');
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

  const closePasteModal = () => { setPasteTargetDocId(null); };

  const updateChange = (id: string, updates: Partial<Change>) =>
    onChangesUpdate(changes.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  const getXlsNewDocRow = (docId: string) =>
    xlsNewDocRow[docId] ?? { field: '', pageNumber: '', oldValue: '', newValue: '', justification: '' };
  const commitXlsDocRow = (docId: string) => {
    const row = getXlsNewDocRow(docId);
    if (!row.field.trim() || !row.newValue.trim()) return;
    onChangesUpdate([...changes, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      field: row.field.trim(),
      oldValue: row.oldValue.trim(),
      newValue: row.newValue.trim(),
      justification: row.justification.trim(),
      pageNumber: row.pageNumber.trim(),
      appliesTo: [docId],
      isGlobal: false,
    }]);
    setXlsNewDocRow((p) => ({ ...p, [docId]: { field: '', pageNumber: '', oldValue: '', newValue: '', justification: '' } }));
  };

  const handleOpenWordPicker = () => {
    if (wordInputRef.current) {
      wordInputRef.current.value = '';
      wordInputRef.current.click();
    }
  };

  const handleWordSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      openConfirm({
        title: 'Formato no permitido',
        message: 'El botón Word solo acepta archivos .docx.',
        confirmLabel: 'Entendido',
        variant: 'warning',
        onConfirm: closeConfirm,
      });
      event.target.value = '';
      return;
    }

    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const parsedRows = parseWordTableHtml(result.value);

      if (parsedRows.length === 0) {
        openConfirm({
          title: 'Sin cambios detectados',
          message: 'No se encontraron filas de cambios en el archivo Word.',
          confirmLabel: 'Entendido',
          variant: 'warning',
          onConfirm: closeConfirm,
        });
        return;
      }

      const allDocs = [
        ...baseDocuments.filter((d) => selectedDocuments.includes(d.id)),
        ...newDocuments,
        ...baseDocuments.filter((d) => !selectedDocuments.includes(d.id)),
      ];

      const newChanges: Change[] = [];
      const autoAddedNames: string[] = [];
      const unmatchedNames: string[] = [];
      const newSelectedIds = new Set(selectedDocuments);

      for (const row of parsedRows) {
        const matched = allDocs.find((d) => normalize(d.name) === normalize(row.documentName));

        if (!matched) {
          if (!unmatchedNames.includes(row.documentName)) unmatchedNames.push(row.documentName);
          continue;
        }

        if (!newSelectedIds.has(matched.id)) {
          newSelectedIds.add(matched.id);
          autoAddedNames.push(matched.name);
        }

        newChanges.push({
          id: `${Date.now()}-${row.rowNumber}-${Math.random().toString(36).slice(2, 8)}`,
          field: row.field,
          oldValue: row.oldValue,
          newValue: row.newValue,
          justification: row.justification,
          pageNumber: '',
          appliesTo: [matched.id],
          isGlobal: false,
        });
      }

      if (newChanges.length > 0) {
        onChangesUpdate([...changes, ...newChanges]);
      }

      if (autoAddedNames.length > 0) {
        onSelectedDocumentsUpdate([...newSelectedIds]);
      }

      const lines: string[] = [];
      if (newChanges.length > 0) lines.push(`Se importaron ${newChanges.length} cambio(s).`);
      if (autoAddedNames.length > 0) lines.push(`Se agregaron al Paso 1: ${autoAddedNames.join(', ')}.`);
      if (unmatchedNames.length > 0) lines.push(`No se reconocieron: ${unmatchedNames.join(', ')}.`);

      openConfirm({
        title: newChanges.length > 0 ? 'Importación completada' : 'Sin coincidencias',
        message: lines.join(' '),
        confirmLabel: 'Entendido',
        variant: unmatchedNames.length > 0 ? 'warning' : 'primary',
        onConfirm: closeConfirm,
      });
    } catch {
      openConfirm({
        title: 'No se pudo leer el archivo',
        message: 'Hubo un problema al procesar el archivo Word seleccionado.',
        confirmLabel: 'Entendido',
        variant: 'warning',
        onConfirm: closeConfirm,
      });
    } finally {
      event.target.value = '';
    }
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

  const handleImportPastedChanges = (docId: string, rows: ParsedPasteRow[]) => {
    const validRows = rows.filter((row) => row.isValid);
    if (validRows.length === 0) return;

    const nextChanges = validRows.map((row) => ({
      id: `${Date.now()}-${row.rowNumber}-${Math.random().toString(36).slice(2, 8)}`,
      field: row.field,
      oldValue: row.oldValue,
      newValue: row.newValue,
      justification: row.justification,
      pageNumber: row.pageNumber,
      appliesTo: [docId],
      isGlobal: false,
    }));

    onChangesUpdate([...changes, ...nextChanges]);
  };

  const handleRemoveChange = (id: string) => {
    onChangesUpdate(changes.filter((change) => change.id !== id));
  };

  const handleOpenExcelPicker = () => {
    if (excelInputRef.current) {
      excelInputRef.current.value = '';
      excelInputRef.current.click();
    }
  };

  const handleExcelSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
      openConfirm({ title: 'Formato no permitido', message: 'Solo se aceptan archivos .xlsx o .xls.', confirmLabel: 'Entendido', variant: 'warning', onConfirm: closeConfirm });
      event.target.value = '';
      return;
    }

    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const parsedRows = parseExcelDocumentSections(workbook);

      if (parsedRows.length === 0) {
        openConfirm({ title: 'Sin cambios detectados', message: 'No se encontraron secciones "Documento:" con filas de cambios en el archivo.', confirmLabel: 'Entendido', variant: 'warning', onConfirm: closeConfirm });
        return;
      }

      const allDocs = [
        ...baseDocuments.filter((d) => selectedDocuments.includes(d.id)),
        ...newDocuments,
        ...baseDocuments.filter((d) => !selectedDocuments.includes(d.id)),
      ];

      const newChanges: Change[] = [];
      const autoAddedNames: string[] = [];
      const unmatchedNames: string[] = [];
      const newSelectedIds = new Set(selectedDocuments);

      for (const row of parsedRows) {
        const matched = allDocs.find((d) => normalize(d.name) === normalize(row.documentName));
        if (!matched) {
          if (!unmatchedNames.includes(row.documentName)) unmatchedNames.push(row.documentName);
          continue;
        }
        if (!newSelectedIds.has(matched.id)) {
          newSelectedIds.add(matched.id);
          autoAddedNames.push(matched.name);
        }
        newChanges.push({
          id: `${Date.now()}-${row.rowNumber}-${Math.random().toString(36).slice(2, 8)}`,
          field: row.field,
          oldValue: row.oldValue,
          newValue: row.newValue,
          justification: row.justification,
          pageNumber: '',
          appliesTo: [matched.id],
          isGlobal: false,
        });
      }

      if (newChanges.length > 0) onChangesUpdate([...changes, ...newChanges]);
      if (autoAddedNames.length > 0) onSelectedDocumentsUpdate([...newSelectedIds]);

      const lines: string[] = [];
      if (newChanges.length > 0) lines.push(`Se importaron ${newChanges.length} cambio(s).`);
      if (autoAddedNames.length > 0) lines.push(`Se agregaron al Paso 1: ${autoAddedNames.join(', ')}.`);
      if (unmatchedNames.length > 0) lines.push(`No se reconocieron: ${unmatchedNames.join(', ')}.`);

      openConfirm({
        title: newChanges.length > 0 ? 'Importación completada' : 'Sin coincidencias',
        message: lines.join(' '),
        confirmLabel: 'Entendido',
        variant: unmatchedNames.length > 0 ? 'warning' : 'primary',
        onConfirm: closeConfirm,
      });
    } catch {
      openConfirm({ title: 'No se pudo leer el archivo', message: 'Hubo un problema al procesar el archivo Excel.', confirmLabel: 'Entendido', variant: 'warning', onConfirm: closeConfirm });
    } finally {
      event.target.value = '';
    }
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
    const csv = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cambios_enmienda.csv';
    a.click();
    URL.revokeObjectURL(url);
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
    setTimeout(() => {
      inlineEditRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const closeInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditDocId(null);
  };

  const saveInlineEdit = () => {
    if (!inlineEditId || !inlineEditDocId) return false;
    if (!inlineEditData.field || !inlineEditData.newValue || !inlineEditData.justification) return false;

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
      if (!saveInlineEdit()) closeInlineEdit();
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

  useEffect(() => {
    if (!focusedNewRowDocId) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const row = newRowRefs.current[focusedNewRowDocId];
      if (row && row.contains(target)) return;
      setFocusedNewRowDocId(null);
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [focusedNewRowDocId]);

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

  const effectiveFilter = categoryFilter === 'Todos' || availableCategories.includes(categoryFilter)
    ? categoryFilter
    : (availableCategories[0] ?? '');
  const filteredDocuments = effectiveFilter === 'Todos' || !effectiveFilter
    ? documents
    : documents.filter(doc => getDocCategory(doc) === effectiveFilter);
  const visibleDocs = docListSearch.trim()
    ? filteredDocuments.filter(doc => doc.name.toLowerCase().includes(docListSearch.toLowerCase()))
    : filteredDocuments;

  return (
    <div>
      <input
        ref={wordInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleWordSelected}
      />

      {/* Questions Section - Collapsible global */}
      <div className="mb-3 border border-gray-200 rounded-sm overflow-hidden">
        {/* Header global */}
        <div
          className="px-4 py-2 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-gray-50 transition-colors"
          onClick={() => setOpenQuestionsSection((v) => !v)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${openQuestionsSection ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <p className="text-sm text-gray-700 m-0">
              ¿Vas a modificar el <span className="font-semibold text-gray-900">Título</span>, <span className="font-semibold text-gray-900">Unidades Operativas</span> o el <span className="font-semibold text-gray-900">Equipo de Investigación</span>?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpenQuestionsSection(true)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${openQuestionsSection ? 'bg-[#C41E3A] text-white hover:bg-[#A01828]' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
            >
              Sí
            </button>
            <button
              onClick={() => setOpenQuestionsSection(false)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${!openQuestionsSection ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
            >
              No
            </button>
          </div>
        </div>

        {openQuestionsSection && (
          <div className="border-t border-gray-200 p-3 space-y-2">
        {/* Card 1: Título y Resumen */}
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div
            className="px-4 py-2 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-gray-50 transition-colors"
            onClick={() => { if (modifiesTitleOrSummary === 'SI') toggleCard('card1'); }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {modifiesTitleOrSummary === 'SI' && (
                <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${openCards.card1 ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              )}
              <p className="text-sm text-gray-700 m-0">
                ¿Vas a modificar el <span className="font-semibold text-gray-900">Título y Resumen</span>?
              </p>
              {modifiesTitleOrSummary === 'SI' && (
                <span className="px-2 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-xs font-semibold rounded shrink-0">Sí</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setModifiesTitleOrSummary('SI'); setOpenCards((p) => ({ ...p, card1: true })); }}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${modifiesTitleOrSummary === 'SI' ? 'bg-[#C41E3A] text-white hover:bg-[#A01828]' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              >Sí</button>
              <button
                onClick={() => { onStep3DataChange({ ...step3Data, modifiesTitleOrSummary: null }); setOpenCards((p) => ({ ...p, card1: false })); }}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${modifiesTitleOrSummary !== 'SI' && modifiesTitleOrSummary !== null ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              >No</button>
            </div>
          </div>
          {openCards.card1 && modifiesTitleOrSummary === 'SI' && (
            <div className="border-t border-gray-200 p-4 space-y-4">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Nuevo título</label>
                <input type="text" value={titleSummaryData.title} onChange={(e) => setTitleSummaryData({ ...titleSummaryData, title: e.target.value })} placeholder="Ingrese el nuevo título del estudio" className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">Nuevo resumen</label>
                <textarea value={titleSummaryData.summary} onChange={(e) => setTitleSummaryData({ ...titleSummaryData, summary: e.target.value })} placeholder="Ingrese el nuevo resumen del estudio" rows={4} className="w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent" />
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Unidades Operativas */}
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div
            className="px-4 py-2 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-gray-50 transition-colors"
            onClick={() => { if (modifiesOperativeUnits === 'SI') toggleCard('card2'); }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {modifiesOperativeUnits === 'SI' && (
                <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${openCards.card2 ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              )}
              <p className="text-sm text-gray-700 m-0">
                ¿Vas a modificar las <span className="font-semibold text-gray-900">Unidades Operativas</span>?
              </p>
              {modifiesOperativeUnits === 'SI' && (
                <span className="px-2 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-xs font-semibold rounded shrink-0">Sí</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setModifiesOperativeUnits('SI'); setOpenCards((p) => ({ ...p, card2: true })); }}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${modifiesOperativeUnits === 'SI' ? 'bg-[#C41E3A] text-white hover:bg-[#A01828]' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              >Sí</button>
              <button
                onClick={() => { onStep3DataChange({ ...step3Data, modifiesOperativeUnits: null }); setOpenCards((p) => ({ ...p, card2: false })); }}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${modifiesOperativeUnits !== 'SI' && modifiesOperativeUnits !== null ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              >No</button>
            </div>
          </div>

        {openCards.card2 && modifiesOperativeUnits === 'SI' && (
          <div className="border-t border-gray-200 p-4 space-y-5">
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
              <div className="border border-gray-200 rounded-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidad</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Carta de declaración</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
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
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div
            className="px-4 py-2 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-gray-50 transition-colors"
            onClick={() => { if (modifiesResearchers === 'SI') toggleCard('card3'); }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {modifiesResearchers === 'SI' && (
                <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${openCards.card3 ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              )}
              <p className="text-sm text-gray-700 m-0">
                ¿Vas a modificar el <span className="font-semibold text-gray-900">Equipo de Investigación</span>?
              </p>
              {modifiesResearchers === 'SI' && (
                <span className="px-2 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-xs font-semibold rounded shrink-0">Sí</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setModifiesResearchers('SI'); setOpenCards((p) => ({ ...p, card3: true })); }}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${modifiesResearchers === 'SI' ? 'bg-[#C41E3A] text-white hover:bg-[#A01828]' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              >Sí</button>
              <button
                onClick={() => { onStep3DataChange({ ...step3Data, modifiesResearchers: null }); setOpenCards((p) => ({ ...p, card3: false })); }}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${modifiesResearchers !== 'SI' && modifiesResearchers !== null ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              >No</button>
            </div>
          </div>

        {openCards.card3 && modifiesResearchers === 'SI' && (
          <div className="border-t border-gray-200 p-4 space-y-4">
            <div className="bg-red-50/50 border-l-4 border-red-200 p-4 rounded-r">
              <p className="text-sm text-[#C41E3A] m-0">
                <strong>Nota:</strong> Agregue cada modificación haciendo clic en el botón "+ Agregar".
              </p>
            </div>

            {researchers.length > 0 && (
              <div>
                <div className="border border-gray-200 rounded-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#C41E3A]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Rol actual</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Rol propuesto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider w-10">Acciones</th>
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
        </div>
      )}
      </div>

      {/* Card 4: Otros Cambios en Documentos */}
      <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div
            className="bg-[#C41E3A] px-4 py-3 cursor-pointer select-none"
            onClick={() => toggleCard('card4')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className={`w-4 h-4 text-white/70 transition-transform shrink-0 ${openCards.card4 ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <div>
                  <h3 className="text-base font-normal text-white m-0">Otros Cambios en Documentos</h3>
                  {!openCards.card4 && changes.length > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 text-white text-xs font-semibold rounded">{changes.length} cambio{changes.length !== 1 ? 's' : ''} registrado{changes.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleOpenWordPicker}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white border border-white/30 rounded hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0l-3 3m3-3l3 3M17 8v12m0 0l-3-3m3 3l3-3M3 12h18" />
                  </svg>
                  Word
                </button>
                <button
                  onClick={handleOpenExcelPicker}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white border border-white/30 rounded hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
                  title="Importar Excel (.xlsx)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                  </svg>
                  Excel
                </button>
                {/*<button
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white border border-white/30 rounded hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
                  title="Exportar a CSV"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 12l-4-4m0 0l-4 4m4-4v12" />
                  </svg>
                  Exportar
                </button>*/}
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditingDocId(null);
                    setSubmitAttempted(false);
                    setSearchDocument('');
                    setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', pageNumber: '', appliesTo: [], isGlobal: true });
                    setShowAddChange(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#C41E3A] rounded hover:bg-gray-100 transition-colors text-xs font-semibold whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              </div>
            </div>
          </div>

          {openCards.card4 && <div className="p-3 space-y-4">
            <div>
              {/* TABS por categoría */}
              {documents.length > 0 && availableCategories.length > 0 && (
                <div className="flex overflow-x-auto flex-nowrap gap-2 mb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <button
                    onClick={() => setCategoryFilter('Todos')}
                    className={`shrink-0 px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                      effectiveFilter === 'Todos'
                        ? 'bg-[#C41E3A] text-white'
                        : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Resumen
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs font-semibold ${effectiveFilter === 'Todos' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {changes.length}
                    </span>
                  </button>
                  {availableCategories.map(cat => {
                    const catDocs = documents.filter(d => getDocCategory(d) === cat);
                    const catChanges = changes.filter(c => catDocs.some(d => c.isGlobal || c.appliesTo.includes(d.id))).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`shrink-0 px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                          effectiveFilter === cat
                            ? 'bg-[#C41E3A] text-white'
                            : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {cat}
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs font-semibold ${effectiveFilter === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {catChanges}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Panel inline global */}
              {inlineAddDocId === '__global__' && (
                <div className="border border-red-200 rounded bg-red-50/50 p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#C41E3A]">Nuevo cambio</span>
                  </div>
                  <div className="grid grid-cols-[1.4fr_1fr_1fr_1.4fr_40px] gap-2 items-start">
                    <div className="flex flex-col gap-1">
                      <input autoFocus type="text" placeholder="Campo *" value={inlineAddData.field} onChange={(e) => setInlineAddData((p) => ({ ...p, field: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white" />
                      <input type="text" placeholder="N° página" value={inlineAddData.pageNumber} onChange={(e) => setInlineAddData((p) => ({ ...p, pageNumber: e.target.value }))} className="w-full px-2 py-1 text-[10px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white text-[#C41E3A]/80" />
                    </div>
                    <textarea rows={3} placeholder="Versión anterior" value={inlineAddData.oldValue} onChange={(e) => setInlineAddData((p) => ({ ...p, oldValue: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white resize-y" />
                    <textarea rows={3} placeholder="Versión nueva *" value={inlineAddData.newValue} onChange={(e) => setInlineAddData((p) => ({ ...p, newValue: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white resize-y" />
                    <textarea rows={3} placeholder="Justificación" value={inlineAddData.justification} onChange={(e) => setInlineAddData((p) => ({ ...p, justification: e.target.value }))} className="w-full px-2 py-1.5 text-xs border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white resize-y" />
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
                        <div className="border border-gray-200 rounded-sm overflow-hidden min-w-[320px]">
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
                                    <label key={d.id} className="flex items-center gap-2.5 pl-8 pr-3 py-2 text-xs text-gray-700 hover:bg-[#C41E3A]/5 cursor-pointer border-t border-gray-200 select-none">
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
                        <div className="border border-gray-200 rounded-sm overflow-hidden min-w-[200px] max-w-[240px]">
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
                                    <div key={group.category} className="border-b border-gray-200 last:border-b-0">
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

              {/* Vista Resumen */}
              {effectiveFilter === 'Todos' && (
                <div>
                  {changes.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No hay cambios registrados.</p>
                  ) : (() => {
                    // Agrupar: categoría → documentos → cambios
                    const categoryGroups: { category: string; docs: { doc: typeof documents[0]; items: typeof changes }[] }[] = [];
                    for (const cat of CATEGORY_ORDER) {
                      const catDocs = documents.filter((d) => getDocCategory(d) === cat);
                      const docsWithChanges = catDocs
                        .map((doc) => ({ doc, items: changes.filter((c) => !c.isGlobal && c.appliesTo.includes(doc.id)) }))
                        .filter((x) => x.items.length > 0);
                      if (docsWithChanges.length > 0) categoryGroups.push({ category: cat, docs: docsWithChanges });
                    }
                    const globalChanges = changes.filter((c) => c.isGlobal);

                    const renderChangeRows = (items: typeof changes) =>
                      items.map((change) => (
                        <tr key={change.id} className="group border-t border-gray-100 hover:bg-[#C41E3A]/5 transition-colors align-top">
                          <td className="px-3 py-2 overflow-hidden" title={[change.field, change.pageNumber ? `p.${change.pageNumber}` : ''].filter(Boolean).join(' · ')}>
                            <p className="text-gray-800 font-medium leading-snug line-clamp-2 break-words">{change.field}</p>
                            {change.pageNumber && <span className="text-[10px] text-gray-400 mt-0.5 block">p. {change.pageNumber}</span>}
                          </td>
                          <td className="px-3 py-2 overflow-hidden" title={change.oldValue}>
                            <p className="text-gray-400 line-through leading-snug line-clamp-3 break-words">{change.oldValue || '—'}</p>
                          </td>
                          <td className="px-3 py-2 overflow-hidden" title={change.newValue}>
                            <p className="text-green-700 font-medium leading-snug line-clamp-3 break-words">{change.newValue}</p>
                          </td>
                          <td className="px-3 py-2 overflow-hidden" title={change.justification}>
                            <p className="text-gray-500 leading-snug line-clamp-3 break-words">{change.justification || '—'}</p>
                          </td>
                          <td className="px-0.5 py-2 text-center">
                            <button onClick={() => handleRemoveChange(change.id)} aria-label="Eliminar cambio" className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 mx-auto">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </td>
                        </tr>
                      ));

                    return (
                      <div className="border border-gray-200 rounded-sm overflow-hidden">
                        <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-xs table-fixed">
                          <colgroup>
                            <col style={{width:'22%'}} /><col style={{width:'22%'}} /><col style={{width:'22%'}} /><col style={{width:'28%'}} /><col style={{width:'28px'}} />
                          </colgroup>
                          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">Campo - Pág</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">V. Anterior</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">V. Nueva</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">Justificación</th>
                              <th style={{width:'28px'}} />
                            </tr>
                          </thead>
                          <tbody>
                            {/* Cambios globales */}
                            {globalChanges.length > 0 && (
                              <Fragment>
                                <tr className="cursor-pointer" onClick={() => setResumeCollapsed((p) => ({ ...p, '__global__': !p['__global__'] }))}>
                                  <td colSpan={5} className="sticky top-[32px] z-[5] px-3 py-2 text-xs font-semibold text-[#C41E3A] uppercase tracking-wide bg-gray-50 border-t border-b border-gray-200 shadow-[0_1px_0_0_#e5e7eb]">
                                    <div className="flex items-center gap-2">
                                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${resumeCollapsed['__global__'] ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                      <span>Todos los documentos</span>
                                      <span className="px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded text-[10px] font-semibold normal-case tracking-normal">{globalChanges.length} cambio{globalChanges.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  </td>
                                </tr>
                                {!resumeCollapsed['__global__'] && renderChangeRows(globalChanges)}
                              </Fragment>
                            )}
                            {/* Por categoría → documento */}
                            {categoryGroups.map(({ category, docs }) => {
                              const catCollapsed = resumeCollapsed[category] !== false;
                              const totalCat = docs.reduce((s, x) => s + x.items.length, 0);
                              return (
                                <Fragment key={category}>
                                  <tr className="cursor-pointer" onClick={() => setResumeCollapsed((p) => ({ ...p, [category]: !catCollapsed }))}>
                                    <td colSpan={5} className="sticky top-[32px] z-[5] px-3 py-2 text-xs font-semibold text-[#C41E3A] uppercase tracking-wide bg-gray-50 border-t border-b border-gray-200 shadow-[0_1px_0_0_#e5e7eb]">
                                      <div className="flex items-center gap-2">
                                        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${catCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        <span>{category}</span>
                                        <span className="px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded text-[10px] font-semibold normal-case tracking-normal">{totalCat} cambio{totalCat !== 1 ? 's' : ''}</span>
                                      </div>
                                    </td>
                                  </tr>
                                  {!catCollapsed && docs.map(({ doc, items }) => (
                                    <Fragment key={doc.id}>
                                      <tr>
                                        <td colSpan={5} className="sticky top-[64px] z-[4] px-4 py-1.5 bg-gray-50/95 border-t border-gray-200 shadow-[0_1px_0_0_#f3f4f6]">
                                          <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#C41E3A]/40 shrink-0" />
                                            <span className="text-xs font-medium text-gray-700 break-words">{doc.name}</span>
                                            <span className="text-[10px] text-gray-400">{items.length} cambio{items.length !== 1 ? 's' : ''}</span>
                                          </div>
                                        </td>
                                      </tr>
                                      {renderChangeRows(items)}
                                    </Fragment>
                                  ))}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Cards por documento */}
              {effectiveFilter !== 'Todos' && (documents.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No hay documentos seleccionados.</p>
              ) : (
                <div className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-sm divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => {
                    const docChanges = changes.filter(
                      (c) => c.isGlobal || c.appliesTo.includes(doc.id)
                    );

                    const docSearch = docChangeSearch[doc.id] ?? '';
                    const visibleChanges = docSearch.trim()
                      ? docChanges.filter(c =>
                          c.field.toLowerCase().includes(docSearch.toLowerCase()) ||
                          c.newValue.toLowerCase().includes(docSearch.toLowerCase()) ||
                          c.oldValue.toLowerCase().includes(docSearch.toLowerCase()) ||
                          c.justification.toLowerCase().includes(docSearch.toLowerCase())
                        )
                      : docChanges;

                    return (
                      <div key={doc.id}>
                        {/* Card header: nombre + buscador + agregar en una sola fila */}
                        <div className="bg-gray-50 px-2 py-1.5 border-b border-gray-200 flex items-center gap-2">
                          <p className="text-xs font-medium text-gray-800 m-0 truncate min-w-0 flex-1">
                            {doc.name}
                            <span className="ml-1.5 text-gray-400 tabular-nums font-normal">{docChanges.length}</span>
                          </p>
                          <div className="relative shrink-0 w-52">
                            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                              type="text"
                              placeholder="Buscar…"
                              value={docSearch}
                              onChange={(e) => setDocChangeSearch(p => ({ ...p, [doc.id]: e.target.value }))}
                              className="w-full pl-6 pr-5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] bg-white text-gray-700 placeholder-gray-400"
                            />
                            {docSearch && (
                              <button
                                onClick={() => setDocChangeSearch(p => ({ ...p, [doc.id]: '' }))}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingDocId(doc.id);
                              setSubmitAttempted(false);
                              setSearchDocument('');
                              setNewChange({ field: '', customField: '', oldValue: '', newValue: '', justification: '', pageNumber: '', appliesTo: [doc.id], isGlobal: false });
                              setShowAddChange(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-xs font-medium shrink-0"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar
                          </button>
                        </div>

                        {/* Excel table */}
                        <div className="max-h-80 overflow-y-auto">
                          <table className="w-full text-xs border-collapse table-fixed">
                            <colgroup>
                              <col style={{width: '27%'}} />
                              <col style={{width: '20%'}} />
                              <col style={{width: '20%'}} />
                              <col style={{width: '25%'}} />
                              <col style={{width: '44px'}} />
                            </colgroup>
                            <thead className="sticky top-0 z-10">
                              <tr className="bg-gray-100 border-b border-gray-200 select-none">
                                <th className="border-r border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-500 text-[10px] uppercase tracking-wide">Campo - Pág <span className="text-[#C41E3A]">*</span></th>
                                <th className="border-r border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-500 text-[10px] uppercase tracking-wide">V. Anterior</th>
                                <th className="border-r border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-500 text-[10px] uppercase tracking-wide">V. Nueva <span className="text-[#C41E3A]">*</span></th>
                                <th className="border-r border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-500 text-[10px] uppercase tracking-wide">Justificación</th>
                                <th className="py-1.5" />
                              </tr>
                            </thead>
                            <tbody>
                              {visibleChanges.map((change, idx) => {
                                const isEditing = inlineEditId === change.id && inlineEditDocId === doc.id;
                                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70';
                                const readCls = `border-r border-b border-gray-200 px-2 py-1.5 align-middle cursor-pointer ${rowBg} hover:bg-[#C41E3A]/5 transition-colors overflow-hidden max-w-0`;
                                const editCls = 'border-r border-b border-[#C41E3A]/30 px-1.5 py-1.5 align-top bg-[#C41E3A]/5';
                                if (isEditing) {
                                  return (
                                    <tr key={change.id} ref={inlineEditRowRef as React.RefObject<HTMLTableRowElement>} className="ring-1 ring-inset ring-[#C41E3A]/30">
                                      <td className={editCls}>
                                        <textarea autoFocus rows={14}
                                          value={[inlineEditData.field, inlineEditData.pageNumber ? `· p.${inlineEditData.pageNumber}` : ''].filter(Boolean).join(' ')}
                                          style={inlineEditHeight ? { height: inlineEditHeight } : undefined}
                                          onMouseUp={(e) => setInlineEditHeight((e.target as HTMLTextAreaElement).offsetHeight)}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const m = val.match(/^([\s\S]*?)\s*·\s*p\.?\s*(\S*)$/);
                                            if (m) setInlineEditData({ ...inlineEditData, field: m[1].trim(), pageNumber: m[2].trim() });
                                            else setInlineEditData({ ...inlineEditData, field: val, pageNumber: '' });
                                          }}
                                          placeholder="Campo · p.12"
                                          className="w-full px-1.5 py-0.5 text-xs border border-[#C41E3A]/40 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#C41E3A] resize-y" />
                                      </td>
                                      <td className={editCls}><textarea rows={14} style={inlineEditHeight ? { height: inlineEditHeight } : undefined} onMouseUp={(e) => setInlineEditHeight((e.target as HTMLTextAreaElement).offsetHeight)} value={inlineEditData.oldValue} onChange={(e) => setInlineEditData({ ...inlineEditData, oldValue: e.target.value })} placeholder="Versión anterior" className="w-full px-1.5 py-0.5 text-xs border border-[#C41E3A]/40 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#C41E3A] resize-y" /></td>
                                      <td className={editCls}><textarea rows={14} style={inlineEditHeight ? { height: inlineEditHeight } : undefined} onMouseUp={(e) => setInlineEditHeight((e.target as HTMLTextAreaElement).offsetHeight)} value={inlineEditData.newValue} onChange={(e) => setInlineEditData({ ...inlineEditData, newValue: e.target.value })} placeholder="Versión nueva *" className="w-full px-1.5 py-0.5 text-xs border border-[#C41E3A]/40 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#C41E3A] resize-y" /></td>
                                      <td className={editCls}><textarea rows={14} style={inlineEditHeight ? { height: inlineEditHeight } : undefined} onMouseUp={(e) => setInlineEditHeight((e.target as HTMLTextAreaElement).offsetHeight)} value={inlineEditData.justification} onChange={(e) => setInlineEditData({ ...inlineEditData, justification: e.target.value })} placeholder="Justificación" className="w-full px-1.5 py-0.5 text-xs border border-[#C41E3A]/40 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#C41E3A] resize-y" /></td>
                                      <td className="border-b border-[#C41E3A]/30 px-0.5 py-1.5 align-top text-center bg-[#C41E3A]/5">
                                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => saveInlineEdit()} title="Guardar" className="w-5 h-5 flex items-center justify-center rounded bg-[#C41E3A] text-white hover:bg-[#A01828] transition-colors mx-auto mb-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => closeInlineEdit()} title="Cancelar" className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors mx-auto">
                                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={change.id} onClick={() => startInlineEdit(change, doc.id)} className="group cursor-pointer">
                                    <td className={readCls} title={[change.field, change.pageNumber ? `p.${change.pageNumber}` : ''].filter(Boolean).join(' · ')}>
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="shrink-0 w-4 h-4 rounded-full bg-[#C41E3A]/10 text-[#C41E3A] text-[9px] font-bold flex items-center justify-center leading-none">{idx + 1}</span>
                                        <span className="truncate block text-gray-800 font-medium">
                                          {change.field ? [change.field, change.pageNumber ? `· p.${change.pageNumber}` : ''].filter(Boolean).join(' ') : <span className="text-gray-400 font-normal italic">—</span>}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={readCls} title={change.oldValue}>
                                      <span className="truncate block text-gray-500 line-through">{change.oldValue || <span className="no-underline not-italic text-gray-300">—</span>}</span>
                                    </td>
                                    <td className={readCls} title={change.newValue}>
                                      <span className="truncate block text-green-700 font-medium">{change.newValue || <span className="text-gray-300 font-normal">—</span>}</span>
                                    </td>
                                    <td className={readCls} title={change.justification}>
                                      <span className="truncate block text-gray-600">{change.justification || <span className="text-gray-300 italic">—</span>}</span>
                                    </td>
                                    <td className={`border-b border-gray-200 px-0.5 py-1.5 align-middle ${rowBg}`} onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-center gap-0.5">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); startInlineEdit(change, doc.id); }}
                                          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#C41E3A] hover:bg-[#C41E3A]/10 transition-colors"
                                          title="Editar"
                                          aria-label="Editar cambio"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openConfirm({ title: 'Eliminar cambio', message: `¿Desea eliminar el cambio "${change.field}"?`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleRemoveChange(change.id); closeConfirm(); } }); }}
                                          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                          title="Eliminar"
                                          aria-label="Eliminar cambio"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Fila de entrada persistente */}
                              {(() => {
                                const newRow = xlsNewDocRow[doc.id] ?? { field: '', pageNumber: '', oldValue: '', newValue: '', justification: '' };
                                const setNewRow = (v: typeof newRow) => setXlsNewDocRow((p) => ({ ...p, [doc.id]: v }));
                                const commit = () => {
                                  if (!newRow.field.trim() || !newRow.newValue.trim()) return;
                                  const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                                  onChangesUpdate([...changes, { id: newId, field: newRow.field.trim(), oldValue: newRow.oldValue.trim(), newValue: newRow.newValue.trim(), justification: newRow.justification.trim(), pageNumber: newRow.pageNumber.trim(), appliesTo: [doc.id], isGlobal: false }]);
                                  setXlsNewDocRow((p) => ({ ...p, [doc.id]: { field: '', pageNumber: '', oldValue: '', newValue: '', justification: '' } }));
                                };
                                const hasContent = newRow.field || newRow.oldValue || newRow.newValue || newRow.justification;
                                const isExpanded = focusedNewRowDocId === doc.id || !!hasContent;
                                const newRowRows = isExpanded ? 14 : 1;
                                const newRowEditCls = `border-r border-gray-100 px-1 py-1 ${isExpanded ? 'align-top' : 'align-middle'}`;
                                const newRowH = newRowHeights[doc.id] ?? null;
                                const newRowStyle = (newRowH && isExpanded) ? { height: newRowH } : undefined;
                                const syncNewRowHeight = (e: React.MouseEvent<HTMLTextAreaElement>) => {
                                  setNewRowHeights(p => ({ ...p, [doc.id]: (e.target as HTMLTextAreaElement).offsetHeight }));
                                };
                                const newRowCls = 'w-full px-1.5 py-0.5 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#C41E3A] placeholder-gray-300 resize-y transition-all';
                                return (
                                  <tr ref={(el) => { newRowRefs.current[doc.id] = el; }} className="bg-gray-50/40 border-t border-dashed border-gray-300">
                                    <td className={newRowEditCls}>
                                      <textarea
                                        rows={newRowRows}
                                        style={newRowStyle}
                                        value={[newRow.field, newRow.pageNumber ? `· p.${newRow.pageNumber}` : ''].filter(Boolean).join(' ')}
                                        onFocus={() => { setFocusedNewRowDocId(doc.id); setTimeout(() => { newRowRefs.current[doc.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 0); }}
                                        onMouseUp={syncNewRowHeight}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const m = val.match(/^([\s\S]*?)\s*·\s*p\.?\s*(\S*)$/);
                                          if (m) setNewRow({ ...newRow, field: m[1].trim(), pageNumber: m[2].trim() });
                                          else setNewRow({ ...newRow, field: val, pageNumber: '' });
                                        }}
                                        placeholder="Campo · p."
                                        className={newRowCls}
                                      />
                                    </td>
                                    <td className={newRowEditCls}><textarea rows={newRowRows} style={newRowStyle} onFocus={() => { setFocusedNewRowDocId(doc.id); setTimeout(() => { newRowRefs.current[doc.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 0); }} onMouseUp={syncNewRowHeight} value={newRow.oldValue} onChange={(e) => setNewRow({ ...newRow, oldValue: e.target.value })} placeholder="V. anterior" className={newRowCls} /></td>
                                    <td className={newRowEditCls}><textarea rows={newRowRows} style={newRowStyle} onFocus={() => { setFocusedNewRowDocId(doc.id); setTimeout(() => { newRowRefs.current[doc.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 0); }} onMouseUp={syncNewRowHeight} value={newRow.newValue} onChange={(e) => setNewRow({ ...newRow, newValue: e.target.value })} placeholder="V. nueva *" className={newRowCls} /></td>
                                    <td className={newRowEditCls}><textarea rows={newRowRows} style={newRowStyle} onFocus={() => { setFocusedNewRowDocId(doc.id); setTimeout(() => { newRowRefs.current[doc.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 0); }} onMouseUp={syncNewRowHeight} value={newRow.justification} onChange={(e) => setNewRow({ ...newRow, justification: e.target.value })} placeholder="Justificación" className={newRowCls} /></td>
                                    <td className={`px-0.5 py-1 text-center ${isExpanded ? 'align-top pt-2' : 'align-middle'}`}>
                                      <button onMouseDown={(e) => e.preventDefault()} onClick={commit} disabled={!newRow.field.trim() || !newRow.newValue.trim()} className="w-4 h-4 flex items-center justify-center rounded-full bg-[#C41E3A] text-white hover:bg-[#A01828] disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors mx-auto" aria-label="Agregar fila">
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>}
        </div>

      {/* Modal Excel por documento */}
      {xlsModalDocId && (() => {
        const modalDoc = documents.find((d) => d.id === xlsModalDocId);
        const modalChanges = changes.filter((c) => c.isGlobal || c.appliesTo.includes(xlsModalDocId));
        const isEdit = (id: string, col: string) => xlsModalEditCell?.id === id && xlsModalEditCell?.col === col;
        const newRow = xlsNewDocRow[xlsModalDocId] ?? { field: '', pageNumber: '', oldValue: '', newValue: '', justification: '' };
        const setNewRow = (v: typeof newRow) => setXlsNewDocRow((p) => ({ ...p, [xlsModalDocId]: v }));
        const commitRow = () => {
          if (!newRow.field.trim() || !newRow.newValue.trim()) return;
          const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          onChangesUpdate([...changes, { id: newId, field: newRow.field.trim(), oldValue: newRow.oldValue.trim(), newValue: newRow.newValue.trim(), justification: newRow.justification.trim(), pageNumber: newRow.pageNumber.trim(), appliesTo: [xlsModalDocId], isGlobal: false }]);
          setXlsNewDocRow((p) => ({ ...p, [xlsModalDocId]: { field: '', pageNumber: '', oldValue: '', newValue: '', justification: '' } }));
        };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => { setXlsModalDocId(null); setXlsModalEditCell(null); }} />
            <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-5xl mx-4 max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm m-0">{modalDoc?.name}</h4>
                  <p className="text-xs text-gray-400 m-0 mt-0.5">{modalChanges.length} cambio{modalChanges.length !== 1 ? 's' : ''} · Click en celda para editar · Enter en nueva fila para agregar</p>
                </div>
                <button onClick={() => { setXlsModalDocId(null); setXlsModalEditCell(null); }} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {/* Table */}
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm border-collapse table-fixed">
                  <colgroup>
                    <col style={{width: '26%'}} />
                    <col style={{width: '21%'}} />
                    <col style={{width: '21%'}} />
                    <col style={{width: '28%'}} />
                    <col style={{width: '40px'}} />
                  </colgroup>
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Campo - Pág <span className="text-[#C41E3A]">*</span></th>
                      <th className="border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">V. Anterior</th>
                      <th className="border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">V. Nueva <span className="text-[#C41E3A]">*</span></th>
                      <th className="border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Justificación</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {modalChanges.map((change, idx) => {
                      const bg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                      const editing = xlsModalEditCell?.id === change.id;
                      const cell = (col: string) => {
                        const active = isEdit(change.id, col);
                        return `border-r border-b border-gray-200 px-3 transition-colors ${active ? 'py-2 align-top bg-[#C41E3A]/5 ring-2 ring-inset ring-[#C41E3A] z-10 relative' : `py-2.5 align-middle cursor-pointer ${bg} hover:bg-[#C41E3A]/5`}`;
                      };
                      return (
                        <tr key={change.id} className={`group ${editing ? 'shadow-sm' : ''}`}>
                          <td className={`border-r border-b border-gray-200 px-3 transition-colors ${isEdit(change.id, 'field') || isEdit(change.id, 'pageNumber') ? 'py-2 align-top bg-[#C41E3A]/5 ring-2 ring-inset ring-[#C41E3A] z-10 relative' : `py-2.5 align-middle cursor-pointer ${bg} hover:bg-[#C41E3A]/5`}`}>
                            <div className="flex gap-1.5 items-start min-w-0">
                              <div className="flex-1 min-w-0" onClick={() => setXlsModalEditCell({ id: change.id, col: 'field' })}>
                                {isEdit(change.id, 'field')
                                  ? <input autoFocus className="w-full bg-transparent focus:outline-none text-sm py-0.5" value={change.field} onChange={(e) => updateChange(change.id, { field: e.target.value })} onBlur={() => setXlsModalEditCell(null)} onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); setXlsModalEditCell({ id: change.id, col: 'pageNumber' }); } }} />
                                  : <span className="block truncate font-medium text-gray-800">{change.field || <span className="text-gray-300 italic font-normal">—</span>}</span>}
                              </div>
                              <span className="text-gray-300 text-[10px] shrink-0 mt-1">·</span>
                              <div className="shrink-0 w-10" onClick={() => setXlsModalEditCell({ id: change.id, col: 'pageNumber' })}>
                                {isEdit(change.id, 'pageNumber')
                                  ? <input autoFocus className="w-full bg-transparent focus:outline-none text-sm py-0.5" value={change.pageNumber ?? ''} onChange={(e) => updateChange(change.id, { pageNumber: e.target.value })} onBlur={() => setXlsModalEditCell(null)} onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); setXlsModalEditCell({ id: change.id, col: 'oldValue' }); } }} />
                                  : <span className="block text-gray-400 text-xs cursor-pointer">{change.pageNumber || <span className="text-gray-300 italic">p.</span>}</span>}
                              </div>
                            </div>
                          </td>
                          <td className={cell('oldValue')} onClick={() => setXlsModalEditCell({ id: change.id, col: 'oldValue' })}>
                            {isEdit(change.id, 'oldValue')
                              ? <textarea autoFocus rows={4} className="w-full bg-transparent focus:outline-none resize-y text-sm min-h-[80px]" value={change.oldValue} onChange={(e) => updateChange(change.id, { oldValue: e.target.value })} onBlur={() => setXlsModalEditCell(null)} />
                              : <span className="block truncate text-gray-400 line-through">{change.oldValue || <span className="no-underline text-gray-300 italic">—</span>}</span>}
                          </td>
                          <td className={cell('newValue')} onClick={() => setXlsModalEditCell({ id: change.id, col: 'newValue' })}>
                            {isEdit(change.id, 'newValue')
                              ? <textarea autoFocus rows={4} className="w-full bg-transparent focus:outline-none resize-y text-sm min-h-[80px]" value={change.newValue} onChange={(e) => updateChange(change.id, { newValue: e.target.value })} onBlur={() => setXlsModalEditCell(null)} />
                              : <span className="block truncate text-green-700 font-medium">{change.newValue || <span className="text-gray-300 italic font-normal">—</span>}</span>}
                          </td>
                          <td className={cell('justification')} onClick={() => setXlsModalEditCell({ id: change.id, col: 'justification' })}>
                            {isEdit(change.id, 'justification')
                              ? <textarea autoFocus rows={4} className="w-full bg-transparent focus:outline-none resize-y text-sm min-h-[80px]" value={change.justification} onChange={(e) => updateChange(change.id, { justification: e.target.value })} onBlur={() => setXlsModalEditCell(null)} />
                              : <span className="block truncate text-gray-600">{change.justification || <span className="text-gray-300 italic">—</span>}</span>}
                          </td>
                          <td className={`border-b border-gray-200 px-1 align-middle text-center ${bg}`} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openConfirm({ title: 'Eliminar cambio', message: `¿Eliminar "${change.field}"?`, confirmLabel: 'Eliminar', variant: 'danger', onConfirm: () => { handleRemoveChange(change.id); closeConfirm(); } })} className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-red-100 hover:text-red-500 transition-colors opacity-30 group-hover:opacity-100" aria-label="Eliminar cambio">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Nueva fila */}
                    <tr className="bg-[#C41E3A]/5 border-t-2 border-[#C41E3A]/20">
                      <td className="border-r border-[#C41E3A]/10 px-3 py-2">
                        <div className="flex gap-1.5 items-center min-w-0">
                          <input placeholder="Campo *" value={newRow.field} className="flex-1 min-w-0 bg-transparent focus:outline-none text-sm placeholder-gray-300" onChange={(e) => setNewRow({ ...newRow, field: e.target.value })} />
                          <span className="text-gray-300 text-[10px] shrink-0">·</span>
                          <input placeholder="p." value={newRow.pageNumber} className="w-10 bg-transparent focus:outline-none text-sm placeholder-gray-300" onChange={(e) => setNewRow({ ...newRow, pageNumber: e.target.value })} />
                        </div>
                      </td>
                      <td className="border-r border-[#C41E3A]/10 px-3 py-2"><input placeholder="V. anterior" value={newRow.oldValue} className="w-full bg-transparent focus:outline-none text-sm placeholder-gray-300" onChange={(e) => setNewRow({ ...newRow, oldValue: e.target.value })} /></td>
                      <td className="border-r border-[#C41E3A]/10 px-3 py-2"><input placeholder="V. nueva *" value={newRow.newValue} className="w-full bg-transparent focus:outline-none text-sm placeholder-gray-300" onChange={(e) => setNewRow({ ...newRow, newValue: e.target.value })} /></td>
                      <td className="border-r border-[#C41E3A]/10 px-3 py-2"><input placeholder="Justificación" value={newRow.justification} className="w-full bg-transparent focus:outline-none text-sm placeholder-gray-300" onChange={(e) => setNewRow({ ...newRow, justification: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') commitRow(); }} /></td>
                      <td className="px-1 py-2 text-center">
                        <button onClick={commitRow} disabled={!newRow.field.trim() || !newRow.newValue.trim()} className="w-6 h-6 flex items-center justify-center mx-auto bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-200 flex justify-end flex-shrink-0">
                <button onClick={() => { setXlsModalDocId(null); setXlsModalEditCell(null); }} className="px-4 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
            <div className="relative bg-white rounded shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-gray-900 text-sm m-0">{editingId ? 'Editar cambio' : 'Nuevo cambio'}</h4>
                  <span className="text-xs text-gray-400">Los campos con <span className="text-[#C41E3A]">*</span> son obligatorios</span>
                </div>
                <button onClick={closeModal} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-hidden grid grid-cols-[1fr_380px]">
                {/* Left: formulario */}
                <div className="overflow-y-auto px-6 py-5 space-y-5 border-r border-gray-200">
                  <div>
                    <div className="flex items-start gap-4">
                      <div className="w-36 flex-shrink-0 pt-2">
                        <label className="text-sm font-semibold text-gray-700">Cambio a Realizar <span className="text-[#C41E3A]">*</span></label>
                      </div>
                      <textarea autoFocus rows={5} value={newChange.field} onChange={(e) => { setNewChange({ ...newChange, field: e.target.value }); setSubmitAttempted(false); }} placeholder="Describa el cambio a realizar..." className={`flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:border-transparent transition-colors resize-y ${err.field ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-[#C41E3A]'}`} />
                    </div>
                    {err.field && <p className="mt-1 text-xs text-red-500 flex items-center gap-1 m-0"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Campo requerido</p>}
                  </div>


                  <div>
                    <div className="flex items-start gap-4">
                      <div className="w-36 flex-shrink-0 pt-2">
                        <label className="text-sm font-semibold text-gray-700">Versión Anterior</label>
                        <span className="block px-1.5 py-0.5 bg-gray-100 text-gray-400 text-xs rounded font-normal mt-1">opcional</span>
                      </div>
                      <textarea rows={5} value={newChange.oldValue} onChange={(e) => setNewChange({ ...newChange, oldValue: e.target.value })} placeholder="Ingrese el valor que se reemplazará" className="flex-1 px-3 py-1.5 text-sm border border-dashed border-gray-300 rounded bg-gray-50 text-gray-600 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors resize-y" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-start gap-4">
                      <div className="w-36 flex-shrink-0 pt-2">
                        <label className="text-sm font-semibold text-gray-700">Versión Nueva <span className="text-[#C41E3A]">*</span></label>
                      </div>
                      <textarea rows={5} value={newChange.newValue} onChange={(e) => { setNewChange({ ...newChange, newValue: e.target.value }); setSubmitAttempted(false); }} placeholder="Ingrese el nuevo valor o texto corregido" className={`flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:border-transparent transition-colors resize-y ${err.newValue ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-[#C41E3A]'}`} />
                    </div>
                    {err.newValue && <p className="mt-1 text-xs text-red-500 flex items-center gap-1 m-0"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Campo requerido</p>}
                  </div>

                  <div>
                    <div className="flex items-start gap-4">
                      <div className="w-36 flex-shrink-0 pt-2">
                        <label className="text-sm font-semibold text-gray-700">Justificación <span className="text-[#C41E3A]">*</span></label>
                        {newChange.justification && <span className="block text-xs text-gray-400 mt-1">{newChange.justification.length} car.</span>}
                      </div>
                      <textarea value={newChange.justification} onChange={(e) => setNewChange({ ...newChange, justification: e.target.value })} placeholder="Describa la razón técnica o científica de este cambio" rows={5} className={`flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:border-transparent resize-y transition-colors ${err.justification ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-[#C41E3A]'}`} />
                    </div>
                    {err.justification && <p className="mt-1 text-xs text-red-500 flex items-center gap-1 m-0"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Campo requerido</p>}
                  </div>
                </div>

                {/* Right: alcance del cambio */}
                <div className="overflow-hidden px-5 py-5 bg-gray-50/60 flex flex-col gap-3">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">Alcance del cambio <span className="text-[#C41E3A]">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setNewChange({ ...newChange, isGlobal: true })} className={`px-3 py-2 rounded border-2 transition-all text-sm font-medium text-left ${newChange.isGlobal ? 'border-[#C41E3A] bg-red-50 text-[#C41E3A]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${newChange.isGlobal ? 'border-[#C41E3A]' : 'border-gray-300'}`}>{newChange.isGlobal && <div className="w-1.5 h-1.5 rounded-full bg-[#C41E3A]" />}</div>
                          <span className="text-xs">Todos los docs.</span>
                        </div>
                        <p className="text-[11px] text-gray-400 m-0 ml-5 mt-0.5">Aplica a los {documents.length} docs.</p>
                      </button>
                      <button onClick={() => setNewChange({ ...newChange, isGlobal: false })} className={`px-3 py-2 rounded border-2 transition-all text-sm font-medium text-left ${!newChange.isGlobal ? 'border-[#C41E3A] bg-red-50 text-[#C41E3A]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${!newChange.isGlobal ? 'border-[#C41E3A]' : 'border-gray-300'}`}>{!newChange.isGlobal && <div className="w-1.5 h-1.5 rounded-full bg-[#C41E3A]" />}</div>
                          <span className="text-xs">Específicos</span>
                        </div>
                        <p className="text-[11px] text-gray-400 m-0 ml-5 mt-0.5">Selecciona cuáles</p>
                      </button>
                    </div>
                  </div>

                  {!newChange.isGlobal && (
                    <div className="flex-1 flex flex-col gap-2 min-h-0">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input type="text" placeholder="Buscar..." value={searchDocument} onChange={(e) => setSearchDocument(e.target.value)} className="w-full px-2.5 py-1 pl-7 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-[#C41E3A] bg-white" />
                          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-red-100 text-[#C41E3A] shrink-0">{newChange.appliesTo.length}/{documents.length}</span>
                        <button onClick={() => { const allIds = documents.map((d) => d.id); const allSelected = allIds.every((id) => newChange.appliesTo.includes(id)); setNewChange({ ...newChange, appliesTo: allSelected ? [] : allIds }); }} className="px-2 py-1 text-[11px] font-semibold text-[#C41E3A] border border-red-200 rounded hover:bg-red-50 transition-colors whitespace-nowrap bg-white shrink-0">
                          {documents.every((d) => newChange.appliesTo.includes(d.id)) ? 'Desel.' : 'Todos'}
                        </button>
                      </div>
                      {err.appliesTo && <p className="text-xs text-red-500 flex items-center gap-1 m-0"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Seleccione al menos uno</p>}
                      <div className="flex-1 overflow-y-auto border border-gray-200 rounded bg-white">
                        {groupedAvailable(documents.filter((doc) => doc.name.toLowerCase().includes(searchDocument.toLowerCase()))).map((group) => (
                          group.docs.length > 0 && (
                            <div key={group.category}>
                              <div className="px-2.5 py-1 bg-[#C41E3A] flex items-center gap-2 sticky top-0">
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 cursor-pointer accent-white shrink-0"
                                  checked={group.docs.every((d) => newChange.appliesTo.includes(d.id))}
                                  ref={(el) => { if (el) el.indeterminate = group.docs.some((d) => newChange.appliesTo.includes(d.id)) && !group.docs.every((d) => newChange.appliesTo.includes(d.id)); }}
                                  onChange={() => {
                                    const allSelected = group.docs.every((d) => newChange.appliesTo.includes(d.id));
                                    if (allSelected) {
                                      const toRemove = group.docs.map((d) => d.id);
                                      setNewChange({ ...newChange, appliesTo: newChange.appliesTo.filter((id) => !toRemove.includes(id)) });
                                    } else {
                                      const toAdd = group.docs.map((d) => d.id).filter((id) => !newChange.appliesTo.includes(id));
                                      setNewChange({ ...newChange, appliesTo: [...newChange.appliesTo, ...toAdd] });
                                    }
                                  }}
                                />
                                <span className="text-[10px] font-semibold text-white uppercase tracking-wide">{group.category}</span>
                              </div>
                              {group.docs.map((doc) => {
                                const selected = newChange.appliesTo.includes(doc.id);
                                return (
                                  <button key={doc.id} onClick={() => { setNewChange({ ...newChange, appliesTo: selected ? newChange.appliesTo.filter((id) => id !== doc.id) : [...newChange.appliesTo, doc.id] }); }} className={`w-full flex items-center gap-2 px-2.5 py-1 text-xs text-left transition-colors border-b border-gray-100 last:border-0 ${selected ? 'bg-red-50 text-[#C41E3A]' : 'text-gray-700 hover:bg-gray-50'}`}>
                                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-[#C41E3A] border-[#C41E3A]' : 'border-gray-300'}`}>{selected && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>
                                    <span className="flex-1 truncate">{doc.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )
                        ))}
                        {searchDocument && documents.filter((doc) => doc.name.toLowerCase().includes(searchDocument.toLowerCase())).length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-4 m-0">Sin resultados</p>
                        )}
                      </div>
                    </div>
                  )}

                  {newChange.isGlobal && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="text-xs m-0">Aplica a todos los<br/>{documents.length} documentos</p>
                      </div>
                    </div>
                  )}
                </div>
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

      {/* Modal: dead code removed */}
      {false && (() => {
        const targetDoc = documents.find((doc) => doc.id === pasteTargetDocId);
        const parsedRows = parseExcelPaste(pasteRaw);
        const validRows = parsedRows.filter((row) => row.isValid);
        const invalidRows = parsedRows.filter((row) => !row.isValid);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={closePasteModal} />
            <div className="relative bg-white rounded shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h4 className="font-semibold text-gray-900 text-base m-0">Importar cambios desde CSV</h4>
                  <p className="text-xs text-gray-500 mt-0.5 m-0">
                    Documento destino: <span className="font-medium text-gray-700">{targetDoc?.name ?? 'Documento no encontrado'}</span>
                  </p>
                </div>
                <button onClick={closePasteModal} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <div className="text-xs text-blue-900">
                        <p className="m-0 font-semibold">Archivo cargado y procesado internamente</p>
                        <p className="m-0 mt-1">Con encabezados: `Campo`, `Página`, `Versión anterior`, `Versión nueva`, `Justificación`.</p>
                        <p className="m-0 mt-1">Sin encabezados también se acepta 4 columnas en este orden: `Página`, `Versión anterior`, `Versión nueva`, `Justificación`.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">Área de pegado</label>
                      <textarea
                        autoFocus
                        value={pasteRaw}
                        onChange={(e) => setPasteRaw(e.target.value)}
                        placeholder={'Pega aquí las filas copiadas desde Excel con Ctrl+V'}
                        rows={12}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent resize-y font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500 m-0">Filas detectadas</p>
                        <p className="text-lg font-semibold text-gray-900 m-0 mt-1">{parsedRows.length}</p>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                        <p className="text-[11px] uppercase tracking-wide text-green-700 m-0">Válidas</p>
                        <p className="text-lg font-semibold text-gray-900 m-0 mt-1">{validRows.length}</p>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                        <p className="text-[11px] uppercase tracking-wide text-red-700 m-0">Con error</p>
                        <p className="text-lg font-semibold text-gray-900 m-0 mt-1">{invalidRows.length}</p>
                      </div>
                    </div>

                    {invalidRows.length > 0 && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                        <p className="text-sm font-medium text-gray-700 m-0">Hay filas que no se pueden importar</p>
                        <ul className="mt-2 mb-0 pl-4 text-xs text-gray-600">
                          {invalidRows.slice(0, 5).map((row) => (
                            <li key={row.rowNumber}>Fila {row.rowNumber}: {row.error}</li>
                          ))}
                        </ul>
                        {invalidRows.length > 5 && <p className="text-xs text-gray-500 m-0 mt-2">Se muestran las primeras 5 filas con error.</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <h5 className="text-sm font-semibold text-gray-800 m-0">Vista previa</h5>
                    <p className="text-xs text-gray-500 m-0">Cada fila válida se creará como un cambio específico para este documento.</p>
                  </div>
                  <div className="border border-gray-200 rounded-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="border-b border-gray-200">
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Fila</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Campo</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Página</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Versión anterior</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Versión nueva</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Justificación</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {parsedRows.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-6 text-center text-gray-400 italic">Pega una tabla desde Excel para ver la vista previa.</td>
                            </tr>
                          ) : (
                            parsedRows.map((row) => (
                              <tr key={row.rowNumber} className="bg-white">
                                <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                                <td className="px-3 py-2 text-gray-800">{row.field || '—'}</td>
                                <td className="px-3 py-2 text-gray-700">{row.pageNumber || '—'}</td>
                                <td className="px-3 py-2 text-gray-500">{row.oldValue || '—'}</td>
                                <td className="px-3 py-2 text-gray-700">{row.newValue || '—'}</td>
                                <td className="px-3 py-2 text-gray-700">{row.justification || '—'}</td>
                                <td className="px-3 py-2 text-gray-500">
                                  {row.isValid ? (
                                    <span>OK</span>
                                  ) : (
                                    <span>{row.error}</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
                <button onClick={closePasteModal} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium">
                  Cancelar
                </button>
                <button
                  onClick={() => handleImportPastedChanges(pasteTargetDocId, parsedRows)}
                  disabled={!targetDoc || parsedRows.length === 0 || invalidRows.length > 0}
                  className="flex-1 px-5 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                >
                  Importar {validRows.length > 0 ? `${validRows.length} cambio(s)` : 'cambios'}
                </button>
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
                        <div className="p-2 border-b border-gray-200">
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
        <button onClick={onNext} disabled={changes.length === 0} className="px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium">Siguiente →</button>
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

      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleExcelSelected}
      />
    </div>
  );
};
