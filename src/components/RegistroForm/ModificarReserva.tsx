import { useEffect, useRef, useState } from 'react';
import type { Modulo } from '../../config/modulos';
import type { Recurso, Registro } from '../../types';
import type { EjecutarAccion } from '../tipos';
import { RegistroForm } from './RegistroForm';

/**
 * Ventana para modificar todos los datos de una reserva (cubículos): el mismo formulario de
 * registro, abierto con los datos guardados. Los errores se muestran dentro de la ventana.
 */
export function ModificarReserva({ modulo, recursos, registro, ejecutar, onCerrar }: {
  modulo: Modulo;
  recursos: Recurso[];
  registro: Registro;
  ejecutar: EjecutarAccion;
  onCerrar: () => void;
}) {
  const ventana = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const d = ventana.current;
    if (d && !d.open) d.showModal();
  }, []);
  const ejecutarEnVentana: EjecutarAccion = async (accion, mensajeExito) => {
    try {
      await accion();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
    return ejecutar(async () => {}, mensajeExito);
  };
  return (
    <dialog ref={ventana} className="ventana" onCancel={onCerrar} aria-labelledby="titulo-registro">
      <RegistroForm modulo={modulo} recursos={recursos} ejecutar={ejecutarEnVentana} anterior={registro} error={error} onListo={onCerrar} onCerrar={onCerrar} />
    </dialog>
  );
}
