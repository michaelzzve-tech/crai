import { salaPorId } from '../config/salas';
import { repositorio } from '../data';
import type { NuevaReservaSala, ReservaSala } from '../types';
import { diaALas, diaDe, formatearDia, formatearHora, horaActual } from '../utils/fechas';
import { validarSerie, type Recurrencia } from './recurrencia';
import { generarId } from '../utils/id';

/**
 * Reglas de las reservas de salas especiales: datos completos y sin choques de
 * horario con otra reserva de la misma sala. La capacidad es solo de referencia.
 */

export async function listarReservasSalas(): Promise<ReservaSala[]> {
  const reservas = await repositorio.listarReservasSalas();
  return reservas.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/**
 * Revisa los datos y arma la reserva, sin guardarla. Las nuevas no pueden ser para
 * un día pasado; al modificar una reserva vieja se respeta su fecha. `existentes`
 * son las reservas con las que no puede chocar.
 */
function prepararReserva(datos: NuevaReservaSala, existentes: ReservaSala[], anterior?: ReservaSala, serieId?: string): ReservaSala {
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

  if (!datos.fecha) throw new Error('Indique la fecha de la reserva.');
  if (!anterior && datos.fecha < diaDe()) throw new Error('La fecha de la reserva no puede ser anterior a hoy.');
  // La fecha de solicitud es solo informativa; las reservas viejas pueden no tenerla.
  if (!anterior && !datos.fechaSolicitud) throw new Error('Indique la fecha de solicitud.');
  if (datos.fechaSolicitud && datos.fechaSolicitud > diaDe()) throw new Error('La fecha de solicitud no puede ser posterior a hoy.');
  if (!datos.horaInicio || !datos.horaFin) throw new Error('Indique la hora de inicio y de fin.');
  const inicio = diaALas(datos.fecha, datos.horaInicio);
  const fin = diaALas(datos.fecha, datos.horaFin);
  if (fin <= inicio) throw new Error('La hora de fin debe ser posterior a la hora de inicio.');

  const usuarios = Number(datos.usuarios);
  if (!Number.isInteger(usuarios) || usuarios < 1) throw new Error('El total de usuarios debe ser un número entero mayor que 0.');

  const choque = existentes.find((r) =>
    r.id !== anterior?.id && r.salaId === sala.id
    && new Date(r.inicio) < fin && inicio < new Date(r.fin));
  if (choque) {
    throw new ChoqueDeHorario(`${sala.nombre} ya está reservada de ${formatearHora(choque.inicio)} a ${formatearHora(choque.fin)} ese día (${choque.actividad}).`);
  }

  return {
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
    ...(datos.fechaSolicitud ? { fechaSolicitud: datos.fechaSolicitud } : {}),
    ...(anterior?.serieId ?? serieId ? { serieId: anterior?.serieId ?? serieId } : {}),
  };
}

/** Error de una reserva que choca con otra de la misma sala. */
class ChoqueDeHorario extends Error {}

/** Crea una reserva o, si se pasa `anterior`, la modifica (si es de una serie, solo esa fecha). */
export async function guardarReservaSala(datos: NuevaReservaSala, anterior?: ReservaSala): Promise<ReservaSala> {
  const reserva = prepararReserva(datos, await repositorio.listarReservasSalas(), anterior);
  await repositorio.guardarReservaSala(reserva);
  return reserva;
}

/**
 * Reserva recurrente: la misma reserva en cada fecha de datos.fecha a `recurrencia.hasta` que caiga
 * en los días elegidos. Se revisan todas antes de guardar: si alguna fecha choca, no se crea ninguna
 * y se dice cuáles chocan.
 */
export async function guardarSerieSala(datos: NuevaReservaSala, recurrencia: Recurrencia): Promise<ReservaSala[]> {
  const fechas = validarSerie(datos.fecha, recurrencia);

  const serieId = generarId();
  const existentes = await repositorio.listarReservasSalas();
  const nuevas: ReservaSala[] = [];
  const choques: string[] = [];
  for (const fecha of fechas) {
    try {
      nuevas.push(prepararReserva({ ...datos, fecha }, [...existentes, ...nuevas], undefined, serieId));
    } catch (e) {
      if (!(e instanceof ChoqueDeHorario)) throw e; // Datos incompletos: el mismo error para todas
      choques.push(formatearDia(fecha));
    }
  }
  if (choques.length) {
    const sala = salaPorId(datos.salaId)?.nombre;
    throw new Error(`No se creó la reserva recurrente: ${sala} ya está ocupada a esa hora el ${choques.join(', ')}.`);
  }
  for (const r of nuevas) await repositorio.guardarReservaSala(r);
  return nuevas;
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
    fechaSolicitud: reserva.fechaSolicitud ?? '',
  }, reserva);
}

export async function cancelarReservaSala(reserva: ReservaSala): Promise<void> {
  await repositorio.borrarReservaSala(reserva.id);
}

/** Cancela esta reserva y las siguientes de su serie; las anteriores quedan. Devuelve cuántas se cancelaron. */
export async function cancelarSerieDesde(reserva: ReservaSala): Promise<number> {
  if (!reserva.serieId) {
    await cancelarReservaSala(reserva);
    return 1;
  }
  const deLaSerie = (await repositorio.listarReservasSalas())
    .filter((r) => r.serieId === reserva.serieId && r.inicio >= reserva.inicio);
  for (const r of deLaSerie) await repositorio.borrarReservaSala(r.id);
  return deLaSerie.length;
}
