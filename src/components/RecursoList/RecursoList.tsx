import { nombreRecurso, type Modulo } from '../../config/modulos';
import { useAhora } from '../../hooks/useAhora';
import { cambiarMantenimiento } from '../../services/registroService';
import type { Recurso, Registro } from '../../types';
import { diaDe, formatearDia, formatearDuracion, formatearHora } from '../../utils/fechas';
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

/** "45 min", "3 h 20 min" o, desde un día, "2 días 4 h". */
function tiempo(minutos: number): string {
  const dias = Math.floor(minutos / 1440);
  if (dias === 0) return formatearDuracion(minutos);
  const horas = Math.floor((minutos % 1440) / 60);
  return `${dias} ${dias === 1 ? 'día' : 'días'}${horas ? ` ${horas} h` : ''}`;
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
 * "Programada" y, si el recurso está libre ahora, cuánto tiempo lo seguirá hasta que empiece
 * su próxima reserva; si está en uso, cuándo es esa próxima reserva.
 */
function ProximaReserva({ reserva, libre, ahora }: { reserva?: Registro; libre: boolean; ahora: Date }) {
  if (!reserva) return null;
  const minutos = Math.floor((new Date(reserva.inicio).getTime() - ahora.getTime()) / 60000);
  const dia = diaDe(reserva.inicio);
  const cuando = `${dia === diaDe(ahora) ? 'hoy' : `el ${formatearDia(dia)}`} a las ${formatearHora(reserva.inicio)}`;
  return (
    <>
      {' '}<EstadoBadge estado="programado" />
      <div className="secundario">
        {libre
          ? <>Libre por <strong>{tiempo(minutos)}</strong>, hasta su reserva {cuando} ({reserva.nombre}).</>
          : <>Próxima reserva {cuando} ({reserva.nombre}), en {tiempo(minutos)}.</>}
      </div>
    </>
  );
}
