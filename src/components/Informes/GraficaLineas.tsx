import { useState } from 'react';
import { COLORES_SERIES, horasCortas, type Cuadro } from '../../services/informeService';

/** Gráfica de líneas de un cuadro comparativo: una línea por fila, un punto por mes. */
export function GraficaLineas({ cuadro }: { cuadro: Cuadro }) {
  const [activo, setActivo] = useState<number | null>(null);
  const formato = (v: number) => (cuadro.horas ? horasCortas(v) : String(v));
  const maximo = Math.max(1, ...cuadro.filas.flatMap((f) => f.valores));
  // Escala con valores "redondos": en horas, múltiplos de 60 minutos.
  const unidad = cuadro.horas ? 60 : 1;
  const paso = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].map((p) => p * unidad).find((p) => maximo / p <= 5) ?? 1000 * unidad;
  const tope = Math.ceil(maximo / paso) * paso;
  const marcas = Array.from({ length: tope / paso + 1 }, (_, i) => i * paso);

  const ancho = 720, alto = 220, izq = 44, der = 12, arriba = 10, abajo = 24;
  const x = (i: number) => izq + (i * (ancho - izq - der)) / Math.max(1, cuadro.meses.length - 1);
  const y = (v: number) => arriba + (alto - arriba - abajo) * (1 - v / tope);
  const columna = (ancho - izq - der) / Math.max(1, cuadro.meses.length - 1);

  return (
    <figure className="grafica-lineas">
      <figcaption>{cuadro.grafica}</figcaption>
      <ul className="actividad-leyenda">
        {cuadro.filas.map((f, i) => (
          <li key={f.etiqueta}>
            <span className="actividad-muestra" style={{ background: COLORES_SERIES[i] }} aria-hidden="true" />
            {f.etiqueta}
          </li>
        ))}
      </ul>
      <div className="actividad-grafica" onMouseLeave={() => setActivo(null)}>
        <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`${cuadro.grafica}. Los datos están en la tabla de arriba.`}>
          {marcas.map((m) => (
            <g key={m}>
              <line x1={izq} x2={ancho - der} y1={y(m)} y2={y(m)} className={m === 0 ? 'actividad-base' : 'actividad-guia'} />
              <text x={izq - 6} y={y(m) + 4} textAnchor="end" className="actividad-eje">{formato(m)}</text>
            </g>
          ))}
          {cuadro.meses.map((mes, i) => (
            <text key={mes} x={x(i)} y={alto - 6} textAnchor="middle" className="actividad-eje">{mes}</text>
          ))}
          {activo !== null && <line x1={x(activo)} x2={x(activo)} y1={arriba} y2={y(0)} className="grafica-cursor" />}
          {cuadro.filas.map((f, i) => (
            <polyline
              key={f.etiqueta}
              fill="none"
              stroke={COLORES_SERIES[i]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={f.valores.map((v, j) => `${x(j)},${y(v)}`).join(' ')}
            />
          ))}
          {activo !== null && cuadro.filas.map((f, i) => (
            <circle key={f.etiqueta} cx={x(activo)} cy={y(f.valores[activo])} r={4} fill={COLORES_SERIES[i]} stroke="#fff" strokeWidth={2} />
          ))}
          {/* Zonas invisibles por mes para mostrar el detalle al pasar el mouse. */}
          {cuadro.meses.map((mes, i) => (
            <rect key={mes} x={x(i) - columna / 2} y={0} width={columna} height={alto} fill="transparent" onMouseEnter={() => setActivo(i)} />
          ))}
        </svg>
        {activo !== null && (
          <div className="actividad-detalle" role="tooltip" style={{ left: `${Math.min(85, Math.max(15, (x(activo) / ancho) * 100))}%` }}>
            <strong>{cuadro.meses[activo]}</strong>
            {cuadro.filas.map((f, i) => (
              <span key={f.etiqueta}>
                <span className="actividad-muestra" style={{ background: COLORES_SERIES[i] }} aria-hidden="true" />
                {f.etiqueta}: {formato(f.valores[activo])}
              </span>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}
