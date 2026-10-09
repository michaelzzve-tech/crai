# Préstamo de laptops · Biblioteca universitaria

Aplicación web para llevar el registro de las laptops que la biblioteca presta a los estudiantes:
inventario, préstamos activos (con alerta de vencidos), devoluciones con observaciones e historial.

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

- **Inventario**: registrar laptops (código, marca, modelo, serie, notas), buscar, enviar a mantenimiento, eliminar.
- **Préstamos**: prestar una laptop disponible a un estudiante (nombre, carnet, correo, bibliotecario, duración).
- **Devoluciones**: registrar la devolución con observaciones (daños, faltantes).
- **Historial**: todos los préstamos, con búsqueda y marca de devoluciones con retraso.
- **Resumen**: totales de disponibles, prestadas, en mantenimiento y préstamos vencidos.

Reglas incluidas: no se repiten códigos de inventario, solo se prestan laptops disponibles,
un estudiante (carnet) no puede tener dos laptops a la vez, y no se elimina una laptop prestada.

## Estructura (por componentes)

```
src/
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
│   ├── LaptopForm/        Formulario de nueva laptop
│   ├── LaptopList/        Tabla de inventario
│   ├── PrestamoForm/      Formulario de nuevo préstamo
│   ├── PrestamosActivos/  Préstamos en curso y devolución
│   └── Historial/         Historial de préstamos
├── styles/global.css  Estilos y colores (variables al inicio)
└── App.tsx            Une los componentes
```

## Cambios comunes

| Quiero… | Archivo |
|---|---|
| Cambiar las duraciones de préstamo | `src/components/PrestamoForm/PrestamoForm.tsx` (`DURACIONES`) |
| Cambiar o agregar reglas | `src/services/prestamoService.ts` |
| Agregar un campo a la laptop o al préstamo | `src/types/index.ts` y el formulario correspondiente |
| Cambiar colores | variables al inicio de `src/styles/global.css` |
| Cambiar las tablas de la base de datos | `supabase/esquema.sql` y `src/data/supabaseRepository.ts` |
| Usar otra base de datos | crear una clase que implemente `Repositorio` y usarla en `src/data/index.ts` |

> Sin Supabase los datos viven solo en ese navegador y esa computadora.
