import { useEffect, useRef } from 'react';

/**
 * En pantallas angostas el calendario se desliza de lado: lleva a la vista el día elegido.
 * Devuelve la referencia para el contenedor que se desliza.
 */
export function useMostrarDiaElegido(elegido: string) {
  const contenedor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const caja = contenedor.current;
    const dia = caja?.querySelector<HTMLElement>('.planner-dia-titulo.elegido');
    if (!caja) return;
    // 64 px: ancho de la columna de horas, que queda fija a la izquierda.
    caja.scrollLeft = dia ? caja.scrollLeft + dia.getBoundingClientRect().left - caja.getBoundingClientRect().left - 64 : 0;
  }, [elegido]);
  return contenedor;
}
