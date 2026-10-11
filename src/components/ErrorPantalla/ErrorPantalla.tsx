import { Component, type ReactNode } from 'react';

/** Pantalla con un mensaje de error, en lugar de una página en blanco. */
export function ErrorPantalla({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <div className="login">
      <div className="formulario" role="alert">
        <h2>{titulo}</h2>
        <p>{mensaje}</p>
      </div>
    </div>
  );
}

interface Estado {
  error: Error | null;
}

/** Si algún componente falla, muestra el error en vez de dejar la página en blanco. */
export class CapturaErrores extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ErrorPantalla titulo="Ocurrió un error" mensaje={this.state.error.message} />;
    }
    return this.props.children;
  }
}
