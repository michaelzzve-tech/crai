import type { EstadoSala } from '../../services/estadoSalas';
import type { Sala } from '../../config/salas';
import { textoMantenimiento } from '../../services/mantenimientoSalas';
import type { MantenimientoSala, ReservaSala } from '../../types';
import { formatearDuracion, formatearHora } from '../../utils/fechas';
import { minutosLibresHoy } from '../../utils/horario';
import { EstadoBadge } from '../EstadoBadge';
import { ProximaReserva } from '../RecursoList';

/** Tarjetas de arriba, como en cubículos: total de salas, disponibles, en uso y en mantenimiento. */
export function ResumenSalas({ estados }: { estados: EstadoSala[] }) {
  const libres = estados.filter((e) => !e.actual && !e.mantenimiento);
  const enMantenimiento = estados.filter((e) => e.mantenimiento).length;
  const tarjetas = [
    { titulo: 'Total de salas', valor: estados.length },
    {
      titulo: 'Disponibles', valor: libres.length, alerta: libres.length === 0,
      detalle: libres.length ? `Salas disponibles: ${libres.map((e) => e.sala.nombre).join(', ')}` : 'No hay salas disponibles.',
    },
    { titulo: 'En uso', valor: estados.filter((e) => e.actual && !e.mantenimiento).length },
    { titulo: 'En mantenimiento', valor: enMantenimiento },
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
 * (Disponible, En uso o Mantenimiento), "Programada" si tiene una reserva por venir y cuánto
 * tiempo sigue libre hoy hasta esa reserva o hasta el cierre. Cada sala se puede mandar a
 * mantenimiento desde una fecha y hora.
 */
export function EspaciosSalas({ estados, ahora, onAbrir, onMantenimiento, onTerminar }: {
  estados: EstadoSala[];
  ahora: Date;
  onAbrir: (r: ReservaSala) => void;
  onMantenimiento: (sala: Sala) => void; // Abre la ventana para elegir fecha y hora
  onTerminar: (m: MantenimientoSala) => void; // Marca disponible o cancela el mantenimiento programado
}) {
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
          {estados.map(({ sala, actual, proxima, mantenimiento, mantenimientoProgramado }) => (
            <tr key={sala.id}>
              <td>
                <span className="titulo-sala"><span className="punto-sala" style={{ background: sala.color }} /><strong>{sala.nombre}</strong></span>
                <div className="secundario">Capacidad: {sala.capacidad} pers.</div>
              </td>
              <td>
                <EstadoBadge estado={mantenimiento ? 'mantenimiento' : actual ? 'ocupado' : 'disponible'} />
                {mantenimiento && (
                  <div className="secundario">
                    En mantenimiento {textoMantenimiento(mantenimiento)}{mantenimiento.nota ? ` · ${mantenimiento.nota}` : ''}
                  </div>
                )}
                {!mantenimiento && mantenimientoProgramado && (
                  <MantenimientoProgramado m={mantenimientoProgramado} libre={!actual} ahora={ahora} />
                )}
                {/* La próxima reserva solo si llega antes que el mantenimiento programado. */}
                {!mantenimiento && proxima && (!mantenimientoProgramado || proxima.inicio < mantenimientoProgramado.inicio) && (
                  <ProximaReserva inicio={proxima.inicio} nombre={proxima.solicitante} libre={!actual} ahora={ahora} />
                )}
                {actual && (
                  <div className="secundario">
                    {actual.actividad} hasta las {formatearHora(actual.fin)} ({actual.solicitante}).
                  </div>
                )}
              </td>
              <td className="acciones">
                {actual && <button onClick={() => onAbrir(actual)}>Ver reserva</button>}
                {mantenimiento ? (
                  <button onClick={() => onTerminar(mantenimiento)}>Marcar disponible</button>
                ) : mantenimientoProgramado ? (
                  <button onClick={() => onTerminar(mantenimientoProgramado)}>Cancelar mantenimiento</button>
                ) : (
                  <button onClick={() => onMantenimiento(sala)}>A mantenimiento</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Aviso de un mantenimiento que todavía no empieza y, si la sala está libre hoy, cuánto tiempo le queda libre. */
function MantenimientoProgramado({ m, libre, ahora }: { m: MantenimientoSala; libre: boolean; ahora: Date }) {
  const minutos = libre ? minutosLibresHoy(ahora, new Date(m.inicio)) : null;
  return (
    <div className="secundario aviso-mantenimiento">
      Mantenimiento programado {textoMantenimiento(m)}{m.nota ? ` · ${m.nota}` : ''}
      {minutos !== null && minutos > 0 && <span className="normal"> (libre por {formatearDuracion(minutos)} hoy)</span>}
    </div>
  );
}
