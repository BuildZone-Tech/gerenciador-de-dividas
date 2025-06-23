
import React, { useEffect } from 'react';
import { Debtor, PaymentRecord, InstallmentType } from '../types';

interface PaymentHistoryPageProps {
  debtors: Debtor[];
  selectedDebtor: Debtor | null;
  setSelectedDebtor: (debtor: Debtor | null) => void;
  paymentHistory: PaymentRecord[];
  fetchPaymentHistory: (debtorId: string) => Promise<void>;
  isLoadingHistory: boolean;
  dataError: string | null;
  // onGoBackToMain: () => void; // Removido
}

const PaymentHistoryPage: React.FC<PaymentHistoryPageProps> = ({
  debtors,
  selectedDebtor,
  setSelectedDebtor,
  paymentHistory,
  fetchPaymentHistory,
  isLoadingHistory,
  dataError,
  // onGoBackToMain // Removido
}) => {
  useEffect(() => {
    if (selectedDebtor) {
      fetchPaymentHistory(selectedDebtor.id);
    }
  }, [selectedDebtor, fetchPaymentHistory]);

  const handleDebtorSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const debtorId = e.target.value;
    const debtor = debtors.find(d => d.id === debtorId) || null;
    setSelectedDebtor(debtor);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (debtors.length === 0 && !isLoadingHistory) { // Adicionado !isLoadingHistory para evitar mostrar durante carregamento inicial
    return (
      <div className="bg-white shadow-xl rounded-xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-slate-200">
          <h2 className="text-2xl font-semibold text-slate-800 mb-3 sm:mb-0">
            Histórico de Pagamentos
          </h2>
          {/* Botão Voltar Removido */}
        </div>
        <div className="text-center py-10">
          <p className="text-slate-500 text-lg">Nenhum devedor cadastrado no sistema.</p>
          <p className="text-slate-400 text-sm">Adicione um devedor para visualizar o histórico.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-semibold text-slate-800 mb-3 sm:mb-0">
          Histórico de Pagamentos
        </h2>
         {/* Botão Voltar Removido */}
      </div>

      <div className="mb-6">
        <label htmlFor="debtorSelectionPage" className="block text-sm font-medium text-slate-700 mb-1">
          Selecione o Devedor:
        </label>
        <select
          id="debtorSelectionPage"
          value={selectedDebtor?.id || ''}
          onChange={handleDebtorSelection}
          className="mt-1 block w-full max-w-md px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          disabled={debtors.length === 0}
        >
          <option value="">-- Selecione um Devedor --</option>
          {debtors.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {selectedDebtor && (
        <div>
          <h3 className="text-xl font-medium text-slate-800 mb-4">
            Exibindo histórico de: <span className="text-blue-600">{selectedDebtor.name}</span>
          </h3>
          {isLoadingHistory && <p className="text-slate-500 py-4 text-center">Carregando histórico...</p>}
          {dataError && !isLoadingHistory && (
             <p className="text-red-500 text-sm p-3 my-4 bg-red-50 border border-red-200 rounded-md">
                Erro ao carregar histórico: {dataError}
             </p>
          )}

          {!isLoadingHistory && !dataError && paymentHistory.length === 0 && (
            <div className="text-center py-10">
                <p className="text-slate-500 text-lg">Nenhum pagamento registrado para este devedor.</p>
                <p className="text-slate-400 text-sm">Quando pagamentos forem registrados, eles aparecerão aqui.</p>
            </div>
          )}

          {!isLoadingHistory && !dataError && paymentHistory.length > 0 && (
            <div className="overflow-x-auto shadow-md rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Data Pag.</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Valor Pago</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Ref. Parcela</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Forma Pag.</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Notas</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Registrado Em</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {paymentHistory.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">{formatDate(record.payment_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">R$ {record.amount_paid.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {selectedDebtor?.installmenttype === InstallmentType.FIXED && record.installments?.installment_number 
                          ? `#${record.installments.installment_number}` 
                          : ((selectedDebtor?.installmenttype === InstallmentType.PROCESS_END || selectedDebtor?.installmenttype === InstallmentType.DECISION_BASED) && record.installment_sequence_number 
                              ? `Seq. #${record.installment_sequence_number}` 
                              : '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{record.payment_method || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={record.notes || ''}>{record.notes || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(record.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
       {!selectedDebtor && !isLoadingHistory && debtors.length > 0 && ( 
         <div className="text-center py-10 mt-6">
            <h3 className="mt-2 text-sm font-medium text-slate-900">Selecione um devedor</h3>
            <p className="mt-1 text-sm text-slate-500">Escolha um devedor na lista acima para visualizar seu histórico de pagamentos.</p>
        </div>
       )}
    </div>
  );
};

export default PaymentHistoryPage;
