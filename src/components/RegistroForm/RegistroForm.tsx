import { useState, type FormEvent } from 'react';
import {
  CARRERA_POR_INSTITUTO, campoCarreraDe, CONDICIONES_SIN_CARRERA, type CampoCarrera, GENEROS, INSTITUTOS, MOTIVOS_LAPTOPS,
  NO_APLICA, OTRO_MOTIVO, semestresDe,
} from '../../config/opciones';
import { nombreRecurso, type Modulo } from '../../config/modulos';
import { useAhora } from '../../hooks/useAhora';
import { registrar } from '../../services/registroService';
import type { NuevoRegistro, Recurso, Registro } from '../../types';
import { diaALas, diaDe, duracionEntreHoras, horaActual } from '../../utils/fechas';
import type { EjecutarAccion } from '../tipos';
import { CampoNombre } from './CampoNombre';

const vacio = (): NuevoRegistro => ({
  nombre: '',
  genero: '',
  instituto: '',
  condicion: '',
  carrera: '',
  semestre: '',
  usuarios: '',
  recursoId: '',
  motivo: '',
  fecha: diaDe(),
  horaInicio: horaActual(),
  horaFin: '',
});

interface Props {
  modulo: Modulo;
  recursos: Recurso[];
  ejecutar: EjecutarAccion;
}

/** Menú desplegable con una opción vacía inicial. */
function Desplegable({ id, titulo, valor, opciones, onCambiar }: {
  id: string;
  titulo: string;
  valor: string;
  opciones: string[];
  onCambiar: (valor: string) => void;
}) {
  return (
    <label htmlFor={id}>
      {titulo}
      <select id={id} required value={valor} onChange={(e) => onCambiar(e.target.value)}>
        <option value="">Seleccione…</option>
        {opciones.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

/** Valor de "Carrera o año" al elegir instituto: si su menú tiene una sola opción (Otro → "No aplica"), ya queda elegida. */
function carreraInicial(instituto: string): string {
  const campo = CARRERA_POR_INSTITUTO[instituto];
  return campo?.tipo === 'menu' && campo.opciones.length === 1 ? campo.opciones[0] : '';
}

/** "Carrera o año": su forma depende del instituto y la condición (ver campoCarreraDe), o solo "No aplica". */
function CampoCarreraOAnio({ instituto, condicion, sinCarrera, valor, onCambiar }: {
  instituto: string;
  condicion: string;
  sinCarrera: boolean;
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  const campo: CampoCarrera | undefined = sinCarrera ? { tipo: 'menu', opciones: [NO_APLICA] } : campoCarreraDe(instituto, condicion);
  if (campo?.tipo === 'menu') {
    return <Desplegable id="registro-carrera" titulo="Carrera o año" valor={valor} opciones={campo.opciones} onCambiar={onCambiar} />;
  }
  return (
    <label htmlFor="registro-carrera">
      Carrera o año
      <input
        id="registro-carrera"
        type="number"
        min={1}
        step={1}
        required
        disabled={!campo}
        placeholder={campo ? 'Escriba un número' : 'Primero elija un instituto'}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
      />
    </label>
  );
}

/** Un motivo escrito a mano (con "Otro") es cualquiera que no esté en los menús. */
const esMotivoPropio = (motivo: string) => motivo !== '' && !MOTIVOS_LAPTOPS.includes(motivo);

/**
 * "Motivo de uso": menú y, si se elige "Otro", una casilla para escribir el motivo.
 * Se guarda lo escrito (por ejemplo, "Impresión"), no la palabra "Otro".
 */
function CampoMotivo({ opciones, valor, otro, onCambiar }: {
  opciones: string[];
  valor: string;
  otro: boolean;
  onCambiar: (valor: string, otro: boolean) => void;
}) {
  return (
    <>
      <Desplegable
        id="registro-motivo"
        titulo="Motivo de uso"
        valor={otro ? OTRO_MOTIVO : valor}
        opciones={opciones}
        onCambiar={(v) => (v === OTRO_MOTIVO ? onCambiar('', true) : onCambiar(v, false))}
      />
      {otro && (
        <label htmlFor="registro-motivo-otro">
          Otro motivo
          <input
            id="registro-motivo-otro"
            required
            autoFocus
            maxLength={60}
            placeholder="Escriba el motivo"
            value={valor}
            onChange={(e) => onCambiar(e.target.value, true)}
          />
        </label>
      )}
    </>
  );
}

/**
 * Datos personales del último registro de una persona, para rellenar el formulario.
 * Lo que no exista en este módulo (por ejemplo, DTI en cubículos) queda vacío para elegirlo.
 */
function datosDe(r: Registro, modulo: Modulo): Partial<NuevoRegistro> {
  const valido = (valor: string | undefined, opciones: string[]) => (valor && opciones.includes(valor) ? valor : '');
  const instituto = valido(r.instituto, INSTITUTOS);
  const condicion = valido(r.condicion, modulo.condiciones);
  const sinCarrera = CONDICIONES_SIN_CARRERA.includes(condicion);
  const campo = campoCarreraDe(instituto, condicion);
  const carrera = sinCarrera ? NO_APLICA
    : campo?.tipo === 'menu' ? valido(r.carrera, campo.opciones) || carreraInicial(instituto)
    : campo && /^\d+$/.test(r.carrera) ? r.carrera : '';
  return {
    nombre: r.nombre,
    genero: valido(r.genero, GENEROS),
    instituto,
    condicion,
    carrera,
    semestre: sinCarrera ? NO_APLICA : valido(r.semestre, semestresDe(instituto, condicion)),
    motivo: esMotivoPropio(r.motivo) ? r.motivo : valido(r.motivo, modulo.motivos),
    ...(modulo.conUsuarios && r.usuarios ? { usuarios: String(r.usuarios) } : {}),
  };
}

/** Formulario de préstamo o reserva; el campo del recurso cambia según el módulo. */
export function RegistroForm({ modulo, recursos, ejecutar }: Props) {
  const [datos, setDatos] = useState<NuevoRegistro>(vacio);
  const [otroMotivo, setOtroMotivo] = useState(false); // "Otro" elegido en Motivo de uso
  const limpiar = () => { setDatos(vacio()); setOtroMotivo(false); };
  const cambiar = (campo: keyof NuevoRegistro) => (valor: string) =>
    setDatos({ ...datos, [campo]: valor });
  // Con Psicólogo o DTI, carrera y semestre quedan en "No aplica"; con Docente se eligen, y "No aplica" es una opción más.
  const sinCarrera = CONDICIONES_SIN_CARRERA.includes(datos.condicion);
  const cambiarCondicion = (condicion: string) => {
    if (CONDICIONES_SIN_CARRERA.includes(condicion)) {
      setDatos({ ...datos, condicion, carrera: NO_APLICA, semestre: NO_APLICA });
      return;
    }
    // Lo ya elegido se mantiene si sigue en los menús de la nueva condición (por ejemplo, "No aplica" al pasar a Estudiante en ITJO, no).
    const campo = campoCarreraDe(datos.instituto, condicion);
    const carrera = campo?.tipo === 'menu' && !campo.opciones.includes(datos.carrera) ? carreraInicial(datos.instituto)
      : !campo || (campo.tipo === 'numero' && !/^\d+$/.test(datos.carrera)) ? '' : datos.carrera;
    const semestre = semestresDe(datos.instituto, condicion).includes(datos.semestre) ? datos.semestre : '';
    setDatos({ ...datos, condicion, carrera, semestre });
  };

  const ahora = useAhora(30_000);
  // Para más tarde u otro día se puede elegir un recurso que hoy está en uso;
  // al registrar se revisa que no choque con otra reserva.
  const programado = !!datos.fecha && !!datos.horaInicio
    && diaALas(datos.fecha, datos.horaInicio) > ahora;
  const elegible = (r: Recurso) => r.estado === 'disponible' || (programado && r.estado === 'ocupado');

  const textoEstado = (r: Recurso) =>
    r.estado === 'ocupado' ? ` (${modulo.ocupado.toLowerCase()})`
      : r.estado === 'mantenimiento' ? ' (en mantenimiento)' : '';

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const recurso = nombreRecurso(datos.recursoId);
    // Una laptop para más tarde no se presta todavía: se avisa que quedó reservada.
    const mensaje = programado && !modulo.conHoraFin
      ? `${modulo.recurso} ${recurso} reservada para ${datos.nombre}.`
      : modulo.mensajeRegistrado(recurso, datos.nombre);
    const ok = await ejecutar(() => registrar(modulo, datos), mensaje);
    if (ok) limpiar();
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2>{modulo.nuevo}</h2>
      <div className="campos">
        <CampoNombre valor={datos.nombre} onCambiar={cambiar('nombre')} onElegir={(r) => { setDatos({ ...datos, ...datosDe(r, modulo) }); setOtroMotivo(esMotivoPropio(r.motivo)); }} />
        <Desplegable id="registro-genero" titulo="Género" valor={datos.genero} opciones={GENEROS} onCambiar={cambiar('genero')} />
        <Desplegable
          id="registro-instituto"
          titulo="Instituto"
          valor={datos.instituto}
          opciones={INSTITUTOS}
          onCambiar={(instituto) => setDatos(sinCarrera ? { ...datos, instituto } : { ...datos, instituto, carrera: carreraInicial(instituto), semestre: '' })}
        />
        <Desplegable id="registro-condicion" titulo="Condición" valor={datos.condicion} opciones={modulo.condiciones} onCambiar={cambiarCondicion} />
        <CampoCarreraOAnio instituto={datos.instituto} condicion={datos.condicion} sinCarrera={sinCarrera} valor={datos.carrera} onCambiar={cambiar('carrera')} />
        <Desplegable
          id="registro-semestre"
          titulo="Semestre, nivel o sección"
          valor={datos.semestre}
          opciones={sinCarrera ? [NO_APLICA] : semestresDe(datos.instituto, datos.condicion)}
          onCambiar={cambiar('semestre')}
        />
        <label htmlFor="registro-recurso">
          {modulo.recurso}
          <select id="registro-recurso" required value={datos.recursoId} onChange={(e) => cambiar('recursoId')(e.target.value)}>
            <option value="">Seleccione…</option>
            {recursos.map((r) => (
              <option key={r.id} value={r.id} disabled={!elegible(r)}>
                {nombreRecurso(r.id)}{textoEstado(r)}
              </option>
            ))}
          </select>
        </label>
        {modulo.conUsuarios && (
          <label htmlFor="registro-usuarios">
            Cantidad de usuarios
            <input
              id="registro-usuarios"
              type="number"
              min={1}
              step={1}
              required
              placeholder="Escriba un número"
              value={datos.usuarios}
              onChange={(e) => cambiar('usuarios')(e.target.value)}
            />
          </label>
        )}
        <CampoMotivo
          opciones={modulo.motivos}
          valor={datos.motivo}
          otro={otroMotivo}
          onCambiar={(motivo, otro) => { setDatos({ ...datos, motivo }); setOtroMotivo(otro); }}
        />
        <label htmlFor="registro-fecha">
          Fecha de la reserva
          <input id="registro-fecha" type="date" required min={diaDe()} value={datos.fecha} onChange={(e) => cambiar('fecha')(e.target.value)} />
        </label>
        <label htmlFor="registro-inicio">
          Hora de inicio
          <input id="registro-inicio" type="time" required value={datos.horaInicio} onChange={(e) => cambiar('horaInicio')(e.target.value)} />
        </label>
        {modulo.conHoraFin && (
          <>
            <label htmlFor="registro-fin">
              Hora de fin
              <input id="registro-fin" type="time" required value={datos.horaFin} onChange={(e) => cambiar('horaFin')(e.target.value)} />
            </label>
            <label htmlFor="registro-duracion">
              Duración
              <input
                id="registro-duracion"
                readOnly
                tabIndex={-1}
                className="calculado"
                placeholder="Se calcula con las horas"
                value={duracionEntreHoras(datos.horaInicio, datos.horaFin)}
              />
            </label>
          </>
        )}
      </div>
      <div className="botones-formulario">
        <button type="submit" className="primario">{modulo.registrar}</button>
        {/* Vacía los campos y vuelve a poner la hora de inicio en la hora actual. */}
        <button type="button" onClick={limpiar}>Limpiar</button>
      </div>
    </form>
  );
}
