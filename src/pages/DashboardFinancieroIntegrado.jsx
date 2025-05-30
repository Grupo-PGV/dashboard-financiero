// DashboardFinancieroIntegrado.jsx
import React, { useState } from 'react';
import { AlertCircle, Wallet, PieChart, TrendingUp } from 'lucide-react';

// ✅ IMPORTACIONES CORREGIDAS - Todas desde components
import ChipaxDataUpdater from '../components/ChipaxDataUpdater';
import BankBalanceCard from '../components/BankBalanceCard';
import CashFlowChart from '../components/CashFlowChart';
import AccountsReceivableTable from '../components/AccountsReceivableTable';
import PendingInvoicesComponent from '../components/PendingInvoicesComponent';

const DashboardFinancieroIntegrado = () => {
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [cuentasPendientes, setCuentasPendientes] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [flujoCaja, setFlujoCaja] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [egresosProgramados, setEgresosProgramados] = useState([]);
  const [dataSource, setDataSource] = useState('manual');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [periodoFlujo, setPeriodoFlujo] = useState('mensual');

  const handleDataSourceChange = (source) => setDataSource(source);
  const handleFlujoCajaPeriodChange = (periodo) => setPeriodoFlujo(periodo);

  const handleExportToExcel = (dataType) => {
    alert(`Exportación a Excel de ${dataType} no implementada.`);
  };

  const calcularSaldoTotal = () => saldosBancarios.reduce((acc, c) => acc + c.saldo, 0);
  const calcularTotalPorCobrar = () => cuentasPendientes.reduce((acc, c) => acc + c.saldo, 0);

  const handleAprobarFactura = (id) => setFacturasPendientes(prev => prev.filter(f => f.id !== id));
  const handleRechazarFactura = (id) => setFacturasPendientes(prev => prev.filter(f => f.id !== id));

  const formatCurrency = (amount, currency = 'CLP') =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: currency === 'CLP' ? 0 : 2 }).format(amount);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Financiero GrupoPGV</h1>
          <p className="text-gray-600">Gestiona tus finanzas en tiempo real con datos de Chipax</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
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

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle size={20} className="text-red-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-red-800 font-medium">Errores al cargar datos</h3>
                  <ul className="mt-1 text-sm text-red-700 space-y-1">
                    {Object.entries(errors).map(([key, value]) => (
                      <li key={key}>{key}: {value}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center mb-4">
              <Wallet size={20} className="text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Saldos Bancarios</h2>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(calcularSaldoTotal())}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Total en {saldosBancarios.length} cuentas
            </div>
            <div className="grid grid-cols-1 gap-3">
              {saldosBancarios.map(cuenta => (
                <BankBalanceCard key={cuenta.id} cuenta={cuenta} loading={loading} />
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center mb-4">
              <TrendingUp size={20} className="text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Cuentas por Cobrar</h2>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatCurrency(calcularTotalPorCobrar())}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {cuentasPendientes.length} facturas pendientes de cobro
            </div>
            <div className="space-y-3">
              {cuentasPendientes.slice(0, 3).map(cuenta => (
                <div key={cuenta.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{cuenta.cliente?.nombre || cuenta.cliente}</p>
                      <p className="text-sm text-gray-500">Factura #{cuenta.folio}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(cuenta.saldo)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center mb-4">
              <PieChart size={20} className="text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Facturas por Aprobar</h2>
            </div>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {facturasPendientes.length}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Facturas pendientes de aprobación
            </div>
            <div className="space-y-3">
              {facturasPendientes.slice(0, 3).map(factura => (
                <div key={factura.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{factura.proveedor?.nombre || factura.proveedor}</p>
                      <p className="text-sm text-gray-500">Factura #{factura.folio}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(factura.monto)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <CashFlowChart
            data={flujoCaja}
            loading={loading}
            onExportData={() => handleExportToExcel('flujoCaja')}
            onPeriodChange={handleFlujoCajaPeriodChange}
            periodo={periodoFlujo}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <AccountsReceivableTable
            cuentas={cuentasPendientes}
            loading={loading}
            onExportData={() => handleExportToExcel('cuentasPendientes')}
          />
        </div>

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
