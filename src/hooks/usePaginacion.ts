import { useState } from 'react';

/** Registros que se muestran por pantalla en cada tabla. */
export const REGISTROS_POR_PAGINA = 30;

/** Divide una lista en páginas; `pagina` se ajusta sola si la lista se achica. */
export function usePaginacion<T>(lista: T[], porPagina = REGISTROS_POR_PAGINA) {
  const [elegida, setElegida] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const pagina = Math.min(elegida, totalPaginas - 1);
  const desde = pagina * porPagina;
  return {
    items: lista.slice(desde, desde + porPagina),
    pagina,
    totalPaginas,
    desde,
    hasta: Math.min(desde + porPagina, lista.length),
    total: lista.length,
    irA: (p: number) => setElegida(Math.max(0, Math.min(p, totalPaginas - 1))),
  };
}
