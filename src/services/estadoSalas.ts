import { SALAS, type Sala } from '../config/salas';
import type { MantenimientoSala, ReservaSala } from '../types';
import { enCurso } from './mantenimientoSalas';

export interface EstadoSala {
  sala: Sala;
  actual?: ReservaSala; // Reserva en curso ahora
  proxima?: ReservaSala; // Próxima reserva que todavía no empieza
  mantenimiento?: MantenimientoSala; // Mantenimiento en curso ahora
  mantenimientoProgramado?: MantenimientoSala; // Próximo mantenimiento que todavía no empieza
}

/** Para cada sala: la reserva en curso (si hay), la próxima y su mantenimiento actual o programado. */
export function estadoDeSalas(reservas: ReservaSala[], ahora: Date, mantenimientos: MantenimientoSala[] = []): EstadoSala[] {
  return SALAS.map((sala) => {
    const deLaSala = reservas.filter((r) => r.salaId === sala.id).sort((a, b) => a.inicio.localeCompare(b.inicio));
    const susMantenimientos = mantenimientos.filter((m) => m.salaId === sala.id).sort((a, b) => a.inicio.localeCompare(b.inicio));
    return {
      sala,
      actual: deLaSala.find((r) => new Date(r.inicio) <= ahora && new Date(r.fin) > ahora),
      proxima: deLaSala.find((r) => new Date(r.inicio) > ahora),
      mantenimiento: susMantenimientos.find((m) => enCurso(m, ahora)),
      mantenimientoProgramado: susMantenimientos.find((m) => new Date(m.inicio) > ahora),
    };
  });
}
