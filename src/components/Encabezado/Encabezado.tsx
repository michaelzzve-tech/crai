import type { Modulo } from '../../config/modulos';

export type Pestana = 'registro' | 'recursos' | 'historial';

interface Props {
  modulos: Modulo[];
  modulo: Modulo;
  onCambiarModulo: (modulo: Modulo) => void;
  activa: Pestana;
  onCambiar: (pestana: Pestana) => void;
  correo?: string;
  onCerrarSesion?: () => void;
}

/** Título, selector de módulo (laptops, cubículos…) y pestañas del módulo. */
export function Encabezado({ modulos, modulo, onCambiarModulo, activa, onCambiar, correo, onCerrarSesion }: Props) {
  const pestanas: { id: Pestana; titulo: string }[] = [
    { id: 'registro', titulo: modulo.registros },
    { id: 'recursos', titulo: modulo.recursos },
    { id: 'historial', titulo: 'Historial' },
  ];

  return (
    <header className="encabezado">
      <div className="encabezado-fila">
        <h1>Biblioteca · Préstamos y reservas</h1>
        {onCerrarSesion && (
          <div className="sesion">
            <span>{correo}</span>
            <button className="pestana" onClick={onCerrarSesion}>Cerrar sesión</button>
          </div>
        )}
      </div>
      <nav className="modulos" aria-label="Módulo">
        {modulos.map((m) => (
          <button
            key={m.id}
            className={m.id === modulo.id ? 'modulo activo' : 'modulo'}
            onClick={() => onCambiarModulo(m)}
          >
            {m.recursos}
          </button>
        ))}
      </nav>
      <nav className="pestanas" aria-label="Sección">
        {pestanas.map((p) => (
          <button
            key={p.id}
            className={p.id === activa ? 'pestana activa' : 'pestana'}
            onClick={() => onCambiar(p.id)}
          >
            {p.titulo}
          </button>
        ))}
      </nav>
    </header>
  );
}
