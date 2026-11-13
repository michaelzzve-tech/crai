# Instrucciones para agentes de código (Codex, Claude y otros)

Este archivo explica el proyecto completo a un agente que llega sin contexto. Léelo entero antes
de cambiar código.

## 1. Qué es

Aplicación web del **CRAI** (centro de recursos de una universidad) para llevar:

| Sección (pestaña) | Qué hace |
|---|---|
| **Laptops** | Préstamo de laptops: se presta, se registra la devolución. Sin hora de fin prevista. Admite **préstamo en masa** (varias laptops a la misma persona a la vez). |
| **Cubículos** | Reserva de cubículos 1–6 y la sala **Podcast** (código guardado `POD`), con fecha, hora de inicio y de fin, planner (calendario) y reservas recurrentes. |
| **Salas especiales** | Reserva de salas grandes (Javier, Loyola, Basabe, Piedra, CRAI) con planner, reservas recurrentes, salida anticipada y mantenimiento. |
| **Informes** (ícono de gráfica en el encabezado) | Estadísticas por rango de fechas con filtros, gráficas, PDF, respaldo en Excel, copia completa (.json) y borrado total. |

- Repositorio: `github.com/michaelzzve-tech/crai`, rama principal `main`.
- Web publicada: https://michaelzzve-tech.github.io/crai/ (GitHub Pages).
- **Dueño: Michael, nuevo en programación y en GitHub.** Todo lo que vea va **en español** y en
  palabras simples: textos de la app, README, mensajes de commit y descripción de los PR.

## 2. Reglas del negocio que el código debe respetar

- **Zona horaria: America/Caracas (UTC−4) siempre**, sin importar la del navegador. Usar las
  funciones de `src/utils/fechas.ts` (`diaDe`, `diaALas`, `formatearHora`, `formatearDia`…).
  Horas en formato de 12 horas («9:00 a. m.»).
- **Horario de la biblioteca: lunes a viernes, 9:00 a. m. a 6:00 p. m.** (`src/config/horario.ts`).
  Se usa para calcular el tiempo libre de un espacio (`src/utils/horario.ts`). El planner de salas
  muestra de 7 a. m. a 9 p. m. (`HORA_APERTURA`/`HORA_CIERRE` en `src/config/salas.ts`).
- **Laptops disponibles:** 1–25 y 59–80 (`LAPTOPS.opciones` en `src/config/modulos.ts`). Recursos
  guardados fuera de esa lista se ocultan, no se borran.
- **Cubículos:** 1–6 y `POD`, que se muestra «Podcast» (`nombreRecurso`). **No cambiar códigos
  guardados** (`POD`, ids de salas como `javier`): se perderían los registros viejos.
- **Choques de horario:** un recurso o sala no puede tener dos reservas que se crucen; tampoco se
  puede reservar una sala en mantenimiento. Las reglas están en `registroService.ts` y
  `salaService.ts`.
- **Reservas programadas:** una reserva futura no ocupa el recurso hasta su hora de inicio
  (`activarProgramados` corre al cargar y cada minuto).
- **Avisos:** una reserva de cubículo está «por vencer» 10 minutos antes de su fin
  (`MINUTOS_AVISO`) y «vencida» después. La campana de notificaciones los reúne.
- **Cancelar = borrar.** Una reserva o préstamo cancelado se borra y no cuenta en estadísticas.
  Finalizar guarda `finReal` (hora real de devolución o salida).
- **Reservas recurrentes:** todas las fechas de una serie llevan el mismo `serieId`
  (`src/services/recurrencia.ts`). Si alguna fecha choca, no se crea ninguna.
- **Préstamo en masa (laptops):** crea un registro por laptop con el mismo `nombre` y la misma
  hora `inicio` exacta. **No hay columna de grupo**: el grupo se reconoce por nombre + inicio
  (`gruposEnMasa`). El cintillo `CintilloEnMasa` (dentro de «Préstamos activos») permite cancelar,
  editar o finalizar todos a la vez (`cancelarEnMasa`, `modificarEnMasa`, `finalizarEnMasa`).
- **Salas especiales:** la capacidad es solo de referencia (no limita). `finReal` registra una
  salida anticipada; desde ahí la sala queda libre y el informe cuenta el uso hasta esa hora.
- **Horas de uso en informes:** laptops = inicio → devolución; cubículos = inicio → hora de fin
  reservada; salas = inicio → salida real o fin.

## 3. Comandos

Node.js 22 (`.nvmrc`; GitHub Actions usa la misma versión).

```bash
npm ci               # instalar dependencias exactamente como en package-lock.json
npm run dev          # servidor de desarrollo en http://localhost:5173
npm run lint         # oxlint (debe quedar sin errores ni advertencias)
npm run build        # tsc -b (revisión de tipos) + vite build → dist/
npm run preview      # sirve dist/ como en producción (base './')
```

**No hay pruebas automáticas.** Antes de dar un cambio por terminado:
1. `npm run lint` y `npm run build` sin errores ni advertencias.
2. Probarlo en el navegador (`npm run dev` o `npm run preview`). Sin Supabase la app guarda en
   localStorage, así que se pueden sembrar datos de prueba con las claves `biblioteca.v3.<tabla>`
   (`prestamos`, `reservas`, `reservas_salas`, `mantenimiento_salas`, `laptops`, `cubiculos`).
   Para pruebas con Playwright conviene fijar la zona `America/Caracas` y la hora del reloj.

## 4. Datos: Supabase o navegador

- Toda lectura y escritura pasa por la interfaz `Repositorio` (`src/data/repository.ts`).
  `src/data/index.ts` elige la implementación:
  - **Supabase** (`supabaseRepository.ts`) si existen `VITE_SUPABASE_URL` y
    `VITE_SUPABASE_ANON_KEY` (ver `.env.example`; copiar a `.env.local`). Pide inicio de sesión
    del administrador (`useSesion`, componente `Login`).
  - **localStorage** (`localStorageRepository.ts`) si no existen. Para desarrollar no hacen falta.
- `escucharCambios` usa el «tiempo real» de Supabase para que planners y listas se actualicen
  solos en todas las computadoras (`useCambiosEnVivo`).
- En producción las variables vienen de los **secretos de GitHub Actions**. **Nunca escribir
  claves reales en el repositorio.**
- En la base de datos las columnas van en `snake_case` (`recurso_id`, `hora_inicio`, `hora_fin`,
  `fin_real`, `serie_id`, `fecha_registro`, `sala_id`, `fecha_solicitud`); el código usa
  `camelCase` (`recursoId`, `inicio`, `fin`, `finReal`…). La conversión está en
  `supabaseRepository.ts`.

### Tablas

| Tabla | Contenido |
|---|---|
| `laptops`, `cubiculos` | Recursos: `id`, `numero`, `estado` (`disponible`/`ocupado`/`mantenimiento`), `notas` |
| `prestamos` | Préstamos de laptops (`Registro`) |
| `reservas` | Reservas de cubículos (`Registro`, con `hora_fin`, `usuarios`, `serie_id`, `fecha_registro`) |
| `reservas_salas` | Reservas de salas especiales (`ReservaSala`) |
| `mantenimiento_salas` | Mantenimientos de salas (`MantenimientoSala`) |

Seguridad (RLS): solo usuarios autenticados leen y escriben (política «bibliotecarios»).

### Scripts SQL (`supabase/`)

| Archivo | ¿Borra datos? | Para qué |
|---|---|---|
| `esquema.sql` | **SÍ, borra y recrea todo** | Solo para una base nueva. **Nunca ejecutarlo contra la base real.** |
| `salas-especiales.sql` | No | Crea `reservas_salas` y `mantenimiento_salas` si faltan |
| `tiempo-real.sql` | No | Activa el tiempo real en las 6 tablas |

**Cambios de esquema:** el agente **no** tiene acceso a la base de datos. Si un cambio necesita
una columna o tabla nueva, escribir un script **que no borre datos** (`create table if not
exists`, `alter table … add column if not exists …`), agregarlo en `supabase/`, explicarlo en el
README y en el PR con pasos simples. Michael lo ejecuta en Supabase → SQL Editor. El código debe
seguir funcionando si la columna aún no existe (por ejemplo, devolver lista vacía o enviar el
campo solo cuando tiene valor).

## 5. Estructura del código

```
src/
├── App.tsx                 Encabezado, pestañas (Laptops, Cubículos, Salas, Informes) y VistaModulo
├── config/
│   ├── modulos.ts          LAPTOPS y CUBICULOS (tipo Modulo): recursos, tablas, textos, opciones
│   ├── opciones.ts         Opciones de menús (institutos, carreras, condiciones, motivos…)
│   ├── salas.ts            SALAS: nombre, capacidad y color; horas del planner; actividades
│   └── horario.ts          Horario de la biblioteca
├── types/index.ts          Recurso, Registro, NuevoRegistro, ReservaSala, MantenimientoSala…
├── data/                   Repositorio: Supabase o localStorage
├── services/
│   ├── registroService.ts      Laptops y cubículos: registrar, en masa, finalizar, cancelar, choques
│   ├── salaService.ts          Salas: guardar, serie, mover, cancelar, salida
│   ├── mantenimientoSalas.ts   Mantenimiento de salas
│   ├── estadoSalas.ts          Estado actual de cada sala (en curso, próxima, mantenimiento)
│   ├── recurrencia.ts          Fechas de reservas recurrentes
│   ├── notificacionService.ts  Avisos por vencer / vencidos
│   ├── informeService.ts       Cálculo del informe y filtros (FiltroInforme)
│   ├── informePdf.ts           PDF del informe (jsPDF, carga diferida)
│   ├── respaldo.ts             Respaldo en Excel (ExcelJS, carga diferida)
│   ├── copiaCompleta.ts        Exportar/importar toda la información en .json
│   └── reinicio.ts             Borrar todos los registros (con contraseña)
├── hooks/                  useBiblioteca, useSesion, useNotificaciones, useCambiosEnVivo,
│                           usePaginacion (30 por página), useOrden, useAhora, useVistaPlanner…
├── utils/                  fechas.ts, horario.ts, orden.ts, texto.ts (búsqueda sin acentos), id.ts
├── components/             Una carpeta por componente con index.ts
│   ├── RegistroForm/           Formulario de préstamo/reserva y ventana «Modificar»
│   ├── RegistrosActivos/       Lista de activos (buscador por nombre, orden, cintillo en masa)
│   ├── CintilloEnMasa/         Préstamos en masa: cancelar, editar, finalizar todos
│   ├── CalendarioReservas/     Planner de cubículos
│   ├── Planner/                PlannerSemanal común (columnas fijas por recurso/sala)
│   ├── Salas/                  Todo el módulo Salas especiales
│   ├── Historial/              Registros terminados, con buscador
│   ├── Informes/               Informes, gráficas, PDF
│   └── …                       Encabezado, Login, Notificaciones, Paginador, Resumen, etc.
└── styles/global.css       Estilos; colores en variables al inicio
```

- **Laptops y Cubículos comparten el mismo código.** Lo que cambia entre ellos está en
  `src/config/modulos.ts` (`conHoraFin`, `conUsuarios`, `conCalendario`, `conPrestamoEnMasa`,
  `conLaptop`, `condiciones`, `motivos`…). Un cambio pedido «en ambos» suele hacerse una sola vez.
- **Salas especiales es aparte** (no es un `Modulo`): datos `ReservaSala`, reglas en
  `salaService.ts`, vista en `src/components/Salas/`.
- El **planner** (`PlannerSemanal`) lo usan Cubículos y Salas: vista de 1 día (al abrir) o 3 días,
  una columna fija por cubículo (1–6, Podcast al final) o por sala; las reservas terminadas se ven
  transparentes; si dos fichas se cruzan en una columna, la columna se divide.

## 6. Convenciones

- React 19 + TypeScript estricto + Vite 8 + oxlint. Componentes de función.
- Nombres de variables, funciones y comentarios **en español**, igual que el código existente.
- Comentarios breves (JSDoc de una o dos líneas) que expliquen el porqué.
- Opciones de menús en `src/config/`, no escritas dentro de los componentes.
- Un archivo de componente exporta solo componentes (regla de oxlint); las funciones compartidas
  van en `utils/` o `services/`.
- Librerías pesadas (jsPDF, ExcelJS) se cargan con `import()` solo cuando se usan.
- Si un cambio afecta lo que ve el usuario, actualizar la sección del `README.md`.
- **No borrar ni modificar datos reales** (Supabase o respaldos) como parte de un cambio de código.

## 7. Cómo entregar un cambio

1. Crear una rama nueva desde `main` (nunca trabajar directo en `main`).
2. Hacer el cambio, pasar `npm run lint` y `npm run build`, probar en el navegador.
3. Commit con mensaje en español que diga qué cambia para el usuario.
4. Abrir un Pull Request en español con tres partes: **Antes:**, **Después:** y **Cómo:**.
   Si hace falta correr SQL, decirlo con pasos simples.
5. Michael lo revisa y lo fusiona. Un PR ya fusionado no se reutiliza: cada cambio nuevo, PR nuevo.

## 8. Publicación

Cada cambio en `main` se publica solo en GitHub Pages con `.github/workflows/deploy.yml`
(`npm ci` → `npm run build` con los secretos de Supabase → `deploy-pages`). También se puede
lanzar a mano desde GitHub → Actions → «Publicar en GitHub Pages» → **Run workflow**.
`vite.config.ts` usa `base: './'`, así que la app funciona en cualquier subcarpeta.
