import { useState } from 'react';
import type { Laptop, Prestamo } from '../../types';
import { formatearFecha, formatearHora } from '../../utils/fechas';
import { EstadoBadge } from '../EstadoBadge';

interface Props {
  prestamos: Prestamo[];
  laptops: Laptop[];
}

export function Historial({ prestamos, laptops }: Props) {
  const [filtro, setFiltro] = useState('');
  const numeroDe = (id: string) => String(laptops.find((l) => l.id === id)?.numero ?? id);

  const texto = filtro.toLowerCase();
  const visibles = prestamos.filter((p) =>
    [numeroDe(p.laptopId), p.nombre, p.instituto, p.condicion, p.carrera, p.motivo].some((v) =>
      v.toLowerCase().includes(texto),
    ),
  );

  return (
    <section className="panel">
      <div className="panel-encabezado">
        <h2>Historial de préstamos ({prestamos.length})</h2>
        <input
          className="buscador"
          placeholder="Buscar por nombre, laptop, instituto, carrera…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>
      {visibles.length === 0 ? (
        <p className="vacio">No hay préstamos que mostrar.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Laptop</th>
              <th>Nombre</th>
              <th>Instituto</th>
              <th>Condición</th>
              <th>Carrera o año</th>
              <th>Motivo</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Devuelta</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => {
              const tarde = p.fechaDevolucion && p.fechaDevolucion > p.fechaLimite;
              return (
                <tr key={p.id}>
                  <td><strong>{numeroDe(p.laptopId)}</strong></td>
                  <td>{p.nombre}</td>
                  <td>{p.instituto}</td>
                  <td>{p.condicion}</td>
                  <td>{p.carrera}</td>
                  <td>{p.motivo}</td>
                  <td>{formatearFecha(p.fechaPrestamo)}</td>
                  <td>{formatearHora(p.fechaLimite)}</td>
                  <td>
                    {p.fechaDevolucion ? (
                      <>
                        {formatearHora(p.fechaDevolucion)}
                        {tarde && <div className="secundario texto-alerta">Con retraso</div>}
                      </>
                    ) : (
                      <EstadoBadge estado="prestada" />
                    )}
                  </td>
                  <td>{p.observacionesDevolucion}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
