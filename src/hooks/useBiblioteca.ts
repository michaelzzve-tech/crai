import { useCallback, useEffect, useState } from 'react';
import type { Modulo } from '../config/modulos';
import { repositorio } from '../data';
import { asegurarRecursos } from '../services/registroService';
import type { Recurso, Registro } from '../types';

/** Carga los recursos y registros del módulo, y expone `recargar` para refrescar tras cada acción. */
export function useBiblioteca(modulo: Modulo) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    const [r, g] = await Promise.all([
      repositorio.listarRecursos(modulo.tablaRecursos),
      repositorio.listarRegistros(modulo.tablaRegistros),
    ]);
    setRecursos(r.sort((a, b) => a.numero - b.numero));
    setRegistros(g.sort((a, b) => b.inicio.localeCompare(a.inicio)));
  }, [modulo]);

  useEffect(() => {
    asegurarRecursos(modulo)
      .then(recargar)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [modulo, recargar]);

  return { recursos, registros, recargar, error };
}
