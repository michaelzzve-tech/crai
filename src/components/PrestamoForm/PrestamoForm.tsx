import { useState, type FormEvent } from 'react';
import { prestarLaptop } from '../../services/prestamoService';
import type { Laptop, NuevoPrestamo } from '../../types';
import type { EjecutarAccion } from '../tipos';

// Opciones de duración en horas. Ajuste esta lista según las políticas de la biblioteca.
const DURACIONES = [
  { horas: 2, texto: '2 horas' },
  { horas: 4, texto: '4 horas' },
  { horas: 8, texto: 'Todo el día (8 horas)' },
  { horas: 24, texto: '24 horas' },
];

const VACIO: NuevoPrestamo = {
  laptopId: '',
  estudianteNombre: '',
  estudianteCarnet: '',
  estudianteCorreo: '',
  encargado: '',
  horas: 2,
};

interface Props {
  laptops: Laptop[];
  ejecutar: EjecutarAccion;
}

export function PrestamoForm({ laptops, ejecutar }: Props) {
  const [datos, setDatos] = useState<NuevoPrestamo>(VACIO);
  const disponibles = laptops.filter((l) => l.estado === 'disponible');

  const cambiar = (campo: keyof NuevoPrestamo) => (e: { target: { value: string } }) =>
    setDatos({ ...datos, [campo]: campo === 'horas' ? Number(e.target.value) : e.target.value });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const ok = await ejecutar(() => prestarLaptop(datos), `Préstamo registrado para ${datos.estudianteNombre}.`);
    // Se conserva el encargado para agilizar el siguiente préstamo.
    if (ok) setDatos({ ...VACIO, encargado: datos.encargado });
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2>Nuevo préstamo</h2>
      {disponibles.length === 0 ? (
        <p className="vacio">No hay laptops disponibles en este momento.</p>
      ) : (
        <>
          <div className="campos">
            <label>
              Laptop
              <select required value={datos.laptopId} onChange={cambiar('laptopId')}>
                <option value="">Seleccione…</option>
                {disponibles.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.codigo} · {l.marca} {l.modelo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Duración
              <select value={datos.horas} onChange={cambiar('horas')}>
                {DURACIONES.map((d) => (
                  <option key={d.horas} value={d.horas}>{d.texto}</option>
                ))}
              </select>
            </label>
            <label>
              Nombre del estudiante
              <input required value={datos.estudianteNombre} onChange={cambiar('estudianteNombre')} />
            </label>
            <label>
              Carnet / ID universitario
              <input required value={datos.estudianteCarnet} onChange={cambiar('estudianteCarnet')} />
            </label>
            <label>
              Correo (opcional)
              <input type="email" value={datos.estudianteCorreo} onChange={cambiar('estudianteCorreo')} />
            </label>
            <label>
              Bibliotecario que entrega
              <input required value={datos.encargado} onChange={cambiar('encargado')} />
            </label>
          </div>
          <button type="submit" className="primario">Registrar préstamo</button>
        </>
      )}
    </form>
  );
}
