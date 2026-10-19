import { useCallback, useEffect, useState } from 'react';
import { CUBICULOS, LAPTOPS } from '../../config/modulos';
import { repositorio } from '../../data';
import { EVENTO_CAMBIO } from '../../services/registroService';
import { diaDe } from '../../utils/fechas';

/** Horario que siempre se muestra; se amplía si hay registros antes o después. */
const PRIMERA_HORA = 7;
const ULTIMA_HORA = 20;

const SERIES = [
  { clave: 'prestamos', nombre: 'Préstamos de laptops', modulo: LAPTOPS, clase: 'serie-laptops' },
  { clave: 'reservas', nombre: 'Reservas de cubículos', modulo: CUBICULOS, clase: 'serie-cubiculos' },
] as const;

type Clave = (typeof SERIES)[number]['clave'];
type Conteo = Record<Clave, number[]>; // Cantidad por hora del día (0 a 23)

const horaDe = (iso: string) =>
  Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'America/Caracas' }).format(new Date(iso)));

/** Hora en formato de 12 horas: 7 → "7 a. m.", 12 → "12 p. m.", 0 → "12 a. m.". */
const hora12 = (h: number) => `${h % 12 || 12} ${h % 24 < 12 ? 'a. m.' : 'p. m.'}`;
const etiquetaHora = (h: number) => hora12(h).replace(' ', ':00 ');

/** Préstamos y reservas de hoy (hora de Caracas), agrupados por la hora en que empiezan. */
async function contarHoy(): Promise<Conteo> {
  const hoy = diaDe();
  const conteo = { prestamos: Array(24).fill(0), reservas: Array(24).fill(0) } as Conteo;
  await Promise.all(
    SERIES.map(async (s) => {
      const registros = await repositorio.listarRegistros(s.modulo.tablaRegistros);
      for (const r of registros) if (diaDe(r.inicio) === hoy) conteo[s.clave][horaDe(r.inicio)] += 1;
    }),
  );
  return conteo;
}

/** Gráfica de barras con la actividad de hoy, hora por hora, de ambos módulos. */
export function ActividadDiaria() {
  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [horaActual, setHoraActual] = useState(0);
  const [activa, setActiva] = useState<number | null>(null);

  const recargar = useCallback(() => { 
    contarHoy().then((c) => { setConteo(c); setHoraActual(horaDe(new Date().toISOString())); }).catch(() => {});
  }, []);

  useEffect(() => {
    recargar();
    window.addEventListener(EVENTO_CAMBIO, recargar);
    const id = setInterval(recargar, 60_000);
    return () => {
      window.removeEventListener(EVENTO_CAMBIO, recargar);
      clearInterval(id);
    };
  }, [recargar]);

  if (!conteo) return null;

  const conDatos = [...Array(24).keys()].filter((h) => conteo.prestamos[h] + conteo.reservas[h] > 0);
  const desde = Math.min(PRIMERA_HORA, ...conDatos);
  const hasta = Math.max(ULTIMA_HORA, ...conDatos);
  const horas = [...Array(hasta - desde + 1).keys()].map((i) => desde + i);
  const total = (c: Clave) => conteo[c].reduce((a, b) => a + b, 0);
  const maximo = Math.max(1, ...horas.flatMap((h) => SERIES.map((s) => conteo[s.clave][h])));
  // Escala con números enteros "redondos": 1, 2, 5, 10, 20…
  const paso = [1, 2, 5, 10, 20, 50, 100].find((p) => maximo / p <= 4) ?? 100;
  const tope = Math.ceil(maximo / paso) * paso;
  const marcas = [...Array(tope / paso + 1).keys()].map((i) => i * paso);

  // Medidas del dibujo (unidades del viewBox; se estira al ancho disponible).
  const ancho = 720, alto = 160, izq = 28, arriba = 8, abajo = 22;
  const alturaGrafica = alto - arriba - abajo;
  const columna = (ancho - izq) / horas.length;
  const barra = Math.min(14, (columna - 10) / 2);
  const y = (v: number) => arriba + alturaGrafica - (v / tope) * alturaGrafica;

  return (
    <section className="panel actividad" aria-label="Actividad de hoy">
      <div className="panel-encabezado">
        <h2>Actividad de hoy</h2>
        <ul className="actividad-leyenda">
          {SERIES.map((s) => (
            <li key={s.clave}>
              <span className={`actividad-muestra ${s.clase}`} aria-hidden="true" />
              {s.nombre}: <strong>{total(s.clave)}</strong>
            </li>
          ))}
        </ul>
      </div>
      <div className="actividad-grafica" onMouseLeave={() => setActiva(null)}>
        <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`Préstamos y reservas por hora: ${horas.map((h) => `${etiquetaHora(h)} ${conteo.prestamos[h]} y ${conteo.reservas[h]}`).join(', ')}`}>
          {marcas.map((m) => (
            <g key={m}>
              <line x1={izq} x2={ancho} y1={y(m)} y2={y(m)} className={m === 0 ? 'actividad-base' : 'actividad-guia'} />
              <text x={izq - 6} y={y(m) + 4} textAnchor="end" className="actividad-eje">{m}</text>
            </g>
          ))}
          {horas.map((h, i) => {
            const x0 = izq + i * columna;
            const centro = x0 + columna / 2;
            return (
              <g key={h}>
                {activa === h && <rect x={x0} y={arriba} width={columna} height={alturaGrafica} className="actividad-resalte" />}
                {SERIES.map((s, j) => {
                  const v = conteo[s.clave][h];
                  if (v === 0) return null;
                  const x = centro - barra - 1 + j * (barra + 2); // 2 de separación entre barras
                  const alturaBarra = y(0) - y(v);
                  const r = Math.min(4, barra / 2, alturaBarra);
                  // Extremo superior redondeado, base recta sobre el eje.
                  const d = `M${x},${y(0)} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + barra - r} Q${x + barra},${y(v)} ${x + barra},${y(v) + r} V${y(0)} Z`;
                  return <path key={s.clave} d={d} className={s.clase} />;
                })}
                <text x={centro} y={alto - 6} textAnchor="middle" className={h === horaActual ? 'actividad-eje actividad-ahora' : 'actividad-eje'}>
                  {hora12(h)}
                </text>
                {/* Zona invisible de toda la columna para mostrar el detalle al pasar el mouse. */}
                <rect x={x0} y={0} width={columna} height={alto} fill="transparent" onMouseEnter={() => setActiva(h)} />
              </g>
            );
          })}
        </svg>
        {activa !== null && (
          <div
            className="actividad-detalle"
            role="tooltip"
            style={{ left: `${((izq + (horas.indexOf(activa) + 0.5) * columna) / ancho) * 100}%` }}
          >
            <strong>{etiquetaHora(activa)} a {etiquetaHora(activa + 1)}</strong>
            {SERIES.map((s) => (
              <span key={s.clave}>
                <span className={`actividad-muestra ${s.clase}`} aria-hidden="true" />
                {s.nombre}: {conteo[s.clave][activa]}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
