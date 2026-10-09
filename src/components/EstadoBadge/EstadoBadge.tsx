import type { EstadoLaptop } from '../../types';

type Estado = EstadoLaptop | 'vencido' | 'activo' | 'devuelto';

const TEXTOS: Record<Estado, string> = {
  disponible: 'Disponible',
  prestada: 'Prestada',
  mantenimiento: 'Mantenimiento',
  vencido: 'Vencido',
  activo: 'A tiempo',
  devuelto: 'Devuelto',
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  return <span className={`badge badge-${estado}`}>{TEXTOS[estado]}</span>;
}
