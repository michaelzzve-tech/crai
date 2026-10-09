import { useState } from 'react';
import type { Laptop, Prestamo } from '../../types';
import { formatearFecha } from '../../utils/fechas';
import { EstadoBadge } from '../EstadoBadge';

interface Props {
  prestamos: Prestamo[];
  laptops: Laptop[];
}

export function Historial({ prestamos, laptops }: Props) {
  const [filtro, setFiltro] = useState('');
  const codigoDe = (id: string) => laptops.find((l) => l.id === id)?.codigo ?? '(eliminada)';

  const texto = filtro.toLowerCase();
  const visibles = prestamos.filter((p) =>
    [codigoDe(p.laptopId), p.estudianteNombre, p.estudianteCarnet].some((v) =>
      v.toLowerCase().includes(texto),
    ),
  );

  return (
    <section className="panel">
      <div className="panel-encabezado">
        <h2>Historial de préstamos ({prestamos.length})</h2>
        <input
          className="buscador"
          placeholder="Buscar por laptop, estudiante o carnet"
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
              <th>Estudiante</th>
              <th>Entregó</th>
              <th>Prestada</th>
              <th>Límite</th>
              <th>Devuelta</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => {
              const tarde = p.fechaDevolucion && p.fechaDevolucion > p.fechaLimite;
              return (
                <tr key={p.id}>
                  <td><strong>{codigoDe(p.laptopId)}</strong></td>
                  <td>
                    {p.estudianteNombre}
                    <div className="secundario">{p.estudianteCarnet}{p.estudianteCorreo && ` · ${p.estudianteCorreo}`}</div>
                  </td>
                  <td>{p.encargado}</td>
                  <td>{formatearFecha(p.fechaPrestamo)}</td>
                  <td>{formatearFecha(p.fechaLimite)}</td>
                  <td>
                    {p.fechaDevolucion ? (
                      <>
                        {formatearFecha(p.fechaDevolucion)}
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
