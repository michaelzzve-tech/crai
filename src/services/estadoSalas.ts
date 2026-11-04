import { SALAS, type Sala } from '../config/salas';
import type { ReservaSala } from '../types';

export interface EstadoSala {
  sala: Sala;
  actual?: ReservaSala; // Reserva en curso ahora
  proxima?: ReservaSala; // Próxima reserva que todavía no empieza
}

/** Para cada sala: la reserva en curso (si hay) y la próxima. */
export function estadoDeSalas(reservas: ReservaSala[], ahora: Date): EstadoSala[] {
  return SALAS.map((sala) => {
    const deLaSala = reservas.filter((r) => r.salaId === sala.id).sort((a, b) => a.inicio.localeCompare(b.inicio));
    return {
      sala,
      actual: deLaSala.find((r) => new Date(r.inicio) <= ahora && new Date(r.fin) > ahora),
      proxima: deLaSala.find((r) => new Date(r.inicio) > ahora),
    };
  });
}
