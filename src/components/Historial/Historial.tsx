import { useState } from 'react';
import { nombreRecurso, type Modulo } from '../../config/modulos';
import type { Registro } from '../../types';
import { diferenciaConPrevisto, duracionEntreFechas, formatearDia, formatearFecha, formatearHora } from '../../utils/fechas';
import { EstadoBadge } from '../EstadoBadge';
import { usePaginacion } from '../../hooks/usePaginacion';
import { Paginador } from '../Paginador';

interface Props {
  modulo: Modulo;
  registros: Registro[];
}

export function Historial({ modulo, registros }: Props) {
  const [filtro, setFiltro] = useState('');
  const conFin = modulo.conHoraFin;

  const texto = filtro.toLowerCase();
  const visibles = registros.filter((r) =>
    [nombreRecurso(r.recursoId), r.nombre, r.genero ?? '', r.instituto, r.condicion, r.carrera, r.semestre ?? '', r.motivo].some((v) =>
      v.toLowerCase().includes(texto),
    ),
  );
  const paginacion = usePaginacion(visibles);

  return (
    <section className="panel">
      <div className="panel-encabezado">
        <h2>Historial de {modulo.registros.toLowerCase()} ({registros.length})</h2>
        <input
          className="buscador"
          placeholder={`Buscar por nombre, ${modulo.recurso.toLowerCase()}, instituto, carrera…`}
          value={filtro}
          onChange={(e) => { setFiltro(e.target.value); paginacion.irA(0); }}
        />
      </div>
      {visibles.length === 0 ? (
        <p className="vacio">No hay {modulo.registros.toLowerCase()} que mostrar.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{modulo.recurso}</th>
              <th>Nombre</th>
              <th>Género</th>
              <th>Instituto</th>
              <th>Condición</th>
              <th>Carrera o año</th>
              <th>Semestre, nivel o sección</th>
              {modulo.conUsuarios && <th>Usuarios</th>}
              <th>Motivo</th>
              {modulo.conFechaRegistro && <th>Fecha de registro</th>}
              <th>Inicio</th>
              {conFin && (
                <>
                  <th>Fin</th>
                  <th>Duración</th>
                </>
              )}
              <th>{modulo.finalizado}</th>
              <th>{conFin ? 'Tiempo real' : 'Tiempo transcurrido'}</th>
            </tr>
          </thead>
          <tbody>
            {paginacion.items.map((r) => {
              const tarde = r.finReal && r.fin && r.finReal > r.fin;
              return (
                <tr key={r.id}>
                  <td><strong>{nombreRecurso(r.recursoId)}</strong></td>
                  <td>{r.nombre}</td>
                  <td>{r.genero ?? '—'}</td>
                  <td>{r.instituto}</td>
                  <td>{r.condicion}</td>
                  <td>{r.carrera}</td>
                  <td>{r.semestre ?? '—'}</td>
                  {modulo.conUsuarios && <td>{r.usuarios ?? '—'}</td>}
                  <td>{r.motivo}</td>
                  {modulo.conFechaRegistro && <td>{r.fechaRegistro ? formatearDia(r.fechaRegistro) : '—'}</td>}
                  <td>{formatearFecha(r.inicio)}</td>
                  {conFin && (
                    <>
                      <td>{formatearHora(r.fin)}</td>
                      <td>{r.fin ? duracionEntreFechas(r.inicio, r.fin) : '—'}</td>
                    </>
                  )}
                  <td>
                    {r.finReal ? (
                      <>
                        {formatearHora(r.finReal)}
                        {r.fin && <div className={tarde ? 'secundario texto-alerta' : 'secundario'}>{diferenciaConPrevisto(r.fin, r.finReal)}</div>}
                      </>
                    ) : (
                      <EstadoBadge estado="ocupado" textoOcupado={modulo.ocupado} />
                    )}
                  </td>
                  <td>{r.finReal ? duracionEntreFechas(r.inicio, r.finReal) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Paginador paginacion={paginacion} />
    </section>
  );
}
