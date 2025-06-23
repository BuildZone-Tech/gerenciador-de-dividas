
import React from 'react';
import { Debtor } from '../types';
import DebtorItem from './DebtorItem';

interface DebtorListProps {
  debtors: Debtor[];
  onRecordPaymentClick: (debtor: Debtor) => void;
  onDeleteDebtor: (debtorId: string) => void;
}

const DebtorList: React.FC<DebtorListProps> = ({ debtors, onRecordPaymentClick, onDeleteDebtor }) => {
  if (debtors.length === 0) {
    return (
      <div className="text-center py-10">
        {/* <img src="https://picsum.photos/seed/emptydebt/300/200" alt="Nenhum devedor" className="mx-auto mb-4 rounded-lg shadow-sm w-48 h-32 object-cover" /> */}
        <p className="text-slate-500 text-lg">Nenhum devedor cadastrado ainda.</p>
        <p className="text-slate-400 text-sm">Clique em "Adicionar Devedor" para começar.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {debtors.map((debtor) => (
        <DebtorItem
          key={debtor.id}
          debtor={debtor}
          onRecordPaymentClick={onRecordPaymentClick}
          onDeleteDebtor={onDeleteDebtor}
        />
      ))}
    </div>
  );
};

export default DebtorList;
