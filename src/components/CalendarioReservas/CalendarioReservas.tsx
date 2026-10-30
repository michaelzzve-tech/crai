import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HORA_CIERRE } from '../../config/salas';
import { nombreRecurso, type Modulo } from '../../config/modulos';
import { useAhora } from '../../hooks/useAhora';
import { useMostrarDiaElegido } from '../../hooks/useMostrarDiaElegido';
import {
  cancelarProgramado, cancelarSerieDesde, editarHorario, estaPorVencer, estaProgramado, estaVencido, finalizar, type NuevoHorario,
} from '../../services/registroService';
import type { NuevoRegistro, Recurso, Registro } from '../../types';
import { diaALas, diaDe, diferenciaConPrevisto, formatearDia, formatearDiaLargo, formatearHora, horaActual, lunesDe, sumarDias } from '../../utils/fechas';
import { EstadoBadge } from '../EstadoBadge';
import { BarraSemana, FiltrosPlanner, PlannerSemanal, type EventoPlanner } from '../Planner';
import { RegistroForm } from '../RegistroForm';
import { EditorHorario } from '../RegistrosActivos';
import type { EjecutarAccion } from '../tipos';

const dosDigitos = (n: number) => String(n).padStart(2, '0');

interface Props {
  modulo: Modulo;
  recursos: Recurso[];
  registros: Registro[];
  ejecutar: EjecutarAccion;
}

/**
 * Reservas de un módulo con hora de fin (cubículos) en el calendario semanal de Salas especiales:
 * se reserva con un clic o con "+ Nueva reserva" (el formulario de siempre, en una ventana),
 * y una reserva se abre con un clic o se arrastra a otro día u hora.
 */
export function CalendarioReservas({ modulo, recursos, registros, ejecutar }: Props) {
  const [elegido, setElegido] = useState(() => diaDe());
  const [ocultos, setOcultos] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState<Partial<NuevoRegistro> | null>(null); // Valores iniciales del formulario abierto
  const [errorVentana, setErrorVentana] = useState('');
  const [detalle, setDetalle] = useState<string | null>(null); // id del registro abierto
  const contenedor = useMostrarDiaElegido(elegido);

  const lunes = lunesDe(elegido);
  const domingo = sumarDias(lunes, 6);
  const deLaSemana = registros.filter((r) => r.fin && diaDe(r.inicio) >= lunes && diaDe(r.inicio) <= domingo);
  const color = (id: string) => modulo.colores[modulo.opciones.indexOf(id)] ?? '#7b8794';
  const nombre = (id: string) => `${modulo.recurso} ${nombreRecurso(id)}`;

  /** Cada reserva tal como se dibuja: el cubículo, el horario y quién lo usa. Las terminadas no se mueven. */
  const evento = (r: Registro): EventoPlanner => {
    const horario = `${formatearHora(r.inicio)} – ${formatearHora(r.fin!)}`;
    return {
      id: r.id, inicio: r.inicio, fin: r.fin!, color: color(r.recursoId),
      titulo: nombreRecurso(r.recursoId) === r.recursoId ? `${modulo.recurso} ${r.recursoId}` : nombreRecurso(r.recursoId),
      lineas: [horario, `${r.nombre}${r.usuarios ? ` · ${r.usuarios} usu.` : ''}`],
      ayuda: `${nombre(r.recursoId)} · ${horario} · ${r.nombre}${r.finReal ? ` · ${modulo.finalizado}` : ''}`,
      movible: !r.finReal,
      atenuado: !!r.finReal,
    };
  };
  const registroDe = (e: EventoPlanner) => registros.find((r) => r.id === e.id);

  /** Nueva reserva: con el cubículo si solo hay uno a la vista, y a la hora del clic o en la próxima hora en punto. */
  const abrirNuevo = (fecha = diaDe(), horaInicio?: string) => {
    const visibles = modulo.opciones.filter((id) => !ocultos.includes(id));
    const proxima = `${dosDigitos(Math.min(HORA_CIERRE - 1, Number(horaActual().slice(0, 2)) + 1))}:00`;
    const inicio = horaInicio ?? (fecha === diaDe() ? horaActual() : proxima);
    const [h, m] = inicio.split(':').map(Number);
    setErrorVentana('');
    setNuevo({
      fecha,
      horaInicio: inicio,
      horaFin: `${dosDigitos(Math.min(h + 1, HORA_CIERRE))}:${dosDigitos(h + 1 >= HORA_CIERRE ? 0 : m)}`,
      recursoId: visibles.length === 1 ? visibles[0] : '',
    });
  };

  // En la ventana, los errores se muestran dentro de ella; el aviso de éxito, arriba de la página.
  const ejecutarEnVentana: EjecutarAccion = async (accion, mensajeExito) => {
    try {
      await accion();
    } catch (e) {
      setErrorVentana(e instanceof Error ? e.message : String(e));
      return false;
    }
    return ejecutar(async () => {}, mensajeExito);
  };

  /** Al soltar una reserva arrastrada: misma duración y cantidad de usuarios, en el nuevo día y hora. */
  async function mover(r: Registro, dia: string, hora: string) {
    const duracion = new Date(r.fin!).getTime() - new Date(r.inicio).getTime();
    const [h, m] = hora.split(':').map(Number);
    const fin = h * 60 + m + duracion / 60000;
    const horario: NuevoHorario = {
      fecha: dia, horaInicio: hora, horaFin: `${dosDigitos(Math.floor(fin / 60))}:${dosDigitos(fin % 60)}`,
      usuarios: r.usuarios ? String(r.usuarios) : '',
    };
    if (dia < diaDe()) {
      await ejecutar(() => Promise.reject(new Error('No se puede mover una reserva a un día pasado.')), '');
      return;
    }
    await ejecutar(() => editarHorario(modulo, r, horario), `${nombre(r.recursoId)} movido a ${formatearDiaLargo(dia)}, ${formatearHora(diaALas(dia, hora).toISOString())}`);
  }

  const abierto = registros.find((r) => r.id === detalle);

  return (
    <section className="panel salas">
      <BarraSemana titulo={modulo.registros} elegido={elegido} onElegir={setElegido} onNueva={() => abrirNuevo()} />

      {/* Cada cubículo es un filtro y a la vez la leyenda de colores del calendario. */}
      <FiltrosPlanner
        grupo={`${modulo.recursos} que se muestran`}
        items={recursos.map((r) => ({
          id: r.id,
          nombre: nombreRecurso(r.id) === r.id ? `${modulo.recurso} ${r.id}` : nombreRecurso(r.id),
          color: color(r.id),
          detalle: `${deLaSemana.filter((x) => x.recursoId === r.id).length} esta semana`,
        }))}
        ocultos={ocultos}
        onOcultos={setOcultos}
      />

      <div className="planner-contenedor" ref={contenedor}>
        <PlannerSemanal
          lunes={lunes}
          elegido={elegido}
          onElegir={setElegido}
          reservas={deLaSemana.filter((r) => !ocultos.includes(r.recursoId)).map(evento)}
          onNueva={(dia, hora) => abrirNuevo(dia, hora)}
          onAbrir={(e) => setDetalle(e.id)}
          onMover={(e, dia, hora) => { const r = registroDe(e); if (r) void mover(r, dia, hora); }}
        />
      </div>
      <p className="secundario">
        Haga clic en un espacio libre del calendario para reservar a esa hora, o en una reserva para ver sus datos.
        Arrastre una reserva para cambiarla de día u hora. Las ya terminadas se ven más claras.
      </p>

      {nuevo && (
        <Ventana titulo="titulo-registro" onCerrar={() => setNuevo(null)}>
          <RegistroForm
            modulo={modulo}
            recursos={recursos}
            ejecutar={ejecutarEnVentana}
            inicial={nuevo}
            conRecurrencia
            error={errorVentana}
            onListo={() => { setElegido(nuevo.fecha ?? elegido); setNuevo(null); }}
            onCerrar={() => setNuevo(null)}
          />
        </Ventana>
      )}
      {abierto && (
        <DetalleRegistro
          modulo={modulo}
          registro={abierto}
          siguientes={abierto.serieId ? registros.filter((r) => r.serieId === abierto.serieId && r.inicio >= abierto.inicio && estaProgramado(r)).length : 1}
          ejecutar={ejecutar}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </section>
  );
}

/** Ventana modal (se cierra con Esc). */
function Ventana({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  const ventana = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ventana.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ventana} className="ventana" onCancel={onCerrar} aria-labelledby={titulo}>
      {children}
    </dialog>
  );
}

/** Datos de una reserva con sus acciones: modificar horario, registrar salida o cancelar (también las siguientes de la serie). */
function DetalleRegistro({ modulo, registro: r, siguientes, ejecutar, onCerrar }: {
  modulo: Modulo;
  registro: Registro;
  siguientes: number; // Reservas de la serie que se cancelan con "Esta y las siguientes" (incluida esta)
  ejecutar: EjecutarAccion;
  onCerrar: () => void;
}) {
  const [paso, setPaso] = useState<'ver' | 'editar' | 'confirmar'>('ver');
  const ahora = useAhora(15_000);
  const programado = estaProgramado(r, ahora);
  const nombre = `${modulo.recurso} ${nombreRecurso(r.recursoId)}`;
  const estado = r.finReal ? null : programado ? 'programado' : estaVencido(r, ahora) ? 'vencido' : estaPorVencer(r, ahora) ? 'por-vencer' : 'activo';

  const filas: [string, string][] = [
    ['Fecha de la reserva', formatearDiaLargo(diaDe(r.inicio))],
    ['Hora', `${formatearHora(r.inicio)} – ${r.fin ? formatearHora(r.fin) : ''}`],
    ...(r.serieId ? [['Reserva recurrente', 'Sí; al modificarla solo cambia esta fecha'] as [string, string]] : []),
    ['Nombre', r.nombre],
    ['Género', r.genero ?? ''],
    ['Instituto', r.instituto],
    ['Condición', r.condicion],
    ['Carrera o año', r.carrera],
    ['Semestre, nivel o sección', r.semestre ?? ''],
    ...(modulo.conUsuarios ? [['Cantidad de usuarios', String(r.usuarios ?? '')] as [string, string]] : []),
    ['Motivo de uso', r.motivo],
    ...(r.finReal ? [[modulo.finalizado, `${formatearDia(diaDe(r.finReal))}, ${formatearHora(r.finReal)}${r.fin ? ` (${diferenciaConPrevisto(r.fin, r.finReal)})` : ''}`] as [string, string]] : []),
  ];

  // La ventana se cierra también si algo falla, para que se vea el aviso de error de la página.
  const hecho = () => onCerrar();
  const guardarHorario = async (h: NuevoHorario) => {
    await ejecutar(() => editarHorario(modulo, r, h), `Reserva del ${nombre.toLowerCase()} actualizada.`);
    hecho();
  };
  const cancelar = async (todas: boolean) => {
    await (todas
      ? ejecutar(() => cancelarSerieDesde(modulo, r), `Se cancelaron ${siguientes} reservas del ${nombre.toLowerCase()} (desde el ${formatearDia(diaDe(r.inicio))}).`)
      : ejecutar(() => cancelarProgramado(modulo, r), `Reserva del ${nombre.toLowerCase()} cancelada.`));
    hecho();
  };
  const salida = async () => {
    const momento = new Date();
    const detalle = r.fin ? ` a las ${formatearHora(momento.toISOString())} (${diferenciaConPrevisto(r.fin, momento.toISOString())})` : '';
    await ejecutar(() => finalizar(modulo, r, momento), modulo.mensajeFinalizado(nombreRecurso(r.recursoId)).replace(/\.$/, `${detalle}.`));
    hecho();
  };

  return (
    <Ventana titulo="titulo-detalle-registro" onCerrar={onCerrar}>
      <div className="panel-encabezado">
        <h2 id="titulo-detalle-registro" className="titulo-sala">
          <span className="punto-sala" style={{ background: modulo.colores[modulo.opciones.indexOf(r.recursoId)] }} />
          {nombre}
          {estado && <EstadoBadge estado={estado} />}
        </h2>
        <button type="button" className="boton-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      </div>
      <dl className="detalle-sala">
        {filas.map(([t, v]) => (
          <div key={t}><dt>{t}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      {paso === 'editar' ? (
        <EditorHorario registro={r} conUsuarios={modulo.conUsuarios} onGuardar={guardarHorario} onCancelar={() => setPaso('ver')} />
      ) : (
        <div className="botones-formulario">
          {r.finReal ? (
            <button onClick={onCerrar}>Cerrar</button>
          ) : paso === 'confirmar' && programado ? (
            <>
              <span>¿Cancelar {r.serieId ? 'la reserva' : 'esta reserva'}? No se puede deshacer.</span>
              <button className="peligro" onClick={() => cancelar(false)}>{r.serieId ? 'Solo esta fecha' : 'Sí, cancelar'}</button>
              {r.serieId && siguientes > 1 && <button className="peligro" onClick={() => cancelar(true)}>Esta y las siguientes ({siguientes})</button>}
              <button onClick={() => setPaso('ver')}>No</button>
            </>
          ) : paso === 'confirmar' ? (
            <>
              <span>Hora de salida: <strong>{formatearHora(ahora.toISOString())}</strong></span>
              <button className="primario" autoFocus onClick={salida}>Confirmar</button>
              <button onClick={() => setPaso('ver')}>Cancelar</button>
            </>
          ) : (
            <>
              <button onClick={() => setPaso('editar')}>Modificar horario</button>
              <button className={programado ? 'peligro' : 'primario'} onClick={() => setPaso('confirmar')}>
                {programado ? 'Cancelar reserva' : modulo.finalizar}
              </button>
              <button onClick={onCerrar}>Cerrar</button>
            </>
          )}
        </div>
      )}
    </Ventana>
  );
}
