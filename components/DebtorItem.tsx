
import React from 'react';
import { Debtor, PaymentStatus, InstallmentType, Installment, InstallmentStatus as InstStatusEnum } from '../types'; // Renamed import
import { CurrencyDollarIcon, TrashIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, ClockIcon } from '../constants';

interface DebtorItemProps {
  debtor: Debtor;
  onRecordPaymentClick: (debtor: Debtor) => void;
  onDeleteDebtor: (debtorId: string) => void;
}

const getPaymentStatus = (debtor: Debtor): PaymentStatus => {
  const { installmenttype, totalamountowed, amountpaid, installments } = debtor;

  if (installmenttype === InstallmentType.PROCESS_END || installmenttype === InstallmentType.DECISION_BASED) {
    return PaymentStatus.ONGOING;
  }

  if (installmenttype === InstallmentType.FIXED) {
    if (!installments || installments.length === 0) { // No installments defined yet, or error loading
        // If totalamountowed > 0 but no installments, it's effectively UNPAID or needs setup
        return amountpaid > 0 ? PaymentStatus.PARTIAL : PaymentStatus.UNPAID; 
    }
    const allPaid = installments.every(inst => inst.status === InstStatusEnum.PAID);
    if (allPaid) return PaymentStatus.PAID;

    const somePaid = installments.some(inst => inst.status === InstStatusEnum.PAID || inst.status === InstStatusEnum.PARTIALLY_PAID || inst.amount_paid > 0);
    if (somePaid) return PaymentStatus.PARTIAL;
    
    // Check for overdue (simplistic check, assumes current date logic elsewhere if needed for visual cue)
    // const anyOverdue = installments.some(inst => new Date(inst.due_date) < new Date() && inst.status !== InstStatusEnum.PAID);
    // if (anyOverdue) return PaymentStatus.OVERDUE; // Could add Overdue to PaymentStatus enum

    return PaymentStatus.UNPAID;
  }

  // Fallback for InstallmentType.NONE
  if (totalamountowed <= 0 && amountpaid <= 0) return PaymentStatus.UNPAID; // Or some "Zeroed" state if applicable
  if (totalamountowed > 0 && (totalamountowed - amountpaid) <= 0.001) return PaymentStatus.PAID;
  if (amountpaid > 0 && totalamountowed > 0) return PaymentStatus.PARTIAL;
  
  return PaymentStatus.UNPAID;
};

const DebtorItem: React.FC<DebtorItemProps> = ({ debtor, onRecordPaymentClick, onDeleteDebtor }) => {
  const status = getPaymentStatus(debtor);
  
  const { totalamountowed, amountpaid, installmenttype, installments } = debtor;
  const remainingAmount = totalamountowed - amountpaid; // General remaining for NONE, or overall for FIXED if totalamountowed is sum of installments.
  
  const isRecurringInstallment = installmenttype === InstallmentType.PROCESS_END || installmenttype === InstallmentType.DECISION_BASED;
  const isFixedInstallment = installmenttype === InstallmentType.FIXED;

  const statusColors: Record<PaymentStatus, string> = {
    [PaymentStatus.PAID]: 'bg-green-100 text-green-700',
    [PaymentStatus.PARTIAL]: 'bg-yellow-100 text-yellow-700',
    [PaymentStatus.UNPAID]: 'bg-red-100 text-red-700',
    [PaymentStatus.ONGOING]: 'bg-sky-100 text-sky-700',
    [PaymentStatus.OVERDUE]: 'bg-orange-100 text-orange-700', // Example if OVERDUE is added
  };

  const statusIcons: Record<PaymentStatus, React.ReactNode> = {
    [PaymentStatus.PAID]: <CheckCircleIcon className="w-5 h-5 mr-1.5" />,
    [PaymentStatus.PARTIAL]: <InformationCircleIcon className="w-5 h-5 mr-1.5" />,
    [PaymentStatus.UNPAID]: <ExclamationCircleIcon className="w-5 h-5 mr-1.5" />,
    [PaymentStatus.ONGOING]: <ClockIcon className="w-5 h-5 mr-1.5" />,
    [PaymentStatus.OVERDUE]: <ExclamationCircleIcon className="w-5 h-5 mr-1.5 text-orange-500" />,
  };
  
  const formattedDate = new Date(debtor.dateadded).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const renderInstallmentInfo = () => {
    if (isFixedInstallment) {
      if (!installments || installments.length === 0) return <p className="text-xs text-slate-500 mt-1">Detalhes das parcelas não carregados ou não definidos.</p>;
      
      const paidCount = installments.filter(inst => inst.status === InstStatusEnum.PAID).length;
      const totalCount = installments.length;
      const nextDueInstallment = installments.find(inst => inst.status === InstStatusEnum.PENDING || inst.status === InstStatusEnum.PARTIALLY_PAID || inst.status === InstStatusEnum.OVERDUE);

      let summary = `${paidCount} de ${totalCount} parcelas pagas.`;
      if (nextDueInstallment) {
        summary += ` Próxima: #${nextDueInstallment.installment_number} em ${new Date(nextDueInstallment.due_date+'T00:00:00').toLocaleDateString('pt-BR')} (R$ ${nextDueInstallment.amount_due.toFixed(2)}).`;
      } else if (paidCount === totalCount && totalCount > 0) {
        summary = "Todas as parcelas foram pagas.";
      }
      return <p className="text-xs text-blue-600 mt-1">{summary}</p>;

    } else if (isRecurringInstallment) {
      let infoText = installmenttype === InstallmentType.PROCESS_END ? 'Recorrente (Até Fim do Processo).' : 'Recorrente (Até Decisão Específica).';
      if (debtor.monthlypaymentamount && debtor.monthlypaymentamount > 0) {
        infoText += ` Mensal: R$ ${(debtor.monthlypaymentamount).toFixed(2)}`;
      }
      if (debtor.paymentdayofmonth) {
        infoText += `, Dia Pag.: ${debtor.paymentdayofmonth}`;
        // Could calculate next expected due date here
      }
      return <p className="text-xs text-blue-600 mt-1">{infoText}</p>;
    }
    return null; // For InstallmentType.NONE
  };
  
  let canRecordPayment = status !== PaymentStatus.PAID || isRecurringInstallment;
  if(isFixedInstallment && installments && installments.every(inst => inst.status === InstStatusEnum.PAID)) {
    canRecordPayment = false;
  }


  return (
    <div className="bg-white shadow-lg rounded-xl p-5 hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-slate-800">{debtor.name}</h3>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {statusIcons[status]}
            {status}
          </span>
        </div>

        <div className="space-y-1 text-sm text-slate-600 mb-4">
          {isRecurringInstallment ? (
            <>
              {totalamountowed > 0 && <p>Valor Inicial/Adiantamento: <span className="font-medium text-slate-700">R$ {totalamountowed.toFixed(2)}</span></p>}
              <p>Total Pago Acumulado: <span className="font-medium text-green-600">R$ {amountpaid.toFixed(2)}</span></p>
            </>
          ) : isFixedInstallment ? (
            <>
              <p>Valor Total do Contrato: <span className="font-medium text-slate-700">R$ {totalamountowed.toFixed(2)}</span></p>
              <p>Total Pago (Geral): <span className="font-medium text-green-600">R$ {amountpaid.toFixed(2)}</span></p>
              <p>Saldo Devedor (Geral): <span className="font-medium text-red-600">R$ {Math.max(0, totalamountowed - amountpaid).toFixed(2)}</span></p>
            </>
          ) : ( // Single Payment (NONE)
            <>
              <p>Valor Devido: <span className="font-medium text-slate-700">R$ {totalamountowed.toFixed(2)}</span></p>
              <p>Valor Pago: <span className="font-medium text-green-600">R$ {amountpaid.toFixed(2)}</span></p>
              <p>Valor Restante: <span className="font-medium text-red-600">R$ {Math.max(0, remainingAmount).toFixed(2)}</span></p>
            </>
          )}
          {renderInstallmentInfo()}
          {debtor.notes && <p className="text-xs text-slate-500 italic mt-1 pt-1 border-t border-slate-100">Nota: {debtor.notes}</p>}
          <p className="text-xs text-slate-400 pt-1">Adicionado em: {formattedDate}</p>
        </div>
      </div>
      
      <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
        <button
          onClick={() => onRecordPaymentClick(debtor)}
          disabled={!canRecordPayment}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          aria-label={`Registrar pagamento para ${debtor.name}`}
        >
          <CurrencyDollarIcon className="w-4 h-4 mr-2" />
          Registrar Pagamento
        </button>
        <button
          onClick={() => onDeleteDebtor(debtor.id)}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          aria-label={`Excluir devedor ${debtor.name}`}
        >
          <TrashIcon className="w-4 h-4 mr-2" />
          Excluir
        </button>
      </div>
    </div>
  );
};

export default DebtorItem;
