import { useEffect, useRef, useState, type FormEvent } from 'react';
import { campoCarreraDe, INSTITUTOS, NO_APLICA, semestresDe } from '../../config/opciones';
import { ACTIVIDADES, HORA_APERTURA, HORA_CIERRE, SALAS, salaPorId } from '../../config/salas';
import type { NuevaReservaSala, ReservaSala } from '../../types';
import { diaDe, duracionEntreHoras, horaActual } from '../../utils/fechas';
import { CampoCarreraOAnio, Desplegable } from '../RegistroForm';

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const APERTURA = `${dosDigitos(HORA_APERTURA)}:00`;
const CIERRE = `${dosDigitos(HORA_CIERRE)}:00`;

/** Una hora después de "HH:MM", sin pasar del cierre. */
function unaHoraDespues(hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  const siguiente = `${dosDigitos(h + 1)}:${dosDigitos(m)}`;
  return siguiente > CIERRE ? CIERRE : siguiente;
}

/** Datos del formulario a partir de una reserva guardada (para modificarla). */
function datosDe(r: ReservaSala): NuevaReservaSala {
  return {
    salaId: r.salaId,
    instituto: r.instituto,
    carrera: r.carrera,
    semestre: r.semestre,
    fecha: diaDe(r.inicio),
    horaInicio: horaActual(new Date(r.inicio)),
    horaFin: horaActual(new Date(r.fin)),
    actividad: r.actividad,
    usuarios: String(r.usuarios),
    solicitante: r.solicitante,
    profesor: r.profesor,
  };
}

/** Lo que se sabe al abrir el formulario: una reserva para modificar, o el día y la hora elegidos. */
export type InicioFormulario =
  | { reserva: ReservaSala }
  | { salaId: string; fecha: string; horaInicio: string };

interface Props {
  inicio: InicioFormulario;
  onGuardar: (datos: NuevaReservaSala, anterior?: ReservaSala) => Promise<void>; // Lanza un error si no se pudo
  onCerrar: () => void;
}

/** Ventana con el formulario para reservar (o modificar la reserva de) una sala especial. */
export function FormularioSala({ inicio, onGuardar, onCerrar }: Props) {
  const anterior = 'reserva' in inicio ? inicio.reserva : undefined;
  const [datos, setDatos] = useState<NuevaReservaSala>(() => 'reserva' in inicio ? datosDe(inicio.reserva) : {
    salaId: inicio.salaId,
    instituto: '',
    carrera: '',
    semestre: '',
    fecha: inicio.fecha,
    horaInicio: inicio.horaInicio,
    horaFin: unaHoraDespues(inicio.horaInicio),
    actividad: '',
    usuarios: '',
    solicitante: '',
    profesor: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const ventana = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ventana.current;
    if (d && !d.open) d.showModal();
  }, []);

  const cambiar = (campo: keyof NuevaReservaSala) => (valor: string) => setDatos({ ...datos, [campo]: valor });
  const sala = salaPorId(datos.salaId);

  // Al cambiar de institución, carrera y semestre se vuelven a elegir (con "Otro", quedan en "No aplica").
  const cambiarInstituto = (instituto: string) => {
    const campo = campoCarreraDe(instituto, '', true);
    const unica = campo?.tipo === 'menu' && campo.opciones.length === 1 ? campo.opciones[0] : '';
    setDatos({ ...datos, instituto, carrera: unica, semestre: unica === NO_APLICA ? NO_APLICA : '' });
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await onGuardar(datos, anterior);
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGuardando(false);
    }
  }

  return (
    <dialog ref={ventana} className="ventana" onCancel={onCerrar} aria-labelledby="titulo-reserva-sala">
      <form className="formulario-sala" onSubmit={enviar}>
        <div className="panel-encabezado">
          <h2 id="titulo-reserva-sala">{anterior ? 'Modificar reserva' : 'Reservar sala'}</h2>
          <button type="button" className="boton-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        <div className="campos">
          <label htmlFor="sala-sala" className="ancho">
            Sala
            <select id="sala-sala" required value={datos.salaId} onChange={(e) => cambiar('salaId')(e.target.value)}>
              <option value="">Seleccione…</option>
              {SALAS.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.capacidad} personas)</option>)}
            </select>
          </label>
          <Desplegable id="sala-instituto" titulo="Institución" valor={datos.instituto} opciones={INSTITUTOS} onCambiar={cambiarInstituto} />
          <CampoCarreraOAnio instituto={datos.instituto} condicion="" sinCarrera={false} noAplica valor={datos.carrera} onCambiar={cambiar('carrera')} />
          <Desplegable id="sala-semestre" titulo="Semestre" valor={datos.semestre} opciones={semestresDe(datos.instituto, '', true)} onCambiar={cambiar('semestre')} />
          <label htmlFor="sala-inicio">
            Hora de inicio
            <input id="sala-inicio" type="time" required min={APERTURA} max={CIERRE} step={900} value={datos.horaInicio}
              onChange={(e) => cambiar('horaInicio')(e.target.value)} />
          </label>
          <label htmlFor="sala-fin">
            Hora de fin
            <input id="sala-fin" type="time" required min={APERTURA} max={CIERRE} step={900} value={datos.horaFin}
              onChange={(e) => cambiar('horaFin')(e.target.value)} />
            <span className="secundario">{duracionEntreHoras(datos.horaInicio, datos.horaFin) || ' '}</span>
          </label>
          <label htmlFor="sala-actividad">
            Actividad
            <input id="sala-actividad" required list="sala-actividades" placeholder="Elija o escriba" maxLength={80}
              value={datos.actividad} onChange={(e) => cambiar('actividad')(e.target.value)} />
            <datalist id="sala-actividades">
              {ACTIVIDADES.map((a) => <option key={a} value={a} />)}
            </datalist>
          </label>
          <label htmlFor="sala-usuarios">
            Total usuarios
            <input id="sala-usuarios" type="number" required min={1} max={sala?.capacidad} step={1} placeholder="Escriba un número"
              value={datos.usuarios} onChange={(e) => cambiar('usuarios')(e.target.value)} />
            {sala && <span className="secundario">Máximo {sala.capacidad} en {sala.nombre}</span>}
          </label>
          <label htmlFor="sala-fecha">
            Fecha de solicitud
            <input id="sala-fecha" type="date" required min={anterior ? undefined : diaDe()} value={datos.fecha}
              onChange={(e) => cambiar('fecha')(e.target.value)} />
          </label>
          <label htmlFor="sala-solicitante">
            Solicitado por
            <input id="sala-solicitante" required maxLength={80} placeholder="Nombre y apellido" value={datos.solicitante}
              onChange={(e) => cambiar('solicitante')(e.target.value)} />
          </label>
          <label htmlFor="sala-profesor">
            Profesor(a)
            <input id="sala-profesor" required maxLength={80} placeholder="Nombre y apellido" value={datos.profesor}
              onChange={(e) => cambiar('profesor')(e.target.value)} />
          </label>
        </div>
        {error && <div className="aviso aviso-error" role="alert">{error}</div>}
        <div className="botones-formulario">
          <button type="submit" className="primario" disabled={guardando}>{anterior ? 'Guardar cambios' : 'Reservar'}</button>
          <button type="button" onClick={onCerrar}>Cancelar</button>
        </div>
      </form>
    </dialog>
  );
}
