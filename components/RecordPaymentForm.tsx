
import React, { useState, useEffect } from 'react';
import { Debtor, Installment, InstallmentType, InstallmentStatus, PaymentRecord } from '../types';
import { CurrencyDollarIcon } from '../constants';

interface RecordPaymentFormProps {
  debtor: Debtor;
  installments: Installment[]; // For FIXED type, pre-fetched by App.tsx
  onRecordPayment: (
    debtorId: string, 
    amount: number, 
    paymentMethod?: string,
    paymentNotes?: string,
    targetInstallmentId?: string // For FIXED type
  ) => void;
  onClose: () => void;
  dataError?: string | null; // To display errors from App.tsx related to fetching installments etc.
}

const PAYMENT_METHOD_OPTIONS = [
  'PIX',
  'Dinheiro',
  'Transferência Bancária',
  'Cartão de Crédito',
  'Cartão de Débito',
];

const RecordPaymentForm: React.FC<RecordPaymentFormProps> = ({ 
    debtor, 
    installments, 
    onRecordPayment, 
    onClose,
    dataError: externalDataError 
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [recurringPaymentSequence, setRecurringPaymentSequence] = useState<number | null>(null);

  const isFixedInstallment = debtor.installmenttype === InstallmentType.FIXED;
  const isRecurringInstallment = debtor.installmenttype === InstallmentType.PROCESS_END || debtor.installmenttype === InstallmentType.DECISION_BASED;
  const isSinglePayment = debtor.installmenttype === InstallmentType.NONE;

  // Calculate remaining for single payment or overall for non-fixed
  const singlePaymentRemaining = isSinglePayment ? (debtor.totalamountowed - debtor.amountpaid) : Infinity;

  useEffect(() => {
    // Reset form state when debtor changes
    setPaymentAmount('');
    setPaymentMethod('');
    setPaymentNotes('');
    setSelectedInstallmentId(undefined);
    setError(null); 
    setRecurringPaymentSequence(null);

    if (isFixedInstallment && installments.length > 0) {
      // Pre-select the first pending/partially_paid/overdue installment
      const firstPayable = installments.find(inst => 
        inst.status === InstallmentStatus.PENDING || 
        inst.status === InstallmentStatus.PARTIALLY_PAID ||
        inst.status === InstallmentStatus.OVERDUE
      );
      if (firstPayable) {
        setSelectedInstallmentId(firstPayable.id);
        const remainingForInstallment = firstPayable.amount_due - firstPayable.amount_paid;
        setPaymentAmount(Math.max(0, remainingForInstallment).toFixed(2));
      }
    } else if (isRecurringInstallment) {
      // For recurring, we might fetch payment history count to suggest next sequence number
      // This is now handled in App.tsx before receipt generation. We can show a placeholder or fixed text.
      // Or, get it passed if vital for the form display. For now, let's assume it's informational on receipt.
    } else if (isSinglePayment) {
        setPaymentAmount(Math.max(0, singlePaymentRemaining).toFixed(2));
    }

  }, [debtor, installments, isFixedInstallment, isRecurringInstallment, isSinglePayment, singlePaymentRemaining]);

  const handleInstallmentSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const instId = e.target.value;
    setSelectedInstallmentId(instId);
    const selectedInst = installments.find(i => i.id === instId);
    if (selectedInst) {
      const remainingForInstallment = selectedInst.amount_due - selectedInst.amount_paid;
      setPaymentAmount(Math.max(0, remainingForInstallment).toFixed(2));
    } else {
      setPaymentAmount('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(paymentAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('O valor do pagamento deve ser um número positivo.');
      return;
    }

    if (isFixedInstallment) {
      if (!selectedInstallmentId) {
        setError('Selecione uma parcela para registrar o pagamento.');
        return;
      }
      const installment = installments.find(inst => inst.id === selectedInstallmentId);
      if (installment) {
        const remainingForInstallment = installment.amount_due - installment.amount_paid;
        if (amount > remainingForInstallment + 0.001) { // Add tolerance for float issues
          setError(`O pagamento de R$ ${amount.toFixed(2)} excede o valor restante de R$ ${remainingForInstallment.toFixed(2)} para a parcela ${installment.installment_number}.`);
          return;
        }
      }
    } else if (isSinglePayment) {
      if (amount > singlePaymentRemaining + 0.001) {
        setError(`O pagamento não pode exceder o valor restante de R$ ${singlePaymentRemaining.toFixed(2)}.`);
        return;
      }
    }
    // For recurring, no upper limit check needed based on 'total' in the same way.

    onRecordPayment(debtor.id, amount, paymentMethod.trim() || undefined, paymentNotes.trim() || undefined, selectedInstallmentId);
    // Form reset is handled by useEffect if debtor context changes, or by App.tsx closing modal
  };
  
  const allFixedInstallmentsPaid = isFixedInstallment && installments.every(inst => inst.status === InstallmentStatus.PAID);
  const isFullyPaidSingle = isSinglePayment && singlePaymentRemaining <= 0.001;
  const cannotMakePayment = allFixedInstallmentsPaid || isFullyPaidSingle;


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-slate-700">Devedor: <span className="font-semibold">{debtor.name}</span></p>
        {isSinglePayment && <p className="text-sm text-slate-700">Valor Restante (Único): <span className="font-semibold">R$ {singlePaymentRemaining.toFixed(2)}</span></p>}
        {isRecurringInstallment && <p className="text-sm text-slate-700">Pagamento Recorrente. Valor Mensal Definido: R$ { (debtor.monthlypaymentamount || 0).toFixed(2)} </p>}
        {isRecurringInstallment && <p className="text-sm text-slate-700">Total Pago Acumulado: <span className="font-semibold">R$ {debtor.amountpaid.toFixed(2)}</span></p>}
        {isFixedInstallment && <p className="text-sm text-slate-700">Total do Contrato: R$ {debtor.totalamountowed.toFixed(2)} | Total Pago: R$ {debtor.amountpaid.toFixed(2)}</p>}

      </div>
      
      {(error || externalDataError) && <p className="text-red-500 text-sm p-2 bg-red-50 border border-red-200 rounded">{error || externalDataError}</p>}
      
      {isFixedInstallment && installments.length > 0 && (
        <div>
          <label htmlFor="installmentSelection" className="block text-sm font-medium text-slate-700 mb-1">
            Pagar Parcela Específica:
          </label>
          <select
            id="installmentSelection"
            value={selectedInstallmentId || ''}
            onChange={handleInstallmentSelectionChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={allFixedInstallmentsPaid}
          >
            <option value="">-- Selecione uma Parcela --</option>
            {installments.map(inst => (
              <option key={inst.id} value={inst.id} disabled={inst.status === InstallmentStatus.PAID}>
                Parcela {inst.installment_number} - Venc: {new Date(inst.due_date + 'T00:00:00').toLocaleDateString('pt-BR')} 
                - R$ {inst.amount_due.toFixed(2)} 
                (Pago: R$ {inst.amount_paid.toFixed(2)})
                {inst.status !== InstallmentStatus.PAID ? ` - Resta: R$ ${(inst.amount_due - inst.amount_paid).toFixed(2)}` : ' (PAGA)'}
              </option>
            ))}
          </select>
        </div>
      )}
      {isFixedInstallment && installments.length === 0 && !externalDataError && (
         <p className="text-orange-600 text-sm p-2 bg-orange-50 border border-orange-200 rounded">Nenhuma parcela encontrada para este devedor ou erro ao carregar.</p>
      )}


      <div>
        <label htmlFor="paymentAmount" className="block text-sm font-medium text-slate-700 mb-1">
          Valor do Pagamento (R$)
        </label>
        <input
          type="number" id="paymentAmount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder={
            isFixedInstallment && selectedInstallmentId ? 
            `Valor para parcela selecionada` : 
            (isSinglePayment ? `Máx: ${singlePaymentRemaining.toFixed(2)}` : "Ex: 100.00")
          }
          step="0.01" min="0.01"
          disabled={cannotMakePayment || (isFixedInstallment && !selectedInstallmentId)}
          required
        />
      </div>

      <div>
        <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-700 mb-1">
          Forma de Pagamento (Opcional)
        </label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          disabled={cannotMakePayment && !isRecurringInstallment}
        >
          <option value="">Selecione (Opcional)</option>
          {PAYMENT_METHOD_OPTIONS.map(method => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="paymentNotes" className="block text-sm font-medium text-slate-700 mb-1">
          Notas do Pagamento (Opcional)
        </label>
        <textarea
          id="paymentNotes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Ex: Pagamento referente à parcela de Maio"
          disabled={cannotMakePayment && !isRecurringInstallment}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button" onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          disabled={cannotMakePayment && !isRecurringInstallment}
        >
          <CurrencyDollarIcon className="w-4 h-4 mr-2" />
          Registrar Pagamento
        </button>
      </div>
    </form>
  );
};

export default RecordPaymentForm;
