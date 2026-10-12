import { useState } from 'react';
import { descargarRespaldo } from '../../services/respaldo';

/** Botón para descargar en Excel todos los préstamos y reservas guardados. */
export function Respaldo() {
  const [estado, setEstado] = useState<{ texto: string; error?: boolean } | null>(null);
  const [descargando, setDescargando] = useState(false);

  async function descargar() {
    setDescargando(true);
    setEstado(null);
    try {
      const total = await descargarRespaldo();
      setEstado({ texto: `Respaldo descargado con ${total} registros.` });
    } catch (e) {
      setEstado({ texto: `No se pudo crear el respaldo. ${e instanceof Error ? e.message : String(e)}`, error: true });
    } finally {
      setDescargando(false);
    }
  }

  return (
    <section className="panel">
      <h2>Respaldo de datos</h2>
      <p className="secundario">
        Descarga un archivo Excel con todos los préstamos de laptops y todas las reservas de cubículos,
        sin importar las fechas del informe. Guárdalo en un lugar seguro: contiene datos personales.
      </p>
      <button className="primario" onClick={descargar} disabled={descargando}>
        {descargando ? 'Preparando respaldo…' : 'Descargar respaldo (Excel)'}
      </button>
      {estado && <p className={estado.error ? 'texto-alerta' : 'secundario'} role="status">{estado.texto}</p>}
    </section>
  );
}
