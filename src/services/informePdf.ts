import { formatearDia, formatearDuracion, formatearFecha } from '../utils/fechas';
import { filasInforme, seccionesDesglose, type Informe } from './informeService';

const AZUL: [number, number, number] = [29, 78, 216];
const TEXTO: [number, number, number] = [31, 41, 51];
const SUAVE: [number, number, number] = [97, 110, 124];
const BORDE: [number, number, number] = [217, 226, 236];

/** Crea el PDF del informe y lo descarga. La librería se carga solo al pedirlo. */
export async function descargarInformePdf(informe: Informe): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const margen = 20;
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const ancho = anchoPagina - margen * 2;
  const { desde, hasta } = informe.periodo;
  let y = 0;

  const color = (c: [number, number, number]) => doc.setTextColor(...c);
  const fuente = (tamano: number, negrita = false) => {
    doc.setFontSize(tamano);
    doc.setFont('helvetica', negrita ? 'bold' : 'normal');
  };
  /** Pasa a otra página si no cabe un bloque de `alto` mm. */
  const espacio = (alto: number) => {
    if (y + alto > altoPagina - margen) {
      doc.addPage();
      y = margen;
    }
  };

  // Encabezado
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, anchoPagina, 32, 'F');
  color([255, 255, 255]);
  fuente(18, true);
  doc.text('Informe de uso', margen, 16);
  fuente(11);
  doc.text(`Período: ${formatearDia(desde)} al ${formatearDia(hasta)}`, margen, 25);

  // Totales
  y = 44;
  const columnas = 2;
  const anchoTarjeta = (ancho - 6) / columnas;
  filasInforme(informe, formatearDuracion).forEach((fila, i) => {
    const x = margen + (i % columnas) * (anchoTarjeta + 6);
    const top = y + Math.floor(i / columnas) * 28;
    doc.setDrawColor(...BORDE);
    doc.roundedRect(x, top, anchoTarjeta, 24, 2, 2, 'S');
    color(TEXTO);
    fuente(16, true);
    doc.text(fila.valor, x + 5, top + 9);
    color(SUAVE);
    fuente(10);
    doc.text(fila.titulo, x + 5, top + 15);
    if (fila.nota) {
      fuente(8);
      doc.text(fila.nota, x + 5, top + 20);
    }
  });
  y += 2 * 28 + 6;

  // Desglose
  const xCantidad = margen + ancho * 0.68;
  const xHoras = margen + ancho;
  for (const seccion of seccionesDesglose(informe)) {
    espacio(30);
    color(AZUL);
    fuente(13, true);
    doc.text(seccion.titulo, margen, y);
    y += 8;
    for (const d of seccion.desgloses) {
      espacio(20);
      color(TEXTO);
      fuente(10, true);
      doc.text(d.titulo, margen, y);
      color(SUAVE);
      fuente(8, true);
      doc.text('Cantidad', xCantidad, y, { align: 'right' });
      doc.text(seccion.columnaHoras, xHoras, y, { align: 'right' });
      y += 2;
      doc.setDrawColor(...BORDE);
      doc.line(margen, y, margen + ancho, y);
      y += 5;
      fuente(10);
      if (d.filas.length === 0) {
        color(SUAVE);
        doc.text('Sin registros.', margen, y);
        y += 6;
      }
      for (const f of d.filas) {
        espacio(6);
        color(TEXTO);
        doc.text(f.etiqueta, margen, y);
        doc.text(String(f.cantidad), xCantidad, y, { align: 'right' });
        doc.text(formatearDuracion(f.minutos), xHoras, y, { align: 'right' });
        y += 6;
      }
      y += 4;
    }
    y += 4;
  }

  espacio(8);
  color(SUAVE);
  fuente(9);
  doc.text(`Generado el ${formatearFecha(new Date().toISOString())} (hora de Caracas).`, margen, y);

  doc.save(`informe-crai-${desde}-al-${hasta}.pdf`);
}
