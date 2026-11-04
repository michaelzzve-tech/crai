import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Sala } from '../../config/salas';
import type { NuevoMantenimiento } from '../../services/mantenimientoSalas';
import { diaDe, horaActual } from '../../utils/fechas';

interface Props {
  sala: Sala;
  onGuardar: (datos: NuevoMantenimiento) => Promise<void>; // Lanza un error si no se pudo
  onCerrar: () => void;
}

/**
 * Ventana para mandar una sala a mantenimiento: fecha y hora en que comienza (por defecto,
 * ahora). El fin es opcional; si se deja vacío, dura hasta que se marque disponible.
 */
export function FormularioMantenimiento({ sala, onGuardar, onCerrar }: Props) {
  const [datos, setDatos] = useState<NuevoMantenimiento>(() => ({
    salaId: sala.id, fecha: diaDe(), hora: horaActual(), fechaFin: '', horaFin: '', nota: '',
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const ventana = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ventana.current;
    if (d && !d.open) d.showModal();
  }, []);
  const cambiar = (campo: keyof NuevoMantenimiento) => (valor: string) => setDatos({ ...datos, [campo]: valor });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await onGuardar(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGuardando(false);
    }
  }

  return (
    <dialog ref={ventana} className="ventana ventana-chica" onCancel={onCerrar} aria-labelledby="titulo-mantenimiento">
      <form className="formulario-sala" onSubmit={enviar}>
        <div className="panel-encabezado">
          <h2 id="titulo-mantenimiento" className="titulo-sala">
            <span className="punto-sala" style={{ background: sala.color }} />
            Mandar a mantenimiento: {sala.nombre}
          </h2>
          <button type="button" className="boton-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        <div className="campos">
          <label htmlFor="mant-fecha">
            Fecha de inicio
            <input id="mant-fecha" type="date" required min={diaDe()} value={datos.fecha} onChange={(e) => cambiar('fecha')(e.target.value)} />
          </label>
          <label htmlFor="mant-hora">
            Hora de inicio
            <input id="mant-hora" type="time" required value={datos.hora} onChange={(e) => cambiar('hora')(e.target.value)} />
          </label>
          <label htmlFor="mant-fecha-fin">
            Fecha de fin (opcional)
            <input id="mant-fecha-fin" type="date" min={datos.fecha} value={datos.fechaFin} onChange={(e) => cambiar('fechaFin')(e.target.value)} />
          </label>
          <label htmlFor="mant-hora-fin">
            Hora de fin (opcional)
            <input id="mant-hora-fin" type="time" value={datos.horaFin} onChange={(e) => cambiar('horaFin')(e.target.value)} />
          </label>
          <label htmlFor="mant-nota" className="ancho">
            Motivo (opcional)
            <input id="mant-nota" maxLength={120} placeholder="Ej.: pintura, aire acondicionado…" value={datos.nota} onChange={(e) => cambiar('nota')(e.target.value)} />
          </label>
          <p className="secundario ancho">
            Desde ese momento la sala aparece «En mantenimiento» y no se puede reservar. Sin fecha de fin, sigue así hasta que pulse «Marcar disponible».
          </p>
        </div>
        {error && <div className="aviso aviso-error" role="alert">{error}</div>}
        <div className="botones-formulario">
          <button type="submit" className="primario" disabled={guardando}>Mandar a mantenimiento</button>
          <button type="button" onClick={onCerrar}>Cancelar</button>
        </div>
      </form>
    </dialog>
  );
}
