import { useState } from 'react';
import { cambiarMantenimiento, eliminarLaptop } from '../../services/prestamoService';
import type { Laptop } from '../../types';
import { EstadoBadge } from '../EstadoBadge';
import type { EjecutarAccion } from '../tipos';

interface Props {
  laptops: Laptop[];
  ejecutar: EjecutarAccion;
}

export function LaptopList({ laptops, ejecutar }: Props) {
  const [filtro, setFiltro] = useState('');
  const texto = filtro.toLowerCase();
  const visibles = laptops.filter((l) =>
    [l.codigo, l.marca, l.modelo, l.numeroSerie].some((v) => v.toLowerCase().includes(texto)),
  );

  function eliminar(laptop: Laptop) {
    if (!confirm(`¿Eliminar la laptop ${laptop.codigo}?`)) return;
    void ejecutar(() => eliminarLaptop(laptop), `Laptop ${laptop.codigo} eliminada.`);
  }

  return (
    <section className="panel">
      <div className="panel-encabezado">
        <h2>Inventario ({laptops.length})</h2>
        <input
          className="buscador"
          placeholder="Buscar por código, marca, modelo o serie"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>
      {visibles.length === 0 ? (
        <p className="vacio">No hay laptops que mostrar.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Marca / modelo</th>
              <th>Serie</th>
              <th>Estado</th>
              <th>Notas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.codigo}</strong></td>
                <td>{l.marca} {l.modelo}</td>
                <td>{l.numeroSerie}</td>
                <td><EstadoBadge estado={l.estado} /></td>
                <td>{l.notas}</td>
                <td className="acciones">
                  {l.estado !== 'prestada' && (
                    <>
                      <button
                        onClick={() =>
                          ejecutar(
                            () => cambiarMantenimiento(l, l.estado !== 'mantenimiento'),
                            `Estado de ${l.codigo} actualizado.`,
                          )
                        }
                      >
                        {l.estado === 'mantenimiento' ? 'Marcar disponible' : 'A mantenimiento'}
                      </button>
                      <button className="peligro" onClick={() => eliminar(l)}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
