import { useCallback, useEffect, useRef, useState } from 'react';
import { SALAS, salaPorId } from '../../config/salas';
import { cancelarReservaSala, cancelarSerieDesde, DIAS_RECURRENCIA, guardarReservaSala, guardarSerieSala, listarReservasSalas, moverReservaSala } from '../../services/salaService';
import type { NuevaReservaSala, ReservaSala } from '../../types';
import { diaDe, formatearDia, formatearDiaLargo, formatearFecha, formatearHora, formatearSemana, horaActual, lunesDe, sumarDias } from '../../utils/fechas';
import { FormularioSala, type InicioFormulario, type Recurrencia } from './FormularioSala';
import { NavegadorFecha } from './NavegadorFecha';
import { PlannerSemanal } from './PlannerSemanal';

/** Módulo Salas especiales: calendario semanal tipo planificador con las reservas de cada sala. */
export function Salas() {
  const [reservas, setReservas] = useState<ReservaSala[]>([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [elegido, setElegido] = useState(() => diaDe()); // Día elegido; se muestra su semana
  const lunes = lunesDe(elegido);
  const [ocultas, setOcultas] = useState<string[]>([]); // Salas que no se muestran en el calendario
  const [formulario, setFormulario] = useState<InicioFormulario | null>(null);
  const [detalle, setDetalle] = useState<ReservaSala | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  // En pantallas angostas el calendario se desliza de lado: se muestra el día elegido.
  useEffect(() => {
    const caja = contenedor.current;
    const dia = caja?.querySelector<HTMLElement>('.planner-dia-titulo.elegido');
    if (!caja) return;
    // 64 px: ancho de la columna de horas, que queda fija a la izquierda.
    caja.scrollLeft = dia ? caja.scrollLeft + dia.getBoundingClientRect().left - caja.getBoundingClientRect().left - 64 : 0;
  }, [elegido]);

  const recargar = useCallback(async () => {
    try {
      setReservas(await listarReservasSalas());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    let vigente = true;
    listarReservasSalas()
      .then((r) => { if (vigente) setReservas(r); })
      .catch((e: unknown) => { if (vigente) setError(e instanceof Error ? e.message : String(e)); });
    return () => { vigente = false; };
  }, []);

  const domingo = sumarDias(lunes, 6);
  const deLaSemana = reservas.filter((r) => {
    const dia = diaDe(r.inicio);
    return dia >= lunes && dia <= domingo;
  });
  const visibles = deLaSemana.filter((r) => !ocultas.includes(r.salaId));

  const alternar = (id: string) =>
    setOcultas(ocultas.includes(id) ? ocultas.filter((x) => x !== id) : [...ocultas, id]);

  /** Nueva reserva: con la sala si solo hay una visible, y en la próxima hora en punto si es hoy. */
  const nueva = (fecha = diaDe(), horaInicio?: string) => {
    const soloUna = SALAS.filter((s) => !ocultas.includes(s.id));
    const proxima = `${String(Math.min(20, Math.max(7, Number(horaActual().slice(0, 2)) + 1))).padStart(2, '0')}:00`;
    setFormulario({ salaId: soloUna.length === 1 ? soloUna[0].id : '', fecha, horaInicio: horaInicio ?? proxima });
  };

  async function guardar(datos: NuevaReservaSala, anterior?: ReservaSala, recurrencia?: Recurrencia) {
    if (recurrencia) {
      const serie = await guardarSerieSala(datos, recurrencia.dias, recurrencia.hasta);
      await recargar();
      setElegido(diaDe(serie[0].inicio));
      const nombres = DIAS_RECURRENCIA.filter((d) => recurrencia.dias.includes(d.numero)).map((d) => d.largo);
      const losDias = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0];
      const total = serie.length === 1 ? '1 reserva' : `${serie.length} reservas`;
      setAviso(`Se ${serie.length === 1 ? 'creó' : 'crearon'} ${total} de ${salaPorId(datos.salaId)?.nombre}: los ${losDias}, ${formatearHora(serie[0].inicio)} – ${formatearHora(serie[0].fin)}, del ${formatearDia(diaDe(serie[0].inicio))} al ${formatearDia(diaDe(serie[serie.length - 1].inicio))}`);
      return;
    }
    const r = await guardarReservaSala(datos, anterior);
    await recargar();
    setElegido(diaDe(r.inicio)); // Muestra el día de la reserva
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

      <section className="panel salas">
        <div className="salas-barra">
          <div className="salas-navegacion">
            <h2>Salas especiales</h2>
            <button onClick={() => setElegido(diaDe())}>Hoy</button>
            <button className="boton-icono" onClick={() => setElegido(sumarDias(elegido, -7))} aria-label="Semana anterior" title="Semana anterior">‹</button>
            <button className="boton-icono" onClick={() => setElegido(sumarDias(elegido, 7))} aria-label="Semana siguiente" title="Semana siguiente">›</button>
            <strong className="salas-semana">{formatearSemana(lunes)}</strong>
            <NavegadorFecha dia={elegido} onCambiar={setElegido} />
          </div>
          <button className="primario" onClick={() => nueva()}>+ Nueva reserva</button>
        </div>

        {/* Cada sala es un filtro y a la vez la leyenda de colores del calendario. */}
        <div className="salas-filtros" role="group" aria-label="Salas que se muestran">
          {SALAS.map((s) => {
            const activa = !ocultas.includes(s.id);
            const cuantas = deLaSemana.filter((r) => r.salaId === s.id).length;
            return (
              <button
                key={s.id}
                className={`filtro-sala${activa ? ' activa' : ''}`}
                aria-pressed={activa}
                onClick={() => alternar(s.id)}
                title={activa ? 'Ocultar del calendario' : 'Mostrar en el calendario'}
              >
                <span className="punto-sala" style={{ background: s.color }} />
                {s.nombre}
                <span className="secundario">{s.capacidad} pers. · {cuantas} esta semana</span>
              </button>
            );
          })}
        </div>

        <div className="planner-contenedor" ref={contenedor}>
          <PlannerSemanal
            lunes={lunes}
            elegido={elegido}
            onElegir={setElegido}
            reservas={visibles}
            onNueva={(dia, hora) => nueva(dia, hora)}
            onAbrir={setDetalle}
            onMover={moverA}
          />
        </div>
        <p className="secundario">Haga clic en un espacio libre del calendario para reservar a esa hora, o en una reserva para ver sus datos. Arrastre una reserva para cambiarla de día u hora.</p>
      </section>

      {formulario && <FormularioSala key={JSON.stringify(formulario)} inicio={formulario} onGuardar={guardar} onCerrar={() => setFormulario(null)} />}
      {detalle && (
        <DetalleReserva
          reserva={detalle}
          onCerrar={() => setDetalle(null)}
          onModificar={() => { setFormulario({ reserva: detalle }); setDetalle(null); }}
          onCancelar={(siguientes) => cancelar(detalle, siguientes)}
        />
      )}
    </main>
  );
}

/** Ventana con todos los datos de una reserva, para modificarla o cancelarla. */
function DetalleReserva({ reserva: r, onCerrar, onModificar, onCancelar }: {
  reserva: ReservaSala;
  onCerrar: () => void;
  onModificar: () => void;
  onCancelar: (siguientes: boolean) => void; // siguientes: también las próximas fechas de la serie
}) {
  const ventana = useRef<HTMLDialogElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  useEffect(() => {
    const d = ventana.current;
    if (d && !d.open) d.showModal();
  }, []);
  const sala = salaPorId(r.salaId);
  const filas: [string, string][] = [
    ['Fecha de solicitud', formatearDiaLargo(diaDe(r.inicio))],
    ['Hora', `${formatearHora(r.inicio)} – ${formatearHora(r.fin)}`],
    ['Institución', r.instituto],
    ['Carrera o año', r.carrera],
    ['Semestre', r.semestre],
    ['Actividad', r.actividad],
    ['Total usuarios', `${r.usuarios} de ${sala?.capacidad ?? '?'}`],
    ['Solicitado por', r.solicitante],
    ['Profesor(a)', r.profesor],
    ['Registrada', formatearFecha(r.creada)],
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
      <div className="botones-formulario">
        {confirmando ? (
          <>
            <span>¿Cancelar {r.serieId ? 'la reserva' : 'esta reserva'}? No se puede deshacer.</span>
            <button className="peligro" onClick={() => onCancelar(false)}>{r.serieId ? 'Solo esta fecha' : 'Sí, cancelar'}</button>
            {r.serieId && <button className="peligro" onClick={() => onCancelar(true)}>Esta y las siguientes</button>}
            <button onClick={() => setConfirmando(false)}>No</button>
          </>
        ) : (
          <>
            <button className="primario" onClick={onModificar}>Modificar</button>
            <button className="peligro" onClick={() => setConfirmando(true)}>Cancelar reserva</button>
            <button onClick={onCerrar}>Cerrar</button>
          </>
        )}
      </div>
    </dialog>
  );
}
