# Préstamo de laptops · Biblioteca universitaria

Aplicación web para llevar el registro de las laptops que la biblioteca presta a los estudiantes:
préstamos activos (con alerta de vencidos), devoluciones con observaciones, estado de las laptops e historial.

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

- **Préstamos**: registrar un préstamo con estos campos, en este orden: nombre, instituto
  (ITJO, IUJO, CFJO), condición (estudiante, docente, otro), carrera o año (ITJO: año del 1 al 6;
  IUJO: carrera; CFJO: un número escrito a mano), laptop (1 a 25),
  motivo de uso (estudio, tarea, entretenimiento), hora de inicio, hora de fin y duración
  (se calcula sola).
- **Devoluciones**: registrar la devolución con observaciones (daños, faltantes).
- **Laptops**: ver el estado de las 25 laptops y enviar alguna a mantenimiento.
- **Historial**: todos los préstamos, con búsqueda y marca de devoluciones con retraso.
- **Resumen**: totales de disponibles, prestadas, en mantenimiento y préstamos vencidos.

Reglas incluidas: solo se prestan laptops disponibles (las prestadas o en mantenimiento
aparecen desactivadas en el menú) y la hora de fin debe ser posterior a la de inicio.

## Estructura (por componentes)

```
src/
├── config/opciones.ts Opciones de los menús desplegables y número de laptops
├── types/            Tipos de datos (Laptop, Prestamo…)
├── data/             Acceso a datos
│   ├── repository.ts             Interfaz `Repositorio`
│   ├── supabaseRepository.ts     Implementación con Supabase
│   ├── localStorageRepository.ts Implementación en el navegador
│   └── index.ts                  Aquí se elige qué implementación usar
├── services/
│   └── prestamoService.ts        Reglas del negocio (prestar, devolver, validar)
├── hooks/
│   ├── useBiblioteca.ts          Carga y refresca los datos
│   └── useSesion.ts              Inicio de sesión de bibliotecarios
├── utils/            Fechas e IDs
├── components/       Una carpeta por componente
│   ├── Encabezado/        Título, pestañas y cerrar sesión
│   ├── Login/             Pantalla de inicio de sesión
│   ├── Resumen/           Tarjetas con totales
│   ├── EstadoBadge/       Etiqueta de color para estados
│   ├── LaptopList/        Estado de las laptops
│   ├── PrestamoForm/      Formulario de nuevo préstamo
│   ├── PrestamosActivos/  Préstamos en curso y devolución
│   └── Historial/         Historial de préstamos
├── styles/global.css  Estilos y colores (variables al inicio)
└── App.tsx            Une los componentes
```

## Cambios comunes

| Quiero… | Archivo |
|---|---|
| Cambiar las opciones de un menú (institutos, carreras, años, motivos…) | `src/config/opciones.ts` |
| Cambiar la cantidad de laptops | `TOTAL_LAPTOPS` en `src/config/opciones.ts` |
| Cambiar o agregar reglas | `src/services/prestamoService.ts` |
| Agregar un campo al préstamo | `src/types/index.ts`, `src/components/PrestamoForm/PrestamoForm.tsx` y la base de datos |
| Cambiar colores | variables al inicio de `src/styles/global.css` |
| Cambiar las tablas de la base de datos | `supabase/esquema.sql` y `src/data/supabaseRepository.ts` |
| Usar otra base de datos | crear una clase que implemente `Repositorio` y usarla en `src/data/index.ts` |

> Sin Supabase los datos viven solo en ese navegador y esa computadora.
