// DashboardFinancieroIntegrado.jsx - Versión corregida y optimizada
import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Filter, Info, Wallet, PieChart, TrendingUp, Activity, Shield } from 'lucide-react';
import ChipaxDataUpdater from '../components/ChipaxDataUpdater';
import BankBalanceCard from '../components/BankBalanceCard';
import CashFlowChart from '../components/CashFlowChart';
import AccountsReceivableTable from '../components/AccountsReceivableTable';
import PendingInvoicesComponent from '../components/PendingInvoicesComponent';

/**
 * Dashboard Financiero Integrado con Chipax
 * Versión mejorada con manejo robusto de errores y estados
 */
const DashboardFinancieroIntegrado = () => {
  // =====================================================
  // ESTADOS PRINCIPALES
  // =====================================================
  
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [cuentasPendientes, setCuentasPendientes] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [flujoCaja, setFlujoCaja] = useState({
    saldoInicial: 0,
    saldoFinal: 0,
    periodos: []
  });
  const [clientes, setClientes] = useState([]);
  const [egresosProgramados, setEgresosProgramados] = useState([]);
  
  // Estados de control
  const [dataSource, setDataSource] = useState('manual');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [periodoFlujo, setPeriodoFlujo] = useState('mensual');
  const [dashboardStats, setDashboardStats] = useState({
    totalModules: 7,
    loadedModules: 0,
    hasErrors: false
  });

  // =====================================================
  // FUNCIONES DE UTILIDAD Y VALIDACIÓN
  // =====================================================

  const validateData = (data, dataType) => {
    try {
      if (data === null || data === undefined) {
        console.warn(`⚠️ Datos ${dataType} son null/undefined`);
        return false;
      }
      
      if (Array.isArray(data)) {
        return true;
      }
      
      if (dataType === 'flujoCaja' && typeof data === 'object') {
        return data.hasOwnProperty('periodos') || data.hasOwnProperty('saldoInicial');
      }
      
      return typeof data === 'object';
    } catch (error) {
      console.error(`Error validando datos ${dataType}:`, error);
      return false;
    }
  };

  const logDataUpdate = (dataType, data) => {
    if (validateData(data, dataType)) {
      const count = Array.isArray(data) ? data.length : 
                   data.periodos ? data.periodos.length : 'objeto';
      console.log(`✅ ${dataType} actualizado: ${count} elementos`);
    } else {
      console.warn(`⚠️ Datos ${dataType} no válidos, usando fallback`);
    }
  };

  const safeUpdateState = (setter, data, dataType, fallback = []) => {
    try {
      if (validateData(data, dataType)) {
        setter(data);
        logDataUpdate(dataType, data);
        
        // Actualizar estadísticas
        setDashboardStats(prev => ({
          ...prev,
          loadedModules: prev.loadedModules + 1
        }));
        
        // Limpiar errores para este módulo
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[dataType];
          return newErrors;
        });
        
      } else {
        setter(fallback);
        console.warn(`⚠️ Usando fallback para ${dataType}`);
        
        setErrors(prev => ({
          ...prev,
          [dataType]: `Datos ${dataType} no válidos`
        }));
      }
    } catch (error) {
      console.error(`Error actualizando estado ${dataType}:`, error);
      setter(fallback);
      
      setErrors(prev => ({
        ...prev,
        [dataType]: `Error procesando ${dataType}: ${error.message}`
      }));
    }
  };

  // =====================================================
  // HANDLERS DE ACTUALIZACIÓN DE DATOS
  // =====================================================

  const handleUpdateSaldos = (data) => {
    safeUpdateState(setSaldosBancarios, data, 'saldosBancarios', []);
  };

  const handleUpdateBancos = (data) => {
    safeUpdateState(setBancos, data, 'bancos', []);
  };

  const handleUpdateCuentasPendientes = (data) => {
    safeUpdateState(setCuentasPendientes, data, 'cuentasPendientes', []);
  };

  const handleUpdateCuentasPorPagar = (data) => {
    safeUpdateState(setCuentasPorPagar, data, 'cuentasPorPagar', []);
  };

  const handleUpdateFacturasPendientes = (data) => {
    safeUpdateState(setFacturasPendientes, data, 'facturasPendientes', []);
  };

  const handleUpdateFlujoCaja = (data) => {
    const fallbackFlujoCaja = {
      saldoInicial: 0,
      saldoFinal: 0,
      periodos: []
    };
    safeUpdateState(setFlujoCaja, data, 'flujoCaja', fallbackFlujoCaja);
  };

  const handleUpdateClientes = (data) => {
    safeUpdateState(setClientes, data, 'clientes', []);
  };

  const handleUpdateEgresosProgramados = (data) => {
    safeUpdateState(setEgresosProgramados, data, 'egresosProgramados', []);
  };

  // =====================================================
  // HANDLERS DE EVENTOS
  // =====================================================

  const handleDataSourceChange = (source) => {
    setDataSource(source);
    console.log(`📡 Fuente de datos cambiada a: ${source}`);
    
    // Resetear estadísticas
    setDashboardStats({
      totalModules: 7,
      loadedModules: 0,
      hasErrors: Object.keys(errors).length > 0
    });
  };

  const handleFlujoCajaPeriodChange = (periodo) => {
    setPeriodoFlujo(periodo);
    console.log(`📊 Periodo de flujo de caja cambiado a: ${periodo}`);
  };

  const handleExportToExcel = (dataType) => {
    // TODO: Implementar exportación a Excel
    alert(`Exportación a Excel de ${dataType} no implementada aún.`);
    console.log(`📊 Solicitud de exportación: ${dataType}`);
  };

  const handleAprobarFactura = (id) => {
    try {
      setFacturasPendientes(prev => prev.filter(f => f.id !== id));
      console.log(`✅ Factura ${id} aprobada`);
    } catch (error) {
      console.error('Error aprobando factura:', error);
    }
  };

  const handleRechazarFactura = (id) => {
    try {
      setFacturasPendientes(prev => prev.filter(f => f.id !== id));
      console.log(`❌ Factura ${id} rechazada`);
    } catch (error) {
      console.error('Error rechazando factura:', error);
    }
  };

  // =====================================================
  // FUNCIONES DE CÁLCULO SEGURAS
  // =====================================================

  const calcularSaldoTotal = () => {
    try {
      return Array.isArray(saldosBancarios) 
        ? saldosBancarios.reduce((acc, cuenta) => acc + (cuenta.saldo || 0), 0)
        : 0;
    } catch (error) {
      console.error('Error calculando saldo total:', error);
      return 0;
    }
  };

  const calcularTotalPorCobrar = () => {
    try {
      return Array.isArray(cuentasPendientes) 
        ? cuentasPendientes.reduce((acc, cuenta) => acc + (cuenta.saldo || 0), 0)
        : 0;
    } catch (error) {
      console.error('Error calculando total por cobrar:', error);
      return 0;
    }
  };

  const calcularTotalPorPagar = () => {
    try {
      return Array.isArray(cuentasPorPagar) 
        ? cuentasPorPagar.reduce((acc, cuenta) => acc + (cuenta.saldo || 0), 0)
        : 0;
    } catch (error) {
      console.error('Error calculando total por pagar:', error);
      return 0;
    }
  };

  // =====================================================
  // FUNCIONES DE FORMATO
  // =====================================================

  const formatCurrency = (amount, currency = 'CLP') => {
    try {
      return new Intl.NumberFormat('es-CL', { 
        style: 'currency', 
        currency, 
        maximumFractionDigits: currency === 'CLP' ? 0 : 2 
      }).format(amount || 0);
    } catch (error) {
      console.error('Error formateando moneda:', error);
      return '$0';
    }
  };

  // =====================================================
  // EFECTOS
  // =====================================================

  useEffect(() => {
    // Actualizar estadísticas de errores
    setDashboardStats(prev => ({
      ...prev,
      hasErrors: Object.keys(errors).length > 0
    }));
  }, [errors]);

  // Log de estado general del dashboard
  useEffect(() => {
    console.log('📊 Estado del Dashboard:', {
      saldosBancarios: saldosBancarios.length,
      cuentasPendientes: cuentasPendientes.length,
      cuentasPorPagar: cuentasPorPagar.length,
      facturasPendientes: facturasPendientes.length,
      flujoCajaPeriodos: flujoCaja.periodos ? flujoCaja.periodos.length : 0,
      clientes: clientes.length,
      egresosProgramados: egresosProgramados.length,
      errores: Object.keys(errors).length
    });
  }, [saldosBancarios, cuentasPendientes, cuentasPorPagar, facturasPendientes, flujoCaja, clientes, egresosProgramados, errors]);

  // =====================================================
  // COMPONENTES DE RENDERIZADO
  // =====================================================

  const renderErrorAlert = () => {
    const errorCount = Object.keys(errors).length;
    
    if (errorCount === 0) return null;

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle size={20} className="text-amber-600 mr-2 mt-0.5" />
          <div>
            <h3 className="text-amber-800 font-medium">
              Advertencias de sincronización ({errorCount})
            </h3>
            <div className="mt-1 text-sm text-amber-700 space-y-1">
              {Object.entries(errors).map(([key, value]) => (
                <div key={key} className="flex items-center">
                  <span className="font-medium mr-2">{key}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-amber-600">
              💡 El dashboard funciona con datos parciales. Algunos módulos pueden mostrar información limitada.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSaldosBancariosCard = () => (
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
          saldosBancarios.map(cuenta => (
            <BankBalanceCard key={cuenta.id} cuenta={cuenta} loading={loading} />
          ))
        ) : (
          <div className="text-center text-gray-500 py-4">
            <Wallet size={32} className="mx-auto mb-2 text-gray-300" />
            <p>No hay cuentas bancarias</p>
            <p className="text-xs">Sincroniza con Chipax para ver tus saldos</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCuentasPorCobrarCard = () => (
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
      
      <div className="space-y-3 max-h-40 overflow-y-auto">
        {cuentasPendientes.length > 0 ? (
          cuentasPendientes.slice(0, 3).map(cuenta => (
            <div key={cuenta.id} className="border-b pb-2 last:border-b-0 last:pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    {cuenta.cliente?.nombre || 'Cliente sin nombre'}
                  </p>
                  <p className="text-sm text-gray-500">Factura #{cuenta.folio}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(cuenta.saldo)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-4">
            <TrendingUp size={32} className="mx-auto mb-2 text-gray-300" />
            <p>No hay cuentas por cobrar</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderFacturasPendientesCard = () => (
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
      
      <div className="space-y-3 max-h-40 overflow-y-auto">
        {facturasPendientes.length > 0 ? (
          facturasPendientes.slice(0, 3).map(factura => (
            <div key={factura.id} className="border-b pb-2 last:border-b-0 last:pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    {factura.proveedor?.nombre || 'Proveedor sin nombre'}
                  </p>
                  <p className="text-sm text-gray-500">Factura #{factura.folio}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(factura.monto)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-4">
            <Shield size={32} className="mx-auto mb-2 text-gray-300" />
            <p>No hay facturas pendientes</p>
          </div>
        )}
      </div>
    </div>
  );

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Financiero</h1>
              <p className="text-gray-600">
                Gestiona tus finanzas en tiempo real con datos de Chipax
              </p>
            </div>
            
            {/* Indicador de estado */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  dataSource === 'chipax' ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-gray-600">
                  Fuente: {dataSource === 'chipax' ? 'Chipax' : 'Manual'}
                </span>
              </div>
              
              <div className="flex items-center">
                <Activity size={16} className="mr-1 text-blue-500" />
                <span className="text-gray-600">
                  {dashboardStats.loadedModules}/{dashboardStats.totalModules} módulos
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Componente de sincronización */}
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
          />
        </div>

        {/* Alertas de errores */}
        {renderErrorAlert()}

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {renderSaldosBancariosCard()}
          {renderCuentasPorCobrarCard()}
          {renderFacturasPendientesCard()}
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

        {/* Componente de facturas pendientes */}
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
