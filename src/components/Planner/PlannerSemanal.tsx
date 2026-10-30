import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { HORA_APERTURA, HORA_CIERRE } from '../../config/salas';
import { diaDe, formatearDiaCorto, minutosDelDia, sumarDias } from '../../utils/fechas';

/** Alto en píxeles de una hora en el calendario. */
const ALTO_HORA = 56;
const INICIO = HORA_APERTURA * 60;
const FIN = HORA_CIERRE * 60;
const HORAS = Array.from({ length: HORA_CIERRE - HORA_APERTURA }, (_, i) => HORA_APERTURA + i);

const dosDigitos = (n: number) => String(n).padStart(2, '0');
/** "HH:MM" para los minutos desde la medianoche. */
const aHora = (minutos: number) => `${dosDigitos(Math.floor(minutos / 60))}:${dosDigitos(minutos % 60)}`;
/** "9:15 a. m." para los minutos desde la medianoche. */
const aHora12 = (minutos: number) => {
  const h = Math.floor(minutos / 60);
  return `${h % 12 || 12}:${dosDigitos(minutos % 60)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
/** Al arrastrar, la hora salta de 15 en 15 minutos. */
const PASO = 15;
/** "7 a. m.", "1 p. m." */
const etiquetaHora = (h: number) => `${h % 12 || 12} ${h < 12 ? 'a. m.' : 'p. m.'}`;

/** Una reserva tal como se dibuja en el calendario (de una sala, de un cubículo…). */
export interface EventoPlanner {
  id: string;
  inicio: string; // ISO 8601
  fin: string; // ISO 8601
  color: string;
  titulo: string; // Primera línea: "Javier", "Cubículo 3"
  lineas: string[]; // Líneas siguientes, que se ocultan si no caben
  datos: [string, string][]; // Todos los datos registrados, para la vista previa al pasar el mouse
  movible: boolean; // false: no se puede arrastrar (por ejemplo, una reserva ya terminada)
  atenuado?: boolean; // Se muestra más claro (terminada)
}

interface Ubicada {
  reserva: EventoPlanner;
  desde: number; // Minutos desde la apertura
  hasta: number;
  carril: number; // Columna dentro del día cuando hay reservas a la misma hora
  carriles: number;
}

/**
 * Coloca las reservas de un día. Las que se cruzan en horario (de salas o cubículos distintos)
 * se reparten en carriles lado a lado, como en un planificador.
 */
function ubicar(reservas: EventoPlanner[]): Ubicada[] {
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
  elegido: string; // Día elegido en el menú de fecha; se resalta
  onElegir: (dia: string) => void;
  reservas: EventoPlanner[];
  onNueva: (dia: string, hora: string) => void;
  onAbrir: (reserva: EventoPlanner) => void;
  onMover: (reserva: EventoPlanner, dia: string, hora: string) => void; // Al soltar una reserva arrastrada
}

/** Reserva que se está arrastrando y adónde iría si se suelta ahora. */
interface Arrastre {
  reserva: EventoPlanner;
  x0: number;
  y0: number;
  desde0: number; // Minutos desde la apertura al empezar
  duracion: number; // Minutos
  dia: string;
  desde: number;
  movido: boolean; // false mientras el puntero no se aleja: entonces es un clic
}

/** Calendario de la semana (lunes a domingo, por horas) con reservas que se abren con un clic y se arrastran. */
export function PlannerSemanal({ lunes, elegido, onElegir, reservas, onNueva, onAbrir, onMover }: Props) {
  const hoy = diaDe();
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [previa, setPrevia] = useState<string | null>(null); // Reserva bajo el mouse: se muestran todos sus datos
  const grilla = useRef<HTMLDivElement>(null);

  // Arrastrar una reserva (con el mouse o el dedo) la mueve a otro día u hora; la duración se mantiene.
  const empezar = (u: Ubicada) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    if (!u.reserva.movible) {
      onAbrir(u.reserva);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastre({
      reserva: u.reserva, x0: e.clientX, y0: e.clientY, desde0: u.desde,
      duracion: minutosDelDia(u.reserva.fin) - minutosDelDia(u.reserva.inicio),
      dia: diaDe(u.reserva.inicio), desde: u.desde, movido: false,
    });
  };
  const mover = (e: PointerEvent<HTMLButtonElement>) => {
    if (!arrastre) return;
    const movido = arrastre.movido || Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0) > 6;
    if (!movido) return;
    // Día: la columna que está bajo el puntero (o la más cercana).
    const columnas = [...(grilla.current?.querySelectorAll<HTMLElement>('.planner-columna') ?? [])];
    const centros = columnas.map((c) => { const r = c.getBoundingClientRect(); return r.left + r.width / 2; });
    const cercana = centros.reduce((mejor, c, i) => (Math.abs(c - e.clientX) < Math.abs(centros[mejor] - e.clientX) ? i : mejor), 0);
    // Hora: lo que se desplazó en vertical, en pasos de 15 minutos y dentro del horario.
    const minutos = arrastre.desde0 + ((e.clientY - arrastre.y0) / ALTO_HORA) * 60;
    const desde = Math.min(Math.max(0, Math.round(minutos / PASO) * PASO), FIN - INICIO - arrastre.duracion);
    setArrastre({ ...arrastre, movido, dia: dias[cercana] ?? arrastre.dia, desde: Math.max(0, desde) });
  };
  const soltar = () => {
    if (!arrastre) return;
    setArrastre(null);
    if (!arrastre.movido) {
      onAbrir(arrastre.reserva);
      return;
    }
    const cambio = arrastre.dia !== diaDe(arrastre.reserva.inicio) || arrastre.desde !== arrastre.desde0;
    if (cambio) onMover(arrastre.reserva, arrastre.dia, aHora(INICIO + arrastre.desde));
  };

  // Clic en un espacio libre: nueva reserva a esa hora (redondeada a la media hora).
  const clicEnDia = (dia: string) => (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const y = e.nativeEvent.offsetY;
    const minutos = INICIO + Math.floor((y / ALTO_HORA) * 2) * 30;
    const tope = Math.min(minutos, FIN - 60);
    onNueva(dia, `${dosDigitos(Math.floor(tope / 60))}:${dosDigitos(tope % 60)}`);
  };

  return (
    <div className={`planner${arrastre?.movido ? ' arrastrando' : ''}`} ref={grilla} style={{ '--alto-hora': `${ALTO_HORA}px` } as CSSProperties}>
      <div className="planner-esquina" />
      {dias.map((dia) => (
        <button
          key={dia}
          type="button"
          className={`planner-dia-titulo${dia === hoy ? ' hoy' : ''}${dia === elegido ? ' elegido' : ''}`}
          onClick={() => onElegir(dia)}
        >
          {formatearDiaCorto(dia)}
        </button>
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
            const alto = ((u.hasta - u.desde) / 60) * ALTO_HORA;
            return (
              <button
                key={u.reserva.id}
                type="button"
                className={`reserva-sala${alto < 48 ? ' compacta' : ''}${u.carriles > 3 ? ' angosta' : ''}${u.reserva.atenuado ? ' atenuada' : ''}${u.reserva.movible ? '' : ' fija'}${arrastre?.movido && arrastre.reserva.id === u.reserva.id ? ' origen' : ''}`}
                style={{
                  top: (u.desde / 60) * ALTO_HORA,
                  height: alto - 2,
                  left: `calc(${(u.carril / u.carriles) * 100}% + 2px)`,
                  width: `calc(${100 / u.carriles}% - 4px)`,
                  '--color-sala': u.reserva.color,
                } as CSSProperties}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPrevia(u.reserva.id); }}
                onPointerLeave={() => setPrevia(null)}
                onFocus={() => setPrevia(u.reserva.id)}
                onBlur={() => setPrevia(null)}
                onPointerDown={empezar(u)}
                onPointerMove={mover}
                onPointerUp={soltar}
                onPointerCancel={() => setArrastre(null)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(u.reserva); } }}
                aria-label={u.reserva.datos.map(([t, v]) => `${t}: ${v}`).join('. ')}
              >
                <strong>{u.reserva.titulo}</strong>
                {/* Solo las líneas que caben enteras (unos 16 px cada una); el resto se ve en la vista previa. */}
                {u.reserva.lineas.slice(0, Math.max(1, Math.floor((alto - 10) / 16) - 1)).map((l, i) => <span key={i}>{l}</span>)}
              </button>
            );
          })}
          {(() => {
            // Vista previa: a la derecha de la ficha (a la izquierda en sábado y domingo), hacia arriba si es tarde.
            const u = !arrastre?.movido && ubicar(reservas.filter((r) => diaDe(r.inicio) === dia)).find((x) => x.reserva.id === previa);
            if (!u) return null;
            const columna = dias.indexOf(dia);
            const abajo = u.desde > (FIN - INICIO) / 2;
            return (
              <div
                className={`vista-previa${columna >= 5 ? ' izquierda' : ''}`}
                style={{
                  top: abajo ? undefined : (u.desde / 60) * ALTO_HORA,
                  bottom: abajo ? HORAS.length * ALTO_HORA - (u.hasta / 60) * ALTO_HORA : undefined,
                  '--color-sala': u.reserva.color,
                } as CSSProperties}
                role="tooltip"
              >
                <strong>{u.reserva.titulo}</strong>
                <dl>
                  {u.reserva.datos.map(([t, v]) => <div key={t}><dt>{t}</dt><dd>{v}</dd></div>)}
                </dl>
                {u.reserva.movible && <p>Arrastre para cambiar de día u hora; clic para ver o modificar.</p>}
              </div>
            );
          })()}
          {arrastre?.movido && arrastre.dia === dia && (
            <div
              className={`reserva-sala fantasma${dia < hoy ? ' invalido' : ''}`}
              style={{
                top: (arrastre.desde / 60) * ALTO_HORA,
                height: (arrastre.duracion / 60) * ALTO_HORA - 2,
                left: 2,
                width: 'calc(100% - 4px)',
                '--color-sala': arrastre.reserva.color,
              } as CSSProperties}
            >
              <strong>{dia < hoy ? 'Día pasado' : arrastre.reserva.titulo}</strong>
              <span>{aHora12(INICIO + arrastre.desde)} – {aHora12(INICIO + arrastre.desde + arrastre.duracion)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
