import logoCrai from '../assets/logo-crai.png';
import { CUBICULOS, LAPTOPS } from '../config/modulos';
import { formatearFecha } from '../utils/fechas';
import {
  COLORES_SERIES, horasCortas, lineasGrupo, lineasInstitucion, type Cuadro, type Informe, type Servicio,
} from './informeService';
import { columnasDetalle, columnasSalas, type Columna } from './respaldo';

/** Una tabla del detalle: sus columnas y el texto de cada celda, fila por fila. */
const tabla = <T>(titulo: string, cols: Columna<T>[], registros: T[]) =>
  ({ titulo, cols, filas: registros.map((r) => cols.map((c) => c.valor(r))) });

type Color = [number, number, number];
const AZUL: Color = [29, 78, 216];
const TEXTO: Color = [31, 41, 51];
const SUAVE: Color = [97, 110, 124];
const BORDE: Color = [217, 226, 236];
const FONDO_CUADRO: Color = [219, 234, 254];

const rgb = (hex: string): Color => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Color;

/** El logo como data URL, para incrustarlo en el PDF. */
async function cargarLogo(): Promise<string> {
  const blob = await (await fetch(logoCrai)).blob();
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result as string);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(blob);
  });
}

/** Crea el PDF del informe (formato del reporte mensual) y lo descarga. La librería se carga solo al pedirlo. */
export async function descargarInformePdf(informe: Informe): Promise<void> {
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), cargarLogo().catch(() => '')]);
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const margen = 20;
  const anchoPagina = doc.internal.pageSize.getWidth();
  let altoPagina = doc.internal.pageSize.getHeight();
  const ancho = anchoPagina - margen * 2;
  const centro = anchoPagina / 2;
  const { desde, hasta } = informe.periodo;
  let y = 0;

  const color = (c: Color) => doc.setTextColor(...c);
  const fuente = (tamano: number, negrita = false) => {
    doc.setFontSize(tamano);
    doc.setFont('helvetica', negrita ? 'bold' : 'normal');
  };
  /** Logo arriba a la derecha y una línea, como el membrete del reporte. */
  const membrete = () => {
    if (logo) doc.addImage(logo, 'PNG', anchoPagina - margen - 30, 8, 30, 12.7);
    doc.setDrawColor(...SUAVE);
    doc.setLineWidth(0.3);
    doc.line(margen, 24, anchoPagina - margen, 24);
    y = 34;
  };
  const nuevaPagina = () => {
    doc.addPage('letter', 'portrait');
    membrete();
  };
  /** Pasa a otra página si no cabe un bloque de `alto` mm. */
  const espacio = (alto: number) => {
    if (y + alto > altoPagina - margen) nuevaPagina();
  };
  /** "Etiqueta: valor" centrado, con el valor en negrita. */
  const lineaCentrada = (etiqueta: string, valor: string, separador = ': ') => {
    fuente(10);
    const a = doc.getTextWidth(`${etiqueta}${separador}`);
    fuente(10, true);
    const b = doc.getTextWidth(valor);
    const x = centro - (a + b) / 2;
    fuente(10);
    doc.text(`${etiqueta}${separador}`, x, y);
    fuente(10, true);
    doc.text(valor, x + a + 1, y);
    y += 5.5;
  };
  /** Viñeta con texto que puede ocupar varias líneas. */
  const vineta = (texto: string, nivel: number) => {
    const x = margen + 4 + nivel * 8;
    fuente(9.5);
    const lineas = doc.splitTextToSize(texto, anchoPagina - margen - x - 4) as string[];
    espacio(lineas.length * 4.6);
    color(TEXTO);
    doc.text(nivel === 0 ? '•' : '-', x, y);
    doc.text(lineas, x + 4, y);
    y += lineas.length * 4.6;
  };
  const tituloSeccion = (texto: string) => {
    espacio(14);
    color(TEXTO);
    fuente(11, true);
    doc.text(texto, margen, y);
    y += 8;
  };

  // Portada
  membrete();
  y = 40;
  color(TEXTO);
  fuente(11, true);
  for (const linea of ['INFORME DE ACTIVIDADES', 'CENTRO DE RECURSOS DE APRENDIZAJE E INVESTIGACIÓN', 'BIBLIOTECA HERMANO KORTA S.J.']) {
    doc.text(linea, centro, y, { align: 'center' });
    y += 8;
  }
  lineaCentrada('Reporte Mensual', informe.titulo, '  |  ');
  doc.line(margen, y, anchoPagina - margen, y);
  y += 10;

  // Beneficiarios por servicio
  tituloSeccion('Beneficiarios alcanzados por servicio prestado');
  informe.servicios.forEach((servicio: Servicio, i) => {
    if (i > 0) nuevaPagina();
    color(TEXTO);
    fuente(14);
    doc.text(servicio.titulo, centro, y, { align: 'center' });
    y += 7;
    for (const t of servicio.totales) lineaCentrada(t.etiqueta, t.valor);
    y += 2;
    doc.setDrawColor(...SUAVE);
    doc.line(margen, y, anchoPagina - margen, y);
    y += 8;
    for (const b of servicio.instituciones) {
      espacio(16);
      color(TEXTO);
      fuente(11, true);
      doc.text(b.nombre, margen, y);
      y += 6;
      for (const l of lineasInstitucion(b, servicio)) vineta(l, 0);
      for (const g of b.grupos) {
        espacio(14); // El título del grupo no queda solo al final de la página
        vineta(`${g.titulo}:`, 0);
        for (const l of lineasGrupo(g, servicio)) vineta(l, 1);
      }
      y += 4;
    }
  });

  // Cuadros comparativos
  nuevaPagina();
  tituloSeccion('Cuadros comparativos progresivos');
  const ALTO_GRAFICA = 56;
  /** Alto de un cuadro con su gráfica: título, encabezado, filas, totales y la gráfica. */
  const altoCuadro = (c: Cuadro) => 5 * (c.filas.length + 3) + 6 + ALTO_GRAFICA + 10;
  for (const seccion of informe.comparativos) {
    espacio(6 + altoCuadro(seccion.cuadros[0]));
    color(TEXTO);
    fuente(10, true);
    doc.text(seccion.titulo, margen, y);
    y += 6;
    for (const cuadro of seccion.cuadros) {
      espacio(altoCuadro(cuadro));
      dibujarCuadro(cuadro);
      y += 6;
      dibujarGrafica(cuadro);
      y += 10;
    }
  }

  /** Tabla con un mes por columna, la fila de totales y la columna TOTAL. */
  function dibujarCuadro(cuadro: Cuadro) {
    const formato = (v: number) => (cuadro.horas ? horasCortas(v) : String(v));
    const suma = (v: number[]) => v.reduce((a, b) => a + b, 0);
    const primera = 20;
    const col = (ancho - primera) / (cuadro.meses.length + 1);
    const alto = 5;
    const filas = [
      ...cuadro.filas.map((f) => [f.etiqueta, ...f.valores.map(formato), formato(suma(f.valores))]),
      ['TOTALES', ...cuadro.meses.map((_, i) => formato(suma(cuadro.filas.map((f) => f.valores[i])))),
        formato(suma(cuadro.filas.flatMap((f) => f.valores)))],
    ];
    doc.setDrawColor(...TEXTO);
    doc.setLineWidth(0.2);
    // Título del cuadro
    doc.setFillColor(...FONDO_CUADRO);
    doc.rect(margen, y, ancho, alto, 'FD');
    color(TEXTO);
    fuente(7, true);
    doc.text(cuadro.titulo, centro, y + 3.4, { align: 'center' });
    y += alto;
    const celdas = (valores: string[], negrita: boolean, fondo?: Color) => {
      valores.forEach((v, i) => {
        const x = i === 0 ? margen : margen + primera + (i - 1) * col;
        const w = i === 0 ? primera : col;
        if (fondo) doc.setFillColor(...fondo);
        doc.rect(x, y, w, alto, fondo ? 'FD' : 'S');
        fuente(6.5, negrita || i === valores.length - 1);
        doc.text(v, i === 0 ? x + 1.5 : x + w / 2, y + 3.4, { align: i === 0 ? 'left' : 'center' });
      });
      y += alto;
    };
    celdas([cuadro.columna, ...cuadro.meses, 'TOTAL'], true, FONDO_CUADRO);
    filas.forEach((f, i) => celdas(f, i === filas.length - 1));
  }

  /** Gráfica de líneas del cuadro, con leyenda. */
  function dibujarGrafica(cuadro: Cuadro) {
    const alto = ALTO_GRAFICA;
    const izq = margen + 14;
    const der = margen + ancho - 30;
    const arriba = y + 8;
    const abajo = y + alto - 8;
    const maximo = Math.max(1, ...cuadro.filas.flatMap((f) => f.valores));
    const unidad = cuadro.horas ? 60 : 1;
    const paso = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].map((p) => p * unidad).find((p) => maximo / p <= 5) ?? 1000 * unidad;
    const tope = Math.ceil(maximo / paso) * paso;
    const px = (i: number) => izq + (i * (der - izq)) / Math.max(1, cuadro.meses.length - 1);
    const py = (v: number) => abajo - ((abajo - arriba) * v) / tope;

    color(SUAVE);
    fuente(9);
    doc.text(cuadro.grafica, centro, y + 3, { align: 'center' });
    fuente(6.5);
    for (let m = 0; m <= tope; m += paso) {
      doc.setDrawColor(...BORDE);
      doc.setLineWidth(0.2);
      doc.line(izq, py(m), der, py(m));
      doc.text(cuadro.horas ? horasCortas(m) : String(m), izq - 2, py(m) + 1, { align: 'right' });
    }
    cuadro.meses.forEach((mes, i) => doc.text(mes, px(i), abajo + 4.5, { align: 'center' }));
    doc.setLineWidth(0.6);
    cuadro.filas.forEach((f, i) => {
      doc.setDrawColor(...rgb(COLORES_SERIES[i]));
      for (let j = 1; j < f.valores.length; j++) doc.line(px(j - 1), py(f.valores[j - 1]), px(j), py(f.valores[j]));
      // Leyenda a la derecha
      const ly = arriba + 2 + i * 5;
      doc.line(der + 4, ly - 1, der + 9, ly - 1);
      color(TEXTO);
      doc.text(f.etiqueta, der + 11, ly);
    });
    doc.setLineWidth(0.2);
    y += alto;
  }

  espacio(8);
  color(SUAVE);
  fuente(9);
  doc.text(`Generado el ${formatearFecha(new Date().toISOString())} (hora de Caracas).`, margen, y);

  // Detalle: cada préstamo y cada reserva del período, en páginas horizontales.
  const detalles = [
    tabla('Detalle de préstamos de laptops', columnasDetalle(LAPTOPS), informe.detallePrestamos),
    tabla('Detalle de reservas de cubículos', columnasDetalle(CUBICULOS), informe.detalleReservas),
    tabla('Detalle de reservas de salas especiales', columnasSalas(), informe.detalleSalas),
  ];
  for (const { titulo, cols, filas: registros } of detalles) {
    doc.addPage('letter', 'landscape');
    altoPagina = doc.internal.pageSize.getHeight();
    const anchoDetalle = doc.internal.pageSize.getWidth() - margen * 2;
    const escala = anchoDetalle / cols.reduce((t, c) => t + c.ancho, 0);
    const xs = cols.map((_, i) => margen + cols.slice(0, i).reduce((t, c) => t + c.ancho, 0) * escala);
    /** Recorta el texto al ancho de su columna. */
    const recortar = (texto: string, i: number) => {
      const max = cols[i].ancho * escala - 1.5;
      let t = texto;
      while (t.length > 1 && doc.getTextWidth(t) > max) t = t.slice(0, -1);
      return t === texto ? t : `${t.slice(0, -1)}…`;
    };
    const encabezados = () => {
      color(SUAVE);
      fuente(7, true);
      const lineas = cols.map((c, i) => doc.splitTextToSize(c.titulo, cols[i].ancho * escala - 1.5) as string[]);
      lineas.forEach((l, i) => doc.text(l, xs[i], y));
      y += Math.max(...lineas.map((l) => l.length)) * 3 - 1;
      doc.setDrawColor(...BORDE);
      doc.line(margen, y, margen + anchoDetalle, y);
      y += 4;
    };

    y = margen;
    color(AZUL);
    fuente(13, true);
    doc.text(`${titulo} (${registros.length})`, margen, y);
    y += 8;
    if (registros.length === 0) {
      color(SUAVE);
      fuente(10);
      doc.text('Sin registros en el período.', margen, y);
      continue;
    }
    encabezados();
    for (const r of registros) {
      if (y + 5 > altoPagina - margen) {
        doc.addPage('letter', 'landscape');
        y = margen;
        encabezados();
      }
      color(TEXTO);
      fuente(7);
      r.forEach((texto, i) => doc.text(recortar(texto, i), xs[i], y));
      y += 5;
    }
  }

  doc.save(`informe-crai-${desde}-al-${hasta}.pdf`);
}
