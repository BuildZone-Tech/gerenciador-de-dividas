
import React from 'react';
import Modal from './Modal';
import { ReceiptData, InstallmentType } from '../types';
import { PrinterIcon } from '../constants';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
  systemLogoUrl: string; // Logo padrão do sistema
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, receiptData, systemLogoUrl }) => {
  if (!isOpen || !receiptData) return null;

  const logoToDisplay = receiptData.userLogoUrl || systemLogoUrl;
  const defaultSystemLogoForErrorHandling = 'https://i.imgur.com/ZXpCjfa.png?v=logo-refresh-default'; // Hardcoded default from App.tsx

  const handlePrint = () => {
    const receiptContentElement = document.getElementById('receipt-content-for-print');
    if (receiptContentElement) {
      const printContents = receiptContentElement.innerHTML;
      const win = window.open('', '_blank', 'height=800,width=800'); 

      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Recibo de Pagamento</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; margin: 0; padding: 20px; 
                  font-size: 10pt; line-height: 1.4; color: #333;
                }
                .receipt-container { max-width: 600px; margin: auto; }
                .receipt-header { text-align: center; margin-bottom: 15px; }
                .receipt-logo { 
                  max-height: 60px; /* Reduzido de 70px */
                  max-width: 150px; /* Reduzido de 180px */
                  margin-bottom: 10px; 
                  object-fit: contain; 
                  display: block; /* Para centralizar com margin: auto se necessário em contextos específicos */
                  margin-left: auto;
                  margin-right: auto;
                }
                .receipt-header h3 { font-size: 16pt; font-weight: bold; margin-bottom: 5px; }
                .receipt-header p { font-size: 9pt; color: #555; margin-top:0; }
                .receipt-section { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #bbb; }
                .receipt-section:last-of-type,
                .receipt-section.footer-preceding { border-bottom: none; }
                .receipt-section h4 { font-size: 11pt; font-weight: bold; margin-bottom: 8px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 3px;}
                .receipt-footer { margin-top: 25px; padding-top: 15px; border-top: 1px solid #aaa; text-align: center; font-size: 9pt; color: #555; }
                .receipt-field { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10pt; }
                .receipt-field strong { font-weight: bold; color: #000; }
                .receipt-field span { color: #444; }
                .text-green-600 { color: #059669 !important; } 
                .text-red-600 { color: #dc2626 !important; } 
                .text-xs { font-size: 0.75rem !important; } 
                .italic { font-style: italic !important; }
                .font-semibold { font-weight: 600 !important; }
                .mb-1 { margin-bottom: 0.25rem !important; }
                .mb-2 { margin-bottom: 0.5rem !important; }
              </style>
            </head>
            <body><div class="receipt-container">${printContents}</div></body>
          </html>
        `);
        win.document.close(); 
        win.focus(); 
        
        setTimeout(() => {
          win.print();
          win.close(); 
        }, 350); 

      } else {
        alert('A janela de impressão foi bloqueada pelo navegador. Por favor, desabilite o bloqueador de pop-ups para este site.');
      }
    } else {
      console.error("Elemento com ID 'receipt-content-for-print' não encontrado.");
      alert("Erro ao tentar preparar o recibo para impressão. Conteúdo não encontrado.");
    }
  };

  const isFixed = receiptData.installmentType === InstallmentType.FIXED;
  const isRecurring = receiptData.installmentType === InstallmentType.PROCESS_END || 
                      receiptData.installmentType === InstallmentType.DECISION_BASED;
  const isSingle = receiptData.installmentType === InstallmentType.NONE;


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recibo de Pagamento">
      <div id="receipt-content-for-print" className="text-sm text-slate-700">
        
        <div className="receipt-header">
          <img 
            src={logoToDisplay} 
            alt="Logo" 
            className="receipt-logo mx-auto max-h-16 max-w-[160px] object-contain mb-2.5" // Classes Tailwind para tamanho na tela e margem
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Prevent infinite loop
                if (target.src !== systemLogoUrl && systemLogoUrl !== defaultSystemLogoForErrorHandling) {
                    target.src = systemLogoUrl; // Try system logo if user logo failed
                } else if (target.src !== defaultSystemLogoForErrorHandling) {
                    target.src = defaultSystemLogoForErrorHandling; // Try absolute default if system logo also failed
                } else {
                    target.style.display = 'none'; // Hide if all fallbacks fail
                }
            }}
          />
          <h3 className="text-xl font-semibold text-slate-800">RECIBO DE PAGAMENTO</h3>
          <p className="text-xs text-slate-500">ID do Recibo: {receiptData.receiptId}</p>
        </div>

        <div className="receipt-section">
          <div className="receipt-field"><span>Recebido de:</span> <strong>{receiptData.debtorName}</strong></div>
          <div className="receipt-field"><span>Data do Pagamento:</span> <strong>{receiptData.paymentDate}</strong></div>
          <div className="receipt-field"><span>Valor Pago (neste recibo):</span> <strong className="text-green-600">R$ {receiptData.paymentAmount.toFixed(2)}</strong></div>
          {receiptData.paymentMethod && (
            <div className="receipt-field"><span>Forma de Pagamento:</span> <strong>{receiptData.paymentMethod}</strong></div>
          )}
        </div>

        <div className="receipt-section">
          <h4 className="font-semibold mb-2 text-slate-800">Detalhes da Dívida e Pagamento:</h4>
          <div className="receipt-field">
            <span>Tipo de Dívida:</span> 
            <strong>
              {isSingle && 'Pagamento Único'}
              {isFixed && 'Parcelamento Fixo'}
              {isRecurring && `Recorrente (${receiptData.installmentType === InstallmentType.PROCESS_END ? 'Até Fim do Processo' : 'Até Decisão Específica'})`}
            </strong>
          </div>

          {isFixed && (
            <>
              {receiptData.paidInstallmentNumber && (
                <div className="receipt-field"><span>Referente à Parcela:</span> <strong>{receiptData.paidInstallmentNumber} de {receiptData.totalInstallments || '?'}</strong></div>
              )}
              {receiptData.originalTotalOwed !== undefined && (
                <div className="receipt-field"><span>Valor Total do Contrato:</span> <strong>R$ {receiptData.originalTotalOwed.toFixed(2)}</strong></div>
              )}
              <div className="receipt-field"><span>Total Acumulado Pago (Contrato):</span> <strong className="text-green-600">R$ {receiptData.cumulativeAmountPaid.toFixed(2)}</strong></div>
              {receiptData.newBalanceDue !== undefined && (
                 <div className="receipt-field"><span>Saldo Devedor (Contrato):</span> <strong className="text-red-600">R$ {receiptData.newBalanceDue.toFixed(2)}</strong></div>
              )}
            </>
          )}

          {isRecurring && (
            <>
              {receiptData.originalTotalOwed !== undefined && receiptData.originalTotalOwed > 0 && (
                <div className="receipt-field"><span>Valor Inicial/Adiantamento:</span> <strong>R$ {receiptData.originalTotalOwed.toFixed(2)}</strong></div>
              )}
              {receiptData.recurringPaymentSequence && (
                 <div className="receipt-field"><span>Este é o:</span> <strong>{receiptData.recurringPaymentSequence}º pagamento recorrente</strong></div>
              )}
              {receiptData.monthlyPaymentAmount !== undefined && receiptData.monthlyPaymentAmount > 0 && (
                <div className="receipt-field"><span>Valor Mensal Definido:</span> <strong>R$ {receiptData.monthlyPaymentAmount.toFixed(2)}</strong></div>
              )}
              {receiptData.paymentDayOfMonth !== undefined && (
                <div className="receipt-field"><span>Dia de Pagamento Definido:</span> <strong>{receiptData.paymentDayOfMonth}</strong></div>
              )}
              <div className="receipt-field"><span>Total Acumulado Pago (Geral):</span> <strong className="text-green-600">R$ {receiptData.cumulativeAmountPaid.toFixed(2)}</strong></div>
            </>
          )}

          {isSingle && (
             <>
              {receiptData.originalTotalOwed !== undefined && (
                <div className="receipt-field"><span>Valor Total Original:</span> <strong>R$ {receiptData.originalTotalOwed.toFixed(2)}</strong></div>
              )}
              {receiptData.totalPaidBeforeThisPayment !== undefined && (
                 <div className="receipt-field"><span>Total Pago (Antes deste):</span> <strong>R$ {receiptData.totalPaidBeforeThisPayment.toFixed(2)}</strong></div>
              )}
              {/* <div className="receipt-field"><span>Saldo Devedor (Antes deste):</span> <strong className="text-red-600">R$ {(receiptData.balanceDueBeforeThisPayment ?? 0).toFixed(2)}</strong></div> */}
              <div className="receipt-field"><span>Total Acumulado Pago:</span> <strong className="text-green-600">R$ {receiptData.cumulativeAmountPaid.toFixed(2)}</strong></div>
              <div className="receipt-field"><span>Novo Saldo Devedor:</span> <strong className="text-red-600">R$ {(receiptData.newBalanceDue ?? 0).toFixed(2)}</strong></div>
            </>
          )}
        </div>

        {receiptData.debtorNotes && (
          <div className="receipt-section">
            <h4 className="font-semibold mb-1 text-slate-800">Notas Gerais da Dívida:</h4>
            <p className="text-xs italic">{receiptData.debtorNotes}</p>
          </div>
        )}
        
        <div className="receipt-section footer-preceding"> 
           <div className="receipt-field"><span>Recebido por:</span> <strong>{receiptData.receivedBy}</strong></div>
        </div>

        <div className="receipt-footer">
          <p>Gerado por {receiptData.officeName || receiptData.receivedBy}</p>
          <p>&copy; {new Date().getFullYear()} Todos os direitos reservados.</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors"
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <PrinterIcon className="w-4 h-4 mr-2" />
          Imprimir / Salvar PDF
        </button>
      </div>
    </Modal>
  );
};
