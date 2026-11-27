import { useCallback, useEffect, useState } from 'react';
import type { Modulo } from '../config/modulos';
import { repositorio } from '../data';
import { activarProgramados, asegurarRecursos, EVENTO_CAMBIO } from '../services/registroService';
import type { MantenimientoCubiculo, Recurso, Registro } from '../types';
import { recursosConMantenimiento } from '../services/mantenimientoCubiculos';
import { useAhora } from './useAhora';
import { masRecientesPrimero } from '../utils/orden';
import { useCambiosEnVivo } from './useCambiosEnVivo';

/** Carga los recursos y registros del módulo, y expone `recargar` para refrescar tras cada acción. */
export function useBiblioteca(modulo: Modulo) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [mantenimientos, setMantenimientos] = useState<MantenimientoCubiculo[]>([]);
  const reloj = useAhora(30_000);
  const [cargado, setCargado] = useState(() => new Date());
  const ahora = reloj > cargado ? reloj : cargado;
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    await activarProgramados(modulo);
    const [r, g, m] = await Promise.all([
      repositorio.listarRecursos(modulo.tablaRecursos),
      repositorio.listarRegistros(modulo.tablaRegistros),
      modulo.id === 'cubiculos' ? repositorio.listarMantenimientosCubiculos() : Promise.resolve([]),
    ]);
    // Solo los del menú actual, en su orden. Los que se quitaron (por ejemplo, laptops
    // 50 a 58) siguen guardados para no perder sus préstamos, pero no se muestran.
    const orden = (x: Recurso) => modulo.opciones.indexOf(x.id);
    setRecursos(r.filter((x) => orden(x) >= 0).sort((a, b) => orden(a) - orden(b)));
    setMantenimientos(m);
    setCargado(new Date());
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

  useEffect(() => {
    const alCambiar = () => { recargar().catch(() => {}); };
    window.addEventListener(EVENTO_CAMBIO, alCambiar);
    return () => window.removeEventListener(EVENTO_CAMBIO, alCambiar);
  }, [recargar]);

  // Lo que se reserva o cambia en otra cuenta aparece aquí al momento.
  useCambiosEnVivo([modulo.tablaRegistros, modulo.tablaRecursos, ...(modulo.id === 'cubiculos' ? ['mantenimiento_cubiculos'] : [])], recargar);

  return { recursos: recursosConMantenimiento(recursos, mantenimientos, ahora), registros, mantenimientos, recargar, error };
}
