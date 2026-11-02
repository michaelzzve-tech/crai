import { useState } from 'react';
import { diaDe, sumarDias } from '../utils/fechas';

/** Vistas del planner: el día en curso (al abrir) o 3 días. */
export const VISTAS_PLANNER = [1, 3];

/**
 * Qué días muestra el planner (cubículos y salas especiales): al abrir, solo el día en curso;
 * con los botones "Día" y "3 días" se cambia, y ‹ › avanzan o retroceden esa cantidad de días.
 */
export function useVistaPlanner() {
  const [elegido, setElegido] = useState(() => diaDe());
  const [desde, setDesde] = useState(() => diaDe()); // Primer día que se ve
  const [cantidad, setCantidad] = useState(VISTAS_PLANNER[0]); // Días a la vista
  const hasta = sumarDias(desde, cantidad - 1);

  /** Elige un día; si no está a la vista, el calendario empieza en él. */
  const elegir = (dia: string) => {
    setElegido(dia);
    if (dia < desde || dia > hasta) setDesde(dia);
  };
  /** ‹ y ›: mueve los días a la vista y el día elegido juntos. */
  const avanzar = (n: number) => {
    setDesde(sumarDias(desde, n));
    setElegido(sumarDias(elegido, n));
  };
  const cambiarCantidad = (n: number) => {
    setCantidad(n);
    setDesde(elegido);
  };

  return {
    elegido, desde, hasta, cantidad, elegir,
    /** Para la barra de arriba (BarraSemana). */
    tramo: { desde, dias: cantidad, onPaso: avanzar, vistas: VISTAS_PLANNER, onDias: cambiarCantidad },
    /** "este día" o "en estos días", para los contadores de los filtros. */
    textoPeriodo: cantidad === 1 ? 'este día' : 'en estos días',
  };
}
