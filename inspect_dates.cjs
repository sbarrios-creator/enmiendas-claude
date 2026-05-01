const XLSX = require('xlsx');
const path = require('path');

const srcPath = path.join(__dirname, 'informe', 'Informe Mensual Diseño - 07 al 29 Abril 2026.xlsx');
const wb = XLSX.readFile(srcPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Convert Excel serial to date (Excel has a fake Feb-29-1900 bug, so serial = days + 1 for modern dates)
function serialToDate(s) {
  // Excel serial 1 = Jan 1 1900; includes fake leap day (serial 60 = Feb 29 1900)
  const offset = s > 59 ? s - 1 : s; // correct for fake leap
  const d = new Date(Date.UTC(1900, 0, 1) + (offset - 1) * 86400000);
  return d;
}
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// Data rows start at index 17
const data = rows.slice(17).filter(r => r[2]);
const seen = new Set();
for (const r of data) {
  const s = r[2];
  if (seen.has(s)) continue;
  seen.add(s);
  const d = serialToDate(s);
  const dayName = DAYS[d.getUTCDay()];
  const fmt = `${d.getUTCDate().toString().padStart(2,'0')}/${(d.getUTCMonth()+1).toString().padStart(2,'0')}/${d.getUTCFullYear()}`;
  console.log(`Serial ${s} → ${fmt} (${dayName})`);
}
