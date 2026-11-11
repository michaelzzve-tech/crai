import { useState } from 'react';
import { nombreRecurso, type Modulo } from '../../config/modulos';
import { cancelarReserva, estaPorVencer, estaProgramado, estaVencido, finalizar } from '../../services/registroService';
import type { Recurso, Registro } from '../../types';
import { ModificarReserva } from '../RegistroForm';
import { useAhora } from '../../hooks/useAhora';
import { usePaginacion } from '../../hooks/usePaginacion';
import { useOrden } from '../../hooks/useOrden';
import { CLAVES_REGISTRO, POR_PAGINA_ACTIVIDAD } from '../../utils/orden';
import { OrdenLista } from '../OrdenLista';
import { PestanasReservas, type GrupoReservas } from '../PestanasReservas';
import { diaDe, diferenciaConPrevisto, duracionEntreFechas, formatearDia, formatearHora } from '../../utils/fechas';
import { BuscadorNombre } from '../BuscadorNombre';
import { coincideNombre } from '../../utils/texto';
import { CintilloEnMasa } from '../CintilloEnMasa';
import { EstadoBadge } from '../EstadoBadge';
import { Paginador } from '../Paginador';
import type { EjecutarAccion } from '../tipos';

interface Props {
  modulo: Modulo;
  recursos: Recurso[]; // Para el formulario de "Modificar reserva" o "Modificar préstamo"
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

/** El momento exacto de la confirmación y, si hay hora de fin, cuánto se adelantó o atrasó. */
function momentoDeFin(registro: Registro) {
  const momento = new Date();
  const detalle = registro.fin
    ? ` a las ${formatearHora(momento.toISOString())} (${diferenciaConPrevisto(registro.fin, momento.toISOString())})`
    : '';
  return { momento, detalle };
}

/** Préstamos o reservas en curso, con el botón para devolver o liberar. */
export function RegistrosActivos({ modulo, recursos, registros, ejecutar }: Props) {
  const [finalizando, setFinalizando] = useState<string | null>(null);
  const [editando, setEditando] = useState<Registro | null>(null); // Reserva abierta en "Modificar reserva"
  const [cancelando, setCancelando] = useState<string | null>(null); // Reserva (cubículos) que se va a cancelar y borrar
  const ahora = useAhora(15_000);
  const conFin = modulo.conHoraFin;
  const textoModificar = modulo.conCalendario ? 'Modificar reserva' : 'Modificar préstamo';

  const [grupo, setGrupo] = useState<GrupoReservas>('actuales');
  const [buscar, setBuscar] = useState('');
  const activos = registros.filter((r) => !r.finReal);
  const encontrados = activos.filter((r) => coincideNombre(r.nombre, buscar));
  // Cubículos: pestañas para separar las reservas de ahora de las programadas a futuro.
  const programadas = modulo.conCalendario ? encontrados.filter((r) => estaProgramado(r, ahora)) : [];
  const actuales = modulo.conCalendario ? encontrados.filter((r) => !estaProgramado(r, ahora)) : encontrados;
  const lista = grupo === 'programadas' ? programadas : actuales;
  const orden = useOrden(lista, CLAVES_REGISTRO); // Al abrir, lo último registrado primero
  const paginacion = usePaginacion(orden.ordenados, POR_PAGINA_ACTIVIDAD);

  async function confirmar(registro: Registro) {
    const { momento, detalle } = momentoDeFin(registro);
    const ok = await ejecutar(() => finalizar(modulo, registro, momento), modulo.mensajeFinalizado(nombreRecurso(registro.recursoId)).replace(/\.$/, `${detalle}.`));
    if (ok) setFinalizando(null);
  }

  /** Cancela la reserva (programada o en curso): se borra y no cuenta en las estadísticas. */
  async function cancelar(registro: Registro) {
    const ok = await ejecutar(() => cancelarReserva(modulo, registro), `Reserva de ${modulo.recurso.toLowerCase()} ${nombreRecurso(registro.recursoId)} cancelada y borrada.`);
    if (ok) setCancelando(null);
  }

  /** Hora de inicio; si es otro día, también la fecha ("14/10/2026 · 2:00 p. m."). */
  const inicioTexto = (iso: string) =>
    diaDe(iso) === diaDe(ahora) ? formatearHora(iso) : `${formatearDia(diaDe(iso))} · ${formatearHora(iso)}`;

  return (
    <section className="panel">
      <div className="panel-encabezado">
        <h2>{modulo.activos} ({activos.length})</h2>
        <BuscadorNombre valor={buscar} onCambio={(v) => { setBuscar(v); paginacion.irA(0); }} />
        <OrdenLista
          campo={orden.campo}
          sentido={orden.sentido}
          onCampo={(c) => { orden.elegirCampo(c); paginacion.irA(0); }}
          onSentido={(s) => { orden.setSentido(s); paginacion.irA(0); }}
          textoFecha={modulo.conCalendario ? 'Fecha de la reserva' : 'Fecha del préstamo'}
        />
      </div>
      {modulo.conPrestamoEnMasa && <CintilloEnMasa modulo={modulo} recursos={recursos} registros={registros} ejecutar={ejecutar} />}
      {modulo.conCalendario && (
        <PestanasReservas
          grupo={grupo}
          onGrupo={(g) => { setGrupo(g); paginacion.irA(0); }}
          actuales={actuales.length}
          programadas={programadas.length}
        />
      )}
      {lista.length === 0 ? (
        <p className="vacio">
          {buscar.trim() ? `Ningún nombre coincide con «${buscar.trim()}».` : !modulo.conCalendario ? `No hay ${modulo.activos.toLowerCase()}.` : grupo === 'programadas' ? 'No hay reservas programadas.' : 'No hay reservas en curso.'}
        </p>
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
                    {r.semestre && <div className="secundario">Semestre, nivel o sección: {r.semestre}</div>}
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
                    {cancelando === r.id ? (
                      <div className="devolucion">
                        <span className="secundario">¿Cancelar esta reserva? Se borrará del sistema y no contará en las estadísticas.</span>
                        <button className="peligro" autoFocus onClick={() => cancelar(r)}>Sí, cancelar</button>
                        <button onClick={() => setCancelando(null)}>No</button>
                      </div>
                    ) : finalizando === r.id ? (
                      <div className="devolucion">
                        {!conFin && !programado && (
                          <span className="secundario">
                            Hora de devolución: <strong>{formatearHora(ahora.toISOString())}</strong>
                            {' · '}Tiempo transcurrido: <strong>{duracionEntreFechas(r.inicio, ahora)}</strong>
                          </span>
                        )}
                        {conFin && !programado && r.fin && (
                          <span className="secundario">
                            Hora de salida: <strong>{formatearHora(ahora.toISOString())}</strong>
                            {' · '}{diferenciaConPrevisto(r.fin, ahora.toISOString())}
                          </span>
                        )}
                        <button className="primario" autoFocus onClick={() => confirmar(r)}>Confirmar</button>
                        <button onClick={() => setFinalizando(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <>
                        {/* Abre el formulario con todos los datos de la reserva o del préstamo. */}
                        <button
                          className="boton-icono"
                          aria-label={textoModificar}
                          title={textoModificar}
                          onClick={() => { setFinalizando(null); setCancelando(null); setEditando(r); }}
                        >
                          <IconoLapiz />
                        </button>
                        {/* Cubículos: cancelar en cualquier momento (se borra); las laptops solo se devuelven. */}
                        {modulo.conCalendario && (
                          <button className="peligro" onClick={() => { setEditando(null); setFinalizando(null); setCancelando(r.id); }}>
                            Cancelar reserva
                          </button>
                        )}
                        {!programado && (
                          <button className="primario" onClick={() => { setEditando(null); setCancelando(null); setFinalizando(r.id); }}>
                            {modulo.finalizar}
                          </button>
                        )}
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
      {editando && (
        <ModificarReserva modulo={modulo} recursos={recursos} registro={editando} ejecutar={ejecutar} onCerrar={() => setEditando(null)} />
      )}
    </section>
  );
}
