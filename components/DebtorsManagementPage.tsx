
import React from 'react';
import { Debtor, PaymentRecord } from '../types';
import DebtorList from './DebtorList';
import { PlusIcon } from '../constants';

interface DebtorsManagementPageProps {
  debtors: Debtor[];
  allUserPayments: PaymentRecord[]; 
  onRecordPaymentClick: (debtor: Debtor) => void;
  onDeleteDebtor: (debtorId: string) => void;
  onOpenAddDebtorModal: () => void;
  isLoading: boolean;
  dataError: string | null;
  limitError: string | null; // Novo: para erros de limite de plano
  onNavigateToSubscriptions: () => void; // Novo: para ir para a página de planos
}

const DebtorsManagementPage: React.FC<DebtorsManagementPageProps> = ({
  debtors,
  // allUserPayments, 
  onRecordPaymentClick,
  onDeleteDebtor,
  onOpenAddDebtorModal,
  isLoading,
  dataError,
  limitError,
  onNavigateToSubscriptions,
}) => {
  const isCriticalError = dataError && dataError.includes("ERRO CRÍTICO");

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-semibold text-slate-800 mb-3 sm:mb-0">
          Gerenciamento de Devedores
        </h2>
      </div>

      <div className="mb-6">
        <button
          onClick={onOpenAddDebtorModal} // A lógica de verificação de limite agora está em App.tsx antes de abrir
          disabled={!!limitError && !isLoading} // Desabilita se houver erro de limite e não estiver carregando
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Adicionar Novo Devedor
        </button>
      </div>

      {limitError && !isLoading && (
         <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm" role="alert">
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-semibold">Limite Atingido:</p>
                    <p>{limitError}</p>
                </div>
                <button 
                    onClick={onNavigateToSubscriptions}
                    className="ml-4 px-3 py-1.5 text-xs font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-md shadow-sm"
                >
                    Ver Planos
                </button>
            </div>
        </div>
      )}

      {isLoading && debtors.length === 0 && ( 
        <div className="text-center py-10">
          <p className="text-lg text-slate-500">Carregando devedores...</p>
        </div>
      )}

      {dataError && !isCriticalError && (
         <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm" role="alert">
            <p className="font-semibold">Erro ao carregar dados:</p>
            <pre className="whitespace-pre-wrap text-xs">{dataError}</pre>
        </div>
      )}
      
      {!isLoading && debtors.length === 0 && !dataError && !limitError && (
         <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.042A8.001 8.001 0 004 12c0 3.866 3.582 7 8 7s8-3.134 8-7a8.001 8.001 0 00-8-7.958v.001zM12 12a3 3 0 100-6 3 3 0 000 6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14c-2.667 0-5 1.333-5 4h10c0-2.667-2.333-4-5-4z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">Nenhum devedor cadastrado</h3>
            <p className="mt-1 text-sm text-slate-500">Clique em "Adicionar Novo Devedor" para começar.</p>
        </div>
      )}

      {!isCriticalError && debtors.length > 0 && (
         <DebtorList
            debtors={debtors}
            onRecordPaymentClick={onRecordPaymentClick}
            onDeleteDebtor={onDeleteDebtor}
          />
      )}
    </div>
  );
};

export default DebtorsManagementPage;
