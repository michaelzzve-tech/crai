/** Quita acentos y mayúsculas para comparar nombres ("José" coincide con "jose"). */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** true si el nombre contiene el texto buscado (vacío = todos). */
export const coincideNombre = (nombre: string, texto: string) => normalizar(nombre).includes(normalizar(texto));
