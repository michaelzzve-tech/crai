import { useState } from 'react';
import { nombreRecurso, type Modulo } from '../../config/modulos';
import { cancelarProgramado, editarHorario, estaPorVencer, estaProgramado, estaVencido, finalizar, type NuevoHorario } from '../../services/registroService';
import type { Registro } from '../../types';
import { useAhora } from '../../hooks/useAhora';
import { usePaginacion } from '../../hooks/usePaginacion';
import { diaDe, duracionEntreFechas, duracionEntreHoras, formatearDia, formatearHora, horaActual } from '../../utils/fechas';
import { EstadoBadge } from '../EstadoBadge';
import { Paginador } from '../Paginador';
import type { EjecutarAccion } from '../tipos';

interface Props {
  modulo: Modulo;
  registros: Registro[];
  ejecutar: EjecutarAccion;
}

function IconoLapiz() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/** Campos para cambiar la fecha y el horario de una reserva, con Guardar y Cancelar. */
function EditorHorario({ registro, onGuardar, onCancelar }: {
  registro: Registro;
  onGuardar: (horario: NuevoHorario) => void;
  onCancelar: () => void;
}) {
  const [horario, setHorario] = useState<NuevoHorario>({
    fecha: diaDe(registro.inicio),
    horaInicio: horaActual(new Date(registro.inicio)),
    horaFin: registro.fin ? horaActual(new Date(registro.fin)) : '',
  });
  const cambiar = (campo: keyof NuevoHorario) => (e: { target: { value: string } }) =>
    setHorario({ ...horario, [campo]: e.target.value });
  // No se puede mover a un día pasado, salvo dejarla en el día que ya tenía.
  const minimo = [diaDe(), diaDe(registro.inicio)].sort()[0];
  return (
    <form className="editor-horario" onSubmit={(e) => { e.preventDefault(); onGuardar(horario); }}>
      <label>
        Fecha
        <input type="date" required min={minimo} value={horario.fecha} onChange={cambiar('fecha')} aria-label="Fecha de la reserva" />
      </label>
      <label>
        Inicio
        <input type="time" required value={horario.horaInicio} onChange={cambiar('horaInicio')} aria-label="Hora de inicio" />
      </label>
      <label>
        Fin
        <input type="time" required value={horario.horaFin} onChange={cambiar('horaFin')} aria-label="Hora de fin" />
      </label>
      <span className="secundario">{duracionEntreHoras(horario.horaInicio, horario.horaFin) || 'La hora de fin debe ser posterior a la de inicio'}</span>
      <div className="botones-editor">
        <button type="submit" className="primario">Guardar</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

/** Préstamos o reservas en curso, con el botón para devolver o liberar. */
export function RegistrosActivos({ modulo, registros, ejecutar }: Props) {
  const [finalizando, setFinalizando] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const ahora = useAhora(15_000);
  const conFin = modulo.conHoraFin;

  const activos = registros.filter((r) => !r.finReal);
  const paginacion = usePaginacion(activos);

  async function confirmar(registro: Registro) {
    const ok = estaProgramado(registro)
      ? await ejecutar(() => cancelarProgramado(modulo, registro), `Reserva de ${modulo.recurso.toLowerCase()} ${nombreRecurso(registro.recursoId)} cancelada.`)
      : await ejecutar(() => finalizar(modulo, registro), modulo.mensajeFinalizado(nombreRecurso(registro.recursoId)));
    if (ok) setFinalizando(null);
  }

  async function guardarHorario(registro: Registro, horario: NuevoHorario) {
    const ok = await ejecutar(
      () => editarHorario(modulo, registro, horario),
      `Reserva de ${modulo.recurso.toLowerCase()} ${nombreRecurso(registro.recursoId)} actualizada.`,
    );
    if (ok) setEditando(null);
  }

  /** Hora de inicio; si es otro día, también la fecha ("14/10/2026 · 2:00 p. m."). */
  const inicioTexto = (iso: string) =>
    diaDe(iso) === diaDe(ahora) ? formatearHora(iso) : `${formatearDia(diaDe(iso))} · ${formatearHora(iso)}`;

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
              const programado = estaProgramado(r, ahora);
              return (
                <tr key={r.id} className={vencido ? 'fila-vencida' : porVencer ? 'fila-por-vencer' : undefined}>
                  <td><strong>{nombreRecurso(r.recursoId)}</strong></td>
                  <td>
                    {r.nombre}
                    <div className="secundario">
                      {[r.genero, r.instituto, r.condicion, r.usuarios && `${r.usuarios} ${r.usuarios === 1 ? 'usuario' : 'usuarios'}`].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td>
                    {r.carrera}
                    {r.semestre && <div className="secundario">Semestre o nivel: {r.semestre}</div>}
                  </td>
                  <td>{r.motivo}</td>
                  <td>{inicioTexto(r.inicio)}</td>
                  {conFin && r.fin ? (
                    <>
                      <td>{formatearHora(r.fin)}</td>
                      <td>{duracionEntreFechas(r.inicio, r.fin)}</td>
                      <td><EstadoBadge estado={programado ? 'programado' : vencido ? 'vencido' : porVencer ? 'por-vencer' : 'activo'} /></td>
                    </>
                  ) : (
                    <td>{programado ? <EstadoBadge estado="programado" /> : duracionEntreFechas(r.inicio, ahora)}</td>
                  )}
                  <td className="acciones">
                    {editando === r.id ? (
                      <EditorHorario registro={r} onGuardar={(h) => guardarHorario(r, h)} onCancelar={() => setEditando(null)} />
                    ) : finalizando === r.id ? (
                      <div className="devolucion">
                        {!conFin && !programado && (
                          <span className="secundario">
                            Hora de devolución: <strong>{formatearHora(ahora.toISOString())}</strong>
                            {' · '}Tiempo transcurrido: <strong>{duracionEntreFechas(r.inicio, ahora)}</strong>
                          </span>
                        )}
                        {programado && <span className="secundario">¿Cancelar esta reserva? Se borrará.</span>}
                        <button className="primario" autoFocus onClick={() => confirmar(r)}>{programado ? 'Sí, cancelar' : 'Confirmar'}</button>
                        <button onClick={() => setFinalizando(null)}>{programado ? 'No' : 'Cancelar'}</button>
                      </div>
                    ) : (
                      <>
                        {/* Solo las reservas con hora de fin (cubículos) cambian de fecha y horario. */}
                        {conFin && (
                          <button
                            className="boton-icono"
                            aria-label="Editar fecha y horario"
                            title="Editar fecha y horario"
                            onClick={() => { setFinalizando(null); setEditando(r.id); }}
                          >
                            <IconoLapiz />
                          </button>
                        )}
                        <button className={programado ? undefined : 'primario'} onClick={() => { setEditando(null); setFinalizando(r.id); }}>
                          {programado ? 'Cancelar reserva' : modulo.finalizar}
                        </button>
                      </>
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
