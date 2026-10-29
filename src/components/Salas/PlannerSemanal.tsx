import type { CSSProperties, MouseEvent } from 'react';
import { HORA_APERTURA, HORA_CIERRE, salaPorId } from '../../config/salas';
import type { ReservaSala } from '../../types';
import { diaDe, formatearDiaCorto, formatearHora, minutosDelDia, sumarDias } from '../../utils/fechas';

/** Alto en píxeles de una hora en el calendario. */
const ALTO_HORA = 56;
const INICIO = HORA_APERTURA * 60;
const FIN = HORA_CIERRE * 60;
const HORAS = Array.from({ length: HORA_CIERRE - HORA_APERTURA }, (_, i) => HORA_APERTURA + i);

const dosDigitos = (n: number) => String(n).padStart(2, '0');
/** "7 a. m.", "1 p. m." */
const etiquetaHora = (h: number) => `${h % 12 || 12} ${h < 12 ? 'a. m.' : 'p. m.'}`;

interface Ubicada {
  reserva: ReservaSala;
  desde: number; // Minutos desde la apertura
  hasta: number;
  carril: number; // Columna dentro del día cuando hay reservas a la misma hora
  carriles: number;
}

/**
 * Coloca las reservas de un día. Las que se cruzan en horario (de salas distintas)
 * se reparten en carriles lado a lado, como en un planificador.
 */
function ubicar(reservas: ReservaSala[]): Ubicada[] {
  const lista = reservas
    .map((reserva) => ({
      reserva,
      desde: Math.max(INICIO, minutosDelDia(reserva.inicio)) - INICIO,
      hasta: Math.min(FIN, Math.max(minutosDelDia(reserva.fin), minutosDelDia(reserva.inicio) + 15)) - INICIO,
      carril: 0,
      carriles: 1,
    }))
    .sort((a, b) => a.desde - b.desde || b.hasta - a.hasta);

  // Grupos de reservas que se cruzan entre sí; cada grupo reparte su ancho.
  let grupo: Ubicada[] = [];
  let finGrupo = -1;
  const cerrar = () => {
    const total = Math.max(...grupo.map((u) => u.carril)) + 1;
    grupo.forEach((u) => { u.carriles = total; });
    grupo = [];
  };
  for (const u of lista) {
    if (grupo.length && u.desde >= finGrupo) cerrar();
    const ocupados = new Set(grupo.filter((g) => g.hasta > u.desde).map((g) => g.carril));
    while (ocupados.has(u.carril)) u.carril++;
    grupo.push(u);
    finGrupo = Math.max(finGrupo, u.hasta);
  }
  if (grupo.length) cerrar();
  return lista;
}

interface Props {
  lunes: string; // Primer día de la semana, "AAAA-MM-DD"
  reservas: ReservaSala[];
  onNueva: (dia: string, hora: string) => void;
  onAbrir: (reserva: ReservaSala) => void;
}

/** Calendario de la semana (lunes a domingo, por horas) con las reservas de las salas. */
export function PlannerSemanal({ lunes, reservas, onNueva, onAbrir }: Props) {
  const hoy = diaDe();
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

  // Clic en un espacio libre: nueva reserva a esa hora (redondeada a la media hora).
  const clicEnDia = (dia: string) => (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const y = e.nativeEvent.offsetY;
    const minutos = INICIO + Math.floor((y / ALTO_HORA) * 2) * 30;
    const tope = Math.min(minutos, FIN - 60);
    onNueva(dia, `${dosDigitos(Math.floor(tope / 60))}:${dosDigitos(tope % 60)}`);
  };

  return (
    <div className="planner" style={{ '--alto-hora': `${ALTO_HORA}px` } as CSSProperties}>
      <div className="planner-esquina" />
      {dias.map((dia) => (
        <div key={dia} className={`planner-dia-titulo${dia === hoy ? ' hoy' : ''}`}>{formatearDiaCorto(dia)}</div>
      ))}

      <div className="planner-horas">
        {HORAS.map((h) => <span key={h} style={{ top: (h - HORA_APERTURA) * ALTO_HORA }}>{etiquetaHora(h)}</span>)}
      </div>
      {dias.map((dia) => (
        <div
          key={dia}
          className={`planner-columna${dia === hoy ? ' hoy' : ''}${dia < hoy ? ' pasado' : ''}`}
          style={{ height: HORAS.length * ALTO_HORA }}
          onClick={dia < hoy ? undefined : clicEnDia(dia)}
          title={dia < hoy ? undefined : 'Clic en un espacio libre para reservar'}
        >
          {ubicar(reservas.filter((r) => diaDe(r.inicio) === dia)).map((u) => {
            const sala = salaPorId(u.reserva.salaId);
            const alto = ((u.hasta - u.desde) / 60) * ALTO_HORA;
            return (
              <button
                key={u.reserva.id}
                type="button"
                className={`reserva-sala${alto < 48 ? ' compacta' : ''}`}
                style={{
                  top: (u.desde / 60) * ALTO_HORA,
                  height: alto - 2,
                  left: `calc(${(u.carril / u.carriles) * 100}% + 2px)`,
                  width: `calc(${100 / u.carriles}% - 4px)`,
                  '--color-sala': sala?.color ?? '#7b8794',
                } as CSSProperties}
                onClick={() => onAbrir(u.reserva)}
                title={`${sala?.nombre ?? u.reserva.salaId} · ${formatearHora(u.reserva.inicio)} – ${formatearHora(u.reserva.fin)} · ${u.reserva.actividad}`}
              >
                <strong>{sala?.nombre.replace('Sala ', '') ?? u.reserva.salaId}</strong>
                <span>{formatearHora(u.reserva.inicio)} – {formatearHora(u.reserva.fin)}</span>
                <span>{u.reserva.actividad} · {u.reserva.usuarios} pers.</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
