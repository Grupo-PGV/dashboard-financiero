// BankBalanceCard.jsx
import React from 'react';
import { TrendingDown, TrendingUp, DollarSign, CreditCard } from 'lucide-react';

/**
 * Componente que muestra una tarjeta de saldo bancario
 * 
 * @param {Object} props
 * @param {Object} props.cuenta - Cuenta bancaria
 * @param {number} props.cuenta.saldo - Saldo actual de la cuenta
 * @param {string} props.cuenta.nombre - Nombre de la cuenta
 * @param {string} props.cuenta.banco - Banco al que pertenece la cuenta
 * @param {string} props.cuenta.moneda - Moneda de la cuenta
 * @param {Date} props.cuenta.ultimoMovimiento - Fecha del último movimiento
 * @param {boolean} props.loading - Indica si la información está cargando
 */
const BankBalanceCard = ({ cuenta, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  // Si no hay cuenta, muestra una tarjeta vacía con mensaje
  if (!cuenta) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-dashed border-gray-300 flex flex-col items-center justify-center h-full text-center">
        <CreditCard className="text-gray-400 mb-2" size={24} />
        <p className="text-gray-500">No hay información disponible</p>
      </div>
    );
  }

  // Formateador de moneda
  const formatCurrency = (amount, currency = 'CLP') => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: currency,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2
    }).format(amount);
  };

  // Determinar color según saldo
  const getColorClass = (saldo) => {
    if (saldo > 0) return 'text-green-600';
    if (saldo < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Determinar icono según saldo
  const getBalanceIcon = (saldo) => {
    if (saldo > 0) return <TrendingUp className="text-green-600" size={20} />;
    if (saldo < 0) return <TrendingDown className="text-red-600" size={20} />;
    return <DollarSign className="text-gray-600" size={20} />;
  };

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return 'Sin datos';
    return new Date(date).toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-300 p-4 border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-800">{cuenta.nombre || 'Cuenta sin nombre'}</h3>
        {getBalanceIcon(cuenta.saldo)}
      </div>
      
      <div className={`text-2xl font-bold mb-2 ${getColorClass(cuenta.saldo)}`}>
        {formatCurrency(cuenta.saldo, cuenta.moneda)}
      </div>
      
      <div className="text-sm text-gray-600 mb-1">
        {cuenta.banco || 'Sin banco'}
      </div>
      
      {cuenta.ultimoMovimiento && (
        <div className="text-xs text-gray-500">
          Último movimiento: {formatDate(cuenta.ultimoMovimiento)}
        </div>
      )}
    </div>
  );
};

export default BankBalanceCard;
