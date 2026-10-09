import { useState, type FormEvent } from 'react';
import { registrarLaptop } from '../../services/prestamoService';
import type { NuevaLaptop } from '../../types';
import type { EjecutarAccion } from '../tipos';

const VACIO: NuevaLaptop = { codigo: '', marca: '', modelo: '', numeroSerie: '', notas: '' };

export function LaptopForm({ ejecutar }: { ejecutar: EjecutarAccion }) {
  const [datos, setDatos] = useState<NuevaLaptop>(VACIO);

  const cambiar = (campo: keyof NuevaLaptop) => (e: { target: { value: string } }) =>
    setDatos({ ...datos, [campo]: e.target.value });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const ok = await ejecutar(() => registrarLaptop(datos), `Laptop ${datos.codigo.toUpperCase()} registrada.`);
    if (ok) setDatos(VACIO);
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h2>Registrar laptop</h2>
      <div className="campos">
        <label>
          Código de inventario
          <input required placeholder="LAP-001" value={datos.codigo} onChange={cambiar('codigo')} />
        </label>
        <label>
          Marca
          <input required value={datos.marca} onChange={cambiar('marca')} />
        </label>
        <label>
          Modelo
          <input required value={datos.modelo} onChange={cambiar('modelo')} />
        </label>
        <label>
          Número de serie
          <input required value={datos.numeroSerie} onChange={cambiar('numeroSerie')} />
        </label>
        <label className="ancho">
          Notas (cargador, accesorios, detalles)
          <input value={datos.notas} onChange={cambiar('notas')} />
        </label>
      </div>
      <button type="submit" className="primario">Agregar laptop</button>
    </form>
  );
}
