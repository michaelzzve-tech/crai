import type { Modulo } from '../../config/modulos';
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

  const tarjetas = [
    { titulo: `Total de ${modulo.recursos.toLowerCase()}`, valor: recursos.length },
    { titulo: 'Disponibles', valor: contar('disponible') },
    { titulo: `${modulo.ocupado}s`, valor: contar('ocupado') },
    { titulo: 'En mantenimiento', valor: contar('mantenimiento') },
    { titulo: modulo.vencidos, valor: vencidos, alerta: vencidos > 0 },
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
