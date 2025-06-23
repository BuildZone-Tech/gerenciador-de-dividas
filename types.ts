
export enum PaymentStatus {
  UNPAID = 'A PAGAR',
  PARTIAL = 'PARCIAL',
  PAID = 'PAGO',
  ONGOING = 'EM ANDAMENTO', // Para parcelamentos abertos
  OVERDUE = 'VENCIDO', // Novo status para parcelas vencidas
}

export enum InstallmentType {
  NONE = 'NONE', // Pagamento Único
  FIXED = 'FIXED', // Número fixo de parcelas com datas e valores definidos
  PROCESS_END = 'PROCESS_END', // Parcelas recorrentes até o fim do processo
  DECISION_BASED = 'DECISION_BASED', // Parcelas recorrentes até uma decisão específica
}

export enum InstallmentStatus {
  PENDING = 'PENDENTE',
  PAID = 'PAGA',
  PARTIALLY_PAID = 'PARCIALMENTE PAGA',
  OVERDUE = 'VENCIDA',
}

export enum SubscriptionPlan {
  FREE = 'free',
  PRO_MONTHLY = 'pro_monthly',
  PRO_LIFETIME = 'pro_lifetime',
}

export interface UserProfile { // Usado para user_metadata
  full_name?: string;
  office_name?: string;
  logo_url?: string; // Nova propriedade para a URL da logo
  current_plan?: SubscriptionPlan;
  stripe_customer_id?: string;
  // stripe_subscription_id?: string; // Para planos mensais
  // subscription_ends_at?: string; // Para planos mensais
}


export interface Installment {
  id: string; // Unique ID for the installment (e.g., UUID)
  debtor_id: string;
  user_id: string;
  installment_number: number;
  due_date: string; // ISO Date string
  amount_due: number;
  amount_paid: number; // Amount paid specifically for this installment
  status: InstallmentStatus;
  payment_ids?: string[]; // Array of PaymentRecord IDs associated with this installment
  created_at: string;
}

export interface Debtor {
  id: string; 
  user_id?: string; 
  name: string;
  // Para FIXED, totalamountowed será a soma dos Installment.amount_due.
  // Para RECURRING, totalamountowed é o valor inicial/adiantamento.
  // Para NONE, é o valor total único.
  totalamountowed: number; 
  amountpaid: number; // Soma de todos os pagamentos (PaymentRecord.amount_paid ou Installment.amount_paid)
  notes?: string;
  dateadded: string; 
  installmenttype: InstallmentType; 
  
  // Campos específicos para FIXED (agora gerenciados pela lista de Installment)
  // numberOfInstallments?: number; // REMOVIDO - será derivado de installments.length
  first_installment_due_date?: string; // Para UI, não necessariamente persistido se installments são criados no backend
  
  // Campos específicos para RECURRING
  monthlypaymentamount?: number; 
  paymentdayofmonth?: number; 

  // Associar parcelas diretamente ao devedor para facilitar o acesso (opcional, pode ser buscado separadamente)
  installments?: Installment[]; // Para dívidas do tipo FIXED
}

export interface PaymentRecord {
  id: string;
  debtor_id: string;
  user_id: string;
  payment_date: string; 
  amount_paid: number;
  payment_method?: string; 
  notes?: string; 
  created_at: string; 
  installment_id?: string; // FK para a tabela Installment (para tipo FIXED)
  installment_sequence_number?: number; // Para tipo RECURRING (1º pagamento, 2º pagamento, etc.)

  // Novo campo para carregar dados da parcela via select aninhado do Supabase
  // O nome 'installments' aqui é como o Supabase retorna a relação baseada na FK installment_id
  installments?: { 
    installment_number: number;
    // Poderia adicionar mais detalhes da parcela aqui se necessário no histórico
    // due_date: string;
    // amount_due: number;
  } | null;
}

export interface ReceiptData {
  debtorName: string;
  paymentDate: string; 
  paymentAmount: number; 
  paymentMethod?: string; 
  
  originalTotalOwed?: number; // Aplicável para NONE e FIXED (valor total do "contrato")
  totalPaidBeforeThisPayment?: number;
  balanceDueBeforeThisPayment?: number;
  newBalanceDue?: number; // Aplicável para NONE e FIXED

  cumulativeAmountPaid: number; 
  
  installmentType: InstallmentType;
  // Para FIXED
  paidInstallmentNumber?: number; // Número da parcela que foi paga (se aplicável)
  totalInstallments?: number; // Total de parcelas do plano (se aplicável)

  // Para RECURRING
  monthlyPaymentAmount?: number;
  paymentDayOfMonth?: number;
  recurringPaymentSequence?: number; // Qual pagamento recorrente é este (1º, 2º, etc.)
  
  debtorNotes?: string;
  receivedBy: string; // Nome do usuário que gerou
  officeName?: string; // Nome do escritório para o rodapé do recibo
  userLogoUrl?: string; // URL da logo do usuário
  receiptId: string; 
}
