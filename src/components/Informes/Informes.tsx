import { useEffect, useState } from 'react';
import { descargarInformePdf } from '../../services/informePdf';
import { filasInforme, generarInforme, periodoDelMes, type Informe, type Periodo } from '../../services/informeService';
import { formatearDuracion } from '../../utils/fechas';

/** Totales de préstamos y reservas en un rango de fechas, con descarga en PDF. */
export function Informes() {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDelMes());
  const [informe, setInforme] = useState<Informe | null>(null);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  const rangoValido = periodo.desde !== '' && periodo.hasta !== '' && periodo.desde <= periodo.hasta;

  useEffect(() => {
    if (!rangoValido) return;
    let vigente = true;
    generarInforme(periodo)
      .then((i) => { if (vigente) { setInforme(i); setError(''); } })
      .catch((e: unknown) => { if (vigente) setError(e instanceof Error ? e.message : String(e)); });
    return () => { vigente = false; };
  }, [periodo, rangoValido]);

  async function descargar() {
    if (!informe) return;
    setDescargando(true);
    try {
      await descargarInformePdf(informe);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDescargando(false);
    }
  }

  return (
    <main>
      <section className="formulario">
        <h2>Informe de uso</h2>
        <div className="campos">
          <label htmlFor="informe-desde">
            Desde
            <input id="informe-desde" type="date" value={periodo.desde} max={periodo.hasta}
              onChange={(e) => setPeriodo({ ...periodo, desde: e.target.value })} />
          </label>
          <label htmlFor="informe-hasta">
            Hasta
            <input id="informe-hasta" type="date" value={periodo.hasta} min={periodo.desde}
              onChange={(e) => setPeriodo({ ...periodo, hasta: e.target.value })} />
          </label>
        </div>
        {!rangoValido && <p className="texto-alerta">Elija un rango de fechas válido.</p>}
        <button className="primario" disabled={!informe || !rangoValido || descargando} onClick={descargar}>
          {descargando ? 'Preparando PDF…' : 'Descargar PDF'}
        </button>
      </section>

      {error && <div className="aviso aviso-error" role="alert">No se pudo generar el informe. {error}</div>}

      {informe && rangoValido && (
        <section className="resumen informe">
          {filasInforme(informe, formatearDuracion).map((f) => (
            <div key={f.titulo} className="tarjeta">
              <span className="tarjeta-valor">{f.valor}</span>
              <span className="tarjeta-titulo">{f.titulo}</span>
              {f.nota && <span className="secundario">{f.nota}</span>}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
