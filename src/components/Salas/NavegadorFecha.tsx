import { diaDe } from '../../utils/fechas';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate(); // mes: 1 a 12
const diaSemana = (anio: number, mes: number, dia: number) => DIAS_SEMANA[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];

/**
 * Menú para ir a cualquier fecha del calendario de salas: año, mes y día.
 * Al cambiar de mes o de año, el día se ajusta si ese mes tiene menos días.
 */
export function NavegadorFecha({ dia, onCambiar }: { dia: string; onCambiar: (dia: string) => void }) {
  const [anio, mes, d] = dia.split('-').map(Number);
  const anioActual = Number(diaDe().slice(0, 4));
  // Desde dos años atrás (para revisar reservas pasadas) hasta tres años adelante.
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - 2 + i);
  if (!anios.includes(anio)) anios.push(anio);
  anios.sort((a, b) => a - b);

  const ir = (a: number, m: number, x: number) =>
    onCambiar(`${a}-${dosDigitos(m)}-${dosDigitos(Math.min(x, diasDelMes(a, m)))}`);

  return (
    <div className="navegador-fecha" role="group" aria-label="Ir a una fecha">
      <select aria-label="Año" value={anio} onChange={(e) => ir(Number(e.target.value), mes, d)}>
        {anios.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select aria-label="Mes" value={mes} onChange={(e) => ir(anio, Number(e.target.value), d)}>
        {MESES.map((nombre, i) => <option key={nombre} value={i + 1}>{nombre}</option>)}
      </select>
      <select aria-label="Día" value={d} onChange={(e) => ir(anio, mes, Number(e.target.value))}>
        {Array.from({ length: diasDelMes(anio, mes) }, (_, i) => i + 1).map((x) => (
          <option key={x} value={x}>{diaSemana(anio, mes, x)} {x}</option>
        ))}
      </select>
    </div>
  );
}
