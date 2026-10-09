export type Pestana = 'prestamos' | 'laptops' | 'historial';

const PESTANAS: { id: Pestana; titulo: string }[] = [
  { id: 'prestamos', titulo: 'Préstamos' },
  { id: 'laptops', titulo: 'Inventario de laptops' },
  { id: 'historial', titulo: 'Historial' },
];

interface Props {
  activa: Pestana;
  onCambiar: (pestana: Pestana) => void;
}

export function Encabezado({ activa, onCambiar }: Props) {
  return (
    <header className="encabezado">
      <h1>Préstamo de laptops · Biblioteca</h1>
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
