import { esFecha, type CampoOrden, type Sentido } from '../../hooks/useOrden';

/** Menús "Ordenar por" y "Orden" de las listas de préstamos y reservas. */
export function OrdenLista({ campo, sentido, onCampo, onSentido, textoFecha }: {
  campo: CampoOrden;
  sentido: Sentido;
  onCampo: (c: CampoOrden) => void;
  onSentido: (s: Sentido) => void;
  textoFecha: string; // "Fecha del préstamo", "Fecha de la reserva"
}) {
  const fecha = esFecha(campo);
  return (
    <div className="orden-lista">
      <label>
        Ordenar por
        <select value={campo} onChange={(e) => onCampo(e.target.value as CampoOrden)}>
          <option value="registro">Fecha de registro</option>
          <option value="fecha">{textoFecha}</option>
          <option value="nombre">Nombre</option>
          <option value="carrera">Carrera o año</option>
        </select>
      </label>
      <label>
        Orden
        <select value={sentido} onChange={(e) => onSentido(e.target.value as Sentido)}>
          <option value="desc">{fecha ? 'Más reciente primero' : 'Z → A'}</option>
          <option value="asc">{fecha ? 'Más antiguo primero' : 'A → Z'}</option>
        </select>
      </label>
    </div>
  );
}
