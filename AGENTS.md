# Instrucciones para agentes de código (Codex y otros)

Aplicación web del CRAI para **préstamo de laptops** y **reserva de cubículos**. El dueño del
proyecto es nuevo en programación: todo lo que vea (textos de la app, README, mensajes de commit,
descripción de los PR) va **en español** y en palabras simples.

## Comandos

Node.js 22 (ver `.nvmrc`; GitHub Actions usa la misma versión).

```bash
npm install          # instalar dependencias
npm run dev          # servidor de desarrollo en http://localhost:5173
npm run lint         # oxlint
npm run build        # tsc -b (revisión de tipos) + vite build → dist/
npm run preview      # sirve dist/ para probarla como en producción
```

No hay pruebas automáticas. Antes de dar un cambio por terminado, deben pasar sin errores ni
advertencias `npm run lint` y `npm run build`, y conviene probarlo en el navegador con
`npm run dev`.

## Datos y variables de entorno

- Los datos van detrás de la interfaz `Repositorio` (`src/data/repository.ts`); `src/data/index.ts`
  elige la implementación.
- Con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver `.env.example`, copiar a `.env.local`)
  se usa **Supabase** con inicio de sesión. Sin ellas, todo se guarda en el navegador
  (localStorage, claves `biblioteca.v3.<tabla>`). Para trabajar no hacen falta: la app funciona
  sin Supabase.
- Nunca escribir claves reales en el repositorio. En producción vienen de los secretos de GitHub
  Actions.
- Las tablas de Supabase están en `supabase/esquema.sql`. **Ese archivo borra y recrea las
  tablas**: no ejecutarlo contra la base de datos real. Si se agrega una columna, documentar en el
  README la línea `alter table … add column if not exists …` para aplicarla sin borrar datos.

## Estructura

```
src/
├── config/
│   ├── modulos.ts      Módulos (Laptops, Cubículos): recursos, tablas, textos, opciones
│   ├── opciones.ts     Opciones de los menús (institutos, carreras, condiciones, motivos…)
│   └── salas.ts        Salas especiales: nombre, capacidad y color de cada sala
├── types/              Recurso, Registro, NuevoRegistro, ReservaSala
├── data/               Repositorio: Supabase o localStorage
├── services/
│   ├── registroService.ts      Reglas: registrar, finalizar, validar, choques de horario
│   ├── salaService.ts          Reglas de las salas: datos completos y choques de horario
│   ├── notificacionService.ts  Avisos de cubículos por vencer o vencidos
│   ├── informeService.ts       Cálculo del informe mensual
│   ├── informePdf.ts           PDF del informe (jsPDF, carga diferida)
│   ├── respaldo.ts             Respaldo en Excel (ExcelJS, carga diferida)
│   └── reinicio.ts             Borrar todos los registros
├── hooks/              useBiblioteca, useSesion, useNotificaciones, usePaginacion, useAhora
├── utils/fechas.ts     Fechas y horas (zona America/Caracas, formato de 12 horas)
├── components/         Una carpeta por componente (RegistroForm, Informes, Historial, Salas…)
├── styles/global.css   Estilos; colores en variables al inicio
└── App.tsx
```

Laptops y Cubículos funcionan igual: lo que cambia entre ellos está en
`src/config/modulos.ts` (por ejemplo `conHoraFin`, `conUsuarios`, `condiciones`, `motivos`). Un
cambio pedido "en ambos módulos" normalmente se hace una sola vez en el código común.

**Salas especiales** es aparte (no es un `Modulo`): tiene sus propios datos (`ReservaSala`, tabla
`reservas_salas`, creada con `supabase/salas-especiales.sql`), reglas en `salaService.ts` y su
vista en `src/components/Salas/`.

El calendario semanal (`src/components/Planner/`) lo usan Salas especiales y los módulos con
`conCalendario` (Cubículos, en `src/components/CalendarioReservas/`). Las reservas recurrentes
(`src/services/recurrencia.ts`) guardan el mismo `serieId` en todas las fechas de la serie.

## Convenciones

- React 19 + TypeScript estricto + Vite. Componentes de función; nombres de variables, funciones
  y comentarios en español, igual que el código existente.
- Comentarios breves (JSDoc de una o dos líneas) que expliquen el porqué.
- Opciones de menús en `src/config/opciones.ts`, no escritas dentro de los componentes.
- Horas siempre en la zona de Caracas con las funciones de `src/utils/fechas.ts`, y mostradas en
  formato de 12 horas.
- Si un cambio afecta lo que ve el usuario, actualizar la sección correspondiente del `README.md`.
- No borrar ni modificar datos reales (Supabase o respaldos) como parte de un cambio de código.

## Publicación

Cada cambio en la rama `main` se publica solo en GitHub Pages
(https://michaelzzve-tech.github.io/crai/) con `.github/workflows/`. Trabajar en una rama nueva y
abrir un Pull Request; el dueño lo revisa y lo fusiona.
