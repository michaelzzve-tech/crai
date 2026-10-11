import type { Modulo } from '../../config/modulos';
import { cambiarMantenimiento } from '../../services/registroService';
import type { Recurso } from '../../types';
import { EstadoBadge } from '../EstadoBadge';
import type { EjecutarAccion } from '../tipos';

interface Props {
  modulo: Modulo;
  recursos: Recurso[];
  ejecutar: EjecutarAccion;
}

/** Los recursos del módulo (laptops 1–25, cubículos 1–6…) con su estado. */
export function RecursoList({ modulo, recursos, ejecutar }: Props) {
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
          {recursos.map((r) => (
            <tr key={r.id}>
              <td><strong>{r.numero}</strong></td>
              <td><EstadoBadge estado={r.estado} textoOcupado={modulo.ocupado} /></td>
              <td className="acciones">
                {r.estado !== 'ocupado' && (
                  <button
                    onClick={() =>
                      ejecutar(
                        () => cambiarMantenimiento(modulo, r, r.estado !== 'mantenimiento'),
                        `Estado de ${modulo.recurso.toLowerCase()} ${r.numero} actualizado.`,
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
    </section>
  );
}
