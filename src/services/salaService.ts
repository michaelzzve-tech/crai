import { salaPorId } from '../config/salas';
import { repositorio } from '../data';
import type { NuevaReservaSala, ReservaSala } from '../types';
import { diaALas, diaDe, formatearHora, horaActual } from '../utils/fechas';
import { generarId } from '../utils/id';

/**
 * Reglas de las reservas de salas especiales: datos completos, capacidad de la
 * sala y sin choques de horario con otra reserva de la misma sala.
 */

export async function listarReservasSalas(): Promise<ReservaSala[]> {
  const reservas = await repositorio.listarReservasSalas();
  return reservas.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/**
 * Crea una reserva o, si se pasa `anterior`, la modifica. Las nuevas no pueden
 * ser para un día pasado; al modificar una reserva vieja se respeta su fecha.
 */
export async function guardarReservaSala(datos: NuevaReservaSala, anterior?: ReservaSala): Promise<ReservaSala> {
  const sala = salaPorId(datos.salaId);
  if (!sala) throw new Error('Seleccione una sala.');

  const textos: [string, string][] = [
    [datos.instituto, 'la institución'],
    [datos.carrera, 'la carrera o año'],
    [datos.semestre, 'el semestre'],
    [datos.actividad, 'la actividad'],
    [datos.solicitante, 'quién la solicita'],
    [datos.profesor, 'el profesor o la profesora'],
  ];
  const falta = textos.find(([valor]) => !valor.trim());
  if (falta) throw new Error(`Indique ${falta[1]}.`);

  if (!datos.fecha) throw new Error('Indique la fecha de solicitud.');
  if (!anterior && datos.fecha < diaDe()) throw new Error('La fecha de solicitud no puede ser anterior a hoy.');
  if (!datos.horaInicio || !datos.horaFin) throw new Error('Indique la hora de inicio y de fin.');
  const inicio = diaALas(datos.fecha, datos.horaInicio);
  const fin = diaALas(datos.fecha, datos.horaFin);
  if (fin <= inicio) throw new Error('La hora de fin debe ser posterior a la hora de inicio.');

  const usuarios = Number(datos.usuarios);
  if (!Number.isInteger(usuarios) || usuarios < 1) throw new Error('El total de usuarios debe ser un número entero mayor que 0.');
  if (usuarios > sala.capacidad) {
    throw new Error(`${sala.nombre} es para ${sala.capacidad} personas como máximo.`);
  }

  const reservas = await repositorio.listarReservasSalas();
  const choque = reservas.find((r) =>
    r.id !== anterior?.id && r.salaId === sala.id
    && new Date(r.inicio) < fin && inicio < new Date(r.fin));
  if (choque) {
    throw new Error(`${sala.nombre} ya está reservada de ${formatearHora(choque.inicio)} a ${formatearHora(choque.fin)} ese día (${choque.actividad}).`);
  }

  const reserva: ReservaSala = {
    id: anterior?.id ?? generarId(),
    salaId: sala.id,
    instituto: datos.instituto,
    carrera: datos.carrera.trim(),
    semestre: datos.semestre,
    actividad: datos.actividad.trim(),
    usuarios,
    solicitante: datos.solicitante.trim(),
    profesor: datos.profesor.trim(),
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
    creada: anterior?.creada ?? new Date().toISOString(),
  };
  await repositorio.guardarReservaSala(reserva);
  return reserva;
}

/**
 * Mueve una reserva a otro día u hora (por ejemplo, al arrastrarla en el calendario),
 * con la misma duración y las mismas reglas que al modificarla, y sin ir a un día pasado.
 */
export async function moverReservaSala(reserva: ReservaSala, fecha: string, horaInicio: string): Promise<ReservaSala> {
  if (fecha < diaDe()) throw new Error('No se puede mover una reserva a un día pasado.');
  const duracion = new Date(reserva.fin).getTime() - new Date(reserva.inicio).getTime();
  const fin = new Date(diaALas(fecha, horaInicio).getTime() + duracion);
  if (diaDe(fin) !== fecha) throw new Error('La reserva terminaría otro día.');
  return guardarReservaSala({
    salaId: reserva.salaId,
    instituto: reserva.instituto,
    carrera: reserva.carrera,
    semestre: reserva.semestre,
    fecha,
    horaInicio,
    horaFin: horaActual(fin),
    actividad: reserva.actividad,
    usuarios: String(reserva.usuarios),
    solicitante: reserva.solicitante,
    profesor: reserva.profesor,
  }, reserva);
}

export async function cancelarReservaSala(reserva: ReservaSala): Promise<void> {
  await repositorio.borrarReservaSala(reserva.id);
}
