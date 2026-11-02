import { nombreRecurso, type Modulo } from '../../config/modulos';
import { useAhora } from '../../hooks/useAhora';
import { cambiarMantenimiento } from '../../services/registroService';
import type { Recurso, Registro } from '../../types';
import { diaDe, formatearDia, formatearDuracion, formatearHora } from '../../utils/fechas';
import { cierreDeHoy, minutosLibresHoy } from '../../utils/horario';
import { EstadoBadge } from '../EstadoBadge';
import { usePaginacion } from '../../hooks/usePaginacion';
import { Paginador } from '../Paginador';
import type { EjecutarAccion } from '../tipos';

interface Props {
  modulo: Modulo;
  recursos: Recurso[];
  registros: Registro[];
  ejecutar: EjecutarAccion;
}

/** Los recursos del módulo (laptops 1–25 y 59–80, cubículos 1–6 y Podcast…) con su estado. */
export function RecursoList({ modulo, recursos, registros, ejecutar }: Props) {
  const paginacion = usePaginacion(recursos);
  const ahora = useAhora(30_000);
  /** La próxima reserva que todavía no empieza (solo módulos con hora de fin, como cubículos). */
  const proxima = (id: string) => (modulo.conHoraFin
    ? registros
      .filter((g) => g.recursoId === id && !g.finReal && new Date(g.inicio) > ahora)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))[0]
    : undefined);

  return (
    <section className="panel">
      <h2>{modulo.recursos} ({recursos.length})</h2>
      <table>
        <thead>
          <tr>
            <th>{modulo.recurso}</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {paginacion.items.map((r) => (
            <tr key={r.id}>
              <td><strong>{nombreRecurso(r.id)}</strong></td>
              <td>
                <EstadoBadge estado={r.estado} textoOcupado={modulo.ocupado} />
                <ProximaReserva reserva={proxima(r.id)} libre={r.estado === 'disponible'} ahora={ahora} />
              </td>
              <td className="acciones">
                {r.estado !== 'ocupado' && (
                  <button
                    onClick={() =>
                      ejecutar(
                        () => cambiarMantenimiento(modulo, r, r.estado !== 'mantenimiento'),
                        `Estado de ${modulo.recurso.toLowerCase()} ${nombreRecurso(r.id)} actualizado.`,
                      )
                    }
                  >
                    {r.estado === 'mantenimiento' ? 'Marcar disponible' : 'A mantenimiento'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Paginador paginacion={paginacion} />
    </section>
  );
}

/**
 * "Programada" y, si el recurso está libre ahora, cuánto tiempo lo seguirá hoy: hasta su
 * próxima reserva o hasta el cierre (las horas libres no se suman de un día a otro;
 * config/horario.ts). Si está en uso, cuándo es esa próxima reserva.
 */
function ProximaReserva({ reserva, libre, ahora }: { reserva?: Registro; libre: boolean; ahora: Date }) {
  if (!reserva) return null;
  const inicio = new Date(reserva.inicio);
  const dia = diaDe(reserva.inicio);
  const esHoy = dia === diaDe(ahora);
  const cuando = `${esHoy ? 'hoy' : `el ${formatearDia(dia)}`} a las ${formatearHora(reserva.inicio)}`;
  const libreHoy = minutosLibresHoy(ahora, inicio);
  let texto;
  if (!libre) {
    texto = <>Próxima reserva {cuando} ({reserva.nombre}){esHoy ? <>, en {formatearDuracion(minutosLibresHoy(ahora, inicio) ?? 0)}</> : null}.</>;
  } else if (libreHoy === null) {
    texto = <>Biblioteca cerrada. Próxima reserva {cuando} ({reserva.nombre}).</>;
  } else if (esHoy) {
    texto = <>Libre por <strong>{formatearDuracion(libreHoy)}</strong>, hasta su reserva {cuando} ({reserva.nombre}).</>;
  } else {
    texto = <>Libre por <strong>{formatearDuracion(libreHoy)}</strong> hoy, hasta el cierre ({formatearHora(cierreDeHoy(ahora))}). Próxima reserva {cuando} ({reserva.nombre}).</>;
  }
  return (
    <>
      {' '}<EstadoBadge estado="programado" />
      <div className="secundario">{texto}</div>
    </>
  );
}
