import type { ReactNode } from 'react';
import logo from '../../assets/logo-crai-interno.png';
import type { Modulo } from '../../config/modulos';

export type Pestana = 'registro' | 'recursos' | 'historial';

interface Props {
  modulos: Modulo[];
  modulo: Modulo;
  onCambiarModulo: (modulo: Modulo) => void;
  enInformes: boolean; // true si está abierta la sección Informes en vez de un módulo
  onInformes: () => void;
  activa: Pestana;
  onCambiar: (pestana: Pestana) => void;
  correo?: string;
  onCerrarSesion?: () => void;
  notificaciones?: ReactNode; // Campana del centro de notificaciones
}

/** Título, selector de módulo (laptops, cubículos…) y pestañas del módulo. */
export function Encabezado({ modulos, modulo, onCambiarModulo, enInformes, onInformes, activa, onCambiar, correo, onCerrarSesion, notificaciones }: Props) {
  // Historial se muestra como un ícono de reloj; su nombre queda en la ayuda y para lectores de pantalla.
  const pestanas: { id: Pestana; titulo: string; icono?: ReactNode }[] = [
    { id: 'registro', titulo: modulo.registros },
    { id: 'recursos', titulo: modulo.pestanaRecursos },
    { id: 'historial', titulo: 'Historial', icono: <IconoReloj /> },
  ];

  return (
    <header className="encabezado">
