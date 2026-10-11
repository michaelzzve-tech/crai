import { useState } from 'react';
import { MINUTOS_AVISO } from '../../services/registroService';
import { textoNotificacion, type Notificacion } from '../../services/notificacionService';

interface Props {
  notificaciones: Notificacion[];
  leidas: Set<string>;
  onAbrir: (n: Notificacion) => void;
  onMarcarLeidas: (claves: string[]) => void;
  permiso: NotificationPermission;
  onPedirPermiso: () => void;
}

/** Campana del encabezado con el número de avisos sin leer y la lista de avisos. */
export function CentroNotificaciones({ notificaciones, leidas, onAbrir, onMarcarLeidas, permiso, onPedirPermiso }: Props) {
  const [abierto, setAbierto] = useState(false);
  const sinLeer = notificaciones.filter((n) => !leidas.has(n.clave)).length;
  const hayVencidas = notificaciones.some((n) => n.tipo === 'vencido' && !leidas.has(n.clave));

  return (
    <div className="centro-notificaciones">
      <button
        className={hayVencidas ? 'campana urgente' : 'campana'}
        aria-label={`Notificaciones (${sinLeer} sin leer)`}
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
      >
        <span aria-hidden="true">🔔</span>
        {sinLeer > 0 && <span className="contador">{sinLeer}</span>}
      </button>
      {abierto && (
        <div className="panel-notificaciones" role="dialog" aria-label="Notificaciones">
          <div className="panel-encabezado">
            <h2>Notificaciones</h2>
            {sinLeer > 0 && (
              <button onClick={() => onMarcarLeidas(notificaciones.map((n) => n.clave))}>Marcar todas como leídas</button>
            )}
          </div>
          {notificaciones.length === 0 ? (
            <p className="vacio">
              Sin avisos. Aquí aparecen las reservas a {MINUTOS_AVISO} minutos o menos de su hora de fin, y las vencidas.
            </p>
          ) : (
            <ul>
              {notificaciones.map((n) => {
                const { titulo, detalle } = textoNotificacion(n);
                return (
                  <li key={n.clave}>
                    <button
                      className={`notificacion notificacion-${n.tipo}${leidas.has(n.clave) ? ' leida' : ''}`}
                      onClick={() => { onAbrir(n); setAbierto(false); }}
                    >
                      <strong>{titulo}</strong>
                      <span>{detalle}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {permiso === 'default' && (
            <button className="primario activar-avisos" onClick={onPedirPermiso}>
              Recibir avisos aunque la página esté en segundo plano
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Avisos destacados que aparecen sobre la página hasta que se cierran. */
export function AvisosDestacados({ notificaciones, onAbrir, onCerrar }: {
  notificaciones: Notificacion[];
  onAbrir: (n: Notificacion) => void;
  onCerrar: (n: Notificacion) => void;
}) {
  if (notificaciones.length === 0) return null;
  return (
    <div className="avisos-destacados" aria-live="assertive">
      {notificaciones.map((n) => {
        const { titulo, detalle } = textoNotificacion(n);
        return (
          <div key={n.clave} className={`destacado destacado-${n.tipo}`} role="alert">
            <button className="destacado-texto" onClick={() => onAbrir(n)}>
              <strong>{n.tipo === 'vencido' ? '⚠ ' : '⏰ '}{titulo}</strong>
              <span>{detalle}</span>
            </button>
            <button className="destacado-cerrar" onClick={() => onCerrar(n)} aria-label="Cerrar aviso">×</button>
          </div>
        );
      })}
    </div>
  );
}
