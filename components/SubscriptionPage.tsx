
import React from 'react';
import { User } from '@supabase/supabase-js';
import { SubscriptionPlan, UserProfile } from '../types';
import { StarIcon, CheckCircleIcon, CheckBadgeIcon } from '../constants';

interface SubscriptionPageProps {
  user: User | null;
  onInitiateCheckout: (planId: string, planName: string) => void;
}

// IDs de Preço do Stripe fornecidos pelo usuário
const STRIPE_PRO_MONTHLY_PRICE_ID = "price_1RYyp8LJfhqaV7iiPOvcDkhg";
const STRIPE_PRO_LIFETIME_PRICE_ID = "price_1RYys7LJfhqaV7iiGgfh3F1v";

const planDetails = {
  [SubscriptionPlan.FREE]: {
    name: 'Plano Gratuito',
    price: 'R$ 0',
    frequency: '/sempre',
    features: ['Até 3 devedores cadastrados', 'Funcionalidades básicas de rastreamento', 'Suporte comunitário'],
    cta: 'Seu Plano Atual',
    stripePriceId: null, // Não aplicável para plano gratuito
    highlight: false,
  },
  [SubscriptionPlan.PRO_MONTHLY]: {
    name: 'Pro Mensal',
    price: 'R$ 14,99',
    frequency: '/mês',
    features: ['Devedores ilimitados', 'Todos os recursos do Gratuito', 'Relatórios avançados (em breve)', 'Suporte prioritário por e-mail'],
    cta: 'Assinar Pro Mensal',
    stripePriceId: STRIPE_PRO_MONTHLY_PRICE_ID, 
    highlight: true,
  },
  [SubscriptionPlan.PRO_LIFETIME]: {
    name: 'Pro Vitalício',
    price: 'R$ 149,99',
    frequency: 'pagamento único',
    features: ['Devedores ilimitados', 'Todos os recursos do Pro Mensal', 'Acesso vitalício a todas as atualizações futuras', 'Suporte VIP'],
    cta: 'Comprar Acesso Vitalício',
    stripePriceId: STRIPE_PRO_LIFETIME_PRICE_ID, 
    highlight: false,
  },
};


const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onInitiateCheckout }) => {
  const userMetadata = user?.user_metadata as UserProfile | undefined;
  const currentPlan = userMetadata?.current_plan || SubscriptionPlan.FREE;

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 md:p-8 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-800 mb-3">Nossos Planos</h1>
        <p className="text-lg text-slate-600">Escolha o plano que melhor se adapta às suas necessidades.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.values(SubscriptionPlan).map((planKey) => {
          const plan = planDetails[planKey];
          const isCurrentPlan = currentPlan === planKey;

          return (
            <div
              key={planKey}
              className={`rounded-lg shadow-lg p-8 flex flex-col ${plan.highlight ? 'border-2 border-blue-500 scale-105 bg-blue-50' : 'bg-slate-50'}`}
            >
              {plan.highlight && (
                <div className="text-center mb-4">
                    <span className="inline-block bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase">Popular</span>
                </div>
              )}
              <h2 className="text-2xl font-semibold text-slate-800 text-center mb-2">{plan.name}</h2>
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-500">{plan.frequency}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {isCurrentPlan ? (
                <button
                  disabled
                  className="w-full mt-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  <CheckBadgeIcon className="w-5 h-5 mr-2"/>
                  Seu Plano Atual
                </button>
              ) : plan.stripePriceId ? (
                <button
                  onClick={() => onInitiateCheckout(plan.stripePriceId!, plan.name)}
                  className={`w-full mt-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${plan.highlight ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
                >
                  <StarIcon className="w-5 h-5 mr-2"/>
                  {plan.cta}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {/* Seção de Nota Importante Removida */}
    </div>
  );
};

export default SubscriptionPage;
