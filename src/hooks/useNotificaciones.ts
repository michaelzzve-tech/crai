import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MODULOS } from '../config/modulos';
import { repositorio } from '../data';
import { calcularNotificaciones, textoNotificacion } from '../services/notificacionService';
import { EVENTO_CAMBIO } from '../services/registroService';
import type { Registro } from '../types';
import { useAhora } from './useAhora';

const CLAVE_LEIDAS = 'biblioteca.notificaciones.leidas';
const RECARGA_MS = 30_000;

// Solo los módulos con hora de fin (cubículos) generan avisos.
const MODULOS_CON_AVISOS = MODULOS.filter((m) => m.conHoraFin);

function leerLeidas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_LEIDAS) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function guardarLeidas(leidas: Set<string>) {
  try {
    localStorage.setItem(CLAVE_LEIDAS, JSON.stringify([...leidas]));
  } catch {
    // Sin almacenamiento del navegador: solo se olvida qué se leyó.
  }
}

const hayAvisosDelSistema = () => typeof Notification !== 'undefined';

/**
 * Centro de notificaciones: revisa las reservas activas de todos los módulos con
 * hora de fin, sin importar qué módulo esté abierto, y avisa cuando faltan pocos
 * minutos o cuando ya se venció. También manda avisos del sistema si se permiten.
 */
export function useNotificaciones() {
  const [registros, setRegistros] = useState<Registro[][]>(() => MODULOS_CON_AVISOS.map(() => []));
  const [leidas, setLeidas] = useState(leerLeidas);
  const [permiso, setPermiso] = useState(() => (hayAvisosDelSistema() ? Notification.permission : 'denied'));
  const enviadas = useRef(new Set<string>());
  const ahora = useAhora(15_000);

  const recargar = useCallback(async () => {
    try {
      const todos = await Promise.all(MODULOS_CON_AVISOS.map((m) => repositorio.listarRegistros(m.tablaRegistros)));
      setRegistros(todos.map((lista) => lista.filter((r) => !r.finReal)));
    } catch {
      // Si falla la conexión se conserva la última lista; la pantalla del módulo ya muestra el error.
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(recargar);
    const id = setInterval(recargar, RECARGA_MS);
    window.addEventListener(EVENTO_CAMBIO, recargar);
    return () => {
      clearInterval(id);
      window.removeEventListener(EVENTO_CAMBIO, recargar);
    };
  }, [recargar]);

  const notificaciones = useMemo(
    () => MODULOS_CON_AVISOS.flatMap((m, i) => calcularNotificaciones(m, registros[i], ahora)),
    [registros, ahora],
  );
  const sinLeer = notificaciones.filter((n) => !leidas.has(n.clave));

  // Aviso del sistema (fuera de la página) una sola vez por notificación nueva.
  useEffect(() => {
    if (permiso !== 'granted') return;
    for (const n of sinLeer) {
      if (enviadas.current.has(n.clave)) continue;
      enviadas.current.add(n.clave);
      const { titulo, detalle } = textoNotificacion(n);
      try {
        new Notification(titulo, { body: detalle, tag: n.clave, requireInteraction: n.tipo === 'vencido' });
      } catch {
        // Algunos navegadores solo permiten avisos desde un service worker.
      }
    }
  }, [sinLeer, permiso]);

  const marcarLeidas = useCallback((claves: string[]) => {
    setLeidas((actual) => {
      // Solo se recuerdan las claves de avisos vigentes, para que la lista no crezca.
      const vigentes = new Set(notificaciones.map((n) => n.clave));
      const nuevas = new Set([...actual, ...claves].filter((c) => vigentes.has(c)));
      guardarLeidas(nuevas);
      return nuevas;
    });
  }, [notificaciones]);

  const pedirPermiso = useCallback(async () => {
    if (!hayAvisosDelSistema()) return;
    setPermiso(await Notification.requestPermission());
  }, []);

  return { notificaciones, sinLeer, leidas, marcarLeidas, permiso, pedirPermiso };
}
