import { useState } from 'react';

/** Por qué se puede ordenar una lista de préstamos o reservas. */
export type CampoOrden = 'registro' | 'fecha' | 'nombre' | 'carrera';
export type Sentido = 'desc' | 'asc';

/** Campos de fecha: se ordenan de más reciente a más antiguo (o al revés); el resto, de la A a la Z. */
export const esFecha = (campo: CampoOrden) => campo === 'registro' || campo === 'fecha';

const comparar = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true });

/**
 * Ordena una lista según lo elegido en los menús "Ordenar por" y "Orden". Al abrir:
 * lo último registrado primero. `claves` dice qué texto usar de cada elemento para cada campo
 * (las fechas, en ISO, se ordenan bien como texto).
 */
export function useOrden<T>(lista: T[], claves: Record<CampoOrden, (x: T) => string>) {
  const [campo, setCampo] = useState<CampoOrden>('registro');
  const [sentido, setSentido] = useState<Sentido>('desc');
  const signo = sentido === 'asc' ? 1 : -1;
  const ordenados = [...lista].sort((a, b) =>
    signo * comparar(claves[campo](a), claves[campo](b)) || -comparar(claves.registro(a), claves.registro(b)));
  return {
    ordenados,
    campo,
    sentido,
    /** Al cambiar de campo, las fechas empiezan por lo más reciente y los textos por la A. */
    elegirCampo: (c: CampoOrden) => { setCampo(c); setSentido(esFecha(c) ? 'desc' : 'asc'); },
    setSentido,
  };
}
