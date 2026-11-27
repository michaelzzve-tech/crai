import { useState } from 'react';
import { FormularioMantenimiento } from '../Salas/FormularioMantenimiento';
import { enMantenimiento, programarMantenimientoCubiculo, terminarMantenimientoCubiculo, reservasAfectadas } from '../../services/mantenimientoCubiculos';
import { textoMantenimiento } from '../../services/mantenimientoSalas';
import { nombreRecurso, type Modulo } from '../../config/modulos';
import { useAhora } from '../../hooks/useAhora';
import { cambiarMantenimiento } from '../../services/registroService';
import type { MantenimientoCubiculo, Recurso, Registro } from '../../types';
import { EstadoBadge } from '../EstadoBadge';
import { ProximaReserva } from './ProximaReserva';
import { usePaginacion } from '../../hooks/usePaginacion';
import { Paginador } from '../Paginador';
import type { EjecutarAccion } from '../tipos';

interface Props {
  modulo: Modulo;
  recursos: Recurso[];
  registros: Registro[];
  ejecutar: EjecutarAccion;
  mantenimientos: MantenimientoCubiculo[];
}

/** Los recursos del módulo (laptops 1–25 y 59–80, cubículos 1–6 y Podcast…) con su estado. */
export function RecursoList({ modulo, recursos, registros, ejecutar, mantenimientos }: Props) {
  const [seleccionado, setSeleccionado] = useState<Recurso | null>(null);
  const paginacion = usePaginacion(recursos);
  const ahora = useAhora(30_000);
  /** La próxima reserva que todavía no empieza (solo módulos con hora de fin, como cubículos). */
  const proxima = (id: string) => (modulo.conHoraFin
    ? registros
      .filter((g) => g.recursoId === id && !g.finReal && new Date(g.inicio) > ahora)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))[0]
    : undefined);

  const vigente = (id: string) => mantenimientos.find((m) => m.recursoId === id && enMantenimiento(m, ahora));
  const proximoMantenimiento = (id: string) => mantenimientos.filter((m) => m.recursoId === id && new Date(m.inicio) > ahora).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const terminar = (m: MantenimientoCubiculo) => ejecutar(() => terminarMantenimientoCubiculo(m), new Date(m.inicio) > ahora ? 'Mantenimiento programado cancelado.' : 'Mantenimiento terminado.');

  return (
    <section className="panel">
      {seleccionado && (
        <FormularioMantenimiento
          sala={{ id: seleccionado.id, nombre: `${modulo.recurso} ${nombreRecurso(seleccionado.id)}`, color: modulo.colores[modulo.opciones.indexOf(seleccionado.id)] }}
          onCerrar={() => setSeleccionado(null)}
          onGuardar={async (datos) => {
            const m = await programarMantenimientoCubiculo(datos);
            const afectadas = reservasAfectadas(m, registros).length;
            setSeleccionado(null);
            await ejecutar(async () => {}, `Mantenimiento registrado ${textoMantenimiento(m).replace(/\.$/, '')}.${afectadas ? ` Hay ${afectadas} reservas que coinciden; revíselas en el calendario.` : ''}`);
          }}
        />
      )}
      <h2>{modulo.recursos} ({recursos.length})</h2>
      <table>
        <thead>
          <tr>
            <th>{modulo.recurso}</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {paginacion.items.map((r) => (
            <tr key={r.id}>
              <td><strong>{nombreRecurso(r.id)}</strong></td>
              <td>
                <EstadoBadge estado={r.estado} textoOcupado={modulo.ocupado} />
                {(() => { const m = vigente(r.id) ?? proximoMantenimiento(r.id); return m && <div className="secundario aviso-mantenimiento">{vigente(r.id) ? 'En mantenimiento' : 'Mantenimiento programado'} {textoMantenimiento(m)}{m.nota ? ` · ${m.nota}` : ''}</div>; })()}
                {(() => { const p = proxima(r.id); return p && <ProximaReserva inicio={p.inicio} nombre={p.nombre} libre={r.estado === 'disponible'} ahora={ahora} />; })()}
              </td>
              <td className="acciones">
                {modulo.id === 'cubiculos' ? (
                  <>
                    {vigente(r.id) ? <button onClick={() => void terminar(vigente(r.id)!)}>Marcar disponible</button>
                      : r.estado === 'mantenimiento' ? <button onClick={() => void ejecutar(() => cambiarMantenimiento(modulo, r, false), 'Cubículo disponible de nuevo.')}>Marcar disponible</button>
                      : !proximoMantenimiento(r.id) && <button onClick={() => setSeleccionado(r)}>A mantenimiento</button>}
                    {proximoMantenimiento(r.id) && <button onClick={() => void terminar(proximoMantenimiento(r.id)!)}>Cancelar mantenimiento</button>}
                  </>
                ) : r.estado !== 'ocupado' && (
                  <button
                    onClick={() =>
                      ejecutar(
                        () => cambiarMantenimiento(modulo, r, r.estado !== 'mantenimiento'),
                        `Estado de ${modulo.recurso.toLowerCase()} ${nombreRecurso(r.id)} actualizado.`,
                      )
                    }
                  >
                    {r.estado === 'mantenimiento' ? 'Marcar disponible' : 'A mantenimiento'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Paginador paginacion={paginacion} />
    </section>
  );
}
