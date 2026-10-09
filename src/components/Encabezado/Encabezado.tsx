export type Pestana = 'prestamos' | 'laptops' | 'historial';

const PESTANAS: { id: Pestana; titulo: string }[] = [
  { id: 'prestamos', titulo: 'Préstamos' },
  { id: 'laptops', titulo: 'Inventario de laptops' },
  { id: 'historial', titulo: 'Historial' },
];

interface Props {
  activa: Pestana;
  onCambiar: (pestana: Pestana) => void;
  correo?: string;
  onCerrarSesion?: () => void;
}

export function Encabezado({ activa, onCambiar, correo, onCerrarSesion }: Props) {
  return (
    <header className="encabezado">
      <div className="encabezado-fila">
        <h1>Préstamo de laptops · Biblioteca</h1>
        {onCerrarSesion && (
          <div className="sesion">
            <span>{correo}</span>
            <button className="pestana" onClick={onCerrarSesion}>Cerrar sesión</button>
          </div>
        )}
      </div>
      <nav className="pestanas">
        {PESTANAS.map((p) => (
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
