import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const memoria = new Map();
globalThis.localStorage = { getItem: k => memoria.get(k) ?? null, setItem: (k,v) => memoria.set(k,v) };
globalThis.window = new EventTarget();
const servidor = await createServer({ envDir: false, server: { middlewareMode: true, ws: false }, appType: 'custom' });
after(() => servidor.close());
const mantenimiento = await servidor.ssrLoadModule('/src/services/mantenimientoCubiculos.ts');
const servicio = await servidor.ssrLoadModule('/src/services/registroService.ts');
const { repositorio, usaBaseDeDatos } = await servidor.ssrLoadModule('/src/data/index.ts');
const { CUBICULOS } = await servidor.ssrLoadModule('/src/config/modulos.ts');
const { diaDe, sumarDias, diaALas } = await servidor.ssrLoadModule('/src/utils/fechas.ts');
assert.equal(usaBaseDeDatos, false);
const hoy = diaDe();
const manana = sumarDias(hoy,1);
const pasado = sumarDias(hoy,2);
const datos = { salaId:'1', fecha:manana, hora:'10:00', fechaFin:manana, horaFin:'12:00', nota:'Pintura' };
const reserva = { recursoId:'1', nombre:'Prueba', genero:'No aplica', instituto:'Otro', condicion:'Docente', carrera:'No aplica', usuarios:'1', motivo:'Estudio', fecha:manana, horaInicio:'10:30', horaFin:'11:00', fechaRegistro:hoy };
async function reiniciar() {
  memoria.clear();
  await servicio.asegurarRecursos(CUBICULOS);
}

test('programa, valida límites, activa y libera por horario sin cambiar el estado permanente', async () => {
  await reiniciar();
  const m = await mantenimiento.programarMantenimientoCubiculo(datos);
  const recursos = await repositorio.listarRecursos('cubiculos');
  for (const [hora,estado] of [['09:59','disponible'],['10:00','mantenimiento'],['11:59','mantenimiento'],['12:00','disponible']]) {
    assert.equal(mantenimiento.recursosConMantenimiento(recursos,[m],diaALas(manana,hora))[0].estado,estado);
  }
  assert.equal((await repositorio.listarRecursos('cubiculos'))[0].estado,'disponible');
  await assert.rejects(mantenimiento.programarMantenimientoCubiculo({...datos,hora:'11:00'}),/mantenimiento/);
  await assert.rejects(mantenimiento.programarMantenimientoCubiculo({...datos,horaFin:'09:00'}),/posterior/);
  await assert.rejects(mantenimiento.programarMantenimientoCubiculo({...datos,horaFin:''}),/ambas vacías/);
  await mantenimiento.programarMantenimientoCubiculo({...datos,hora:'12:00',horaFin:'13:00'});
});

test('bloquea alta, edición, movimiento y serie completa; permite reservar fuera del período', async () => {
  await reiniciar();
  const previa = await servicio.registrar(CUBICULOS,{...reserva,horaInicio:'09:00',horaFin:'10:00'});
  await mantenimiento.programarMantenimientoCubiculo(datos);
  await assert.rejects(servicio.registrar(CUBICULOS,reserva),/mantenimiento/);
  await assert.rejects(servicio.modificarRegistro(CUBICULOS,previa,reserva),/mantenimiento/);
  await assert.rejects(servicio.editarHorario(CUBICULOS,previa,{fecha:manana,horaInicio:'11:00',horaFin:'12:00',usuarios:'1'}),/mantenimiento/);
  const diaSemana = new Date(`${manana}T12:00:00-04:00`).getUTCDay();
  await assert.rejects(servicio.registrarSerie(CUBICULOS,reserva,{hasta:pasado,dias:[diaSemana]}),/mantenimiento/);
  assert.equal((await repositorio.listarRegistros('reservas')).length,1);
  await servicio.registrar(CUBICULOS,{...reserva,horaInicio:'12:00',horaFin:'13:00'});
  assert.equal((await repositorio.listarRegistros('reservas')).length,2);
});

test('conserva reservas afectadas, admite Podcast sin fin y distingue terminar de cancelar', async () => {
  await reiniciar();
  const existente = await servicio.registrar(CUBICULOS,{...reserva,recursoId:'POD'});
  const m = await mantenimiento.programarMantenimientoCubiculo({...datos,salaId:'POD',fechaFin:'',horaFin:''});
  assert.equal(mantenimiento.reservasAfectadas(m,[existente]).length,1);
  assert.equal((await repositorio.listarRegistros('reservas')).length,1);
  await assert.rejects(servicio.registrar(CUBICULOS,{...reserva,recursoId:'POD',fecha:pasado}),/mantenimiento/);
  await mantenimiento.terminarMantenimientoCubiculo(m,diaALas(manana,'09:00'));
  assert.equal((await repositorio.listarMantenimientosCubiculos()).length,0);
  const activo = await mantenimiento.programarMantenimientoCubiculo({...datos,salaId:'POD',fechaFin:'',horaFin:''});
  await mantenimiento.terminarMantenimientoCubiculo(activo,diaALas(manana,'11:00'));
  assert.equal((await repositorio.listarMantenimientosCubiculos())[0].fin,diaALas(manana,'11:00').toISOString());
  await servicio.registrar(CUBICULOS,{...reserva,recursoId:'POD',fecha:pasado});
});

test('el repositorio traduce columnas y tolera instalaciones sin la tabla nueva', async () => {
  const { SupabaseRepositorio } = await servidor.ssrLoadModule('/src/data/supabaseRepository.ts');
  let error = null;
  let guardado;
  const db = new SupabaseRepositorio({ from(tabla) {
    assert.equal(tabla, 'mantenimiento_cubiculos');
    return {
      select: async () => ({ data: [{ id:'m', recurso_id:'POD', inicio:`${manana}T10:00:00-04:00`,fin:null,nota:'Prueba' }], error }),
      upsert: async fila => { guardado = fila; return {error}; },
    };
  } });
  const [m] = await db.listarMantenimientosCubiculos();
  assert.equal(m.recursoId, 'POD');
  assert.equal(m.inicio, `${manana}T14:00:00.000Z`);
  await db.guardarMantenimientoCubiculo(m);
  assert.equal(guardado.recurso_id, 'POD');
  assert.equal(guardado.fin, null);
  error = {code:'PGRST205',message:'Tabla inexistente'};
  assert.deepEqual(await db.listarMantenimientosCubiculos(), []);
  await assert.rejects(db.guardarMantenimientoCubiculo(m), /mantenimiento-cubiculos.sql/);
  error = {code:'42501',message:'Permiso denegado'};
  await assert.rejects(db.listarMantenimientosCubiculos(), /Permiso denegado/);
});

test('la copia completa restaura mantenimientos y acepta copias anteriores', async () => {
  await reiniciar();
  const copia = await servidor.ssrLoadModule('/src/services/copiaCompleta.ts');
  const m = await mantenimiento.programarMantenimientoCubiculo(datos);
  const antigua = {formato:'crai-copia-completa',version:1,creada:new Date().toISOString(),recursos:{},registros:{},reservasSalas:[]};
  const leida = await copia.leerCopia(new File([JSON.stringify(antigua)],'copia.json'));
  await copia.importarCopia(leida,'REEMPLAZAR');
  assert.equal((await repositorio.listarMantenimientosCubiculos()).length,1);
  const nueva = {...antigua,mantenimientosCubiculos:[{...m,nota:'Restaurado'}]};
  await copia.importarCopia(await copia.leerCopia(new File([JSON.stringify(nueva)],'copia.json')),'REEMPLAZAR');
  assert.equal((await repositorio.listarMantenimientosCubiculos())[0].nota,'Restaurado');
});
