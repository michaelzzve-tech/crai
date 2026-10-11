import { useRef } from 'react';
import type { usePaginacion } from '../../hooks/usePaginacion';

/** Flechas para pasar de página; no se muestra si todo cabe en una. */
export function Paginador({ paginacion }: { paginacion: ReturnType<typeof usePaginacion> }) {
  const { pagina, totalPaginas, desde, hasta, total } = paginacion;
  const ref = useRef<HTMLElement>(null);
  if (totalPaginas <= 1) return null;

  // Al cambiar de página se vuelve al inicio de la tabla.
  const irA = (p: number) => {
    paginacion.irA(p);
    ref.current?.closest('section')?.scrollIntoView({ block: 'start' });
  };
  return (
    <nav ref={ref} className="paginador" aria-label="Páginas">
      <button onClick={() => irA(0)} disabled={pagina === 0} aria-label="Primera página">«</button>
      <button onClick={() => irA(pagina - 1)} disabled={pagina === 0} aria-label="Página anterior">‹</button>
      <span>
        {desde + 1}–{hasta} de {total} · página {pagina + 1} de {totalPaginas}
      </span>
      <button onClick={() => irA(pagina + 1)} disabled={pagina === totalPaginas - 1} aria-label="Página siguiente">›</button>
      <button onClick={() => irA(totalPaginas - 1)} disabled={pagina === totalPaginas - 1} aria-label="Última página">»</button>
    </nav>
  );
}
