import type { Modulo } from '../config/modulos';
import type { Registro } from '../types';
import { estaPorVencer, estaVencido } from './registroService';

export type TipoNotificacion = 'por-vencer' | 'vencido';

export interface Notificacion {
  clave: string; // Única por registro y tipo, para recordar cuáles se leyeron
  tipo: TipoNotificacion;
  modulo: Modulo;
  registro: Registro;
  minutos: number; // Que faltan (por vencer) o que pasaron (vencido)
}

/** Avisos de los registros activos con hora de fin: por vencer y vencidos (estos primero). */
export function calcularNotificaciones(modulo: Modulo, registros: Registro[], ahora = new Date()): Notificacion[] {
  const lista: Notificacion[] = [];
  for (const registro of registros) {
    if (!registro.fin) continue;
    const diferencia = Math.round((new Date(registro.fin).getTime() - ahora.getTime()) / 60_000);
    if (estaVencido(registro, ahora)) {
      lista.push({ clave: `${registro.id}:vencido`, tipo: 'vencido', modulo, registro, minutos: Math.max(0, -diferencia) });
    } else if (estaPorVencer(registro, ahora)) {
      lista.push({ clave: `${registro.id}:por-vencer`, tipo: 'por-vencer', modulo, registro, minutos: Math.max(1, diferencia) });
    }
  }
  return lista.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'vencido' ? -1 : 1));
}

/** Título y detalle para mostrar una notificación. */
export function textoNotificacion(n: Notificacion): { titulo: string; detalle: string } {
  const nombre = `${n.modulo.recurso} ${n.registro.recursoId}`;
  if (n.tipo === 'vencido') {
    return {
      titulo: `${nombre}: reserva vencida`,
      detalle: `${n.registro.nombre} debía salir hace ${n.minutos} min.`,
    };
  }
  return {
    titulo: `${nombre}: faltan ${n.minutos} min`,
    detalle: `La reserva de ${n.registro.nombre} está por terminar.`,
  };
}
