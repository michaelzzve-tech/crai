import { nombreRecurso, type Modulo } from '../../config/modulos';
import { estaVencido } from '../../services/registroService';
import type { Recurso, Registro } from '../../types';

interface Props {
  modulo: Modulo;
  recursos: Recurso[];
  registros: Registro[];
}

export function Resumen({ modulo, recursos, registros }: Props) {
  const contar = (estado: Recurso['estado']) => recursos.filter((r) => r.estado === estado).length;
  const vencidos = registros.filter((r) => estaVencido(r)).length;
  const disponibles = recursos.filter((r) => r.estado === 'disponible');
  // Al pasar el mouse por "Disponibles" se ven sus números.
  const detalleDisponibles = disponibles.length > 0
    ? `${modulo.recursos} disponibles: ${disponibles.map((r) => nombreRecurso(r.id)).join(', ')}`
    : `No hay ${modulo.recursos.toLowerCase()} disponibles.`;

  const tarjetas = [
    { titulo: `Total de ${modulo.recursos.toLowerCase()}`, valor: recursos.length },
    { titulo: 'Disponibles', valor: disponibles.length, alerta: recursos.length > 0 && disponibles.length === 0, detalle: detalleDisponibles },
    { titulo: `${modulo.ocupado}s`, valor: contar('ocupado') },
    { titulo: 'En mantenimiento', valor: contar('mantenimiento') },
    ...(modulo.conHoraFin ? [{ titulo: modulo.vencidos, valor: vencidos, alerta: vencidos > 0 }] : []),
  ];

  return (
    <section className="resumen">
      {tarjetas.map((t) => (
        <div
          key={t.titulo}
          className={`tarjeta${t.alerta ? ' alerta' : ''}${t.detalle ? ' con-detalle' : ''}`}
          // Con teclado también se puede ver el detalle (al enfocar la tarjeta).
          tabIndex={t.detalle ? 0 : undefined}
          aria-describedby={t.detalle ? 'detalle-disponibles' : undefined}
        >
          <span className="tarjeta-valor">{t.valor}</span>
          <span className="tarjeta-titulo">{t.titulo}</span>
          {t.detalle && <span id="detalle-disponibles" role="tooltip" className="tarjeta-detalle">{t.detalle}</span>}
        </div>
      ))}
    </section>
  );
}
