import { DIAS_RECURRENCIA, fechasDeSerie, type Recurrencia } from '../../services/recurrencia';
import { diaDe, formatearSemana, lunesDe, sumarDias } from '../../utils/fechas';
import { NavegadorFecha } from './NavegadorFecha';

/** Título, botones Hoy y ‹ ›, la semana, el menú de año, mes y día, y el botón para reservar. */
export function BarraSemana({ titulo, elegido, onElegir, onNueva }: {
  titulo: string;
  elegido: string;
  onElegir: (dia: string) => void;
  onNueva: () => void;
}) {
  return (
    <div className="salas-barra">
      <div className="salas-navegacion">
        <h2>{titulo}</h2>
        <button onClick={() => onElegir(diaDe())}>Hoy</button>
        <button className="boton-icono" onClick={() => onElegir(sumarDias(elegido, -7))} aria-label="Semana anterior" title="Semana anterior">‹</button>
        <button className="boton-icono" onClick={() => onElegir(sumarDias(elegido, 7))} aria-label="Semana siguiente" title="Semana siguiente">›</button>
        <strong className="salas-semana">{formatearSemana(lunesDe(elegido))}</strong>
        <NavegadorFecha dia={elegido} onCambiar={onElegir} />
      </div>
      <button className="primario" onClick={onNueva}>+ Nueva reserva</button>
    </div>
  );
}

/** Botones de colores que muestran u ocultan cada sala o cubículo; a la vez son la leyenda del calendario. */
export function FiltrosPlanner({ grupo, items, ocultos, onOcultos }: {
  grupo: string; // "Salas que se muestran"
  items: { id: string; nombre: string; color: string; detalle: string }[];
  ocultos: string[];
  onOcultos: (ocultos: string[]) => void;
}) {
  return (
    <div className="salas-filtros" role="group" aria-label={grupo}>
      {items.map((s) => {
        const activo = !ocultos.includes(s.id);
        return (
          <button
            key={s.id}
            className={`filtro-sala${activo ? ' activa' : ''}`}
            aria-pressed={activo}
            onClick={() => onOcultos(activo ? [...ocultos, s.id] : ocultos.filter((x) => x !== s.id))}
            title={activo ? 'Ocultar del calendario' : 'Mostrar en el calendario'}
          >
            <span className="punto-sala" style={{ background: s.color }} />
            {s.nombre}
            <span className="secundario">{s.detalle}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Opciones de una reserva recurrente: días de la semana (lunes a sábado), "Válida desde"
 * (la fecha de la reserva) y "Válida hasta", y cuántas reservas se crearán.
 */
export function CampoRecurrencia({ prefijo, desde, onDesde, recurrencia, onRecurrencia }: {
  prefijo: string; // Para los id de los campos: "sala", "registro"
  desde: string;
  onDesde: (fecha: string) => void;
  recurrencia: Recurrencia;
  onRecurrencia: (r: Recurrencia) => void;
}) {
  const { dias, hasta } = recurrencia;
  const alternar = (n: number) =>
    onRecurrencia({ ...recurrencia, dias: dias.includes(n) ? dias.filter((d) => d !== n) : [...dias, n].sort((x, y) => x - y) });
  const total = fechasDeSerie(desde, hasta, dias).length;
  return (
    <fieldset className="ancho recurrencia">
      <legend>Se repite los días</legend>
      <div className="dias-recurrencia" role="group" aria-label="Días de la semana">
        {DIAS_RECURRENCIA.map((d) => (
          <button key={d.numero} type="button" className={dias.includes(d.numero) ? 'activo' : ''}
            aria-pressed={dias.includes(d.numero)} title={d.largo} onClick={() => alternar(d.numero)}>
            {d.corto}
          </button>
        ))}
      </div>
      <div className="campos">
        <label htmlFor={`${prefijo}-desde`}>
          Válida desde
          <input id={`${prefijo}-desde`} type="date" required min={diaDe()} value={desde} onChange={(e) => onDesde(e.target.value)} />
        </label>
        <label htmlFor={`${prefijo}-hasta`}>
          Válida hasta
          <input id={`${prefijo}-hasta`} type="date" required min={desde} value={hasta}
            onChange={(e) => onRecurrencia({ ...recurrencia, hasta: e.target.value })} />
        </label>
      </div>
      <p className="secundario">
        {total === 0 ? 'Elija al menos un día que caiga entre esas fechas.'
          : total === 1 ? 'Se creará 1 reserva.' : `Se crearán ${total} reservas.`}
      </p>
    </fieldset>
  );
}
