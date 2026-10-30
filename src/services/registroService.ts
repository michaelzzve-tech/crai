import { LAPTOPS, nombreRecurso, type Modulo } from '../config/modulos';
import { repositorio } from '../data';
import type { NuevoRegistro, Recurso, Registro } from '../types';
import { diaALas, diaDe, formatearDia, formatearHora } from '../utils/fechas';
import { generarId } from '../utils/id';
import { validarSerie, type Recurrencia } from './recurrencia';

/**
 * Reglas del negocio, iguales para todos los módulos (préstamo de laptops,
 * reserva de cubículos…). Los componentes llaman a estas funciones y nunca
 * hablan directamente con el almacenamiento.
 */

/** Minutos antes de la hora de fin en que se avisa que una reserva está por vencer. */
export const MINUTOS_AVISO = 10;

/** Evento del navegador que se emite tras registrar o finalizar, para refrescar las notificaciones. */
export const EVENTO_CAMBIO = 'biblioteca:cambio';
const avisarCambio = () => window.dispatchEvent(new Event(EVENTO_CAMBIO));

export function estaVencido(registro: Registro, ahora = new Date()): boolean {
  return !registro.finReal && !!registro.fin && new Date(registro.fin) <= ahora;
}

/** Activo y a MINUTOS_AVISO minutos o menos de su hora de fin (sin haberla pasado). */
export function estaPorVencer(registro: Registro, ahora = new Date()): boolean {
  if (registro.finReal || !registro.fin) return false;
  const restante = new Date(registro.fin).getTime() - ahora.getTime();
  return restante > 0 && restante <= MINUTOS_AVISO * 60_000;
}

/** Reserva hecha para más tarde (otra hora u otro día) que todavía no empieza. */
export function estaProgramado(registro: Registro, ahora = new Date()): boolean {
  return !registro.finReal && new Date(registro.inicio) > ahora;
}

/** Hora de fin de un registro para comparar choques; sin hora de fin, sigue en uso. */
const finPara = (r: Registro) => (r.fin ? new Date(r.fin) : new Date(8.64e15));

/**
 * Marca como en uso los recursos cuyas reservas programadas ya empezaron.
 * Se llama al cargar el módulo y cada minuto.
 */
export async function activarProgramados(modulo: Modulo, ahora = new Date()): Promise<void> {
  const [recursos, registros] = await Promise.all([
    repositorio.listarRecursos(modulo.tablaRecursos),
    repositorio.listarRegistros(modulo.tablaRegistros),
  ]);
  let cambio = false;
  for (const r of registros) {
    if (r.finReal || new Date(r.inicio) > ahora || finPara(r) <= ahora) continue;
    const recurso = recursos.find((x) => x.id === r.recursoId);
    if (recurso?.estado === 'disponible') {
      recurso.estado = 'ocupado';
      await repositorio.guardarRecurso(modulo.tablaRecursos, recurso);
      cambio = true;
    }
  }
  if (cambio) avisarCambio();
}

/** Crea los recursos del módulo (sus opciones del menú) que todavía no existan. */
export async function asegurarRecursos(modulo: Modulo): Promise<void> {
  const recursos = await repositorio.listarRecursos(modulo.tablaRecursos);
  const existentes = new Set(recursos.map((r) => r.id));
  // "numero" no se puede repetir; los nuevos van después del mayor ya guardado.
  let siguiente = Math.max(0, ...recursos.map((r) => r.numero)) + 1;
  for (const id of modulo.opciones) {
    if (!existentes.has(id)) {
      await repositorio.guardarRecurso(modulo.tablaRecursos, { id, numero: siguiente++, estado: 'disponible' });
    }
  }
}

export async function cambiarMantenimiento(modulo: Modulo, recurso: Recurso, enMantenimiento: boolean) {
  if (recurso.estado === 'ocupado') {
    throw new Error(`No se puede cambiar el estado: está en uso (${modulo.ocupado.toLowerCase()}).`);
  }
  await repositorio.guardarRecurso(modulo.tablaRecursos, {
    ...recurso,
    estado: enMantenimiento ? 'mantenimiento' : 'disponible',
  });
}

/** Fin que se usa para los choques: sin hora de fin (laptops), el préstamo ocupa la laptop hasta el final de su día. */
const finEstimado = (r: Registro) => (r.fin ? new Date(r.fin) : diaALas(diaDe(r.inicio), '23:59'));

/** Error de un registro que choca con otro del mismo recurso. */
class ChoqueDeHorario extends Error {}

/**
 * Falla si el recurso ya tiene otro registro sin terminar (de `existentes`) que se cruce con ese horario.
 * `excluirId` deja fuera el registro que se está editando.
 */
function revisarChoque(modulo: Modulo, existentes: Registro[], recursoId: string, inicio: Date, fin?: Date, excluirId?: string) {
  const hasta = fin ?? diaALas(diaDe(inicio), '23:59');
  const choque = existentes.find(
    (r) => r.recursoId === recursoId && r.id !== excluirId && !r.finReal && new Date(r.inicio) < hasta && inicio < finEstimado(r),
  );
  if (choque) {
    const nombre = `${modulo.recurso} ${nombreRecurso(recursoId)}`;
    throw new ChoqueDeHorario(choque.fin
      ? `${nombre} ya está reservado de ${formatearHora(choque.inicio)} a ${formatearHora(choque.fin)} el ${formatearDia(diaDe(choque.inicio))}.`
      : `${nombre} ya tiene un préstamo el ${formatearDia(diaDe(choque.inicio))} desde las ${formatearHora(choque.inicio)}`);
  }
}

/** Revisa los datos y arma el registro, sin guardarlo. `programado`: es para más tarde y aún no ocupa el recurso. */
function prepararRegistro(modulo: Modulo, datos: NuevoRegistro, recursos: Recurso[], existentes: Registro[], serieId?: string) {
  const recurso = recursos.find((r) => r.id === datos.recursoId);
  if (!recurso) throw new Error(`Seleccione un ${modulo.recurso.toLowerCase()}.`);

  const dia = datos.fecha || diaDe();
  if (dia < diaDe()) throw new Error('La fecha de la reserva no puede ser anterior a hoy.');
  const inicio = diaALas(dia, datos.horaInicio);
  const fin = modulo.conHoraFin ? diaALas(dia, datos.horaFin) : undefined;
  if (fin && fin <= inicio) {
    throw new Error('La hora de fin debe ser posterior a la hora de inicio.');
  }

  // Una reserva para más tarde no ocupa el recurso todavía: se marca en uso al llegar su hora.
  const programado = inicio > new Date();
  if (recurso.estado === 'mantenimiento' || (!programado && recurso.estado !== 'disponible')) {
    throw new Error(`${modulo.recurso} ${nombreRecurso(recurso.id)} no está disponible.`);
  }
  const usuarios = modulo.conUsuarios ? Number(datos.usuarios) : undefined;
  if (usuarios !== undefined && (!Number.isInteger(usuarios) || usuarios < 1)) {
    throw new Error('La cantidad de usuarios debe ser un número entero mayor que 0.');
  }

  if (!datos.motivo.trim()) throw new Error('Escriba el motivo de uso.');
  if (modulo.conFechaRegistro) {
    if (!datos.fechaRegistro) throw new Error('Indique la fecha de registro.');
    if (datos.fechaRegistro > diaDe()) throw new Error('La fecha de registro no puede ser posterior a hoy.');
  }

  revisarChoque(modulo, existentes, recurso.id, inicio, fin);

  const registro: Registro = {
    id: generarId(),
    recursoId: recurso.id,
    nombre: datos.nombre.trim(),
    genero: datos.genero,
    instituto: datos.instituto,
    condicion: datos.condicion,
    carrera: datos.carrera,
    semestre: datos.semestre,
    usuarios,
    motivo: datos.motivo.trim(),
    inicio: inicio.toISOString(),
    fin: fin?.toISOString(),
    ...(serieId ? { serieId } : {}),
    ...(modulo.conFechaRegistro ? { fechaRegistro: datos.fechaRegistro } : {}),
  };
  return { registro, recurso, programado };
}

export async function registrar(modulo: Modulo, datos: NuevoRegistro): Promise<Registro> {
  const [recursos, existentes] = await Promise.all([
    repositorio.listarRecursos(modulo.tablaRecursos),
    repositorio.listarRegistros(modulo.tablaRegistros),
  ]);
  const { registro, recurso, programado } = prepararRegistro(modulo, datos, recursos, existentes);
  await repositorio.guardarRegistro(modulo.tablaRegistros, registro);
  if (!programado) await repositorio.guardarRecurso(modulo.tablaRecursos, { ...recurso, estado: 'ocupado' });
  avisarCambio();
  return registro;
}

/**
 * Reserva (de cubículo) con préstamo de laptop: con los mismos datos de la persona, la
 * fecha y la hora de inicio se crea también el préstamo de `laptopId` en Laptops. Se revisan
 * los dos antes de guardar: si la laptop o el cubículo no se pueden, no se guarda ninguno.
 */
export async function registrarConLaptop(modulo: Modulo, datos: NuevoRegistro, laptopId: string): Promise<[Registro, Registro]> {
  if (!laptopId) throw new Error('Seleccione la laptop que se presta.');
  const [recursos, existentes, laptops, prestamos] = await Promise.all([
    repositorio.listarRecursos(modulo.tablaRecursos),
    repositorio.listarRegistros(modulo.tablaRegistros),
    repositorio.listarRecursos(LAPTOPS.tablaRecursos),
    repositorio.listarRegistros(LAPTOPS.tablaRegistros),
  ]);
  const reserva = prepararRegistro(modulo, datos, recursos, existentes);
  const prestamo = prepararRegistro(LAPTOPS, { ...datos, recursoId: laptopId, usuarios: '', horaFin: '', fechaRegistro: '' }, laptops, prestamos);
  await repositorio.guardarRegistro(modulo.tablaRegistros, reserva.registro);
  await repositorio.guardarRegistro(LAPTOPS.tablaRegistros, prestamo.registro);
  if (!reserva.programado) await repositorio.guardarRecurso(modulo.tablaRecursos, { ...reserva.recurso, estado: 'ocupado' });
  if (!prestamo.programado) await repositorio.guardarRecurso(LAPTOPS.tablaRecursos, { ...prestamo.recurso, estado: 'ocupado' });
  avisarCambio();
  return [reserva.registro, prestamo.registro];
}

/**
 * Reserva recurrente: el mismo registro en cada fecha de datos.fecha a `recurrencia.hasta` que caiga
 * en los días elegidos. Se revisan todas antes de guardar: si alguna fecha choca, no se crea ninguna
 * y se dice cuáles chocan.
 */
export async function registrarSerie(modulo: Modulo, datos: NuevoRegistro, recurrencia: Recurrencia): Promise<Registro[]> {
  const fechas = validarSerie(datos.fecha, recurrencia);
  const [recursos, existentes] = await Promise.all([
    repositorio.listarRecursos(modulo.tablaRecursos),
    repositorio.listarRegistros(modulo.tablaRegistros),
  ]);
  const serieId = generarId();
  const nuevas: ReturnType<typeof prepararRegistro>[] = [];
  const choques: string[] = [];
  for (const fecha of fechas) {
    try {
      nuevas.push(prepararRegistro(modulo, { ...datos, fecha }, recursos, [...existentes, ...nuevas.map((n) => n.registro)], serieId));
    } catch (e) {
      if (!(e instanceof ChoqueDeHorario)) throw e; // Datos incompletos: el mismo error para todas
      choques.push(formatearDia(fecha));
    }
  }
  if (choques.length) {
    throw new Error(`No se creó la reserva recurrente: ${modulo.recurso} ${nombreRecurso(datos.recursoId)} ya está ocupado a esa hora el ${choques.join(', ')}.`);
  }
  for (const n of nuevas) await repositorio.guardarRegistro(modulo.tablaRegistros, n.registro);
  const ahora = nuevas.find((n) => !n.programado); // La primera fecha puede ser hoy y ya haber empezado
  if (ahora) await repositorio.guardarRecurso(modulo.tablaRecursos, { ...ahora.recurso, estado: 'ocupado' });
  avisarCambio();
  return nuevas.map((n) => n.registro);
}

export interface NuevoHorario {
  fecha: string; // "AAAA-MM-DD"
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  usuarios?: string; // Solo en módulos con "Cantidad de usuarios"
}

/**
 * Cambia la fecha, el horario y (si el módulo la pide) la cantidad de usuarios de una reserva sin terminar. Si pasa a ser para más
 * tarde, el cubículo se libera mientras tanto; si ya empezó, se marca en uso.
 */
export async function editarHorario(modulo: Modulo, registro: Registro, horario: NuevoHorario) {
  const { fecha, horaInicio, horaFin } = horario;
  const usuarios = modulo.conUsuarios ? Number(horario.usuarios) : registro.usuarios;
  if (modulo.conUsuarios && (!Number.isInteger(usuarios) || (usuarios ?? 0) < 1)) {
    throw new Error('La cantidad de usuarios debe ser un número entero mayor que 0.');
  }
  if (fecha < diaDe() && fecha !== diaDe(registro.inicio)) {
    throw new Error('La fecha de la reserva no puede ser anterior a hoy.');
  }
  const inicio = diaALas(fecha, horaInicio);
  const fin = diaALas(fecha, horaFin);
  if (fin <= inicio) throw new Error('La hora de fin debe ser posterior a la hora de inicio.');
  revisarChoque(modulo, await repositorio.listarRegistros(modulo.tablaRegistros), registro.recursoId, inicio, fin, registro.id);

  await repositorio.guardarRegistro(modulo.tablaRegistros, { ...registro, inicio: inicio.toISOString(), fin: fin.toISOString(), usuarios });

  // En uso si alguno de sus registros sin terminar ya empezó.
  const ahora = new Date();
  const [recursos, registros] = await Promise.all([
    repositorio.listarRecursos(modulo.tablaRecursos),
    repositorio.listarRegistros(modulo.tablaRegistros),
  ]);
  const recurso = recursos.find((r) => r.id === registro.recursoId);
  if (recurso && recurso.estado !== 'mantenimiento') {
    const enUso = registros.some((r) => r.recursoId === recurso.id && !r.finReal && new Date(r.inicio) <= ahora);
    const estado = enUso ? 'ocupado' : 'disponible';
    if (recurso.estado !== estado) await repositorio.guardarRecurso(modulo.tablaRecursos, { ...recurso, estado });
  }
  avisarCambio();
}

/** Cancela una reserva programada que todavía no empieza: se borra y el recurso no cambia. */
export async function cancelarProgramado(modulo: Modulo, registro: Registro) {
  if (!estaProgramado(registro)) throw new Error('La reserva ya empezó; registre la salida.');
  await repositorio.borrarRegistro(modulo.tablaRegistros, registro.id);
  avisarCambio();
}

/**
 * Cancela esta reserva programada y las siguientes de su serie que todavía no empiezan;
 * las anteriores y las que ya empezaron quedan. Devuelve cuántas se cancelaron.
 */
export async function cancelarSerieDesde(modulo: Modulo, registro: Registro): Promise<number> {
  if (!estaProgramado(registro)) throw new Error('La reserva ya empezó; registre la salida.');
  const deLaSerie = registro.serieId
    ? (await repositorio.listarRegistros(modulo.tablaRegistros))
      .filter((r) => r.serieId === registro.serieId && r.inicio >= registro.inicio && estaProgramado(r))
    : [registro];
  for (const r of deLaSerie) await repositorio.borrarRegistro(modulo.tablaRegistros, r.id);
  avisarCambio();
  return deLaSerie.length;
}

/** Devuelve la laptop o libera el cubículo; la hora de fin real es la del momento. */
/** Guarda el momento exacto en que se devuelve o libera, sea antes o después de la hora de fin. */
export async function finalizar(modulo: Modulo, registro: Registro, momento = new Date()) {
  await repositorio.guardarRegistro(modulo.tablaRegistros, {
    ...registro,
    finReal: momento.toISOString(),
  });
  const recursos = await repositorio.listarRecursos(modulo.tablaRecursos);
  const recurso = recursos.find((r) => r.id === registro.recursoId);
  if (recurso) await repositorio.guardarRecurso(modulo.tablaRecursos, { ...recurso, estado: 'disponible' });
  avisarCambio();
}
