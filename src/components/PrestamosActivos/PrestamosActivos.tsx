import { useState } from 'react';
import { devolverLaptop, estaVencido } from '../../services/prestamoService';
import type { Laptop, Prestamo } from '../../types';
import { duracionEntreFechas, formatearHora } from '../../utils/fechas';
import { EstadoBadge } from '../EstadoBadge';
import type { EjecutarAccion } from '../tipos';

interface Props {
  prestamos: Prestamo[];
  laptops: Laptop[];
  ejecutar: EjecutarAccion;
}

export function PrestamosActivos({ prestamos, laptops, ejecutar }: Props) {
  const [devolviendo, setDevolviendo] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');

  const activos = prestamos.filter((p) => !p.fechaDevolucion);
  const numeroDe = (id: string) => laptops.find((l) => l.id === id)?.numero ?? id;

  async function confirmarDevolucion(p: Prestamo) {
    const ok = await ejecutar(
      () => devolverLaptop(p, observaciones),
      `Laptop ${numeroDe(p.laptopId)} devuelta.`,
    );
    if (ok) {
      setDevolviendo(null);
      setObservaciones('');
    }
  }

  return (
    <section className="panel">
      <h2>Préstamos activos ({activos.length})</h2>
      {activos.length === 0 ? (
        <p className="vacio">No hay préstamos activos.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Laptop</th>
              <th>Nombre</th>
              <th>Carrera o año</th>
              <th>Motivo</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Duración</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {activos.map((p) => {
              const vencido = estaVencido(p);
              return (
                <tr key={p.id} className={vencido ? 'fila-vencida' : undefined}>
                  <td><strong>{numeroDe(p.laptopId)}</strong></td>
                  <td>
                    {p.nombre}
                    <div className="secundario">{p.instituto} · {p.condicion}</div>
                  </td>
                  <td>{p.carrera}</td>
                  <td>{p.motivo}</td>
                  <td>{formatearHora(p.fechaPrestamo)}</td>
                  <td>{formatearHora(p.fechaLimite)}</td>
                  <td>{duracionEntreFechas(p.fechaPrestamo, p.fechaLimite)}</td>
                  <td><EstadoBadge estado={vencido ? 'vencido' : 'activo'} /></td>
                  <td className="acciones">
                    {devolviendo === p.id ? (
                      <div className="devolucion">
                        <input
                          autoFocus
                          placeholder="Observaciones (daños, faltantes…)"
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                        />
                        <button className="primario" onClick={() => confirmarDevolucion(p)}>Confirmar</button>
                        <button onClick={() => setDevolviendo(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <button className="primario" onClick={() => { setDevolviendo(p.id); setObservaciones(''); }}>
                        Registrar devolución
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
