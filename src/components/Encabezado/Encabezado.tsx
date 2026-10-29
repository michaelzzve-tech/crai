import type { ReactNode } from 'react';
import logo from '../../assets/logo-crai-interno.png';
import type { Modulo } from '../../config/modulos';

export type Pestana = 'registro' | 'recursos' | 'historial';
/** Lo que se muestra debajo del encabezado: un módulo, las salas especiales o los informes. */
export type Vista = 'modulo' | 'salas' | 'informes';

interface Props {
  modulos: Modulo[];
  modulo: Modulo;
  onCambiarModulo: (modulo: Modulo) => void;
  vista: Vista;
  onVista: (vista: Vista) => void;
  activa: Pestana;
  onCambiar: (pestana: Pestana) => void;
  correo?: string;
  onCerrarSesion?: () => void;
  notificaciones?: ReactNode; // Campana del centro de notificaciones
}

/** Título, selector de módulo (laptops, cubículos…) y pestañas del módulo. */
export function Encabezado({ modulos, modulo, onCambiarModulo, vista, onVista, activa, onCambiar, correo, onCerrarSesion, notificaciones }: Props) {
  // Historial se muestra como un ícono de reloj; su nombre queda en la ayuda y para lectores de pantalla.
  const pestanas: { id: Pestana; titulo: string; icono?: ReactNode }[] = [
    { id: 'registro', titulo: modulo.registros },
    { id: 'recursos', titulo: modulo.pestanaRecursos },
    { id: 'historial', titulo: 'Historial', icono: <IconoReloj /> },
  ];

  return (
    <header className="encabezado">
      <div className="encabezado-fila">
        <div className="marca">
          <img className="encabezado-logo" src={logo} alt="CRAI" />
          <h1>Préstamos y reservas</h1>
        </div>
        <div className="sesion">
          {notificaciones}
          {onCerrarSesion && (
            <>
              <span>{correo}</span>
              <button className="pestana" onClick={onCerrarSesion}>Cerrar sesión</button>
            </>
          )}
        </div>
      </div>
      <nav className="modulos" aria-label="Módulo">
        {modulos.map((m) => (
          <button
            key={m.id}
            className={vista === 'modulo' && m.id === modulo.id ? 'modulo activo' : 'modulo'}
            onClick={() => onCambiarModulo(m)}
          >
            {m.recursos}
          </button>
        ))}
        <button className={vista === 'salas' ? 'modulo activo' : 'modulo'} onClick={() => onVista('salas')}>
          Salas especiales
        </button>
        <button
          className={vista === 'informes' ? 'boton-informes activo' : 'boton-informes'}
          onClick={() => onVista('informes')}
          aria-label="Informes"
          title="Informes"
        >
          <IconoGrafica />
        </button>
      </nav>
      {vista === 'modulo' && (
        <nav className="pestanas" aria-label="Sección">
          {pestanas.map((p) => (
            <button
              key={p.id}
              className={`pestana${p.icono ? ' pestana-icono' : ''}${p.id === activa ? ' activa' : ''}`}
              onClick={() => onCambiar(p.id)}
              aria-label={p.icono ? p.titulo : undefined}
              title={p.icono ? p.titulo : undefined}
            >
              {p.icono ?? p.titulo}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}

/** Gráfica de barras minimalista para el botón de Informes. */
function IconoGrafica() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M7 17v-5" />
      <path d="M12 17V7" />
      <path d="M17 17v-8" />
    </svg>
  );
}

/** Reloj minimalista para la pestaña Historial. */
function IconoReloj() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
