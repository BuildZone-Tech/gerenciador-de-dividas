
import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Import Supabase client

interface LoginFormProps {
  onNavigateToSignUp: () => void; // Callback to navigate to SignUpForm
  setLoginError: (error: string | null) => void;
  error: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onNavigateToSignUp, error, setLoginError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setIsLoading(false);

    if (signInError) {
      setLoginError(signInError.message || 'Erro ao tentar fazer login. Verifique suas credenciais.');
    } else {
      // onLoginSuccess will be called by App.tsx's onAuthStateChange listener
      // No need to call onLoginSuccess directly here as App.tsx listens to auth state.
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-xl p-8">
          <h2 className="text-3xl font-bold text-center text-slate-700 mb-8">
            Acessar Sistema
          </h2>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-600 mb-1"
              >
                E-mail
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                placeholder="seuemail@exemplo.com"
                required
                aria-required="true"
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-600 mb-1"
              >
                Senha
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                placeholder="Sua senha"
                required
                aria-required="true"
                disabled={isLoading}
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-400"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Não tem uma conta?{' '}
              <button
                onClick={onNavigateToSignUp}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Gerenciador de Dívidas.
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
