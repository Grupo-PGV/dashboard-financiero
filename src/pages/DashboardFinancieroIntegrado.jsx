// DashboardFinancieroIntegrado.jsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Filter, Info, Wallet, PieChart, TrendingUp } from 'lucide-react';

// Importaciones de componentes - RUTAS CORREGIDAS
import ChipaxDataUpdater from '../components/ChipaxDataUpdater';
import BankBalanceCard from '../components/BankBalanceCard';
import CashFlowChart from '../components/CashFlowChart';
import AccountsReceivableTable from '../components/AccountsReceivableTable';
import PendingInvoicesComponent from '../components/PendingInvoicesComponent';

/**
 * Dashboard Financiero Principal
 * Este componente orquesta toda la información financiera de la empresa
 */
const DashboardFinancieroIntegrado = () => {
  // Estados principales del dashboard
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [cuentasPendientes, setCuentasPendientes] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [flujoCaja, setFlujoCaja] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [egresosProgramados, setEgresosProgramados] = useState([]);
  
  // Estados de control
  const [dataSource, setDataSource] = useState('manual');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [periodoFlujo, setPeriodoFlujo] = useState('mensual');
  const [fechasRango, setFechasRango] = useState({
    fechaInicio: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0]
  });

  // Manejadores de eventos
  const handleDataSourceChange = (source) => {
    console.log('📊 Fuente de datos cambiada a:', source);
    setDataSource(source);
  };

  const handleFlujoCajaPeriodChange = (periodo) => {
    console.log('📅 Período de flujo de caja cambiado a:', periodo);
    setPeriodoFlujo(periodo);
  };

  const handleDateRangeChange = (newRange) => {
    console.log('📅 Rango de fechas cambiado:', newRange);
    setFechasRango(newRange);
  };

  const handleExportToExcel = (dataType) => {
    console.log('📊 Exportando a Excel:', dataType);
    alert(`Exportación a Excel de ${dataType} no implementada aún.`);
  };

  // Calculadores de totales
  const calcularSaldoTotal = () => {
    return saldosBancarios.reduce((acc, cuenta) => acc + (cuenta.saldo || 0), 0);
  };

  const calcularTotalPorCobrar = () => {
    return cuentasPendientes.reduce((acc, cuenta) => acc + (cuenta.saldo || 0), 0);
  };

  const calcularTotalPorPagar = () => {
    return cuentasPorPagar.reduce((acc, cuenta) => acc + (cuenta.saldo || 0), 0);
  };

  // Manejadores de facturas
  const handleAprobarFactura = (id) => {
    console.log('✅ Aprobando factura:', id);
    setFacturasPendientes(prev => prev.filter(f => f.id !== id));
  };

  const handleRechazarFactura = (id) => {
    console.log('❌ Rechazando factura:', id);
    setFacturasPendientes(prev => prev.filter(f => f.id !== id));
  };

  // Formatear moneda
  const formatCurrency = (amount, currency = 'CLP') => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency, 
      maximumFractionDigits: currency === 'CLP' ? 0 : 2 
    }).format(amount || 0);
  };

  // Efecto para logs de debugging
  useEffect(() => {
    console.log('🔍 Estado actual del dashboard:', {
      saldosBancarios: saldosBancarios.length,
      cuentasPendientes: cuentasPendientes.length,
      cuentasPorPagar: cuentasPorPagar.length,
      facturasPendientes: facturasPendientes.length,
      dataSource,
      loading
    });
  }, [saldosBancarios, cuentasPendientes, cuentasPorPagar, facturasPendientes, dataSource, loading]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Financiero</h1>
              <p className="text-gray-600">Gestiona tus finanzas en tiempo real con datos de Chipax</p>
            </div>
            <div className="text-sm text-gray-500">
              Fuente: {dataSource === 'chipax' ? '🔗 Chipax' : '📝 Manual'}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Componente de actualización de datos */}
        <div className="mb-6">
          <ChipaxDataUpdater
            onUpdateSaldos={setSaldosBancarios}
            onUpdateCuentasPendientes={setCuentasPendientes}
            onUpdateCuentasPorPagar={setCuentasPorPagar}
            onUpdateFacturasPendientes={setFacturasPendientes}
            onUpdateFlujoCaja={setFlujoCaja}
            onUpdateClientes={setClientes}
            onUpdateEgresosProgramados={setEgresosProgramados}
            onUpdateBancos={setBancos}
            saldoInicial={0}
            onDataSourceChange={handleDataSourceChange}
          />
        </div>

        {/* Mostrar errores si los hay */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle size={20} className="text-red-600 mr-2 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-medium">Errores al cargar datos</h3>
                <ul className="mt-1 text-sm text-red-700 space-y-1">
                  {Object.entries(errors).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {value}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Saldos Bancarios */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center mb-4">
              <Wallet size={20} className="text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Saldos Bancarios</h2>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(calcularSaldoTotal())}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Total en {saldosBancarios.length} cuenta{saldosBancarios.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
              {saldosBancarios.length > 0 ? (
                saldosBancarios.map((cuenta, index) => (
                  <BankBalanceCard 
                    key={cuenta.id || index} 
                    cuenta={cuenta} 
                    loading={loading} 
                  />
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Wallet size={24} className="mx-auto mb-2 text-gray-300" />
                  <p>No hay cuentas bancarias</p>
                </div>
              )}
            </div>
          </div>

          {/* Cuentas por Cobrar */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center mb-4">
              <TrendingUp size={20} className="text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Cuentas por Cobrar</h2>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatCurrency(calcularTotalPorCobrar())}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {cuentasPendientes.length} factura{cuentasPendientes.length !== 1 ? 's' : ''} pendiente{cuentasPendientes.length !== 1 ? 's' : ''} de cobro
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {cuentasPendientes.slice(0, 3).map((cuenta, index) => (
                <div key={cuenta.id || index} className="border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {cuenta.cliente?.nombre || cuenta.cliente || 'Cliente desconocido'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Factura #{cuenta.folio || cuenta.numeroFactura || 'Sin número'}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(cuenta.saldo || cuenta.montoTotal || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {cuentasPendientes.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <TrendingUp size={24} className="mx-auto mb-2 text-gray-300" />
                  <p>No hay cuentas por cobrar</p>
                </div>
              )}
            </div>
          </div>

          {/* Facturas por Aprobar */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center mb-4">
              <PieChart size={20} className="text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Facturas por Aprobar</h2>
            </div>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {facturasPendientes.length}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Factura{facturasPendientes.length !== 1 ? 's' : ''} pendiente{facturasPendientes.length !== 1 ? 's' : ''} de aprobación
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {facturasPendientes.slice(0, 3).map((factura, index) => (
                <div key={factura.id || index} className="border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {factura.proveedor?.nombre || factura.proveedor || 'Proveedor desconocido'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Factura #{factura.folio || factura.numeroFactura || 'Sin número'}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(factura.monto || factura.montoTotal || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {facturasPendientes.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <PieChart size={24} className="mx-auto mb-2 text-gray-300" />
                  <p>No hay facturas pendientes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico de Flujo de Caja */}
        <div className="mb-6">
          <CashFlowChart
            data={flujoCaja}
            loading={loading}
            onExportData={() => handleExportToExcel('flujoCaja')}
            onPeriodChange={handleFlujoCajaPeriodChange}
            periodo={periodoFlujo}
          />
        </div>

        {/* Tabla de Cuentas por Cobrar */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          <AccountsReceivableTable
            cuentas={cuentasPendientes}
            loading={loading}
            onExportData={() => handleExportToExcel('cuentasPendientes')}
          />
        </div>

        {/* Componente de Facturas Pendientes */}
        <div className="mb-6">
          <PendingInvoicesComponent
            facturas={facturasPendientes}
            loading={loading}
            onApprove={handleAprobarFactura}
            onReject={handleRechazarFactura}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
