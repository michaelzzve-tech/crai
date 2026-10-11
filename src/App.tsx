import { useState } from 'react';
import { Encabezado, type Pestana } from './components/Encabezado';
import { Historial } from './components/Historial';
import { Login } from './components/Login';
import { RecursoList } from './components/RecursoList';
import { RegistroForm } from './components/RegistroForm';
import { RegistrosActivos } from './components/RegistrosActivos';
import { Resumen } from './components/Resumen';
import type { EjecutarAccion } from './components/tipos';
import { MODULOS, type Modulo } from './config/modulos';
import { useBiblioteca } from './hooks/useBiblioteca';
import { useSesion } from './hooks/useSesion';

interface Aviso {
  texto: string;
  tipo: 'exito' | 'error';
}

export default function App() {
  const { requiereLogin, cargando, correo, cerrarSesion } = useSesion();
  const [modulo, setModulo] = useState<Modulo>(MODULOS[0]);
  const [pestana, setPestana] = useState<Pestana>('registro');

  if (cargando) return null;
  if (requiereLogin) return <Login />;

  return (
    <div className="app">
      <Encabezado
        modulos={MODULOS}
        modulo={modulo}
        onCambiarModulo={setModulo}
        activa={pestana}
        onCambiar={setPestana}
        correo={correo}
        onCerrarSesion={cerrarSesion}
      />
      {/* `key` hace que cada módulo empiece con su propio estado. */}
      <VistaModulo key={modulo.id} modulo={modulo} pestana={pestana} />
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
      <Resumen modulo={modulo} recursos={recursos} registros={registros} />

      {pestana === 'registro' && (
        <>
          <RegistroForm modulo={modulo} recursos={recursos} ejecutar={ejecutar} />
          <RegistrosActivos modulo={modulo} registros={registros} ejecutar={ejecutar} />
        </>
      )}
      {pestana === 'recursos' && <RecursoList modulo={modulo} recursos={recursos} ejecutar={ejecutar} />}
      {pestana === 'historial' && <Historial modulo={modulo} registros={registros} />}
    </main>
  );
}
