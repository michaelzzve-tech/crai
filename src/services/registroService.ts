import { nombreRecurso, type Modulo } from '../config/modulos';
import { repositorio } from '../data';
import type { NuevoRegistro, Recurso, Registro } from '../types';
import { diaALas, diaDe, formatearDia, formatearHora } from '../utils/fechas';
import { generarId } from '../utils/id';

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

/**
 * Falla si el recurso ya tiene otro registro sin terminar que se cruce con ese horario.
 * Sin hora de fin (laptops), se cuenta que el préstamo ocupa la laptop hasta el final de su día.
 * `excluirId` deja fuera el registro que se está editando.
 */
async function revisarChoque(modulo: Modulo, recursoId: string, inicio: Date, fin?: Date, excluirId?: string) {
  const finEstimado = (r: Registro) => (r.fin ? new Date(r.fin) : diaALas(diaDe(r.inicio), '23:59'));
  const hasta = fin ?? diaALas(diaDe(inicio), '23:59');
  const choque = (await repositorio.listarRegistros(modulo.tablaRegistros)).find(
    (r) => r.recursoId === recursoId && r.id !== excluirId && !r.finReal && new Date(r.inicio) < hasta && inicio < finEstimado(r),
  );
  if (choque) {
    const nombre = `${modulo.recurso} ${nombreRecurso(recursoId)}`;
    throw new Error(choque.fin
      ? `${nombre} ya está reservado de ${formatearHora(choque.inicio)} a ${formatearHora(choque.fin)} el ${formatearDia(diaDe(choque.inicio))}.`
      : `${nombre} ya tiene un préstamo el ${formatearDia(diaDe(choque.inicio))} desde las ${formatearHora(choque.inicio)}.`);
  }
}

export async function registrar(modulo: Modulo, datos: NuevoRegistro): Promise<Registro> {
  const recursos = await repositorio.listarRecursos(modulo.tablaRecursos);
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

  await revisarChoque(modulo, recurso.id, inicio, fin);

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
    motivo: datos.motivo,
    inicio: inicio.toISOString(),
    fin: fin?.toISOString(),
  };
  await repositorio.guardarRegistro(modulo.tablaRegistros, registro);
  if (!programado) await repositorio.guardarRecurso(modulo.tablaRecursos, { ...recurso, estado: 'ocupado' });
  avisarCambio();
  return registro;
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
  await revisarChoque(modulo, registro.recursoId, inicio, fin, registro.id);

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
