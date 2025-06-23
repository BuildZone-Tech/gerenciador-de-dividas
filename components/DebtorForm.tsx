
import React, { useState, useEffect, useCallback } from 'react';
import { Debtor, Installment, InstallmentType, InstallmentStatus } from '../types';
import { PlusIcon } from '../constants';

// Helper to add months to a date, simplistic, consider date-fns for production robustness
const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  // Handle cases where day might exceed days in new month (e.g., Jan 31 + 1 month = Feb 28/29)
  if (d.getDate() !== date.getDate()) {
    d.setDate(0); // Go to last day of previous month (which is the target month)
  }
  return d;
};


interface NewDebtorData {
  name: string;
  totalamountowed: number; // For FIXED: sum of installments. For RECURRING: initial/upfront. For NONE: total.
  notes?: string;
  installmentType: InstallmentType;
  
  // For FIXED
  installments?: Omit<Installment, 'id' | 'debtor_id' | 'user_id' | 'created_at' | 'amount_paid' | 'status' | 'payment_ids'>[]; 

  // For RECURRING
  monthlyPaymentAmount?: number;
  paymentDayOfMonth?: number;
}

interface DebtorFormProps {
  onAddDebtor: (debtorData: NewDebtorData) => void;
  onClose: () => void;
}

const DebtorForm: React.FC<DebtorFormProps> = ({ onAddDebtor, onClose }) => {
  const [name, setName] = useState('');
  const [totalAmountOwedFixed, setTotalAmountOwedFixed] = useState(''); // For InstallmentType.FIXED (total principal)
  const [initialUpfrontAmountRecurring, setInitialUpfrontAmountRecurring] = useState(''); // For RECURRING (initial/upfront)
  const [singlePaymentAmount, setSinglePaymentAmount] = useState(''); // For InstallmentType.NONE
  
  const [notes, setNotes] = useState('');
  const [installmentTypeState, setInstallmentTypeState] = useState<InstallmentType>(InstallmentType.NONE);
  
  // FIXED specific
  const [numberOfInstallmentsFixed, setNumberOfInstallmentsFixed] = useState('');
  const [firstInstallmentDueDateFixed, setFirstInstallmentDueDateFixed] = useState('');
  const [calculatedInstallments, setCalculatedInstallments] = useState<Installment[]>([]);

  // RECURRING specific
  const [monthlyPaymentAmountRecurring, setMonthlyPaymentAmountRecurring] = useState('');
  const [paymentDayOfMonthRecurring, setPaymentDayOfMonthRecurring] = useState('');
  
  const [error, setError] = useState<string | null>(null);

  const isFixedInstallment = installmentTypeState === InstallmentType.FIXED;
  const isRecurringInstallment = installmentTypeState === InstallmentType.PROCESS_END || installmentTypeState === InstallmentType.DECISION_BASED;
  const isSinglePayment = installmentTypeState === InstallmentType.NONE;

  const resetFormSpecifics = () => {
    setTotalAmountOwedFixed('');
    setInitialUpfrontAmountRecurring('');
    setSinglePaymentAmount('');
    setNumberOfInstallmentsFixed('');
    setFirstInstallmentDueDateFixed('');
    setCalculatedInstallments([]);
    setMonthlyPaymentAmountRecurring('');
    setPaymentDayOfMonthRecurring('');
  };

  useEffect(() => {
    resetFormSpecifics();
    setError(null);
  }, [installmentTypeState]);

  const calculateFixedInstallments = useCallback(() => {
    if (!isFixedInstallment || !totalAmountOwedFixed || !numberOfInstallmentsFixed || !firstInstallmentDueDateFixed) {
      setCalculatedInstallments([]);
      return;
    }

    const total = parseFloat(totalAmountOwedFixed);
    const numInstall = parseInt(numberOfInstallmentsFixed, 10);
    const firstDueDate = new Date(firstInstallmentDueDateFixed + 'T00:00:00'); // Ensure local timezone

    if (isNaN(total) || total <= 0 || isNaN(numInstall) || numInstall <= 0 || isNaN(firstDueDate.getTime())) {
      setCalculatedInstallments([]);
      setError("Para parcelamento fixo, preencha valor total, número de parcelas e data da primeira parcela corretamente.");
      return;
    }
    setError(null);

    const baseInstallmentAmount = parseFloat((total / numInstall).toFixed(2));
    let remainder = parseFloat((total - (baseInstallmentAmount * numInstall)).toFixed(2));

    const newCalculated: Installment[] = [];
    for (let i = 0; i < numInstall; i++) {
      let currentInstallmentAmount = baseInstallmentAmount;
      if (remainder !== 0 && i === numInstall - 1) { // Add remainder to the last installment
        currentInstallmentAmount = parseFloat((currentInstallmentAmount + remainder).toFixed(2));
      }
      
      const dueDate = addMonths(firstDueDate, i);
      
      newCalculated.push({
        id: `temp-${i}`, // Temporary ID
        debtor_id: '', user_id: '', // Will be set later
        installment_number: i + 1,
        due_date: dueDate.toISOString().split('T')[0], // YYYY-MM-DD
        amount_due: currentInstallmentAmount,
        amount_paid: 0,
        status: InstallmentStatus.PENDING,
        created_at: new Date().toISOString(),
      });
    }
    setCalculatedInstallments(newCalculated);
  }, [isFixedInstallment, totalAmountOwedFixed, numberOfInstallmentsFixed, firstInstallmentDueDateFixed]);

  useEffect(() => {
    if (isFixedInstallment) {
      calculateFixedInstallments();
    }
  }, [isFixedInstallment, totalAmountOwedFixed, numberOfInstallmentsFixed, firstInstallmentDueDateFixed, calculateFixedInstallments]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O nome do devedor é obrigatório.');
      return;
    }

    let finalTotalAmountOwed = 0;
    const newDebtorPayload: NewDebtorData = {
      name: name.trim(),
      totalamountowed: 0, // Placeholder, will be set based on type
      notes: notes.trim() || undefined,
      installmentType: installmentTypeState,
    };

    if (isSinglePayment) {
      const amount = parseFloat(singlePaymentAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Para pagamento único, o valor total devido deve ser um número positivo.');
        return;
      }
      finalTotalAmountOwed = amount;
    } else if (isFixedInstallment) {
      if (calculatedInstallments.length === 0 || !totalAmountOwedFixed || !numberOfInstallmentsFixed || !firstInstallmentDueDateFixed) {
        setError('Para parcelamento fixo, todos os campos são obrigatórios e as parcelas devem ser calculadas.');
        return;
      }
      const numInstall = parseInt(numberOfInstallmentsFixed, 10);
      if (isNaN(numInstall) || numInstall <= 0) {
        setError('Número de parcelas inválido.');
        return;
      }
      
      const installmentsToSave = calculatedInstallments.map(inst => ({
        installment_number: inst.installment_number,
        due_date: inst.due_date,
        amount_due: inst.amount_due,
      }));
      newDebtorPayload.installments = installmentsToSave;
      finalTotalAmountOwed = parseFloat(totalAmountOwedFixed); // This is the principal

    } else if (isRecurringInstallment) {
      let initialAmount = 0;
      if (initialUpfrontAmountRecurring.trim() !== '') {
        initialAmount = parseFloat(initialUpfrontAmountRecurring);
        if (isNaN(initialAmount) || initialAmount < 0) {
          setError('O valor inicial/adiantamento para parcelamento recorrente deve ser um número positivo ou zero.');
          return;
        }
      }
      finalTotalAmountOwed = initialAmount;

      const monthlyAmount = parseFloat(monthlyPaymentAmountRecurring);
      if (isNaN(monthlyAmount) || monthlyAmount <= 0) {
        setError('O valor da parcela mensal recorrente deve ser um número positivo.');
        return;
      }
      newDebtorPayload.monthlyPaymentAmount = monthlyAmount;

      const paymentDay = parseInt(paymentDayOfMonthRecurring, 10);
      if (isNaN(paymentDay) || paymentDay < 1 || paymentDay > 31) {
        setError('O dia do mês para pagamento recorrente deve ser entre 1 e 31.');
        return;
      }
      newDebtorPayload.paymentDayOfMonth = paymentDay;
    }
    
    newDebtorPayload.totalamountowed = finalTotalAmountOwed;
    onAddDebtor(newDebtorPayload);
    
    // Reset form
    setName('');
    setNotes('');
    setInstallmentTypeState(InstallmentType.NONE); // This will trigger useEffect to reset specifics
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500 text-sm mb-3 p-2 bg-red-50 border border-red-200 rounded">{error}</p>}
      <div>
        <label htmlFor="debtorName" className="block text-sm font-medium text-slate-700 mb-1">
          Nome do Devedor
        </label>
        <input
          type="text" id="debtorName" value={name} onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Ex: João Silva" required
        />
      </div>

      <div>
        <label htmlFor="installmentType" className="block text-sm font-medium text-slate-700 mb-1">
          Tipo de Dívida/Pagamento
        </label>
        <select
          id="installmentType" value={installmentTypeState}
          onChange={(e) => setInstallmentTypeState(e.target.value as InstallmentType)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value={InstallmentType.NONE}>Pagamento Único</option>
          <option value={InstallmentType.FIXED}>Parcelamento Fixo</option>
          <option value={InstallmentType.PROCESS_END}>Recorrente (Até Fim do Processo)</option>
          <option value={InstallmentType.DECISION_BASED}>Recorrente (Até Decisão Específica)</option>
        </select>
      </div>

      {isSinglePayment && (
        <div>
          <label htmlFor="singlePaymentAmount" className="block text-sm font-medium text-slate-700 mb-1">
            Valor Total Devido (R$)
          </label>
          <input
            type="number" id="singlePaymentAmount" value={singlePaymentAmount} onChange={(e) => setSinglePaymentAmount(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Ex: 1500.75" step="0.01" min="0.01" required
          />
        </div>
      )}

      {isFixedInstallment && (
        <>
          <div>
            <label htmlFor="totalAmountOwedFixed" className="block text-sm font-medium text-slate-700 mb-1">
              Valor Total do Contrato/Dívida (R$)
            </label>
            <input
              type="number" id="totalAmountOwedFixed" value={totalAmountOwedFixed} onChange={(e) => setTotalAmountOwedFixed(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ex: 1200.00" step="0.01" min="0.01" required
            />
          </div>
          <div>
            <label htmlFor="numberOfInstallmentsFixed" className="block text-sm font-medium text-slate-700 mb-1">
              Número de Parcelas
            </label>
            <input
              type="number" id="numberOfInstallmentsFixed" value={numberOfInstallmentsFixed} onChange={(e) => setNumberOfInstallmentsFixed(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ex: 12" step="1" min="1" required
            />
          </div>
          <div>
            <label htmlFor="firstInstallmentDueDateFixed" className="block text-sm font-medium text-slate-700 mb-1">
              Data de Vencimento da 1ª Parcela
            </label>
            <input
              type="date" id="firstInstallmentDueDateFixed" value={firstInstallmentDueDateFixed} onChange={(e) => setFirstInstallmentDueDateFixed(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          {calculatedInstallments.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
              <h4 className="text-sm font-medium text-slate-600 mb-2">Parcelas Calculadas (Mensais):</h4>
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {calculatedInstallments.map(inst => (
                  <li key={inst.id} className="flex justify-between">
                    <span>Parcela {inst.installment_number}: R$ {inst.amount_due.toFixed(2)}</span>
                    <span>Venc: {new Date(inst.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {isRecurringInstallment && (
        <>
          <div>
            <label htmlFor="initialUpfrontAmountRecurring" className="block text-sm font-medium text-slate-700 mb-1">
              Valor Inicial/Adiantamento (R$) (Opcional)
            </label>
            <input
              type="number" id="initialUpfrontAmountRecurring" value={initialUpfrontAmountRecurring} onChange={(e) => setInitialUpfrontAmountRecurring(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ex: 0 ou 500.00" step="0.01" min="0"
            />
          </div>
          <div>
            <label htmlFor="monthlyPaymentAmountRecurring" className="block text-sm font-medium text-slate-700 mb-1">
              Valor da Parcela Mensal Recorrente (R$)
            </label>
            <input
              type="number" id="monthlyPaymentAmountRecurring" value={monthlyPaymentAmountRecurring} onChange={(e) => setMonthlyPaymentAmountRecurring(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ex: 300.00" step="0.01" min="0.01" required
            />
          </div>
          <div>
            <label htmlFor="paymentDayOfMonthRecurring" className="block text-sm font-medium text-slate-700 mb-1">
              Dia do Mês para Pagamento Recorrente (1-31)
            </label>
            <input
              type="number" id="paymentDayOfMonthRecurring" value={paymentDayOfMonthRecurring} onChange={(e) => setPaymentDayOfMonthRecurring(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ex: 10" step="1" min="1" max="31" required
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
          Notas (Opcional)
        </label>
        <textarea
          id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Ex: Referente ao processo X, ou detalhes da decisão Y"
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
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Adicionar Devedor
        </button>
      </div>
    </form>
  );
};

export default DebtorForm;
