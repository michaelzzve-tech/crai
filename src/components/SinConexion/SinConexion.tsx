import { useEffect, useState } from 'react';
import { useConexion } from '../../hooks/useConexion';

/** Segundos que se muestra "Conexión restablecida" al volver internet. */
const SEGUNDOS_RESTABLECIDA = 4;

/**
 * Franja fija arriba de la pantalla: "Sin conexión a internet" mientras no hay conexión
 * (lo que se guarde puede fallar) y, al volver, "Conexión restablecida" por unos segundos.
 */
export function SinConexion() {
  const enLinea = useConexion();
  const [restablecida, setRestablecida] = useState(false);
  const [anterior, setAnterior] = useState(enLinea);
  if (anterior !== enLinea) {
    setAnterior(enLinea);
    setRestablecida(enLinea);
  }
  useEffect(() => {
    if (!restablecida) return;
    const t = setTimeout(() => setRestablecida(false), SEGUNDOS_RESTABLECIDA * 1000);
    return () => clearTimeout(t);
  }, [restablecida]);

  if (!enLinea) {
    return (
      <div className="sin-conexion" role="alert">
        <strong>Sin conexión a internet.</strong> Revise la red; los cambios pueden no guardarse hasta que vuelva.
      </div>
    );
  }
  if (restablecida) return <div className="sin-conexion restablecida" role="status">Conexión restablecida.</div>;
  return null;
}
