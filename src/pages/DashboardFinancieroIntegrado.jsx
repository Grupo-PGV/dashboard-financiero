// DashboardFinancieroIntegrado.jsx - Versión completa corregida
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Filter, Info, Wallet, PieChart, TrendingUp, 
  Database, CheckCircle, Clock, RefreshCw, Settings, FileText
} from 'lucide-react';
import ChipaxDataUpdater from '../components/ChipaxDataUpdater';
import BankBalanceCard from '../components/BankBalanceCard';
import CashFlowChart from '../components/CashFlowChart';
import AccountsReceivableTable from '../components/AccountsReceivableTable';
import PendingInvoicesComponent from '../components/PendingInvoicesComponent';
import PaginationDebugger from '../components/PaginationDebugger';
import ChipaxDataInspector from '../components/ChipaxDataInspector';
import ChipaxDTEAnalyzer from '../components/ChipaxDTEAnalyzer';
import ChipaxDebugPanel from '../components/ChipaxDebugPanel';
import ChipaxSaldosDebugger from '../components/ChipaxSaldosDebugger';
import ChipaxCartolaDebugger from '../components/ChipaxCartolaDebugger';
import SimpleSaldosDebugger from '../components/SimpleSaldosDebugger';
import ChipaxSaldosExplorer from '../components/ChipaxSaldosExplorer';
import ChipaxCuentasConSaldosDebugger from '../components/ChipaxCuentasConSaldosDebugger';
import ChipaxAdvancedExplorer from '../components/ChipaxAdvancedExplorer';
import ChipaxFinalDebugger from '../components/ChipaxFinalDebugger';
import ChipaxCartolaCalculator from '../components/ChipaxCartolaCalculator';
import ChipaxSaldoConFechas from '../components/ChipaxSaldoConFechas';

const DashboardFinancieroIntegrado = () => {
  // Estados principales
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
  
  // Estados para información de paginación
  const [paginationInfo, setPaginationInfo] = useState({});
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [lastSyncDetails, setLastSyncDetails] = useState(null);
  const [showInspector, setShowInspector] = useState(false);
  const [showDTEAnalyzer, setShowDTEAnalyzer] = useState(false);
  
  // Estados para configuración
  const [periodoFlujo, setPeriodoFlujo] = useState('mensual');
  const [fechasRango, setFechasRango] = useState({
    fechaInicio: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0]
  });

  // Handlers principales
  const handleDataSourceChange = (source) => {
    setDataSource(source);
    console.log(`📊 Fuente de datos cambiada a: ${source}`);
  };

  const handleFlujoCajaPeriodChange = (periodo) => setPeriodoFlujo(periodo);
  const handleDateRangeChange = (newRange) => setFechasRango(newRange);

  // Handlers para actualización de datos con información de paginación
  const handleUpdateSaldos = (saldos) => {
    setSaldosBancarios(saldos);
    console.log(`✅ Saldos bancarios actualizados: ${saldos.length} cuentas`);
  };

  const handleUpdateCuentasPendientes = (cuentas, info = null) => {
    setCuentasPendientes(cuentas);
    if (info) {
      setPaginationInfo(prev => ({ ...prev, cuentasPendientes: info }));
    }
    console.log(`✅ Cuentas por cobrar actualizadas: ${cuentas.length} facturas`);
  };

  const handleUpdateCuentasPorPagar = (cuentas, info = null) => {
    setCuentasPorPagar(cuentas);
    if (info) {
      setPaginationInfo(prev => ({ ...prev, cuentasPorPagar: info }));
    }
    console.log(`✅ Cuentas por pagar actualizadas: ${cuentas.length} facturas`);
  };

  const handleUpdateFacturasPendientes = (facturas) => {
    setFacturasPendientes(facturas);
    console.log(`✅ Facturas pendientes actualizadas: ${facturas.length} facturas`);
  };

  const handleUpdateFlujoCaja = (flujo) => {
    setFlujoCaja(flujo);
    console.log(`✅ Flujo de caja actualizado`);
  };

  const handleUpdateClientes = (clientesData, info = null) => {
    setClientes(clientesData);
    if (info) {
      setPaginationInfo(prev => ({ ...prev, clientes: info }));
    }
    console.log(`✅ Clientes actualizados: ${clientesData.length || 'N/A'} clientes`);
  };

  const handleUpdateEgresosProgramados = (egresos) => {
    setEgresosProgramados(egresos);
    console.log(`✅ Egresos programados actualizados: ${egresos.length} egresos`);
  };

  const handleUpdateBancos = (bancosData) => {
    setBancos(bancosData);
    console.log(`✅ Bancos actualizados: ${bancosData.length} bancos`);
  };

  // Handler para detalles de sincronización
  const handleSyncDetails = (details) => {
    setLastSyncDetails(details);
    console.log('📊 Detalles de sincronización recibidos:', details);
  };

  const handleExportToExcel = (dataType) => {
    alert(`Exportación a Excel de ${dataType} no implementada.`);
  };

  // Funciones de cálculo
  const calcularSaldoTotal = () => saldosBancarios.reduce((acc, c) => acc + c.saldo, 0);
  const calcularTotalPorCobrar = () => cuentasPendientes.reduce((acc, c) => acc + c.saldo, 0);
  const calcularTotalPorPagar = () => cuentasPorPagar.reduce((acc, c) => acc + c.saldo, 0);

  const handleAprobarFactura = (id) => setFacturasPendientes(prev => prev.filter(f => f.id !== id));
  const handleRechazarFactura = (id) => setFacturasPendientes(prev => prev.filter(f => f.id !== id));

  const formatCurrency = (amount, currency = 'CLP') =>
    new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency, 
      maximumFractionDigits: currency === 'CLP' ? 0 : 2 
    }).format(amount);

  // Componente para mostrar información de paginación
  const PaginationInfoCard = ({ title, info, total }) => {
    if (!info) return null;

    const isComplete = info.completenessPercent === 100;
    const hasFailures = info.failedPages && info.failedPages.length > 0;

    return (
      <div className={`p-3 rounded border ${
        isComplete ? 'bg-green-50 border-green-200' : 
        hasFailures ? 'bg-amber-50 border-amber-200' : 
        'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-800">{title}</h4>
          <div className={`flex items-center text-xs ${
            isComplete ? 'text-green-600' : 
            hasFailures ? 'text-amber-600' : 
            'text-blue-600'
          }`}>
            {isComplete ? <CheckCircle size={12} className="mr-1" /> : 
             hasFailures ? <AlertCircle size={12} className="mr-1" /> : 
             <Clock size={12} className="mr-1" />}
            {info.completenessPercent.toFixed(1)}%
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-600">Páginas:</span>
            <p className="font-medium">{info.totalPagesLoaded}/{info.totalPagesRequested}</p>
          </div>
          <div>
            <span className="text-gray-600">Items:</span>
            <p className="font-medium">{total || info.totalItemsLoaded}</p>
          </div>
        </div>
        
        {hasFailures && (
          <div className="mt-2 text-xs text-amber-700">
            <span>Páginas fallidas: {info.failedPages.join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Financiero</h1>
              <p className="text-gray-600">Gestiona tus finanzas en tiempo real con datos de Chipax</p>
            </div>
            
            {/* Controles del header */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDTEAnalyzer(!showDTEAnalyzer)}
                className={`px-3 py-1 rounded text-sm flex items-center ${
                  showDTEAnalyzer 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileText size={16} className="mr-1" />
                Analizar DTEs
              </button>
              
              <button
                onClick={() => setShowInspector(!showInspector)}
                className={`px-3 py-1 rounded text-sm flex items-center ${
                  showInspector 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Database size={16} className="mr-1" />
                Inspector
              </button>
              
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className={`px-3 py-1 rounded text-sm flex items-center ${
                  showDebugPanel 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Settings size={16} className="mr-1" />
                Debug
              </button>
              
              {dataSource === 'chipax' && (
                <div className="flex items-center text-sm text-green-600">
                  <Database size={16} className="mr-1" />
                  Conectado a Chipax
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Panel de debug (condicional) */}
        {showDebugPanel && (
          <div className="mb-6">
            <PaginationDebugger />
          </div>
        )}

        {/* Analizador de DTEs */}
        {showDTEAnalyzer && (
          <div className="mb-6">
            <ChipaxDTEAnalyzer />
          </div>
        )}

        {/* Inspector de datos */}
        {showInspector && (
          <div className="mb-6">
            <ChipaxDataInspector />
          </div>
        )}

        {/* Chipax Data Updater */}
        <div className="mb-6">
          <ChipaxDataUpdater
            onUpdateSaldos={handleUpdateSaldos}
            onUpdateCuentasPendientes={handleUpdateCuentasPendientes}
            onUpdateCuentasPorPagar={handleUpdateCuentasPorPagar}
            onUpdateFacturasPendientes={handleUpdateFacturasPendientes}
            onUpdateFlujoCaja={handleUpdateFlujoCaja}
            onUpdateClientes={handleUpdateClientes}
            onUpdateEgresosProgramados={handleUpdateEgresosProgramados}
            onUpdateBancos={handleUpdateBancos}
            saldoInicial={0}
            onDataSourceChange={handleDataSourceChange}
            onSyncDetails={handleSyncDetails}
          />
        </div>
<div className="mb-6">
  <ChipaxSaldoConFechas />
</div>
      
        {/* Información de paginación */}
        {Object.keys(paginationInfo).length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Info size={16} className="mr-2 text-blue-600" />
              Información de Carga de Datos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paginationInfo.cuentasPendientes && (
                <PaginationInfoCard
                  title="Cuentas por Cobrar"
                  info={paginationInfo.cuentasPendientes}
                  total={cuentasPendientes.length}
                />
              )}
              
              {paginationInfo.cuentasPorPagar && (
                <PaginationInfoCard
                  title="Cuentas por Pagar"
                  info={paginationInfo.cuentasPorPagar}
                  total={cuentasPorPagar.length}
                />
              )}
              
              {paginationInfo.clientes && (
                <PaginationInfoCard
                  title="Clientes"
                  info={paginationInfo.clientes}
                  total={clientes.length}
                />
              )}
            </div>
          </div>
        )}

        {/* Errores */}
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

       {/* Tarjetas principales */}
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
      Total en {saldosBancarios.length} cuentas
    </div>
    <div className="grid grid-cols-1 gap-3">
      {saldosBancarios.map(cuenta => (
        <BankBalanceCard key={cuenta.id} cuenta={cuenta} loading={loading} />
      ))}
    </div>
  </div>

  {/* Cuentas por Cobrar - SIMPLIFICADA */}
  <div className="bg-white shadow rounded-lg p-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <TrendingUp size={20} className="text-green-600 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900">Cuentas por Cobrar</h2>
      </div>
      {paginationInfo.cuentasPendientes && (
        <div className={`text-xs px-2 py-1 rounded ${
          paginationInfo.cuentasPendientes.completenessPercent === 100
            ? 'bg-green-100 text-green-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {paginationInfo.cuentasPendientes.completenessPercent.toFixed(0)}%
        </div>
      )}
    </div>
    <div className="text-3xl font-bold text-green-600 mb-2">
      {formatCurrency(calcularTotalPorCobrar())}
    </div>
    <div className="text-sm text-gray-500">
      {cuentasPendientes.length} facturas pendientes de cobro
    </div>
    {/* Ya no mostramos el detalle de las facturas aquí */}
    <div className="mt-4 pt-4 border-t text-sm text-gray-600">
      <p className="flex items-center">
        <Calendar size={16} className="mr-2" />
        Ver detalle completo más abajo
      </p>
    </div>
  </div>

  {/* Cuentas por Pagar - SIMPLIFICADA */}
  <div className="bg-white shadow rounded-lg p-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <PieChart size={20} className="text-red-600 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900">Cuentas por Pagar</h2>
      </div>
      {paginationInfo.cuentasPorPagar && (
        <div className={`text-xs px-2 py-1 rounded ${
          paginationInfo.cuentasPorPagar.completenessPercent === 100
            ? 'bg-green-100 text-green-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {paginationInfo.cuentasPorPagar.completenessPercent.toFixed(0)}%
        </div>
      )}
    </div>
    <div className="text-3xl font-bold text-red-600 mb-2">
      {formatCurrency(calcularTotalPorPagar())}
    </div>
    <div className="text-sm text-gray-500">
      {cuentasPorPagar.length} facturas pendientes de pago
    </div>
    {/* Ya no mostramos el detalle de las facturas aquí */}
    <div className="mt-4 pt-4 border-t text-sm text-gray-600">
      <p className="flex items-center">
        <Calendar size={16} className="mr-2" />
        Ver detalle completo más abajo
      </p>
    </div>
  </div>
</div>

        {/* Gráfico de flujo de caja */}
        <div className="mb-6">
          <CashFlowChart
            data={flujoCaja}
            loading={loading}
            onExportData={() => handleExportToExcel('flujoCaja')}
            onPeriodChange={handleFlujoCajaPeriodChange}
            periodo={periodoFlujo}
          />
        </div>

        {/* Tabla de cuentas por cobrar */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          <AccountsReceivableTable
            cuentas={cuentasPendientes}
            loading={loading}
            onExportData={() => handleExportToExcel('cuentasPendientes')}
          />
        </div>

        {/* Facturas pendientes de aprobación */}
        <div className="mb-6">
          <PendingInvoicesComponent
            facturas={facturasPendientes}
            loading={loading}
            onApprove={handleAprobarFactura}
            onReject={handleRechazarFactura}
          />
        </div>

        {/* Información de última sincronización */}
        {lastSyncDetails && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <RefreshCw size={16} className="mr-2 text-blue-600" />
              Última Sincronización
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Duración:</span>
                <p className="font-medium">{lastSyncDetails.duration}s</p>
              </div>
              <div>
                <span className="text-gray-600">Módulos cargados:</span>
                <p className="font-medium">{lastSyncDetails.modulesLoaded || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Timestamp:</span>
                <p className="font-medium">{new Date(lastSyncDetails.timestamp || Date.now()).toLocaleTimeString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Estado:</span>
                <p className={`font-medium ${lastSyncDetails.success ? 'text-green-600' : 'text-red-600'}`}>
                  {lastSyncDetails.success ? 'Exitoso' : 'Con errores'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <ChipaxDebugPanel />
    </div>
  );
};

export default DashboardFinancieroIntegrado;
