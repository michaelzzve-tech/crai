import { useState } from 'react';
import { Encabezado, type Pestana } from './components/Encabezado';
import { Historial } from './components/Historial';
import { LaptopForm } from './components/LaptopForm';
import { LaptopList } from './components/LaptopList';
import { PrestamoForm } from './components/PrestamoForm';
import { PrestamosActivos } from './components/PrestamosActivos';
import { Resumen } from './components/Resumen';
import type { EjecutarAccion } from './components/tipos';
import { useBiblioteca } from './hooks/useBiblioteca';

interface Aviso {
  texto: string;
  tipo: 'exito' | 'error';
}

export default function App() {
  const { laptops, prestamos, recargar } = useBiblioteca();
  const [pestana, setPestana] = useState<Pestana>('prestamos');
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
    <div className="app">
      <Encabezado activa={pestana} onCambiar={setPestana} />
      <main>
        {aviso && (
          <div className={`aviso aviso-${aviso.tipo}`} role="status">
            {aviso.texto}
            <button onClick={() => setAviso(null)} aria-label="Cerrar">×</button>
          </div>
        )}
        <Resumen laptops={laptops} prestamos={prestamos} />

        {pestana === 'prestamos' && (
          <>
            <PrestamoForm laptops={laptops} ejecutar={ejecutar} />
            <PrestamosActivos prestamos={prestamos} laptops={laptops} ejecutar={ejecutar} />
          </>
        )}
        {pestana === 'laptops' && (
          <>
            <LaptopForm ejecutar={ejecutar} />
            <LaptopList laptops={laptops} ejecutar={ejecutar} />
          </>
        )}
        {pestana === 'historial' && <Historial prestamos={prestamos} laptops={laptops} />}
      </main>
    </div>
  );
}
