import * as XLSX from 'xlsx';

export function exportToExcel(data: Record<string, any>[], filename: string, sheetName = 'Datos') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][][],
  filename: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138);
  doc.text('LOGIGUAY', 14, 14);
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(title, 14, 22);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Exportado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, 14, 29);

  autoTable(doc, {
    head: [columns],
    body: rows.flat().map((r) => r.map(String)),
    startY: 34,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  });

  doc.save(`${filename}.pdf`);
}
