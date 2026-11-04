import { nombreRecurso, type Modulo } from '../../config/modulos';
import { useAhora } from '../../hooks/useAhora';
import { cambiarMantenimiento } from '../../services/registroService';
import type { Recurso, Registro } from '../../types';
import { EstadoBadge } from '../EstadoBadge';
import { ProximaReserva } from './ProximaReserva';
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
                {(() => { const p = proxima(r.id); return p && <ProximaReserva inicio={p.inicio} nombre={p.nombre} libre={r.estado === 'disponible'} ahora={ahora} />; })()}
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
