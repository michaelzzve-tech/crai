import type { EstadoSala } from '../../services/estadoSalas';
import type { ReservaSala } from '../../types';
import { formatearHora } from '../../utils/fechas';
import { EstadoBadge } from '../EstadoBadge';
import { ProximaReserva } from '../RecursoList';

/** Tarjetas de arriba, como en cubículos: total de salas, disponibles y en uso. */
export function ResumenSalas({ estados }: { estados: EstadoSala[] }) {
  const libres = estados.filter((e) => !e.actual);
  const tarjetas = [
    { titulo: 'Total de salas', valor: estados.length },
    {
      titulo: 'Disponibles', valor: libres.length, alerta: libres.length === 0,
      detalle: libres.length ? `Salas disponibles: ${libres.map((e) => e.sala.nombre).join(', ')}` : 'No hay salas disponibles.',
    },
    { titulo: 'En uso', valor: estados.length - libres.length },
  ];
  return (
    <section className="resumen">
      {tarjetas.map((t) => (
        <div
          key={t.titulo}
          className={`tarjeta${t.alerta ? ' alerta' : ''}${t.detalle ? ' con-detalle' : ''}`}
          tabIndex={t.detalle ? 0 : undefined}
          aria-describedby={t.detalle ? 'detalle-salas-disponibles' : undefined}
        >
          <span className="tarjeta-valor">{t.valor}</span>
          <span className="tarjeta-titulo">{t.titulo}</span>
          {t.detalle && <span id="detalle-salas-disponibles" role="tooltip" className="tarjeta-detalle">{t.detalle}</span>}
        </div>
      ))}
    </section>
  );
}

/**
 * Pestaña Espacios de Salas especiales, como la de cubículos: cada sala con su estado
 * (Disponible o En uso), "Programada" si tiene una reserva por venir y cuánto tiempo
 * sigue libre hoy hasta esa reserva o hasta el cierre.
 */
export function EspaciosSalas({ estados, ahora, onAbrir }: { estados: EstadoSala[]; ahora: Date; onAbrir: (r: ReservaSala) => void }) {
  return (
    <section className="panel">
      <h2>Salas ({estados.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Sala</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {estados.map(({ sala, actual, proxima }) => (
            <tr key={sala.id}>
              <td>
                <span className="titulo-sala"><span className="punto-sala" style={{ background: sala.color }} /><strong>{sala.nombre}</strong></span>
                <div className="secundario">Capacidad: {sala.capacidad} pers.</div>
              </td>
              <td>
                <EstadoBadge estado={actual ? 'ocupado' : 'disponible'} />
                {proxima && <ProximaReserva inicio={proxima.inicio} nombre={proxima.solicitante} libre={!actual} ahora={ahora} />}
                {actual && (
                  <div className="secundario">
                    {actual.actividad} hasta las {formatearHora(actual.fin)} ({actual.solicitante}).
                  </div>
                )}
              </td>
              <td className="acciones">
                {actual && <button onClick={() => onAbrir(actual)}>Ver reserva</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
