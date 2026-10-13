import { useState, type FormEvent } from 'react';
import { CARRERA_POR_INSTITUTO, CANTIDAD_USUARIOS, CONDICIONES, GENEROS, INSTITUTOS, MOTIVOS, SEMESTRES } from '../../config/opciones';
import { nombreRecurso, type Modulo } from '../../config/modulos';
import { useAhora } from '../../hooks/useAhora';
import { registrar } from '../../services/registroService';
import type { NuevoRegistro, Recurso } from '../../types';
import { diaALas, diaDe, duracionEntreHoras, horaActual } from '../../utils/fechas';
import type { EjecutarAccion } from '../tipos';

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

/** "Carrera o año": su forma depende del instituto (ver CARRERA_POR_INSTITUTO). */
function CampoCarreraOAnio({ instituto, valor, onCambiar }: {
  instituto: string;
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  const campo = CARRERA_POR_INSTITUTO[instituto];
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

/** Formulario de préstamo o reserva; el campo del recurso cambia según el módulo. */
export function RegistroForm({ modulo, recursos, ejecutar }: Props) {
  const [datos, setDatos] = useState<NuevoRegistro>(vacio);
  const cambiar = (campo: keyof NuevoRegistro) => (valor: string) =>
    setDatos({ ...datos, [campo]: valor });

  const ahora = useAhora(30_000);
  // Para más tarde u otro día se puede elegir un recurso que hoy está en uso;
  // al registrar se revisa que no choque con otra reserva.
  const programado = modulo.conHoraFin && !!datos.fecha && !!datos.horaInicio
    && diaALas(datos.fecha, datos.horaInicio) > ahora;
  const elegible = (r: Recurso) => r.estado === 'disponible' || (programado && r.estado === 'ocupado');

  const textoEstado = (r: Recurso) =>
    r.estado === 'ocupado' ? ` (${modulo.ocupado.toLowerCase()})`
      : r.estado === 'mantenimiento' ? ' (en mantenimiento)' : '';

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const ok = await ejecutar(() => registrar(modulo, datos), modulo.mensajeRegistrado(nombreRecurso(datos.recursoId), datos.nombre));
    if (ok) setDatos(vacio());
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2>{modulo.nuevo}</h2>
      <div className="campos">
        <label htmlFor="registro-nombre">
          Nombre
          <input id="registro-nombre" required value={datos.nombre} onChange={(e) => cambiar('nombre')(e.target.value)} />
        </label>
        <Desplegable id="registro-genero" titulo="Género" valor={datos.genero} opciones={GENEROS} onCambiar={cambiar('genero')} />
        <Desplegable
          id="registro-instituto"
          titulo="Instituto"
          valor={datos.instituto}
          opciones={INSTITUTOS}
          onCambiar={(instituto) => setDatos({ ...datos, instituto, carrera: '' })}
        />
        <Desplegable id="registro-condicion" titulo="Condición" valor={datos.condicion} opciones={CONDICIONES} onCambiar={cambiar('condicion')} />
        <CampoCarreraOAnio instituto={datos.instituto} valor={datos.carrera} onCambiar={cambiar('carrera')} />
        <Desplegable id="registro-semestre" titulo="Semestre o nivel" valor={datos.semestre} opciones={SEMESTRES} onCambiar={cambiar('semestre')} />
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
          <Desplegable id="registro-usuarios" titulo="Cantidad de usuarios" valor={datos.usuarios} opciones={CANTIDAD_USUARIOS} onCambiar={cambiar('usuarios')} />
        )}
        <Desplegable id="registro-motivo" titulo="Motivo de uso" valor={datos.motivo} opciones={MOTIVOS} onCambiar={cambiar('motivo')} />
        {modulo.conHoraFin && (
          <label htmlFor="registro-fecha">
            Fecha de la reserva
            <input id="registro-fecha" type="date" required min={diaDe()} value={datos.fecha} onChange={(e) => cambiar('fecha')(e.target.value)} />
          </label>
        )}
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
        <button type="button" onClick={() => setDatos(vacio())}>Limpiar</button>
      </div>
    </form>
  );
}
