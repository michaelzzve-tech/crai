import { useState } from 'react';
import { ActividadDiaria } from './components/ActividadDiaria';
import { CalendarioReservas } from './components/CalendarioReservas';
import { Encabezado, type Pestana, type Vista } from './components/Encabezado';
import { ErrorPantalla } from './components/ErrorPantalla';
import { Historial } from './components/Historial';
import { Informes } from './components/Informes';
import { Login } from './components/Login';
import { AvisosDestacados, CentroNotificaciones } from './components/Notificaciones';
import { RecursoList } from './components/RecursoList';
import { RegistroForm } from './components/RegistroForm';
import { RegistrosActivos } from './components/RegistrosActivos';
import { Salas } from './components/Salas';
import { Resumen } from './components/Resumen';
import type { EjecutarAccion } from './components/tipos';
import { MODULOS, type Modulo } from './config/modulos';
import { useBiblioteca } from './hooks/useBiblioteca';
import { errorConfiguracion } from './data/supabaseClient';
import { useNotificaciones } from './hooks/useNotificaciones';
import { useSesion } from './hooks/useSesion';
import type { Notificacion } from './services/notificacionService';

interface Aviso {
  texto: string;
  tipo: 'exito' | 'error';
}

export default function App() {
  const { requiereLogin, cargando, correo, cerrarSesion } = useSesion();

  if (errorConfiguracion) return <ErrorPantalla titulo="Falta configurar la base de datos" mensaje={errorConfiguracion} />;
  if (cargando) return <p className="cargando">Cargando…</p>;
  if (requiereLogin) return <Login />;
  return <Principal correo={correo} cerrarSesion={cerrarSesion} />;
}

/** Pantalla tras iniciar sesión: encabezado, notificaciones y el módulo elegido. */
function Principal({ correo, cerrarSesion }: { correo?: string; cerrarSesion?: () => void }) {
  const [modulo, setModulo] = useState<Modulo>(MODULOS[0]);
  const [pestana, setPestana] = useState<Pestana>('registro');
  const [vista, setVista] = useState<Vista>('modulo');
  const { notificaciones, sinLeer, leidas, marcarLeidas, permiso, pedirPermiso } = useNotificaciones();

  const abrirNotificacion = (n: Notificacion) => {
    setModulo(n.modulo);
    setVista('modulo');
    setPestana('registro');
    marcarLeidas([n.clave]);
  };

  return (
    <div className="app">
      <Encabezado
        modulos={MODULOS}
        modulo={modulo}
        onCambiarModulo={(m) => { setModulo(m); setVista('modulo'); }}
        vista={vista}
        onVista={setVista}
        activa={pestana}
        onCambiar={setPestana}
        correo={correo}
        onCerrarSesion={cerrarSesion}
        notificaciones={
          <CentroNotificaciones
            notificaciones={notificaciones}
            leidas={leidas}
            onAbrir={abrirNotificacion}
            onMarcarLeidas={marcarLeidas}
            permiso={permiso}
            onPedirPermiso={pedirPermiso}
          />
        }
      />
      <AvisosDestacados notificaciones={sinLeer} onAbrir={abrirNotificacion} onCerrar={(n) => marcarLeidas([n.clave])} />
      {/* `key` hace que cada módulo empiece con su propio estado. */}
      {vista === 'informes' ? <Informes />
        : vista === 'salas' ? <Salas />
        : <VistaModulo key={modulo.id} modulo={modulo} pestana={pestana} />}
    </div>
  );
}

/** Contenido de un módulo: resumen y la pestaña elegida. */
function VistaModulo({ modulo, pestana }: { modulo: Modulo; pestana: Pestana }) {
  const { recursos, registros, recargar, error } = useBiblioteca(modulo);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const ejecutar: EjecutarAccion = async (accion, mensajeExito) => {
    try {
      await accion();
      setAviso({ texto: mensajeExito, tipo: 'exito' });
      return true;
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : String(e), tipo: 'error' });
      return false;
    } finally {
      await recargar();
    }
  };

  return (
    <main>
      {error && <div className="aviso aviso-error" role="alert">No se pudieron cargar los datos. {error}</div>}
      {aviso && (
        <div className={`aviso aviso-${aviso.tipo}`} role="status">
          {aviso.texto}
          <button onClick={() => setAviso(null)} aria-label="Cerrar">×</button>
        </div>
      )}
      {pestana === 'registro' && <ActividadDiaria modulo={modulo} />}
      <Resumen modulo={modulo} recursos={recursos} registros={registros} />

      {pestana === 'registro' && (
        <>
          {modulo.conCalendario
            ? <CalendarioReservas modulo={modulo} recursos={recursos} registros={registros} ejecutar={ejecutar} />
            : <RegistroForm modulo={modulo} recursos={recursos} ejecutar={ejecutar} />}
          <RegistrosActivos modulo={modulo} registros={registros} ejecutar={ejecutar} />
        </>
      )}
      {pestana === 'recursos' && <RecursoList modulo={modulo} recursos={recursos} ejecutar={ejecutar} />}
      {pestana === 'historial' && <Historial modulo={modulo} registros={registros} />}
    </main>
  );
}
