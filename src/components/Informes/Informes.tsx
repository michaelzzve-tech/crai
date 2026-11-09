import { useEffect, useState } from 'react';
import { descargarInformePdf } from '../../services/informePdf';
import {
  dosCifras, generarInforme, horasCortas, lineasGrupo, lineasInstitucion, OPCIONES_FILTRO, periodoDelMes, periodoDeMes,
  SIN_FILTRO, type Cuadro, type FiltroInforme, type HorasLaptops, type Informe, type Periodo, type Servicio,
} from '../../services/informeService';
import { BorrarRegistros } from '../BorrarRegistros';
import { CopiaCompleta } from '../CopiaCompleta';
import { Respaldo } from '../Respaldo';
import { GraficaLineas } from './GraficaLineas';

/** Sección 3 del reporte: totales del servicio y el detalle por institución. */
function BloqueServicio({ servicio, conDetalle }: { servicio: Servicio; conDetalle: boolean }) {
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
              {lineasInstitucion(b, servicio).map((l) => <li key={l}>{l}</li>)}
              {b.grupos.map((g) => (
                <li key={g.titulo}>
                  {g.titulo}:
                  <ul>{lineasGrupo(g, servicio).map((l) => <li key={l}>{l}</li>)}</ul>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>}
    </section>
  );
}

/** Horas de préstamo de laptops de cada mes del año, con lo acumulado hasta ese mes. */
function TablaHorasLaptops({ horas }: { horas: HorasLaptops }) {
  const total = horas.meses.reduce((t, m) => t + m.prestamos, 0);
  const ultimo = horas.meses[horas.meses.length - 1];
  return (
    <section className="panel">
      <h3>Horas de préstamo de laptops por mes ({horas.anio})</h3>
      <div className="tabla-cuadro">
        <table className="tabla-horas">
          <thead>
            <tr>
              <th>Mes</th>
              <th className="numero">Préstamos</th>
              <th className="numero">Horas del mes</th>
              <th className="numero">Acumulado del año</th>
            </tr>
          </thead>
          <tbody>
            {horas.meses.map((m) => (
              <tr key={m.mes}>
                <td>{m.mes}</td>
                <td className="numero">{m.prestamos}</td>
                <td className="numero">{horasCortas(m.minutos)}</td>
                <td className="numero">{horasCortas(m.acumulado)}</td>
              </tr>
            ))}
            <tr className="fila-total">
              <td>TOTAL</td>
              <td className="numero">{total}</td>
              <td className="numero">{horasCortas(ultimo?.acumulado ?? 0)}</td>
              <td className="numero">{horasCortas(ultimo?.acumulado ?? 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3>Horas por laptop ({horas.anio})</h3>
      {horas.porLaptop.length === 0 ? (
        <p className="vacio">No hubo préstamos de laptops en el año.</p>
      ) : (
        <div className="tabla-cuadro">
          <table>
            <thead>
              <tr>
                <th>Laptop</th>
                {horas.meses.map((m) => <th key={m.mes} className="numero">{m.mes.slice(0, 3)}</th>)}
                <th className="numero">Total</th>
                <th className="numero">Préstamos</th>
              </tr>
            </thead>
            <tbody>
              {horas.porLaptop.map((l) => (
                <tr key={l.laptop}>
                  <td>{l.laptop}</td>
                  {l.minutos.map((v, i) => <td key={i} className="numero">{v ? horasCortas(v) : '–'}</td>)}
                  <td className="numero"><strong>{horasCortas(l.total)}</strong></td>
                  <td className="numero">{l.prestamos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="secundario">Horas:minutos, de la salida de cada laptop a su devolución. Los préstamos sin devolver todavía no suman.
        En "Horas por laptop" salen solo las laptops que se prestaron en el año.</p>
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

/** Botones para elegir varias opciones; sin ninguna elegida, entran todas. */
function Opciones({ titulo, opciones, elegidas, etiqueta = (o) => o, onCambio }: {
  titulo: string;
  opciones: string[];
  elegidas: string[];
  etiqueta?: (o: string) => string;
  onCambio: (elegidas: string[]) => void;
}) {
  return (
    <div className="filtro-opciones" role="group" aria-label={titulo}>
      <span>{titulo}</span>
      <div className="dias-recurrencia">
        {opciones.map((o) => {
          const activa = elegidas.includes(o);
          return (
            <button key={o} type="button" className={activa ? 'activo' : ''} aria-pressed={activa}
              onClick={() => onCambio(activa ? elegidas.filter((e) => e !== o) : opciones.filter((x) => x === o || elegidas.includes(x)))}>
              {etiqueta(o)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Horario, instituciones, carreras, años y duración de los registros que entran en el informe y el PDF. */
function Filtros({ filtro, onCambio }: { filtro: FiltroInforme; onCambio: (f: FiltroInforme) => void }) {
  const cambiar = (cambios: Partial<FiltroInforme>) => onCambio({ ...filtro, ...cambios });
  const activo = JSON.stringify(filtro) !== JSON.stringify(SIN_FILTRO);
  return (
    <fieldset className="recurrencia filtros-informe">
      <legend>Filtros del informe y del PDF</legend>
      <div className="campos">
        <label htmlFor="filtro-hora-desde">
          Hora de inicio desde
          <input id="filtro-hora-desde" type="time" value={filtro.horaDesde} max={filtro.horaHasta || undefined}
            onChange={(e) => cambiar({ horaDesde: e.target.value })} />
        </label>
        <label htmlFor="filtro-hora-hasta">
          Hora de inicio hasta
          <input id="filtro-hora-hasta" type="time" value={filtro.horaHasta} min={filtro.horaDesde || undefined}
            onChange={(e) => cambiar({ horaHasta: e.target.value })} />
        </label>
        <label htmlFor="filtro-horas-min">
          Duración mínima (horas)
          <input id="filtro-horas-min" type="number" min="0" step="0.5" inputMode="decimal" placeholder="Sin mínimo"
            value={filtro.horasMin} onChange={(e) => cambiar({ horasMin: e.target.value })} />
        </label>
        <label htmlFor="filtro-horas-max">
          Duración máxima (horas)
          <input id="filtro-horas-max" type="number" min="0" step="0.5" inputMode="decimal" placeholder="Sin máximo"
            value={filtro.horasMax} onChange={(e) => cambiar({ horasMax: e.target.value })} />
        </label>
      </div>
      <Opciones titulo="Instituciones" opciones={OPCIONES_FILTRO.instituciones} elegidas={filtro.instituciones}
        onCambio={(instituciones) => cambiar({ instituciones })} />
      <Opciones titulo="Carreras" opciones={OPCIONES_FILTRO.carreras} elegidas={filtro.carreras}
        onCambio={(carreras) => cambiar({ carreras })} />
      <Opciones titulo="Años (ITJO)" opciones={OPCIONES_FILTRO.anios} elegidas={filtro.anios} etiqueta={(a) => `Año ${a}`}
        onCambio={(anios) => cambiar({ anios })} />
      <div className="filtros-pie">
        <p className="secundario">Si no elige ninguna opción de un grupo, entran todas. Las carreras y los años se suman entre sí.</p>
        {activo && <button type="button" onClick={() => onCambio(SIN_FILTRO)}>Quitar filtros</button>}
      </div>
    </fieldset>
  );
}

/** Informe con el formato del reporte mensual del CRAI, con descarga en PDF. */
export function Informes() {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoDelMes());
  const [filtro, setFiltro] = useState<FiltroInforme>(SIN_FILTRO);
  const [version, setVersion] = useState(0); // Sube tras borrar todo, para recalcular
  const [informe, setInforme] = useState<Informe | null>(null);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  const rangoValido = periodo.desde !== '' && periodo.hasta !== '' && periodo.desde <= periodo.hasta;
  const errorFiltro =
    filtro.horaDesde && filtro.horaHasta && filtro.horaDesde > filtro.horaHasta ? 'La hora "desde" debe ser anterior a la hora "hasta".'
    : [filtro.horasMin, filtro.horasMax].some((h) => h !== '' && !(Number(h) >= 0)) ? 'La duración debe ser un número de horas.'
    : filtro.horasMin && filtro.horasMax && Number(filtro.horasMin) > Number(filtro.horasMax) ? 'La duración mínima no puede ser mayor que la máxima.'
    : '';
  const valido = rangoValido && !errorFiltro;

  useEffect(() => {
    if (!valido) return;
    let vigente = true;
    generarInforme(periodo, filtro)
      .then((i) => { if (vigente) { setInforme(i); setError(''); } })
      .catch((e: unknown) => { if (vigente) setError(e instanceof Error ? e.message : String(e)); });
    return () => { vigente = false; };
  }, [periodo, filtro, valido, version]);

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
        <Filtros filtro={filtro} onCambio={setFiltro} />
        {!rangoValido && <p className="texto-alerta">Elija un rango de fechas válido.</p>}
        {errorFiltro && <p className="texto-alerta">{errorFiltro}</p>}
        <button className="primario" disabled={!informe || !valido || descargando} onClick={descargar}>
          {descargando ? 'Preparando PDF…' : 'Descargar PDF'}
        </button>
      </section>

      {error && <div className="aviso aviso-error" role="alert">No se pudo generar el informe. {error}</div>}

      {informe && valido && (
        // `key`: al cambiar el período se vuelve a la vista previa.
        <VistaInforme key={`${periodo.desde}-${periodo.hasta}-${version}`} informe={informe} />
      )}

      <CopiaCompleta onImportado={() => setVersion((v) => v + 1)} />
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
        {informe.filtros.map((f) => <p key={f.etiqueta} className="filtro-portada">{f.etiqueta}: <strong>{f.valor}</strong></p>)}
      </section>

      <h2 className="titulo-seccion-informe">Beneficiarios alcanzados por servicio prestado</h2>
      {informe.servicios.map((s) => <BloqueServicio key={s.titulo} servicio={s} conDetalle={conDetalle} />)}
      <TablaHorasLaptops horas={informe.horasLaptops} />

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
