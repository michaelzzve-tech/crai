import { useCallback, useEffect, useRef, useState } from 'react';
import { HORA_APERTURA, HORA_CIERRE, SALAS, salaPorId, TABLA_MANTENIMIENTO_SALAS, TABLA_RESERVAS_SALAS, type Sala } from '../../config/salas';
import { listarMantenimientosSalas, mantenimientoQueChoca, programarMantenimiento, terminarMantenimiento, textoMantenimiento, type NuevoMantenimiento } from '../../services/mantenimientoSalas';
import { nombresDeDias, type Recurrencia } from '../../services/recurrencia';
import { cancelarReservaSala, cancelarSerieDesde, guardarReservaSala, guardarSerieSala, listarReservasSalas, moverReservaSala, registrarSalidaSala } from '../../services/salaService';
import { finDeSala, type MantenimientoSala, type NuevaReservaSala, type ReservaSala } from '../../types';
import { diaALas, diaDe, formatearDia, sumarDias, formatearDiaLargo, formatearFecha, formatearHora, horaActual } from '../../utils/fechas';
import { useAhora } from '../../hooks/useAhora';
import { useCambiosEnVivo } from '../../hooks/useCambiosEnVivo';
import { useMostrarDiaElegido } from '../../hooks/useMostrarDiaElegido';
import { useVistaPlanner } from '../../hooks/useVistaPlanner';
import { usePaginacion } from '../../hooks/usePaginacion';
import { useOrden, type CampoOrden } from '../../hooks/useOrden';
import { POR_PAGINA_ACTIVIDAD } from '../../utils/orden';
import { BuscadorNombre } from '../BuscadorNombre';
import { coincideNombre } from '../../utils/texto';
import { OrdenLista } from '../OrdenLista';
import { PestanasReservas, type GrupoReservas } from '../PestanasReservas';
import { Paginador } from '../Paginador';
import { BarraSemana, FiltrosPlanner, PlannerSemanal, type EventoPlanner } from '../Planner';
import { estadoDeSalas } from '../../services/estadoSalas';
import { EspaciosSalas, ResumenSalas } from './EspaciosSalas';
import { FormularioMantenimiento } from './FormularioMantenimiento';
import { FormularioSala, type InicioFormulario } from './FormularioSala';

/**
 * Módulo Salas especiales, con dos pestañas como cubículos: Reservas (calendario tipo
 * planificador y reservas activas) y Espacios (estado de cada sala).
 */
export function Salas({ pestana = 'reservas' }: { pestana?: 'reservas' | 'espacios' }) {
  const [reservas, setReservas] = useState<ReservaSala[]>([]);
  const [mantenimientos, setMantenimientos] = useState<MantenimientoSala[]>([]);
  const [salaAMantenimiento, setSalaAMantenimiento] = useState<Sala | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const { elegido, desde, hasta, cantidad, elegir, tramo, textoPeriodo } = useVistaPlanner(); // Al abrir, solo el día en curso
  const [ocultas, setOcultas] = useState<string[]>([]); // Salas que no se muestran en el calendario
  const [formulario, setFormulario] = useState<InicioFormulario | null>(null);
  const [detalle, setDetalle] = useState<ReservaSala | null>(null);
  const contenedor = useMostrarDiaElegido(elegido);
  const ahora = useAhora(30_000); // Para "EN USO" y el estado de cada sala
  const estados = estadoDeSalas(reservas, ahora, mantenimientos);

  const recargar = useCallback(async () => {
    try {
      setMantenimientos(await listarMantenimientosSalas());
      setReservas(await listarReservasSalas());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  // Lo que se reserva o cambia en otra cuenta aparece aquí al momento.
  useCambiosEnVivo([TABLA_RESERVAS_SALAS, TABLA_MANTENIMIENTO_SALAS], recargar);
  useEffect(() => {
    let vigente = true;
    listarReservasSalas()
      .then((r) => { if (vigente) setReservas(r); })
      .catch((e: unknown) => { if (vigente) setError(e instanceof Error ? e.message : String(e)); });
    void listarMantenimientosSalas().then((m) => { if (vigente) setMantenimientos(m); });
    return () => { vigente = false; };
  }, []);

  const aLaVista = reservas.filter((r) => {
    const dia = diaDe(r.inicio);
    return dia >= desde && dia <= hasta;
  });
  const visibles = aLaVista.filter((r) => !ocultas.includes(r.salaId));

  /**
   * Cada mantenimiento como una ficha más del calendario, en cada día a la vista que cubre
   * (sin fecha de fin, hasta el final de cada día). No se puede arrastrar.
   */
  const fichasMantenimiento: EventoPlanner[] = [];
  for (const m of mantenimientos) {
    if (ocultas.includes(m.salaId)) continue;
    const sala = salaPorId(m.salaId);
    for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
      const abre = diaALas(dia, `${String(HORA_APERTURA).padStart(2, '0')}:00`);
      const cierra = diaALas(dia, `${String(HORA_CIERRE).padStart(2, '0')}:00`);
      const inicio = new Date(Math.max(abre.getTime(), new Date(m.inicio).getTime()));
      const fin = new Date(Math.min(cierra.getTime(), m.fin ? new Date(m.fin).getTime() : Infinity));
      if (fin <= inicio) continue;
      fichasMantenimiento.push({
        id: `mantenimiento-${m.id}-${dia}`, inicio: inicio.toISOString(), fin: fin.toISOString(),
        color: sala?.color ?? '#7b8794', movible: false, atenuado: fin <= ahora, columna: m.salaId,
        titulo: sala?.nombre.replace('Sala ', '') ?? m.salaId,
        lineas: ['Mantenimiento', ...(m.nota ? [m.nota] : [])],
        datos: [
          ['Sala', sala?.nombre ?? m.salaId],
          ['Mantenimiento', textoMantenimiento(m)],
          ...(m.nota ? [['Motivo', m.nota] as [string, string]] : []),
        ],
        etiqueta: 'EN MANTENIMIENTO', etiquetaAviso: true,
      });
    }
  }

  /** Cada reserva tal como se dibuja: nombre corto de la sala y todos sus datos (menos la fecha de solicitud). */
  const evento = (r: ReservaSala): EventoPlanner => {
    const sala = salaPorId(r.salaId);
    const horario = `${formatearHora(r.inicio)} – ${formatearHora(r.fin)}`;
    const fin = finDeSala(r); // Si se fueron antes, la ficha llega hasta la salida
    return {
      // Ya usada (terminó): más clara y fija, como en cubículos.
      id: r.id, inicio: r.inicio, fin, color: sala?.color ?? '#7b8794',
      movible: !r.finReal && new Date(fin) > ahora, atenuado: new Date(fin) <= ahora, columna: r.salaId,
      titulo: sala?.nombre.replace('Sala ', '') ?? r.salaId,
      lineas: [horario, ...(r.finReal ? [`Salida: ${formatearHora(r.finReal)}`] : []), `${r.actividad} · ${r.usuarios} pers.`, `Solicita: ${r.solicitante}`, `Prof.: ${r.profesor}`,
        `${r.instituto} · ${r.carrera} · ${r.semestre}`],
      datos: [
        ['Sala', sala?.nombre ?? r.salaId],
        ['Fecha', formatearDiaLargo(diaDe(r.inicio))],
        ['Hora', horario],
        ['Institución', r.instituto],
        ['Carrera o año', r.carrera],
        ['Semestre', r.semestre],
        ['Actividad', r.actividad],
        ['Total usuarios', String(r.usuarios)],
        ['Solicitado por', r.solicitante],
        ['Profesor(a)', r.profesor],
        ...(r.serieId ? [['Recurrente', 'Sí'] as [string, string]] : []),
        ...(r.finReal ? [['Salida registrada', formatearHora(r.finReal)] as [string, string]] : []),
      ],
      ...(mantenimientoQueChoca(mantenimientos, r.salaId, new Date(r.inicio), new Date(r.fin))
        ? { etiqueta: 'EN MANTENIMIENTO', etiquetaAviso: true } // La sala está en mantenimiento a esa hora
        : { etiqueta: new Date(r.inicio) <= ahora && new Date(fin) > ahora ? 'EN USO' : undefined }),
    };
  };
  const reservaDe = (e: EventoPlanner) => reservas.find((r) => r.id === e.id);

  /** Nueva reserva: con la sala si solo hay una visible, y en la próxima hora en punto si es hoy. */
  const nueva = (fecha = diaDe(), horaInicio?: string) => {
    const soloUna = SALAS.filter((s) => !ocultas.includes(s.id));
    const proxima = `${String(Math.min(23, Math.max(7, Number(horaActual().slice(0, 2)) + 1))).padStart(2, '0')}:00`;
    setFormulario({ salaId: soloUna.length === 1 ? soloUna[0].id : '', fecha, horaInicio: horaInicio ?? proxima });
  };

  async function guardar(datos: NuevaReservaSala, anterior?: ReservaSala, recurrencia?: Recurrencia) {
    if (recurrencia) {
      const serie = await guardarSerieSala(datos, recurrencia);
      await recargar();
      elegir(diaDe(serie[0].inicio));
      const losDias = nombresDeDias(recurrencia.dias);
      const total = serie.length === 1 ? '1 reserva' : `${serie.length} reservas`;
      setAviso(`Se ${serie.length === 1 ? 'creó' : 'crearon'} ${total} de ${salaPorId(datos.salaId)?.nombre}: los ${losDias}, ${formatearHora(serie[0].inicio)} – ${formatearHora(serie[0].fin)}, del ${formatearDia(diaDe(serie[0].inicio))} al ${formatearDia(diaDe(serie[serie.length - 1].inicio))}`);
      return;
    }
    const r = await guardarReservaSala(datos, anterior);
    await recargar();
    elegir(diaDe(r.inicio)); // Muestra el día de la reserva
    setAviso(`${salaPorId(r.salaId)?.nombre} ${anterior ? 'actualizada' : 'reservada'}: ${formatearDiaLargo(diaDe(r.inicio))}, ${formatearHora(r.inicio)} – ${formatearHora(r.fin)}`);
  }

  async function moverA(r: ReservaSala, dia: string, hora: string) {
    try {
      const movida = await moverReservaSala(r, dia, hora);
      await recargar();
      setAviso(`${salaPorId(r.salaId)?.nombre} movida a ${formatearDiaLargo(diaDe(movida.inicio))}, ${formatearHora(movida.inicio)} – ${formatearHora(movida.fin)}`);
    } catch (e) {
      // No se movió: la reserva se queda donde estaba y se explica por qué.
      await recargar();
      setAviso('');
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /** Guarda la hora real de salida; si falla, el error se muestra dentro de la ventana. */
  async function registrarSalida(r: ReservaSala, hora: string) {
    const actualizada = await registrarSalidaSala(r, hora);
    await recargar();
    setDetalle(null);
    setAviso(`${salaPorId(r.salaId)?.nombre}: salida registrada a las ${formatearHora(actualizada.finReal)}`);
  }

  async function cancelar(r: ReservaSala, siguientes = false) {
    try {
      const cuantas = siguientes ? await cancelarSerieDesde(r) : (await cancelarReservaSala(r), 1);
      await recargar();
      setDetalle(null);
      const nombre = salaPorId(r.salaId)?.nombre ?? r.salaId;
      setAviso(cuantas === 1 ? `Se canceló la reserva de ${nombre}.` : `Se cancelaron ${cuantas} reservas de ${nombre} (desde el ${formatearDia(diaDe(r.inicio))}).`);
    } catch (e) {
      await recargar();
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function mandarAMantenimiento(datos: NuevoMantenimiento) {
    const m = await programarMantenimiento(datos);
    await recargar();
    setSalaAMantenimiento(null);
    // Reservas que ya estaban en ese horario: se avisa para reubicarlas o cancelarlas.
    const afectadas = reservas.filter((r) => r.salaId === m.salaId && new Date(r.fin) > new Date(m.inicio) && (!m.fin || new Date(r.inicio) < new Date(m.fin)));
    const nota = afectadas.length ? ` Atención: ${afectadas.length === 1 ? 'hay 1 reserva' : `hay ${afectadas.length} reservas`} en ese horario; revíselas en la pestaña Reservas.` : '';
    setAviso(`${salaPorId(m.salaId)?.nombre} en mantenimiento ${textoMantenimiento(m)}${m.nota ? ` (${m.nota})` : ''}.${nota}`.replace('m..', 'm.'));
  }

  async function terminar(m: MantenimientoSala) {
    try {
      // Con la misma hora que la pantalla, para que la sala se vea disponible al instante.
      const yaEmpezo = new Date(m.inicio) < ahora;
      await terminarMantenimiento(m, ahora);
      await recargar();
      setAviso(`${salaPorId(m.salaId)?.nombre}: ${yaEmpezo ? 'disponible de nuevo' : 'se canceló el mantenimiento programado'}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main>
      {error && (
        <div className="aviso aviso-error" role="alert">
          {error}
          <button onClick={() => setError('')} aria-label="Cerrar">×</button>
        </div>
      )}
      {aviso && (
        <div className="aviso aviso-exito" role="status">
          {aviso}
          <button onClick={() => setAviso('')} aria-label="Cerrar">×</button>
        </div>
      )}

      <ResumenSalas estados={estados} />

      {pestana === 'espacios' && (
        <EspaciosSalas estados={estados} ahora={ahora} onAbrir={setDetalle} onMantenimiento={setSalaAMantenimiento} onTerminar={(m) => void terminar(m)} />
      )}
      {salaAMantenimiento && (
        <FormularioMantenimiento sala={salaAMantenimiento} onGuardar={mandarAMantenimiento} onCerrar={() => setSalaAMantenimiento(null)} />
      )}
      {pestana === 'reservas' && (
        <>
        <section className="panel salas">
          <BarraSemana titulo="Salas especiales" elegido={elegido} onElegir={elegir} onNueva={() => nueva()} tramo={tramo} />

          {/* Cada sala es un filtro y a la vez la leyenda de colores del calendario. */}
          <FiltrosPlanner
            grupo="Salas que se muestran"
            items={SALAS.map((s) => ({ ...s, detalle: `${s.capacidad} pers. · ${aLaVista.filter((r) => r.salaId === s.id).length} ${textoPeriodo}` }))}
            ocultos={ocultas}
            onOcultos={setOcultas}
          />

          <div className="planner-contenedor" ref={contenedor}>
            <PlannerSemanal
              lunes={desde}
              cantidadDias={cantidad}
              elegido={elegido}
              onElegir={elegir}
              // Una columna por sala, en el orden de SALAS; las ocultas no se muestran.
              columnas={SALAS.filter((s) => !ocultas.includes(s.id)).map((s) => ({
                id: s.id, color: s.color, titulo: s.nombre, tituloCorto: s.nombre.replace('Sala ', ''),
              }))}
              reservas={[...visibles.map(evento), ...fichasMantenimiento]}
              onNueva={(dia, hora) => nueva(dia, hora)}
              onAbrir={(e) => setDetalle(reservaDe(e) ?? null)}
              onMover={(e, dia, hora) => { const r = reservaDe(e); if (r) void moverA(r, dia, hora); }}
            />
          </div>
          <p className="secundario">Haga clic en un espacio libre del calendario para reservar a esa hora, o en una reserva para ver sus datos. Arrastre una reserva para cambiarla de día u hora.</p>
        </section>

        <ReservasActivas reservas={reservas} onAbrir={setDetalle} />
        </>
      )}

      {formulario && <FormularioSala key={JSON.stringify(formulario)} inicio={formulario} onGuardar={guardar} onCerrar={() => setFormulario(null)} />}
      {detalle && (
        <DetalleReserva
          reserva={detalle}
          onCerrar={() => setDetalle(null)}
          onModificar={() => { setFormulario({ reserva: detalle }); setDetalle(null); }}
          onCancelar={(siguientes) => cancelar(detalle, siguientes)}
          onSalida={(hora) => registrarSalida(detalle, hora)}
        />
      )}
    </main>
  );
}

/** Qué dato de una reserva de sala se usa para cada opción de "Ordenar por". */
const CLAVES_SALA: Record<CampoOrden, (r: ReservaSala) => string> = {
  registro: (r) => r.creada,
  fecha: (r) => r.inicio,
  nombre: (r) => r.solicitante,
  carrera: (r) => `${r.carrera} ${r.semestre}`,
};

/**
 * Reservas que todavía no terminan (en curso o por venir), con las últimas en registrarse
 * primero. Un clic en "Ver" abre sus datos para modificarla o cancelarla.
 */
function ReservasActivas({ reservas, onAbrir }: { reservas: ReservaSala[]; onAbrir: (r: ReservaSala) => void }) {
  const ahora = useAhora(60_000);
  const [grupo, setGrupo] = useState<GrupoReservas>('actuales');
  const [buscar, setBuscar] = useState('');
  const activas = reservas.filter((r) => new Date(finDeSala(r)) > ahora);
  const encontradas = activas.filter((r) => coincideNombre(r.solicitante, buscar));
  // Pestañas: las reservas de ahora (en curso) y las programadas a futuro.
  const programadas = encontradas.filter((r) => new Date(r.inicio) > ahora);
  const actuales = encontradas.filter((r) => new Date(r.inicio) <= ahora);
  const lista = grupo === 'programadas' ? programadas : actuales;
  const orden = useOrden(lista, CLAVES_SALA); // Al abrir, lo último registrado primero
  const paginacion = usePaginacion(orden.ordenados, POR_PAGINA_ACTIVIDAD);
  return (
    <section className="panel">
      <div className="panel-encabezado">
        <h2>Reservas activas ({activas.length})</h2>
        <BuscadorNombre valor={buscar} onCambio={(v) => { setBuscar(v); paginacion.irA(0); }} />
        <OrdenLista
          campo={orden.campo}
          sentido={orden.sentido}
          onCampo={(c) => { orden.elegirCampo(c); paginacion.irA(0); }}
          onSentido={(s) => { orden.setSentido(s); paginacion.irA(0); }}
          textoFecha="Fecha de la reserva"
        />
      </div>
      <PestanasReservas
        grupo={grupo}
        onGrupo={(g) => { setGrupo(g); paginacion.irA(0); }}
        actuales={actuales.length}
        programadas={programadas.length}
      />
      {lista.length === 0 ? (
        <p className="vacio">{buscar.trim() ? `Ningún nombre coincide con «${buscar.trim()}».` : grupo === 'programadas' ? 'No hay reservas programadas.' : 'No hay reservas en curso.'}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Sala</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Actividad</th>
              <th>Institución</th>
              <th>Solicitado por</th>
              <th>Registrada</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginacion.items.map((r) => {
              const sala = salaPorId(r.salaId);
              return (
                <tr key={r.id}>
                  <td>
                    <span className="titulo-sala"><span className="punto-sala" style={{ background: sala?.color }} />{sala?.nombre ?? r.salaId}</span>
                  </td>
                  <td>{formatearDia(diaDe(r.inicio))}</td>
                  <td>{formatearHora(r.inicio)} – {formatearHora(r.fin)}</td>
                  <td>{r.actividad}<div className="secundario">{r.usuarios} {r.usuarios === 1 ? 'usuario' : 'usuarios'}</div></td>
                  <td>{r.instituto}<div className="secundario">{[r.carrera, r.semestre].filter(Boolean).join(' · ')}</div></td>
                  <td>{r.solicitante}<div className="secundario">Prof.: {r.profesor}</div></td>
                  <td>{formatearFecha(r.creada)}</td>
                  <td className="acciones"><button onClick={() => onAbrir(r)}>Ver</button></td>
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

/** Ventana con todos los datos de una reserva, para modificarla o cancelarla. */
function DetalleReserva({ reserva: r, onCerrar, onModificar, onCancelar, onSalida }: {
  reserva: ReservaSala;
  onCerrar: () => void;
  onModificar: () => void;
  onSalida: (hora: string) => Promise<void>; // Registra la hora real de salida; lanza un error si no es válida
  onCancelar: (siguientes: boolean) => void; // siguientes: también las próximas fechas de la serie
}) {
  const ventana = useRef<HTMLDialogElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  const ahora = useAhora(30_000);
  // "Registrar salida": para una reserva que ya empezó y aún no tiene salida registrada.
  const puedeSalir = !r.finReal && new Date(r.inicio) < ahora;
  const [salida, setSalida] = useState<string | null>(null); // Hora elegida mientras se registra la salida
  const [errorSalida, setErrorSalida] = useState('');
  const guardarSalida = async () => {
    try {
      await onSalida(salida ?? '');
    } catch (e) {
      setErrorSalida(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    const d = ventana.current;
    if (d && !d.open) d.showModal();
  }, []);
  const sala = salaPorId(r.salaId);
  const filas: [string, string][] = [
    ['Fecha de la reserva', formatearDiaLargo(diaDe(r.inicio))],
    ['Hora', `${formatearHora(r.inicio)} – ${formatearHora(r.fin)}`],
    ['Institución', r.instituto],
    ['Carrera o año', r.carrera],
    ['Semestre', r.semestre],
    ['Actividad', r.actividad],
    ['Total usuarios', sala ? `${r.usuarios} (capacidad de referencia: ${sala.capacidad})` : String(r.usuarios)],
    ['Solicitado por', r.solicitante],
    ['Profesor(a)', r.profesor],
    ['Fecha de solicitud', r.fechaSolicitud ? formatearDia(r.fechaSolicitud) : 'No registrada'],
    ['Registrada', formatearFecha(r.creada)],
    ...(r.finReal ? [['Salida registrada', `${formatearHora(r.finReal)} (antes de las ${formatearHora(r.fin)})`] as [string, string]] : []),
  ];
  if (r.serieId) filas.splice(2, 0, ['Reserva recurrente', 'Sí; al modificarla solo cambia esta fecha']);
  return (
    <dialog ref={ventana} className="ventana" onCancel={onCerrar} aria-labelledby="titulo-detalle-sala">
      <div className="panel-encabezado">
        <h2 id="titulo-detalle-sala" className="titulo-sala">
          <span className="punto-sala" style={{ background: sala?.color }} />
          {sala?.nombre ?? r.salaId}
        </h2>
        <button type="button" className="boton-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      </div>
      <dl className="detalle-sala">
        {filas.map(([t, v]) => (
          <div key={t}><dt>{t}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      {errorSalida && <div className="aviso aviso-error" role="alert">{errorSalida}</div>}
      <div className="botones-formulario">
        {salida !== null ? (
          <>
            <label htmlFor="sala-salida" className="hora-salida">
              Hora de salida
              <input id="sala-salida" type="time" autoFocus value={salida} onChange={(e) => setSalida(e.target.value)} />
            </label>
            <button className="primario" onClick={() => void guardarSalida()}>Guardar salida</button>
            <button onClick={() => { setSalida(null); setErrorSalida(''); }}>Cancelar</button>
          </>
        ) : confirmando ? (
          <>
            <span>¿Cancelar {r.serieId ? 'la reserva' : 'esta reserva'}? No se puede deshacer.</span>
            <button className="peligro" onClick={() => onCancelar(false)}>{r.serieId ? 'Solo esta fecha' : 'Sí, cancelar'}</button>
            {r.serieId && <button className="peligro" onClick={() => onCancelar(true)}>Esta y las siguientes</button>}
            <button onClick={() => setConfirmando(false)}>No</button>
          </>
        ) : (
          <>
            {puedeSalir && (
              // Por defecto, la hora actual (o la de fin, si la reserva ya terminó).
              <button className="primario" onClick={() => setSalida(horaActual(new Date(Math.min(ahora.getTime(), new Date(r.fin).getTime()))))}>
                Registrar salida
              </button>
            )}
            <button className={puedeSalir ? undefined : 'primario'} onClick={onModificar}>Modificar</button>
            <button className="peligro" onClick={() => setConfirmando(true)}>Cancelar reserva</button>
            <button onClick={onCerrar}>Cerrar</button>
          </>
        )}
      </div>
    </dialog>
  );
}
