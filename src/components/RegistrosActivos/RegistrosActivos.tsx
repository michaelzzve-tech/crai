import { useState } from 'react';
import type { Modulo } from '../../config/modulos';
import { estaPorVencer, estaVencido, finalizar } from '../../services/registroService';
import type { Registro } from '../../types';
import { useAhora } from '../../hooks/useAhora';
import { usePaginacion } from '../../hooks/usePaginacion';
import { duracionEntreFechas, formatearHora } from '../../utils/fechas';
import { EstadoBadge } from '../EstadoBadge';
import { Paginador } from '../Paginador';
import type { EjecutarAccion } from '../tipos';

interface Props {
  modulo: Modulo;
  registros: Registro[];
  ejecutar: EjecutarAccion;
}

/** Préstamos o reservas en curso, con el botón para devolver o liberar. */
export function RegistrosActivos({ modulo, registros, ejecutar }: Props) {
  const [finalizando, setFinalizando] = useState<string | null>(null);
  const ahora = useAhora(15_000);
  const conFin = modulo.conHoraFin;

  const activos = registros.filter((r) => !r.finReal);
  const paginacion = usePaginacion(activos);

  async function confirmar(registro: Registro) {
    const ok = await ejecutar(
      () => finalizar(modulo, registro),
      modulo.mensajeFinalizado(registro.recursoId),
    );
    if (ok) setFinalizando(null);
  }

  return (
    <section className="panel">
      <h2>{modulo.activos} ({activos.length})</h2>
      {activos.length === 0 ? (
        <p className="vacio">No hay {modulo.activos.toLowerCase()}.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{modulo.recurso}</th>
              <th>Nombre</th>
              <th>Carrera o año</th>
              <th>Motivo</th>
              <th>Inicio</th>
              {conFin ? (
                <>
                  <th>Fin</th>
                  <th>Duración</th>
                  <th>Estado</th>
                </>
              ) : (
                <th>Tiempo transcurrido</th>
              )}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginacion.items.map((r) => {
              const vencido = estaVencido(r, ahora);
              const porVencer = estaPorVencer(r, ahora);
              return (
                <tr key={r.id} className={vencido ? 'fila-vencida' : porVencer ? 'fila-por-vencer' : undefined}>
                  <td><strong>{r.recursoId}</strong></td>
                  <td>
                    {r.nombre}
                    <div className="secundario">{[r.genero, r.instituto, r.condicion].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td>{r.carrera}</td>
                  <td>{r.motivo}</td>
                  <td>{formatearHora(r.inicio)}</td>
                  {conFin && r.fin ? (
                    <>
                      <td>{formatearHora(r.fin)}</td>
                      <td>{duracionEntreFechas(r.inicio, r.fin)}</td>
                      <td><EstadoBadge estado={vencido ? 'vencido' : porVencer ? 'por-vencer' : 'activo'} /></td>
                    </>
                  ) : (
                    <td>{duracionEntreFechas(r.inicio, ahora)}</td>
                  )}
                  <td className="acciones">
                    {finalizando === r.id ? (
                      <div className="devolucion">
                        {!conFin && (
                          <span className="secundario">
                            Hora de devolución: <strong>{formatearHora(ahora.toISOString())}</strong>
                            {' · '}Tiempo transcurrido: <strong>{duracionEntreFechas(r.inicio, ahora)}</strong>
                          </span>
                        )}
                        <button className="primario" autoFocus onClick={() => confirmar(r)}>Confirmar</button>
                        <button onClick={() => setFinalizando(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <button className="primario" onClick={() => setFinalizando(r.id)}>
                        {modulo.finalizar}
                      </button>
                    )}
                  </td>
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
