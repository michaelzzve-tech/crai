/** Casilla para buscar registros por el nombre de quien pidió el préstamo o la reserva. */
export function BuscadorNombre({ valor, onCambio }: { valor: string; onCambio: (v: string) => void }) {
  return (
    <label className="buscador-nombre">
      Buscar por nombre
      <input type="search" placeholder="Escriba un nombre…" value={valor} onChange={(e) => onCambio(e.target.value)} />
    </label>
  );
}
