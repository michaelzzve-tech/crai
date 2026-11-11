import { useState } from 'react';
import { nombreRecurso, type Modulo } from '../../config/modulos';
import { useAhora } from '../../hooks/useAhora';
import { cancelarEnMasa, finalizarEnMasa, gruposEnMasa } from '../../services/registroService';
import type { Recurso, Registro } from '../../types';
import { formatearHora } from '../../utils/fechas';
import { ModificarReserva } from '../RegistroForm';
import type { EjecutarAccion } from '../tipos';

/**
 * Cintillo fijo en la parte inferior con cada préstamo en masa activo o programado: quién lo
 * pidió, una etiqueta "PRÉSTAMO EN MASA" y botones para cancelar, editar o finalizar todos
 * sus préstamos a la vez.
 */
export function CintilloEnMasa({ modulo, recursos, registros, ejecutar }: {
  modulo: Modulo;
  recursos: Recurso[];
  registros: Registro[];
  ejecutar: EjecutarAccion;
}) {
  const ahora = useAhora(30_000);
  const [confirmando, setConfirmando] = useState<{ clave: string; accion: 'cancelar' | 'finalizar' } | null>(null);
  const [editando, setEditando] = useState<Registro[] | null>(null);
  const grupos = gruposEnMasa(registros, modulo);
  if (grupos.length === 0) return null;

  const recursosDe = (g: Registro[]) => `${modulo.recursos.toLowerCase()} ${g.map((r) => nombreRecurso(r.recursoId)).join(', ')}`;

  return (
    <>
      {/* Espacio al final de la página para que el cintillo no tape lo último. */}
      <div className="cintillo-espacio" style={{ height: grupos.length * 64 + 16 }} aria-hidden />
      <aside className="cintillo-masa" aria-label="Préstamos en masa">
        {grupos.map((g) => {
          const clave = g[0].id;
          const programado = new Date(g[0].inicio) > ahora;
          const pregunta = confirmando?.clave === clave ? confirmando.accion : null;
          return (
            <div key={clave} className="cintillo-fila">
              <em className="etiqueta-masa">PRÉSTAMO EN MASA</em>
              <div className="cintillo-texto">
                <strong>{g[0].nombre}</strong>
                <span>
                  {g.length} {modulo.recursos.toLowerCase()} ({g.map((r) => nombreRecurso(r.recursoId)).join(', ')})
                  {' · '}{programado ? 'programado para las' : 'desde las'} {formatearHora(g[0].inicio)}
                </span>
              </div>
              <div className="cintillo-botones">
                {pregunta ? (
                  <>
                    <span>{pregunta === 'cancelar'
                      ? `¿Cancelar los ${g.length} préstamos? Se borran y no cuentan en las estadísticas.`
                      : `¿Finalizar los ${g.length} préstamos ahora?`}</span>
                    <button
                      className={pregunta === 'cancelar' ? 'peligro' : 'primario'}
                      autoFocus
                      onClick={async () => {
                        setConfirmando(null);
                        await (pregunta === 'cancelar'
                          ? ejecutar(() => cancelarEnMasa(modulo, g), `Se cancelaron los ${g.length} préstamos en masa de ${g[0].nombre} (${recursosDe(g)}).`)
                          : ejecutar(() => finalizarEnMasa(modulo, g), `Se finalizaron los ${g.length} préstamos en masa de ${g[0].nombre} (${recursosDe(g)}).`));
                      }}
                    >
                      {pregunta === 'cancelar' ? 'Sí, cancelar todos' : 'Sí, finalizar todos'}
                    </button>
                    <button onClick={() => setConfirmando(null)}>No</button>
                  </>
                ) : (
                  <>
                    <button className="peligro" onClick={() => setConfirmando({ clave, accion: 'cancelar' })}>Cancelar todos</button>
                    <button onClick={() => setEditando(g)}>Editar</button>
                    {!programado && <button className="primario" onClick={() => setConfirmando({ clave, accion: 'finalizar' })}>Finalizar todos</button>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </aside>
      {editando && (
        <ModificarReserva modulo={modulo} recursos={recursos} registro={editando[0]} grupo={editando} ejecutar={ejecutar} onCerrar={() => setEditando(null)} />
      )}
    </>
  );
}
