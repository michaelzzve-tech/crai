/** Qué reservas muestra la lista: las de ahora (en curso) o las programadas a futuro. */
export type GrupoReservas = 'actuales' | 'programadas';

/** Pestañas "Reservas" y "Reservas programadas" de las listas de cubículos y salas especiales. */
export function PestanasReservas({ grupo, onGrupo, actuales, programadas }: {
  grupo: GrupoReservas;
  onGrupo: (g: GrupoReservas) => void;
  actuales: number;
  programadas: number;
}) {
  const opciones: [GrupoReservas, string, number][] = [
    ['actuales', 'Reservas', actuales],
    ['programadas', 'Reservas programadas', programadas],
  ];
  return (
    <div className="pestanas-reservas" role="tablist" aria-label="Qué reservas mostrar">
      {opciones.map(([id, texto, n]) => (
        <button key={id} role="tab" aria-selected={grupo === id} className={grupo === id ? 'activa' : ''} onClick={() => onGrupo(id)}>
          {texto} <span className="cuenta">{n}</span>
        </button>
      ))}
    </div>
  );
}
