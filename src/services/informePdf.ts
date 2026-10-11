import { formatearDia, formatearDuracion, formatearFecha } from '../utils/fechas';
import { filasInforme, type Informe } from './informeService';

/** Crea el PDF del informe y lo descarga. La librería se carga solo al pedirlo. */
export async function descargarInformePdf(informe: Informe): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const margen = 20;
  const ancho = doc.internal.pageSize.getWidth() - margen * 2;
  const { desde, hasta } = informe.periodo;

  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Biblioteca · Informe de uso', margen, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Período: ${formatearDia(desde)} al ${formatearDia(hasta)}`, margen, 25);

  let y = 48;
  for (const fila of filasInforme(informe, formatearDuracion)) {
    doc.setDrawColor(217, 226, 236);
    doc.roundedRect(margen, y - 8, ancho, fila.nota ? 22 : 16, 2, 2, 'S');
    doc.setTextColor(97, 110, 124);
    doc.setFontSize(11);
    doc.text(fila.titulo, margen + 5, y);
    doc.setTextColor(31, 41, 51);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(fila.valor, margen + ancho - 5, y + 1, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    if (fila.nota) {
      doc.setTextColor(97, 110, 124);
      doc.setFontSize(9);
      doc.text(fila.nota, margen + 5, y + 8);
    }
    y += fila.nota ? 28 : 22;
  }

  doc.setTextColor(97, 110, 124);
  doc.setFontSize(9);
  doc.text(`Generado el ${formatearFecha(new Date().toISOString())} (hora de Caracas).`, margen, y + 4);

  doc.save(`informe-biblioteca-${desde}-al-${hasta}.pdf`);
}
