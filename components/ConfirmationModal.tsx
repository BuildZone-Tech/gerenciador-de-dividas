
import React from 'react';
import { XMarkIcon, ExclamationCircleIcon } from '../constants'; // Adicionado ExclamationTriangleIcon

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = "Confirmar",
  cancelButtonText = "Cancelar",
  confirmButtonClass = "bg-red-600 hover:bg-red-700 focus:ring-red-500",
  cancelButtonClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 focus:ring-slate-400 border border-slate-300"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-100 opacity-100">
        <div className="flex justify-between items-center p-5 border-b border-slate-200">
          <div className="flex items-center">
            <ExclamationCircleIcon className="w-6 h-6 text-red-500 mr-3" />
            <h3 className="text-xl font-semibold text-slate-800">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            aria-label="Fechar modal de confirmação"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 text-slate-600 text-sm">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        <div className="flex justify-end space-x-3 p-5 bg-slate-50 border-t border-slate-200 rounded-b-xl">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${cancelButtonClass}`}
          >
            {cancelButtonText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              // onClose(); // O onConfirm deve decidir se fecha o modal ou não (App.tsx o faz)
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${confirmButtonClass}`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
      {/* 
        The <style jsx global> block was removed due to TypeScript errors.
        The animation classes 'scale-95 opacity-0 animate-modalEnter' were providing an entry animation.
        For simplicity, these classes were adjusted to 'scale-100 opacity-100' for direct display
        as the animation itself is not standard without a framework like Next.js or a CSS-in-JS library.
      */}
    </div>
  );
};

export default ConfirmationModal;
