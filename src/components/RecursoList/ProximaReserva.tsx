import { diaDe, formatearDia, formatearDuracion, formatearHora } from '../../utils/fechas';
import { cierreDeHoy, minutosLibresHoy } from '../../utils/horario';
import { EstadoBadge } from '../EstadoBadge';

/**
 * "Programada" y, si el recurso (cubículo o sala) está libre ahora, cuánto tiempo lo seguirá hoy: hasta su
 * próxima reserva o hasta el cierre (las horas libres no se suman de un día a otro;
 * config/horario.ts). Si está en uso, cuándo es esa próxima reserva.
 */
export function ProximaReserva({ inicio: inicioIso, nombre, libre, ahora }: {
  inicio: string; // Inicio de la próxima reserva, ISO 8601
  nombre: string; // Quién reservó
  libre: boolean;
  ahora: Date;
}) {
  const inicio = new Date(inicioIso);
  const dia = diaDe(inicioIso);
  const esHoy = dia === diaDe(ahora);
  const cuando = `${esHoy ? 'hoy' : `el ${formatearDia(dia)}`} a las ${formatearHora(inicioIso)}`;
  const libreHoy = minutosLibresHoy(ahora, inicio);
  let texto;
  if (!libre) {
    texto = <>Próxima reserva {cuando} ({nombre}){esHoy ? <>, en {formatearDuracion(minutosLibresHoy(ahora, inicio) ?? 0)}</> : null}.</>;
  } else if (libreHoy === null) {
    texto = <>Biblioteca cerrada. Próxima reserva {cuando} ({nombre}).</>;
  } else if (esHoy) {
    texto = <>Libre por <strong>{formatearDuracion(libreHoy)}</strong>, hasta su reserva {cuando} ({nombre}).</>;
  } else {
    texto = <>Libre por <strong>{formatearDuracion(libreHoy)}</strong> hoy, hasta el cierre ({formatearHora(cierreDeHoy(ahora))}). Próxima reserva {cuando} ({nombre}).</>;
  }
  return (
    <>
      {' '}<EstadoBadge estado="programado" />
      <div className="secundario">{texto}</div>
    </>
  );
}
