import { useState } from 'react';
import { descargarRespaldo, MESES } from '../../services/respaldo';
import { diaDe } from '../../utils/fechas';

/** Años que se ofrecen: del actual hacia atrás. */
const ANIO_ACTUAL = Number(diaDe().slice(0, 4));
const ANIOS = Array.from({ length: 6 }, (_, i) => ANIO_ACTUAL - i);

/** Botón para descargar en Excel los préstamos y reservas: todo, un año o un mes. */
export function Respaldo() {
  const [estado, setEstado] = useState<{ texto: string; error?: boolean } | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [anio, setAnio] = useState(0); // 0 = todos los años
  const [mes, setMes] = useState(0); // 0 = todo el año

  async function descargar() {
    setDescargando(true);
    setEstado(null);
    try {
      const total = await descargarRespaldo({ anio: anio || undefined, mes: (anio && mes) || undefined });
      setEstado({ texto: total ? `Respaldo descargado con ${total} registros.` : 'No hay registros en ese período; el archivo se descargó vacío.' });
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
        Descarga un archivo Excel con los préstamos de laptops y las reservas de cubículos: todos, los de
        un año o los de un mes. Guárdalo en un lugar seguro: contiene datos personales.
      </p>
      <div className="campos">
        <label htmlFor="respaldo-anio">
          Año
          <select id="respaldo-anio" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            <option value={0}>Todos los años</option>
            {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label htmlFor="respaldo-mes">
          Mes
          <select id="respaldo-mes" value={anio ? mes : 0} disabled={!anio} onChange={(e) => setMes(Number(e.target.value))}>
            <option value={0}>Todos los meses</option>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
      </div>
      <button className="primario" onClick={descargar} disabled={descargando}>
        {descargando ? 'Preparando respaldo…' : 'Descargar respaldo (Excel)'}
      </button>
      {estado && <p className={estado.error ? 'texto-alerta' : 'secundario'} role="status">{estado.texto}</p>}
    </section>
  );
}
