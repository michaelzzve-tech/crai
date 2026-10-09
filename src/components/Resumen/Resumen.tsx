import { estaVencido } from '../../services/prestamoService';
import type { Laptop, Prestamo } from '../../types';

interface Props {
  laptops: Laptop[];
  prestamos: Prestamo[];
}

export function Resumen({ laptops, prestamos }: Props) {
  const contar = (estado: Laptop['estado']) =>
    laptops.filter((l) => l.estado === estado).length;
  const vencidos = prestamos.filter((p) => estaVencido(p)).length;

  const tarjetas = [
    { titulo: 'Total de laptops', valor: laptops.length },
    { titulo: 'Disponibles', valor: contar('disponible') },
    { titulo: 'Prestadas', valor: contar('prestada') },
    { titulo: 'En mantenimiento', valor: contar('mantenimiento') },
    { titulo: 'Préstamos vencidos', valor: vencidos, alerta: vencidos > 0 },
  ];

  return (
    <section className="resumen">
      {tarjetas.map((t) => (
        <div key={t.titulo} className={t.alerta ? 'tarjeta alerta' : 'tarjeta'}>
          <span className="tarjeta-valor">{t.valor}</span>
          <span className="tarjeta-titulo">{t.titulo}</span>
        </div>
      ))}
    </section>
  );
}
