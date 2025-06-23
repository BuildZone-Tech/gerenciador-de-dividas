
import React from 'react';
import { Debtor, InstallmentType, Installment, PaymentRecord, InstallmentStatus } from '../types';
import { CurrencyDollarIcon, CalendarDaysIcon } from '../constants'; // Added CalendarDaysIcon
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';

interface SummaryStatsProps {
  debtors: Debtor[];
  allUserPayments: PaymentRecord[];
}

const SummaryStats: React.FC<SummaryStatsProps> = ({ debtors, allUserPayments }) => {
  let totalPaid = 0;
  let totalOwedRelevant = 0; 
  let totalRemainingRelevant = 0;
  let totalImmediateReceivable = 0;

  const today = new Date();
  today.setHours(0,0,0,0); // Normalize today to the beginning of the day for date comparisons
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  debtors.forEach(debtor => {
    totalPaid += debtor.amountpaid;

    if (debtor.installmenttype === InstallmentType.FIXED) {
      const sumOfInstallmentsDue = (debtor.installments || []).reduce((sum, inst) => sum + inst.amount_due, 0);
      totalOwedRelevant += sumOfInstallmentsDue;
      totalRemainingRelevant += Math.max(0, sumOfInstallmentsDue - debtor.amountpaid);

      (debtor.installments || []).forEach(inst => {
        const instRemaining = inst.amount_due - inst.amount_paid;
        if (instRemaining > 0) {
          const dueDate = new Date(inst.due_date + 'T00:00:00'); // Ensure local timezone by adding time part
          if (inst.status === InstallmentStatus.OVERDUE) {
            totalImmediateReceivable += instRemaining;
          } else if ((inst.status === InstallmentStatus.PENDING || inst.status === InstallmentStatus.PARTIALLY_PAID) && dueDate <= sevenDaysFromNow) {
            totalImmediateReceivable += instRemaining;
          }
        }
      });

    } else if (debtor.installmenttype === InstallmentType.PROCESS_END || debtor.installmenttype === InstallmentType.DECISION_BASED) {
      totalOwedRelevant += debtor.totalamountowed; 
      if (debtor.totalamountowed > 0) {
         totalRemainingRelevant += Math.max(0, debtor.totalamountowed - debtor.amountpaid);
         const initialRemaining = debtor.totalamountowed - debtor.amountpaid;
         if (initialRemaining > 0) {
            totalImmediateReceivable += initialRemaining;
         }
      }
    } else { // InstallmentType.NONE
      totalOwedRelevant += debtor.totalamountowed;
      const debtorRemaining = debtor.totalamountowed - debtor.amountpaid;
      totalRemainingRelevant += Math.max(0, debtorRemaining);
      if (debtorRemaining > 0) {
        totalImmediateReceivable += debtorRemaining;
      }
    }
  });

  const StatCard: React.FC<{ title: string; value: number; color: string; icon?: React.ReactNode }> = ({ title, value, color, icon }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 border-l-4 ${color}`}>
      {icon && <div className="p-2 rounded-full bg-slate-100">{icon}</div>}
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-semibold text-slate-700">R$ {(value ?? 0).toFixed(2)}</p>
      </div>
    </div>
  );

  // Data for Pie Chart
  const pieChartData = [
    { name: 'Total Pago', value: totalPaid },
    { name: 'Pendente (Contratos/Iniciais)', value: Math.max(0, totalOwedRelevant - totalPaid) },
  ];
  const PIE_COLORS = ['#22c55e', '#ef4444']; // green-500, red-500

  // Data for Bar Chart (Top 5 Debtors by Remaining Balance)
  const topDebtorsData = debtors
    .map(d => {
      let remaining = 0;
      if (d.installmenttype === InstallmentType.FIXED) {
        remaining = (d.installments || []).reduce((sum, inst) => sum + (inst.amount_due - inst.amount_paid), 0);
      } else { // NONE, PROCESS_END, DECISION_BASED
        remaining = d.totalamountowed - d.amountpaid;
      }
      return { name: d.name, "Saldo Restante": Math.max(0, remaining) };
    })
    .filter(d => d["Saldo Restante"] > 0)
    .sort((a, b) => b["Saldo Restante"] - a["Saldo Restante"])
    .slice(0, 5);

  // Data for Line Chart (Payments in Last 30 Days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0,0,0,0);

  const recentPayments = allUserPayments.filter(p => new Date(p.payment_date) >= thirtyDaysAgo);
  const paymentsByDay: { [key: string]: number } = {};
  
  // Initialize last 30 days with 0 amount
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
    paymentsByDay[dayKey] = 0;
  }

  recentPayments.forEach(p => {
    const paymentDay = p.payment_date.split('T')[0]; // YYYY-MM-DD
    paymentsByDay[paymentDay] = (paymentsByDay[paymentDay] || 0) + p.amount_paid;
  });

  const lineChartData = Object.entries(paymentsByDay)
    .map(([date, amount]) => ({
      date: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      "Valor Recebido": amount,
      fullDate: date, // For sorting
    }))
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());


  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Devido (Contratos/Iniciais)" 
          value={totalOwedRelevant} 
          color="border-blue-500"
          icon={<CurrencyDollarIcon className="w-8 h-8 text-blue-500"/>}
        />
        <StatCard 
          title="Total Geral Pago" 
          value={totalPaid} 
          color="border-green-500"
          icon={<CurrencyDollarIcon className="w-8 h-8 text-green-500"/>}
        />
        <StatCard 
          title="A Receber (Fixos/Iniciais)" 
          value={totalRemainingRelevant > 0 ? totalRemainingRelevant : 0} 
          color="border-orange-500" // Changed to orange for distinction
          icon={<CurrencyDollarIcon className="w-8 h-8 text-orange-500"/>}
        />
        <StatCard
          title="A Receber (Imediato)"
          value={totalImmediateReceivable}
          color="border-red-500"
          icon={<CalendarDaysIcon className="w-8 h-8 text-red-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Pie Chart Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Distribuição de Contratos/Iniciais</h3>
          {pieChartData.reduce((sum, item) => sum + item.value, 0) > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-10">Sem dados suficientes para o gráfico de pizza.</p>
          )}
        </div>

        {/* Bar Chart Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Top 5 Devedores (Saldo Restante)</h3>
          {topDebtorsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topDebtorsData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `R$${value}`} />
                <YAxis type="category" dataKey="name" width={100} interval={0} />
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="Saldo Restante" fill="#3b82f6" barSize={20} /> {/* blue-500 */}
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <p className="text-slate-500 text-center py-10">Sem devedores com saldo restante para exibir.</p>
          )}
        </div>
      </div>

      {/* Line Chart Card */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Pagamentos Recebidos (Últimos 30 Dias)</h3>
         {lineChartData.some(d => d["Valor Recebido"] > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `R$${value}`} />
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="Valor Recebido" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} /> {/* emerald-500 */}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-10">Nenhum pagamento registrado nos últimos 30 dias.</p>
          )}
      </div>
    </>
  );
};

export default SummaryStats;
