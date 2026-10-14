import { nombreRecurso, type Modulo } from '../../config/modulos';
import { cambiarMantenimiento } from '../../services/registroService';
import type { Recurso } from '../../types';
import { EstadoBadge } from '../EstadoBadge';
import { usePaginacion } from '../../hooks/usePaginacion';
import { Paginador } from '../Paginador';
import type { EjecutarAccion } from '../tipos';

interface Props {
  modulo: Modulo;
  recursos: Recurso[];
  ejecutar: EjecutarAccion;
}

/** Los recursos del módulo (laptops 1–25 y 59–80, cubículos 1–6 y Podcast…) con su estado. */
export function RecursoList({ modulo, recursos, ejecutar }: Props) {
  const paginacion = usePaginacion(recursos);
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
              <td><EstadoBadge estado={r.estado} textoOcupado={modulo.ocupado} /></td>
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
