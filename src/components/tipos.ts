/**
 * Función que ejecuta una acción del servicio, muestra el mensaje de éxito
 * o el error y refresca los datos. Devuelve `true` si la acción salió bien.
 */
export type EjecutarAccion = (
  accion: () => Promise<unknown>,
  mensajeExito: string,
) => Promise<boolean>;
