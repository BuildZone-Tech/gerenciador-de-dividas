
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { SubscriptionPlan } from '../types'; // Import SubscriptionPlan

interface SignUpFormProps {
  onNavigateToLogin: () => void;
  setSignUpError: (error: string | null) => void; // Using this to display general auth errors
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onNavigateToLogin, setSignUpError }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setSignUpError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setSignUpError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
     if (!fullName.trim()) {
      setSignUpError('O nome completo é obrigatório.');
      return;
    }


    setIsLoading(true);

    let planForNewUser = SubscriptionPlan.FREE;
    const specialEmails = ['victordias922@gmail.com', 'viniciusvencato.adv@gmail.com', 'testesadvogados@gmail.com'];
    if (specialEmails.includes(email.toLowerCase().trim())) {
        planForNewUser = SubscriptionPlan.PRO_LIFETIME;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName.trim(),
          current_plan: planForNewUser, // Assign determined plan
        },
      },
    });

    setIsLoading(false);

    if (error) {
      setSignUpError(error.message || 'Erro ao tentar criar a conta.');
    } else if (data.user) {
      // Check if email confirmation is required
      if (data.session === null && data.user.identities && data.user.identities.length > 0) {
         setSuccessMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar sua conta e poder fazer login.');
      } else if (data.session) {
        // Auto-login or no email confirmation needed, auth listener in App.tsx will handle it
        setSuccessMessage('Cadastro realizado com sucesso! Você será redirecionado.');
        // App.tsx's onAuthStateChange will redirect to main app
      } else {
        // Fallback for unexpected scenarios
        setSuccessMessage('Cadastro realizado. Você pode tentar fazer login.');
      }
      // Reset form or redirect (App.tsx handles redirection on session change)
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-xl p-8">
          <h2 className="text-3xl font-bold text-center text-slate-700 mb-8">
            Criar Conta
          </h2>
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md text-sm" role="alert">
              {successMessage}
            </div>
          )}
          {/* The error passed via setSignUpError prop is displayed by App.tsx */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-slate-600 mb-1"
              >
                Nome Completo
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                placeholder="Seu nome completo"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="email-signup"
                className="block text-sm font-medium text-slate-600 mb-1"
              >
                E-mail
              </label>
              <input
                type="email"
                id="email-signup"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                placeholder="seuemail@exemplo.com"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="password-signup"
                className="block text-sm font-medium text-slate-600 mb-1"
              >
                Senha
              </label>
              <input
                type="password"
                id="password-signup"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                placeholder="Crie uma senha (mín. 6 caracteres)"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-600 mb-1"
              >
                Confirmar Senha
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                placeholder="Confirme sua senha"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-400"
                disabled={isLoading}
              >
                {isLoading ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Já tem uma conta?{' '}
              <button
                onClick={onNavigateToLogin}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Faça Login
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

export default SignUpForm;
