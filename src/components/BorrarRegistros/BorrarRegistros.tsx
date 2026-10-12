import { useState, type FormEvent } from 'react';
import { borrarTodosLosRegistros, confirmaConClave, PALABRA_CONFIRMACION } from '../../services/reinicio';
import { descargarRespaldo } from '../../services/respaldo';

/** Borra todos los préstamos y reservas, pidiendo la contraseña para confirmar. */
export function BorrarRegistros({ onBorrado }: { onBorrado: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);

  const cerrar = () => {
    setAbierto(false);
    setConfirmacion('');
  };

  async function respaldar() {
    setTrabajando(true);
    try {
      const total = await descargarRespaldo();
      setMensaje({ texto: `Respaldo descargado con ${total} registros.` });
    } catch (e) {
      setMensaje({ texto: `No se pudo crear el respaldo. ${e instanceof Error ? e.message : String(e)}`, error: true });
    } finally {
      setTrabajando(false);
    }
  }

  async function borrar(e: FormEvent) {
    e.preventDefault();
    setTrabajando(true);
    setMensaje(null);
    try {
      const total = await borrarTodosLosRegistros(confirmacion);
      setMensaje({ texto: `Se borraron ${total} registros. Todo quedó en 0.` });
      cerrar();
      onBorrado();
    } catch (e) {
      setMensaje({ texto: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <section className="panel zona-peligro">
      <h2>Borrar todos los registros</h2>
      <p className="secundario">
        Deja en 0 todos los préstamos de laptops y todas las reservas de cubículos, incluido el historial.
        Las laptops y cubículos en uso quedan disponibles. <strong>No se puede deshacer.</strong>
      </p>
      {!abierto ? (
        <button className="peligro" onClick={() => { setAbierto(true); setMensaje(null); }}>
          Borrar todos los registros…
        </button>
      ) : (
        <form className="confirmar-borrado" onSubmit={borrar}>
          <p>
            Antes de borrar, se recomienda descargar un respaldo.{' '}
            <button type="button" onClick={respaldar} disabled={trabajando}>Descargar respaldo primero</button>
          </p>
          <label htmlFor="borrar-confirmacion">
            {confirmaConClave ? 'Escriba su contraseña para confirmar' : `Escriba ${PALABRA_CONFIRMACION} para confirmar`}
            <input
              id="borrar-confirmacion"
              type={confirmaConClave ? 'password' : 'text'}
              autoComplete={confirmaConClave ? 'current-password' : 'off'}
              required
              autoFocus
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
          </label>
          <div className="acciones-borrado">
            <button type="submit" className="boton-peligro" disabled={trabajando || confirmacion === ''}>
              {trabajando ? 'Un momento…' : 'Borrar todo'}
            </button>
            <button type="button" onClick={cerrar} disabled={trabajando}>Cancelar</button>
          </div>
        </form>
      )}
      {mensaje && <p className={mensaje.error ? 'texto-alerta' : 'secundario'} role="status">{mensaje.texto}</p>}
    </section>
  );
}
