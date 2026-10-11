import { useState, type FormEvent } from 'react';
import { CARRERA_POR_INSTITUTO, CONDICIONES, INSTITUTOS, MOTIVOS } from '../../config/opciones';
import { prestarLaptop } from '../../services/prestamoService';
import type { Laptop, NuevoPrestamo } from '../../types';
import { duracionEntreHoras, horaActual } from '../../utils/fechas';
import type { EjecutarAccion } from '../tipos';

const vacio = (): NuevoPrestamo => ({
  nombre: '',
  instituto: '',
  condicion: '',
  carrera: '',
  laptopId: '',
  motivo: '',
  horaInicio: horaActual(),
  horaFin: '',
});

const TEXTO_ESTADO: Record<Laptop['estado'], string> = {
  disponible: '',
  prestada: ' (prestada)',
  mantenimiento: ' (en mantenimiento)',
};

interface Props {
  laptops: Laptop[];
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
    return <Desplegable id="prestamo-carrera" titulo="Carrera o año" valor={valor} opciones={campo.opciones} onCambiar={onCambiar} />;
  }
  return (
    <label htmlFor="prestamo-carrera">
      Carrera o año
      <input
        id="prestamo-carrera"
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

export function PrestamoForm({ laptops, ejecutar }: Props) {
  const [datos, setDatos] = useState<NuevoPrestamo>(vacio);
  const cambiar = (campo: keyof NuevoPrestamo) => (valor: string) =>
    setDatos({ ...datos, [campo]: valor });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const numero = laptops.find((l) => l.id === datos.laptopId)?.numero;
    const ok = await ejecutar(() => prestarLaptop(datos), `Laptop ${numero} prestada a ${datos.nombre}.`);
    if (ok) setDatos(vacio());
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2>Nuevo préstamo</h2>
      <div className="campos">
        <label htmlFor="prestamo-nombre">
          Nombre
          <input id="prestamo-nombre" required value={datos.nombre} onChange={(e) => cambiar('nombre')(e.target.value)} />
        </label>
        <Desplegable
          id="prestamo-instituto"
          titulo="Instituto"
          valor={datos.instituto}
          opciones={INSTITUTOS}
          onCambiar={(instituto) => setDatos({ ...datos, instituto, carrera: '' })}
        />
        <Desplegable id="prestamo-condicion" titulo="Condición" valor={datos.condicion} opciones={CONDICIONES} onCambiar={cambiar('condicion')} />
        <CampoCarreraOAnio instituto={datos.instituto} valor={datos.carrera} onCambiar={cambiar('carrera')} />
        <label htmlFor="prestamo-laptop">
          Laptop
          <select id="prestamo-laptop" required value={datos.laptopId} onChange={(e) => cambiar('laptopId')(e.target.value)}>
            <option value="">Seleccione…</option>
            {laptops.map((l) => (
              <option key={l.id} value={l.id} disabled={l.estado !== 'disponible'}>
                {l.numero}{TEXTO_ESTADO[l.estado]}
              </option>
            ))}
          </select>
        </label>
        <Desplegable id="prestamo-motivo" titulo="Motivo de uso" valor={datos.motivo} opciones={MOTIVOS} onCambiar={cambiar('motivo')} />
        <label htmlFor="prestamo-inicio">
          Hora de inicio
          <input id="prestamo-inicio" type="time" required value={datos.horaInicio} onChange={(e) => cambiar('horaInicio')(e.target.value)} />
        </label>
        <label htmlFor="prestamo-fin">
          Hora de fin
          <input id="prestamo-fin" type="time" required value={datos.horaFin} onChange={(e) => cambiar('horaFin')(e.target.value)} />
        </label>
        <label htmlFor="prestamo-duracion">
          Duración
          <input
            id="prestamo-duracion"
            readOnly
            tabIndex={-1}
            className="calculado"
            placeholder="Se calcula con las horas"
            value={duracionEntreHoras(datos.horaInicio, datos.horaFin)}
          />
        </label>
      </div>
      <button type="submit" className="primario">Registrar préstamo</button>
    </form>
  );
}
