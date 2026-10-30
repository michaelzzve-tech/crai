import { useState, type FormEvent } from 'react';
import {
  exportarCopia, importarCopia, leerCopia, PALABRA_IMPORTAR, resumirCopia,
  type CopiaCompleta as Copia, type ResumenCopia,
} from '../../services/copiaCompleta';
import { confirmaConClave } from '../../services/reinicio';
import { formatearFecha } from '../../utils/fechas';

const detalle = (r: ResumenCopia) => r.partes.map((p) => `${p.cantidad} ${p.titulo.toLowerCase()}`).join(', ');

/**
 * Exporta toda la información del sistema a un archivo y la restaura desde
 * ese archivo. Importar reemplaza lo que hay, por eso pide confirmación.
 */
export function CopiaCompleta({ onImportado }: { onImportado: () => void }) {
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);
  const [copia, setCopia] = useState<Copia | null>(null); // Archivo elegido, aún sin importar
  const [resumen, setResumen] = useState<ResumenCopia | null>(null);
  const [confirmacion, setConfirmacion] = useState('');
  const [archivo, setArchivo] = useState(0); // Sube para vaciar el selector de archivo

  const error = (e: unknown) => setMensaje({ texto: e instanceof Error ? e.message : String(e), error: true });

  async function exportar() {
    setTrabajando(true);
    setMensaje(null);
    try {
      const r = await exportarCopia();
      setMensaje({ texto: `Copia completa descargada: ${detalle(r)}.` });
    } catch (e) {
      error(e);
    } finally {
      setTrabajando(false);
    }
  }

  async function elegir(lista: FileList | null) {
    setMensaje(null);
    setCopia(null);
    const elegido = lista?.[0];
    if (!elegido) return;
    try {
      const c = await leerCopia(elegido);
      setCopia(c);
      setResumen(resumirCopia(c));
    } catch (e) {
      error(e);
      setArchivo((n) => n + 1);
    }
  }

  const cancelar = () => {
    setCopia(null);
    setConfirmacion('');
    setArchivo((n) => n + 1);
  };

  async function importar(e: FormEvent) {
    e.preventDefault();
    if (!copia) return;
    setTrabajando(true);
    setMensaje(null);
    try {
      const r = await importarCopia(copia, confirmacion);
      setMensaje({ texto: `Información restaurada: ${detalle(r)}.` });
      cancelar();
      onImportado();
    } catch (e) {
      error(e);
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <section className="panel">
      <h2>Copia completa del sistema</h2>
      <p className="secundario">
        Guarda en un solo archivo toda la información cargada: laptops y cubículos (con su estado), préstamos,
        reservas de cubículos y de salas especiales. Ese archivo se puede importar después para dejar el sistema
        exactamente como estaba, en esta misma computadora o en otra. Contiene datos personales: guárdalo en un lugar seguro.
      </p>
      <div className="acciones-copia">
        <button className="primario" onClick={exportar} disabled={trabajando}>Exportar copia completa</button>
        <label className="boton" htmlFor="copia-archivo">
          Importar copia…
          <input key={archivo} id="copia-archivo" type="file" accept=".json,application/json" className="oculto"
            disabled={trabajando} onChange={(e) => void elegir(e.target.files)} />
        </label>
      </div>

      {copia && resumen && (
        <form className="confirmar-borrado" onSubmit={importar}>
          <p>
            Copia del <strong>{formatearFecha(resumen.creada)}</strong> con {detalle(resumen)}.
          </p>
          <p className="texto-alerta">
            Importarla <strong>reemplaza toda la información actual</strong>: lo que no esté en la copia se borra.
            No se puede deshacer.{' '}
            <button type="button" onClick={exportar} disabled={trabajando}>Exportar la información actual primero</button>
          </p>
          <label htmlFor="copia-confirmacion">
            {confirmaConClave ? 'Escriba su contraseña para confirmar' : `Escriba ${PALABRA_IMPORTAR} para confirmar`}
            <input
              id="copia-confirmacion"
              type={confirmaConClave ? 'password' : 'text'}
              autoComplete={confirmaConClave ? 'current-password' : 'off'}
              required
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
          </label>
          <div className="acciones-borrado">
            <button type="submit" className="boton-peligro" disabled={trabajando || confirmacion === ''}>
              {trabajando ? 'Importando…' : 'Reemplazar con la copia'}
            </button>
            <button type="button" onClick={cancelar} disabled={trabajando}>Cancelar</button>
          </div>
        </form>
      )}
      {mensaje && <p className={mensaje.error ? 'texto-alerta' : 'secundario'} role="status">{mensaje.texto}</p>}
    </section>
  );
}
