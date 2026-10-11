import { useState, type FormEvent } from 'react';
import { supabase } from '../../data/supabaseClient';

/** Pantalla de inicio de sesión para bibliotecarios (solo con base de datos). */
export function Login() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setEnviando(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
    if (error) setError('Correo o contraseña incorrectos.');
    setEnviando(false);
  }

  return (
    <div className="login">
      <form className="formulario" onSubmit={entrar}>
        <h2>Préstamo de laptops · Biblioteca</h2>
        <p className="secundario">Inicia sesión con tu cuenta de bibliotecario.</p>
        <div className="campos una-columna">
          <label>
            Correo
            <input id="login-correo" type="email" required autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </label>
          <label>
            Contraseña
            <input id="login-clave" type="password" required autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
          </label>
        </div>
        {error && <p className="texto-alerta">{error}</p>}
        <button type="submit" className="primario" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
