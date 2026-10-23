# Préstamos y reservas · Biblioteca universitaria

Aplicación web con dos módulos que funcionan igual:

- **Laptops**: préstamo de las laptops 1 a 25 y 59 a 80.
- **Cubículos**: reserva de los cubículos 1 a 6 y el Podcast.

Cada módulo tiene su formulario, la lista de préstamos o reservas en curso (con alerta de
vencidos), el estado de cada laptop o cubículo y el historial.

![Pantalla de préstamos](docs/captura.png)

Hecha con **React + TypeScript + Vite**. Los datos se guardan en una base de datos en línea
(**Supabase**, gratuita) o, si no se configura, en el navegador (localStorage).

## Cómo usarla

Requiere [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install
npm run dev      # abre http://localhost:5173
npm run build    # genera la versión final en dist/
```

## Verla en línea

La app se publica sola en GitHub Pages cada vez que se actualiza la rama `main`:
https://michaelzzve-tech.github.io/crai/

Con Supabase configurado, todos los bibliotecarios ven los mismos datos después de iniciar sesión.
Sin Supabase, cada persona que la abre tiene sus propios datos, guardados en su navegador.

## Base de datos (Supabase)

1. Cree una cuenta gratis en https://supabase.com y un proyecto nuevo.
2. En el proyecto, abra **SQL Editor → New query**, pegue el contenido de
   [`supabase/esquema.sql`](supabase/esquema.sql) y pulse **Run**. Esto crea las tablas.
   Si ya había creado las tablas antes del cambio de devolución automática, en vez de
   eso basta con ejecutar esta línea (no borra datos):
   `alter table prestamos alter column hora_fin drop not null;`
   Y para el campo Género (tampoco borra datos):
   `alter table prestamos add column if not exists genero text; alter table reservas add column if not exists genero text;`
   Y para el campo Semestre o nivel (tampoco borra datos):
   `alter table prestamos add column if not exists semestre text; alter table reservas add column if not exists semestre text;`
   Y para el campo Cantidad de usuarios de los cubículos (tampoco borra datos):
   `alter table prestamos add column if not exists usuarios integer; alter table reservas add column if not exists usuarios integer;`
3. En **Authentication → Users → Add user → Create new user**, cree una cuenta (correo y
   contraseña) para cada bibliotecario. Marque "Auto Confirm User".
4. En **Authentication → Sign In / Providers**, desactive **Allow new users to sign up**
   para que nadie más pueda crearse una cuenta.
5. En **Project Settings → API** copie el **Project URL** y la clave **anon public**.
6. En GitHub, en el repositorio, abra **Settings → Secrets and variables → Actions →
   New repository secret** y cree dos secretos con esos valores:
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
7. Vuelva a publicar la web: **Actions → Publicar en GitHub Pages → Run workflow**.

Para usar la base de datos en su computadora, copie `.env.example` como `.env.local`
y pegue los mismos dos valores.

## Funciones

- **Sugerencias de nombre**: al escribir en Nombre aparecen hasta 3 nombres ya registrados (en laptops o
  cubículos) que coinciden, los más recientes primero, sin importar mayúsculas ni acentos. Al elegir uno
  (con el mouse o con las flechas y Enter) se rellenan género, instituto, condición, carrera, semestre,
  motivo y, en cubículos, la cantidad de usuarios con los datos de su último registro. La laptop o el
  cubículo, la fecha y las horas se eligen cada vez. Si un dato no existe en el módulo (por ejemplo DTI
  en cubículos), queda vacío para elegirlo.
- **Formulario**, en este orden: nombre, género (masculino, femenino, no aplica), instituto (ITJO, IUJO, CFJO u Otro),
  condición (estudiante, docente, psicólogo, otro; en laptops también DTI; con docente, psicólogo o DTI, carrera y semestre quedan en "No aplica"), carrera o año (ITJO: año del 1 al 6; IUJO: carrera;
  CFJO: secretariado administrativo, asistente administrativo o analista contable;
  Otro: queda en "No aplica"),
  semestre, nivel o sección (1 a 10 o "No aplica"; con ITJO, sección A a E), cantidad de usuarios (solo cubículos; se escribe el número),
  laptop (1 a 25 y 59 a 80) o cubículo (1 a 6 o Podcast), motivo de uso
  (estudio, tarea, entretenimiento, TEG, didáctico; en laptops también soporte), **fecha de la reserva** (un calendario; por
  defecto hoy) y hora de inicio. Los cubículos piden además hora de fin y muestran la duración
  (se calcula sola). Una reserva para más tarde u otro día sale como "Programada" en la lista de en curso,
  no ocupa la laptop o el cubículo hasta su hora de inicio y se puede cancelar; si choca con otra reserva
  del mismo recurso, no se guarda (una laptop sin devolver cuenta como ocupada hasta el final de su día). El botón **Limpiar** vacía los campos y pone
  la hora de inicio en la hora actual.
- **En curso**: préstamos o reservas activos; desde ahí se registra la devolución de la
  laptop o la salida del cubículo. En los cubículos, el botón del **lápiz** cambia la fecha, el
  horario y la cantidad de usuarios de una reserva (se revisa que no choque con otra; si queda para más tarde, el cubículo
  se libera mientras tanto). En las laptops, la hora de devolución
  se toma sola en el momento y se muestra el **tiempo transcurrido** desde la hora de inicio. En los
  cubículos, al confirmar la salida se guarda la hora exacta de ese momento, aunque sea antes o
  después de la hora de fin, y se indica cuántos minutos se adelantó o se atrasó.
- **Centro de notificaciones** (campana del encabezado): avisa cuando a una reserva de
  cubículo le faltan 10 minutos o menos para su hora de fin, y cuando ya se venció. Los
  avisos nuevos aparecen destacados en la esquina inferior (en rojo los vencidos) y la fila
  se marca en amarillo (por vencer) o en rojo (vencida). Desde la campana se pueden activar
  los avisos del sistema para verlos aunque la página esté en segundo plano. Los minutos se
  cambian en `MINUTOS_AVISO` (`src/services/registroService.ts`).
- **Informes** (ícono de gráfica en el extremo derecho del encabezado): informe de actividades con el formato
  del reporte mensual del CRAI, para un mes (campo **Mes**) o un rango de fechas (por defecto, el mes actual):
  - **Beneficiarios alcanzados por servicio prestado**: para cubículos y laptops, los totales (reservas o
    solicitudes, por estudiantes, docentes y otros, usuarias, usuarios, usuarios en cubículos y tiempo total)
    y el detalle por institución (ITJO, IUJO, CFJO, Otros y Otros (DTI)) y por condición: cantidad, cursantes
    de cada carrera o año, motivos de uso, usuarios en cubículos y horas de uso.
  - **Cuadros comparativos progresivos**: los últimos 13 meses hasta el mes del informe, por género, por
    institución, usuarios de cubículos y horas de uso de cubículos y de laptops, cada cuadro con su gráfica.
  En pantalla el informe empieza como **vista previa** (portada y totales de cada servicio); cada botón
  **Ver más** agrega una parte: primero el detalle por institución y luego cada grupo de cuadros comparativos.
  Al cambiar el mes o las fechas se vuelve a la vista previa.
  Las horas de laptops van de la hora de inicio a la devolución; las de cubículos, hasta la salida real (si
  sigue activa, hasta la hora de fin). El botón **Descargar PDF** guarda siempre el informe completo con membrete y, al
  final, el **detalle** de cada préstamo y cada reserva del período. Los textos de logros, metas y
  conclusiones del reporte se escriben a mano; el sistema no los genera.
- **Respaldo**: en Informes, el botón **Descargar respaldo (Excel)** guarda un archivo con
  los préstamos y las reservas (una hoja para cada uno, una fila por registro con su fecha): todos, los de un año
  o los de un mes (se cuentan por la fecha de inicio, en hora de Caracas). Si la devolución o salida fue otro día,
  su columna muestra también la fecha.
- **Borrar todos los registros**: al final de Informes. Deja en 0 préstamos y reservas (y libera
  laptops y cubículos en uso). Pide la contraseña del usuario para confirmar (sin base de datos,
  escribir BORRAR) y ofrece descargar el respaldo antes. No se puede deshacer.
- **Páginas de 30**: cada tabla muestra como máximo 30 registros; si hay más, aparecen flechas
  (« ‹ › ») para pasar de página. El número se cambia en `REGISTROS_POR_PAGINA`
  (`src/hooks/usePaginacion.ts`).
- **Hora de Caracas**: todas las horas se muestran y se registran en hora de Caracas,
  Venezuela, aunque la computadora tenga otra zona horaria, y en formato de 12 horas ("3:47 p. m.") en pantallas,
  avisos, Excel y PDF. Los campos donde se escribe la hora usan el formato que tenga configurado el navegador.
- **Equipos / Espacios** (pestaña de laptops / cubículos): estado de cada uno y opción de enviarlo a mantenimiento.
- **Historial** (ícono de reloj): todos los registros, con búsqueda. En los cubículos muestra la hora real de
  salida, cuánto antes o después de lo previsto fue y el tiempo real de uso (también en el Excel y el PDF).
- **Actividad de hoy**: arriba de la pantalla principal, una gráfica de barras con la actividad de cada hora del día del módulo abierto (préstamos de laptops en Laptops, reservas de cubículos en Cubículos) (por la hora en que empiezan, en formato de 12 horas). Al pasar el mouse por una hora se ven las cantidades exactas; se actualiza sola.
- **Resumen**: disponibles, en uso, en mantenimiento y (en cubículos) reservas vencidas. Al pasar el mouse por
  **Disponibles** se ven los números de las laptops o cubículos disponibles; si no queda ninguno, la tarjeta se pone roja.

Reglas incluidas: solo se usan laptops o cubículos disponibles (los ocupados o en
mantenimiento aparecen desactivados en el menú) y, en los cubículos, la hora de fin debe ser posterior a la de inicio.

## Estructura (por componentes)

```
src/
├── config/
│   ├── modulos.ts        Módulos (laptops, cubículos): cantidad, tablas y textos
│   └── opciones.ts       Opciones de los menús desplegables
├── types/            Tipos de datos (Recurso, Registro…)
├── data/             Acceso a datos
│   ├── repository.ts             Interfaz `Repositorio`
│   ├── supabaseRepository.ts     Implementación con Supabase
│   ├── localStorageRepository.ts Implementación en el navegador
│   └── index.ts                  Aquí se elige qué implementación usar
├── services/
│   └── registroService.ts        Reglas del negocio (registrar, finalizar, validar)
├── hooks/
│   ├── useBiblioteca.ts          Carga y refresca los datos
│   └── useSesion.ts              Inicio de sesión de bibliotecarios
├── utils/            Fechas e IDs
├── components/       Una carpeta por componente
│   ├── Encabezado/        Título, módulos, pestañas y cerrar sesión
│   ├── Login/             Pantalla de inicio de sesión
│   ├── ActividadDiaria/   Gráfica de actividad de hoy por hora
│   ├── Resumen/           Tarjetas con totales
│   ├── EstadoBadge/       Etiqueta de color para estados
│   ├── RecursoList/       Estado de las laptops o cubículos
│   ├── RegistroForm/      Formulario de préstamo o reserva
│   ├── RegistrosActivos/  Registros en curso y devolución o salida
│   └── Historial/         Historial de préstamos o reservas
├── styles/global.css  Estilos y colores (variables al inicio)
└── App.tsx            Une los componentes
```

## Cambios comunes

| Quiero… | Archivo |
|---|---|
| Cambiar las opciones de un menú (institutos, carreras, años, motivos…) | `src/config/opciones.ts` |
| Cambiar las laptops o cubículos del menú (cantidad, o nombres como Podcast) | `opciones` y `NOMBRES_RECURSOS` en `src/config/modulos.ts` |
| Agregar otro módulo (por ejemplo, salas) | una entrada en `src/config/modulos.ts` y sus tablas en `supabase/esquema.sql` |
| Cambiar o agregar reglas | `src/services/registroService.ts` |
| Agregar un campo al formulario | `src/types/index.ts`, `src/components/RegistroForm/RegistroForm.tsx` y la base de datos |
| Cambiar colores | variables al inicio de `src/styles/global.css` |
| Cambiar las tablas de la base de datos | `supabase/esquema.sql` y `src/data/supabaseRepository.ts` |
| Usar otra base de datos | crear una clase que implemente `Repositorio` y usarla en `src/data/index.ts` |

> Sin Supabase los datos viven solo en ese navegador y esa computadora.
