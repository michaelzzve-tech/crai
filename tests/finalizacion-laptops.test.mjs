import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const memoria = new Map();
globalThis.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) };
globalThis.window = new EventTarget();
const servidor = await createServer({ envDir: false, server: { middlewareMode: true, ws: false }, appType: 'custom' });
after(() => servidor.close());
const servicio = await servidor.ssrLoadModule('/src/services/registroService.ts');
const { LAPTOPS, CUBICULOS } = await servidor.ssrLoadModule('/src/config/modulos.ts');
const { repositorio, usaBaseDeDatos } = await servidor.ssrLoadModule('/src/data/index.ts');
assert.equal(usaBaseDeDatos, false, 'Las pruebas requieren almacenamiento local; quite las variables de Supabase del entorno.');
const { diaDe, sumarDias } = await servidor.ssrLoadModule('/src/utils/fechas.ts');
const hoy = diaDe();
const manana = sumarDias(hoy, 1);
const pasado = sumarDias(hoy, 2);
const datos = { nombre: 'Prueba', genero: 'No aplica', instituto: 'Otro', condicion: 'Docente', carrera: 'No aplica', semestre: 'No aplica', usuarios: '', recursoId: '1', motivo: 'Estudio', fecha: manana, horaInicio: '23:00', fechaFin: pasado, horaFin: '01:00', fechaRegistro: hoy };

async function reiniciar() {
  memoria.clear();
  for (const id of ['1', '2']) await repositorio.guardarRecurso('laptops', { id, numero: Number(id), estado: 'disponible' });
}

test('crea y edita todo el grupo, valida fin y choques y recupera vencidos con su hora exacta', async () => {
  await reiniciar();
  const grupo = await servicio.registrarEnMasa(LAPTOPS, datos, ['1', '2']);
  assert.equal(grupo[0].fin, `${pasado}T05:00:00.000Z`);
  assert.equal(grupo[0].fin, grupo[1].fin);
  await assert.rejects(servicio.modificarEnMasa(LAPTOPS, grupo, { ...datos, fechaFin: manana, horaFin: '22:00' }), /posterior/);
  await assert.rejects(servicio.modificarEnMasa(LAPTOPS, grupo, { ...datos, horaFin: '' }), /fecha y la hora/);
  await assert.rejects(servicio.registrarEnMasa(LAPTOPS, { ...datos, fecha: pasado, horaInicio: '00:30', horaFin: '02:00' }, ['1']), /reservado/);
  const editados = await servicio.modificarEnMasa(LAPTOPS, grupo, { ...datos, horaFin: '02:00' });
  assert.ok(editados.every((r) => r.fin === `${pasado}T06:00:00.000Z`));
  await servicio.finalizarLaptopsProgramadas(new Date(`${pasado}T05:59:59Z`));
  assert.ok((await repositorio.listarRegistros('prestamos')).every((r) => !r.finReal));
  await servicio.finalizarLaptopsProgramadas(new Date(`${pasado}T08:00:00Z`));
  assert.ok((await repositorio.listarRegistros('prestamos')).every((r) => r.finReal === r.fin));
  await servicio.finalizarLaptopsProgramadas(new Date(`${pasado}T09:00:00Z`));
  assert.ok((await repositorio.listarRegistros('prestamos')).every((r) => r.finReal === r.fin));
});

test('permite quitar la programación y conserva préstamos manuales y cubículos', async () => {
  await reiniciar();
  const grupo = await servicio.registrarEnMasa(LAPTOPS, datos, ['1', '2']);
  await servicio.modificarEnMasa(LAPTOPS, grupo, { ...datos, fechaFin: '', horaFin: '' });
  await repositorio.guardarRegistro('reservas', { ...grupo[0], id: 'cubiculo' });
  await servicio.finalizarLaptopsProgramadas(new Date(`${pasado}T08:00:00Z`));
  assert.ok((await repositorio.listarRegistros('prestamos')).every((r) => !r.fin && !r.finReal));
  assert.equal((await repositorio.listarRegistros(CUBICULOS.tablaRegistros))[0].finReal, undefined);
});

test('respeta devolución anticipada, mantenimiento y otro préstamo activo', async () => {
  await reiniciar();
  const grupo = await servicio.registrarEnMasa(LAPTOPS, datos, ['1', '2']);
  await servicio.finalizar(LAPTOPS, grupo[0], new Date(`${pasado}T04:30:00Z`));
  await repositorio.guardarRecurso('laptops', { id: '2', numero: 2, estado: 'mantenimiento' });
  await servicio.finalizarLaptopsProgramadas(new Date(`${pasado}T08:00:00Z`));
  assert.equal((await repositorio.listarRegistros('prestamos'))[0].finReal, `${pasado}T04:30:00.000Z`);
  assert.equal((await repositorio.listarRecursos('laptops'))[1].estado, 'mantenimiento');
  await repositorio.guardarRegistro('prestamos', { ...grupo[0], id: 'otro', inicio: '2020-01-01T12:00:00Z', fin: undefined });
  await repositorio.guardarRegistro('prestamos', { ...grupo[0], id: 'vencido', fin: '2020-01-02T12:00:00Z' });
  await servicio.finalizarLaptopsProgramadas();
  assert.equal((await repositorio.listarRecursos('laptops'))[0].estado, 'ocupado');
});
