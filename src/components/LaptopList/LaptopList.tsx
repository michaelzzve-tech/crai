import { cambiarMantenimiento } from '../../services/prestamoService';
import type { Laptop } from '../../types';
import { EstadoBadge } from '../EstadoBadge';
import type { EjecutarAccion } from '../tipos';

interface Props {
  laptops: Laptop[];
  ejecutar: EjecutarAccion;
}

/** Las laptops de la biblioteca (del 1 al 25) con su estado. */
export function LaptopList({ laptops, ejecutar }: Props) {
  return (
    <section className="panel">
      <h2>Laptops ({laptops.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Laptop</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {laptops.map((l) => (
            <tr key={l.id}>
              <td><strong>{l.numero}</strong></td>
              <td><EstadoBadge estado={l.estado} /></td>
              <td className="acciones">
                {l.estado !== 'prestada' && (
                  <button
                    onClick={() =>
                      ejecutar(
                        () => cambiarMantenimiento(l, l.estado !== 'mantenimiento'),
                        `Estado de la laptop ${l.numero} actualizado.`,
                      )
                    }
                  >
                    {l.estado === 'mantenimiento' ? 'Marcar disponible' : 'A mantenimiento'}
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
