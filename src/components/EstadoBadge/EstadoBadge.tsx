import type { EstadoRecurso } from '../../types';

type Estado = EstadoRecurso | 'vencido' | 'activo';

const TEXTOS: Record<Estado, string> = {
  disponible: 'Disponible',
  ocupado: 'En uso',
  mantenimiento: 'Mantenimiento',
  vencido: 'Vencido',
  activo: 'A tiempo',
};

/** Etiqueta de color para un estado. `textoOcupado` cambia "En uso" por "Prestada", "Reservado"… */
export function EstadoBadge({ estado, textoOcupado }: { estado: Estado; textoOcupado?: string }) {
  const texto = estado === 'ocupado' && textoOcupado ? textoOcupado : TEXTOS[estado];
  return <span className={`badge badge-${estado}`}>{texto}</span>;
}
