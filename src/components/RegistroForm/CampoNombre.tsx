import { useState } from 'react';
import { MODULOS } from '../../config/modulos';
import { repositorio } from '../../data';
import type { Registro } from '../../types';
import { diaDe, formatearDia } from '../../utils/fechas';

const MAXIMO_SUGERENCIAS = 3;

/** "José Pérez" → "jose perez", para buscar sin importar mayúsculas ni acentos. */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** El último registro de cada nombre que contiene lo escrito, del más reciente al más antiguo. */
function buscar(registros: Registro[], texto: string): Registro[] {
  const buscado = normalizar(texto);
  if (!buscado) return [];
  const vistos = new Set<string>();
  const resultado: Registro[] = [];
  for (const r of registros) {
    const nombre = normalizar(r.nombre);
    if (!nombre.includes(buscado) || vistos.has(nombre)) continue;
    vistos.add(nombre);
    resultado.push(r);
    if (resultado.length === MAXIMO_SUGERENCIAS) break;
  }
  return resultado;
}

/**
 * Campo "Nombre" que, al escribir, sugiere hasta 3 nombres ya registrados (en
 * laptops o cubículos), los más recientes primero. Al elegir uno se llama a
 * `onElegir` con su último registro para rellenar el formulario.
 */
export function CampoNombre({ valor, onCambiar, onElegir }: {
  valor: string;
  onCambiar: (valor: string) => void;
  onElegir: (registro: Registro) => void;
}) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [abierta, setAbierta] = useState(false);
  const [marcada, setMarcada] = useState(0);
  const sugerencias = abierta ? buscar(registros, valor) : [];

  // Se cargan al entrar al campo, así incluyen lo registrado hace un momento.
  async function cargar() {
    const listas = await Promise.all(MODULOS.map((m) => repositorio.listarRegistros(m.tablaRegistros)));
    setRegistros(listas.flat().sort((a, b) => b.inicio.localeCompare(a.inicio)));
  }

  function elegir(r: Registro) {
    onElegir(r);
    setAbierta(false);
  }

  function teclas(e: React.KeyboardEvent<HTMLInputElement>) {
    if (sugerencias.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setMarcada((marcada + paso + sugerencias.length) % sugerencias.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      elegir(sugerencias[marcada]);
    } else if (e.key === 'Escape') {
      setAbierta(false);
    }
  }

  return (
    <label htmlFor="registro-nombre" className="campo-nombre">
      Nombre
      <input
        id="registro-nombre"
        required
        autoComplete="off"
        role="combobox"
        aria-expanded={sugerencias.length > 0}
        aria-controls="sugerencias-nombre"
        value={valor}
        onFocus={() => { cargar().catch(() => {}); }}
        onBlur={() => setAbierta(false)}
        onKeyDown={teclas}
        onChange={(e) => { onCambiar(e.target.value); setAbierta(true); setMarcada(0); }}
      />
      {sugerencias.length > 0 && (
        <ul id="sugerencias-nombre" role="listbox" className="sugerencias">
          {sugerencias.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={i === marcada}
              className={i === marcada ? 'marcada' : undefined}
              // mousedown en vez de click: se elige antes de que el campo pierda el foco.
              onMouseDown={(e) => { e.preventDefault(); elegir(r); }}
              onMouseEnter={() => setMarcada(i)}
            >
              <strong>{r.nombre}</strong>
              <span>{r.instituto} · {r.condicion} · último registro {formatearDia(diaDe(r.inicio))}</span>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
