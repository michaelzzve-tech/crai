import { useCallback, useEffect, useState } from 'react';
import type { Modulo } from '../config/modulos';
import { repositorio } from '../data';
import { activarProgramados, asegurarRecursos } from '../services/registroService';
import type { Recurso, Registro } from '../types';
import { masRecientesPrimero } from '../utils/orden';
import { useCambiosEnVivo } from './useCambiosEnVivo';

/** Carga los recursos y registros del módulo, y expone `recargar` para refrescar tras cada acción. */
export function useBiblioteca(modulo: Modulo) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    await activarProgramados(modulo);
    const [r, g] = await Promise.all([
      repositorio.listarRecursos(modulo.tablaRecursos),
      repositorio.listarRegistros(modulo.tablaRegistros),
    ]);
    // Solo los del menú actual, en su orden. Los que se quitaron (por ejemplo, laptops
    // 50 a 58) siguen guardados para no perder sus préstamos, pero no se muestran.
    const orden = (x: Recurso) => modulo.opciones.indexOf(x.id);
    setRecursos(r.filter((x) => orden(x) >= 0).sort((a, b) => orden(a) - orden(b)));
    setRegistros(g.sort(masRecientesPrimero)); // Las últimas en registrarse, primero
  }, [modulo]);

  useEffect(() => {
    asegurarRecursos(modulo)
      .then(recargar)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [modulo, recargar]);

  // Las reservas programadas ocupan su recurso al llegar su hora: se revisa cada minuto.
  useEffect(() => {
    const id = setInterval(() => { recargar().catch(() => {}); }, 60_000);
    return () => clearInterval(id);
  }, [modulo, recargar]);

  // Lo que se reserva o cambia en otra cuenta aparece aquí al momento.
  useCambiosEnVivo([modulo.tablaRegistros, modulo.tablaRecursos], recargar);

  return { recursos, registros, recargar, error };
}
