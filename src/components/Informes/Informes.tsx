import { useEffect, useState } from 'react';
import { descargarInformePdf } from '../../services/informePdf';
import {
  dosCifras, generarInforme, horasCortas, lineasGrupo, lineasInstitucion, periodoDelMes, periodoDeMes,
  type Cuadro, type Informe, type Periodo, type Servicio,
} from '../../services/informeService';
import { BorrarRegistros } from '../BorrarRegistros';
import { Respaldo } from '../Respaldo';
import { GraficaLineas } from './GraficaLineas';

/** Sección 3 del reporte: totales del servicio y el detalle por institución. */
function BloqueServicio({ servicio, conDetalle }: { servicio: Servicio; conDetalle: boolean }) {
  const conUsuarios = servicio.unidad === 'reservas';
  return (
    <section className="panel servicio-informe">
      <div className="servicio-totales">
        <h3>{servicio.titulo}</h3>
        {servicio.totales.map((t) => (
          <p key={t.etiqueta}>{t.etiqueta}: <strong>{t.valor}</strong></p>
        ))}
      </div>
      {conDetalle && <div className="instituciones-informe">
        {servicio.instituciones.map((b) => (
          <div key={b.nombre}>
            <h4>{b.nombre}</h4>
            <ul>
              {lineasInstitucion(b, servicio.unidad, conUsuarios).map((l) => <li key={l}>{l}</li>)}
              {b.grupos.map((g) => (
                <li key={g.titulo}>
                  {g.titulo}:
                  <ul>{lineasGrupo(g, servicio.unidad).map((l) => <li key={l}>{l}</li>)}</ul>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>}
    </section>
  );
}

/** Sección 4: cuadro de un año (meses en columnas) con su gráfica. */
function CuadroComparativo({ cuadro }: { cuadro: Cuadro }) {
  const formato = (v: number) => (cuadro.horas ? horasCortas(v) : String(v));
  const suma = (valores: number[]) => valores.reduce((a, b) => a + b, 0);
  const totales = cuadro.meses.map((_, i) => suma(cuadro.filas.map((f) => f.valores[i])));
  return (
    <div className="cuadro-comparativo">
      <div className="tabla-cuadro">
        <table>
          <caption>{cuadro.titulo}</caption>
          <thead>
            <tr>
              <th>{cuadro.columna}</th>
              {cuadro.meses.map((m) => <th key={m} className="numero">{m}</th>)}
              <th className="numero">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {cuadro.filas.map((f) => (
              <tr key={f.etiqueta}>
                <td>{f.etiqueta}</td>
                {f.valores.map((v, i) => <td key={i} className="numero">{formato(v)}</td>)}
                <td className="numero"><strong>{formato(suma(f.valores))}</strong></td>
              </tr>
            ))}
            <tr className="fila-total">
              <td>TOTALES</td>
              {totales.map((v, i) => <td key={i} className="numero">{formato(v)}</td>)}
              <td className="numero">{formato(suma(totales))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <GraficaLineas cuadro={cuadro} />
    </div>
  );
}

/** Informe con el formato del reporte mensual del CRAI, con descarga en PDF. */
export function Informes() {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDelMes());
  const [version, setVersion] = useState(0); // Sube tras borrar todo, para recalcular
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
  }, [periodo, rangoValido, version]);

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
      <Respaldo />

      <section className="formulario">
        <h2>Informe de actividades</h2>
        <div className="campos">
          <label htmlFor="informe-mes">
            Mes
            <input id="informe-mes" type="month" value={periodo.desde.slice(0, 7)}
              onChange={(e) => e.target.value && setPeriodo(periodoDeMes(e.target.value))} />
          </label>
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
        // `key`: al cambiar el período se vuelve a la vista previa.
        <VistaInforme key={`${periodo.desde}-${periodo.hasta}-${version}`} informe={informe} />
      )}

      <BorrarRegistros onBorrado={() => setVersion((v) => v + 1)} />
    </main>
  );
}

/**
 * En pantalla el informe empieza como vista previa (portada y totales) y cada
 * "Ver más" agrega una parte: el detalle por institución y luego cada grupo de
 * cuadros comparativos. El PDF siempre trae todo.
 */
function VistaInforme({ informe }: { informe: Informe }) {
  const [partes, setPartes] = useState(0);
  const siguientes = ['Detalle por institución', ...informe.comparativos.map((c) => c.titulo)];
  const conDetalle = partes >= 1;
  const cuadros = informe.comparativos.slice(0, Math.max(0, partes - 1));
  return (
    <>
      <section className="panel portada-informe">
        <p><strong>INFORME DE ACTIVIDADES</strong></p>
        <p><strong>CENTRO DE RECURSOS DE APRENDIZAJE E INVESTIGACIÓN</strong></p>
        <p><strong>BIBLIOTECA HERMANO KORTA S.J.</strong></p>
        <p>Reporte Mensual | <strong>{informe.titulo}</strong></p>
      </section>

      <h2 className="titulo-seccion-informe">Beneficiarios alcanzados por servicio prestado</h2>
      {informe.servicios.map((s) => <BloqueServicio key={s.titulo} servicio={s} conDetalle={conDetalle} />)}

      {cuadros.length > 0 && (
        <>
          <h2 className="titulo-seccion-informe">Cuadros comparativos progresivos</h2>
          <p className="secundario">
            Evolución de los últimos {dosCifras(informe.comparativos[0].cuadros[0].meses.length)} meses, hasta el mes del informe.
          </p>
        </>
      )}
      {cuadros.map((sec) => (
        <section key={sec.titulo} className="panel">
          <h3>{sec.titulo}</h3>
          {sec.cuadros.map((c) => <CuadroComparativo key={c.titulo} cuadro={c} />)}
        </section>
      ))}

      {partes < siguientes.length && (
        <div className="ver-mas">
          <button onClick={() => setPartes(partes + 1)}>Ver más</button>
          <span className="secundario">Sigue: {siguientes[partes].toLowerCase()} ({partes + 1} de {siguientes.length})</span>
        </div>
      )}
    </>
  );
}
