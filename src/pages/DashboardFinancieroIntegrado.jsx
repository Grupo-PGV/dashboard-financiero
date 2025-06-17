// DashboardFinancieroIntegrado.jsx - Dashboard principal actualizado para Fase 2
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Filter, Info, Wallet, PieChart, TrendingUp, 
  Database, CheckCircle, Clock, RefreshCw, Settings, FileText, TestTube
} from 'lucide-react';

// Importar componentes
import ChipaxDataUpdater from '../components/ChipaxDataUpdater';
import BankBalanceCard from '../components/BankBalanceCard';
import CashFlowChart from '../components/CashFlowChart';
import AccountsReceivableTable from '../components/AccountsReceivableTable';
import PendingInvoicesComponent from '../components/PendingInvoicesComponent';
import PaginationDebugger from '../components/PaginationDebugger';
import ChipaxDataInspector from '../components/ChipaxDataInspector';
import ChipaxDTEAnalyzer from '../components/ChipaxDTEAnalyzer';
import ChipaxDebugPanel from '../components/ChipaxDebugPanel';

// Importar servicios actualizados
import { testearSaldosBancarios, investigarEndpointsDisponibles } from '../services/chipaxService';
import { probarAdaptadorCorregido } from '../services/chipaxAdapter';

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

  // Estados adicionales para Fase 2
  const [strategiaSaldosUsada, setStrategiaSaldosUsada] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // === HANDLERS PRINCIPALES ===

  /**
   * HANDLER ACTUALIZADO: Maneja la actualización de saldos bancarios
   * Ahora compatible con el nuevo sistema de múltiples estrategias
   */
  const handleUpdateSaldos = async (nuevosSaldos, paginationInfo) => {
    console.log('💰 Actualizando saldos bancarios...');
    
    // Si nuevosSaldos viene del nuevo servicio con múltiples estrategias
    if (nuevosSaldos && typeof nuevosSaldos === 'object' && nuevosSaldos.data) {
      const { data, estrategiaUsada, totalSaldos, cantidadCuentas, warning } = nuevosSaldos;
      
      console.log(`✅ Saldos obtenidos con estrategia: ${estrategiaUsada}`);
      console.log(`💰 Total: ${totalSaldos?.toLocaleString('es-CL') || 0}`);
      console.log(`🏦 Cantidad de cuentas: ${cantidadCuentas}`);
      
      // Guardar información de la estrategia usada
      setStrategiaSaldosUsada(estrategiaUsada);
      
      // Mostrar warning si existe
      if (warning) {
        console.warn(`⚠️ ${warning}`);
      }
      
      setSaldosBancarios(data);
    } 
    // Si es un array directo (respuesta tradicional)
    else if (Array.isArray(nuevosSaldos)) {
      setSaldosBancarios(nuevosSaldos);
      setStrategiaSaldosUsada('Método tradicional');
    }
    // Si no hay datos válidos
    else {
      console.warn('⚠️ No se recibieron saldos válidos');
      setSaldosBancarios([]);
    }
    
    if (paginationInfo) {
      setPaginationInfo(prev => ({
        ...prev,
        saldosBancarios: paginationInfo
      }));
    }
  };

  /**
   * HANDLER ACTUALIZADO: Maneja las cuentas por pagar
   * Ahora verifica que el adaptador funcione correctamente
   */
  const handleUpdateCuentasPorPagar = async (nuevasCuentas, paginationInfo) => {
    console.log('💸 Actualizando cuentas por pagar...');
    
    if (Array.isArray(nuevasCuentas)) {
      // Verificar que el primer elemento tenga proveedor como string
      if (nuevasCuentas.length > 0) {
        const primeraFactura = nuevasCuentas[0];
        console.log('🔍 Verificando adaptación de cuentas por pagar:');
        console.log(`✅ proveedor es string: ${typeof primeraFactura.proveedor === 'string'}`);
        console.log(`✅ proveedorInfo existe: ${!!primeraFactura.proveedorInfo}`);
        
        if (typeof primeraFactura.proveedor !== 'string') {
          console.error('❌ ERROR: El campo proveedor no es un string. El adaptador no está funcionando correctamente.');
          setErrors(prev => ({
            ...prev,
            cuentasPorPagar: 'Error: El adaptador de compras necesita corrección'
          }));
          return;
        }
      }
      
      setCuentasPorPagar(nuevasCuentas);
      
      // Limpiar errores si todo está bien
      setErrors(prev => {
        const { cuentasPorPagar, ...rest } = prev;
        return rest;
      });
      
      console.log(`✅ Cuentas por pagar actualizadas: ${nuevasCuentas.length} facturas`);
    } else {
      console.warn('⚠️ Datos inválidos para cuentas por pagar');
    }
    
    if (paginationInfo) {
      setPaginationInfo(prev => ({
        ...prev,
        cuentasPorPagar: paginationInfo
      }));
    }
  };

  const handleUpdateCuentasPendientes = async (nuevasCuentas, paginationInfo) => {
    console.log('📋 Actualizando cuentas pendientes...');
    
    if (Array.isArray(nuevasCuentas)) {
      setCuentasPendientes(nuevasCuentas);
      console.log(`✅ Cuentas pendientes actualizadas: ${nuevasCuentas.length} facturas`);
    }
    
    if (paginationInfo) {
      setPaginationInfo(prev => ({
        ...prev,
        cuentasPendientes: paginationInfo
      }));
    }
  };

  const handleUpdateFacturasPendientes = async (nuevasFacturas, paginationInfo) => {
    console.log('⏳ Actualizando facturas pendientes...');
    
    if (Array.isArray(nuevasFacturas)) {
      setFacturasPendientes(nuevasFacturas);
    }
    
    if (paginationInfo) {
      setPaginationInfo(prev => ({
        ...prev,
        facturasPendientes: paginationInfo
      }));
    }
  };

  const handleUpdateFlujoCaja = async (nuevoFlujo) => {
    console.log('💵 Actualizando flujo de caja...');
    setFlujoCaja(nuevoFlujo);
  };

  const handleUpdateClientes = async (nuevosClientes, paginationInfo) => {
    console.log('👥 Actualizando clientes...');
    
    if (Array.isArray(nuevosClientes)) {
      setClientes(nuevosClientes);
    }
    
    if (paginationInfo) {
      setPaginationInfo(prev => ({
        ...prev,
        clientes: paginationInfo
      }));
    }
  };

  const handleUpdateEgresosProgramados = async (nuevosEgresos) => {
    console.log('📅 Actualizando egresos programados...');
    setEgresosProgramados(nuevosEgresos || []);
  };

  const handleUpdateBancos = async (nuevosBancos) => {
    console.log('🏦 Actualizando información de bancos...');
    setBancos(nuevosBancos || []);
  };

  const handleDataSourceChange = (newSource) => {
    console.log(`🔄 Cambio de fuente de datos: ${newSource}`);
    setDataSource(newSource);
  };

  const handleSyncDetails = (details) => {
    setLastSyncDetails(details);
  };

  // === FUNCIONES DE TESTING PARA FASE 2 ===

  /**
   * Ejecuta pruebas específicas de la Fase 2
   */
  const ejecutarPruebasFase2 = async () => {
    console.log('🧪 EJECUTANDO PRUEBAS DE LA FASE 2');
    setLoading(true);
    setShowTestPanel(true);
    
    const resultados = {
      timestamp: new Date().toISOString(),
      pruebas: {}
    };
    
    try {
      // 1. Probar el adaptador corregido de compras
      console.log('🔧 Probando adaptador de compras...');
      const pruebaAdaptador = probarAdaptadorCorregido();
      resultados.pruebas.adaptadorCompras = {
        exito: pruebaAdaptador && pruebaAdaptador.length > 0,
        detalles: pruebaAdaptador,
        mensaje: 'Adaptador de compras verificado'
      };
      
      // 2. Probar estrategias de saldos bancarios
      console.log('🏦 Probando estrategias de saldos...');
      const pruebaSaldos = await testearSaldosBancarios();
      resultados.pruebas.saldosBancarios = {
        exito: pruebaSaldos.success,
        estrategiaUsada: pruebaSaldos.estrategiaUsada,
        totalSaldos: pruebaSaldos.totalSaldos,
        cantidadCuentas: pruebaSaldos.cantidadCuentas,
        mensaje: pruebaSaldos.success ? 'Saldos obtenidos exitosamente' : 'No se pudieron obtener saldos'
      };
      
      // 3. Investigar endpoints disponibles
      console.log('🔍 Investigando endpoints...');
      const endpoints = await investigarEndpointsDisponibles();
      resultados.pruebas.endpointsDisponibles = {
        exito: endpoints.length > 0,
        disponibles: endpoints.filter(e => e.existe).length,
        total: endpoints.length,
        detalles: endpoints,
        mensaje: `${endpoints.filter(e => e.existe).length} de ${endpoints.length} endpoints disponibles`
      };
      
      setTestResults(resultados);
      console.log('✅ Pruebas completadas:', resultados);
      
    } catch (error) {
      console.error('❌ Error en las pruebas:', error);
      resultados.error = error.message;
      setTestResults(resultados);
    } finally {
      setLoading(false);
    }
  };

  // === FUNCIONES DE CÁLCULO ===

  const calcularTotalSaldos = () => {
    return saldosBancarios.reduce((total, cuenta) => total + (cuenta.saldo || 0), 0);
  };

  const calcularTotalPorCobrar = () => {
    return cuentasPendientes.reduce((total, cuenta) => total + (cuenta.saldo || 0), 0);
  };

  const calcularTotalPorPagar = () => {
    return cuentasPorPagar.reduce((total, cuenta) => total + (cuenta.saldo || 0), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // === HANDLERS ADICIONALES ===

  const handleAprobarFactura = async (facturaId) => {
    console.log(`✅ Aprobando factura ${facturaId}`);
    // Implementar lógica de aprobación
  };

  const handleRechazarFactura = async (facturaId, motivo) => {
    console.log(`❌ Rechazando factura ${facturaId}: ${motivo}`);
    // Implementar lógica de rechazo
  };

  const handleExportToExcel = (tipo) => {
    console.log(`📊 Exportando a Excel: ${tipo}`);
    // Implementar exportación
  };

  const handleFlujoCajaPeriodChange = (nuevoPeriodo) => {
    setPeriodoFlujo(nuevoPeriodo);
  };

  // === COMPONENTE DE INFORMACIÓN DE PAGINACIÓN ===

  const PaginationInfoCard = ({ title, info, total }) => {
    const isComplete = info?.completenessPercent === 100;
    const hasFailures = info?.failedPages?.length > 0;
    
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
            {info?.completenessPercent?.toFixed(1) || 0}%
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-600">Páginas:</span>
            <p className="font-medium">{info?.totalPagesLoaded || 0}/{info?.totalPagesRequested || 0}</p>
          </div>
          <div>
            <span className="text-gray-600">Items:</span>
            <p className="font-medium">{total || info?.totalItemsLoaded || 0}</p>
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

  // === PANEL DE PRUEBAS DE FASE 2 ===

  const TestPanelFase2 = () => {
    if (!showTestPanel) return null;
    
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TestTube size={20} className="mr-2 text-purple-600" />
            Pruebas de la Fase 2
          </h3>
          <button
            onClick={() => setShowTestPanel(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="animate-spin mr-2" size={20} />
            <span>Ejecutando pruebas...</span>
          </div>
        )}
        
        {testResults && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Ejecutado: {new Date(testResults.timestamp).toLocaleString()}
            </div>
            
            {Object.entries(testResults.pruebas).map(([nombre, resultado]) => (
              <div key={nombre} className={`p-4 rounded border ${
                resultado.exito ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{nombre}</h4>
                  <span className={`text-sm ${
                    resultado.exito ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {resultado.exito ? '✅ Éxito' : '❌ Error'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{resultado.mensaje}</p>
                
                {resultado.estrategiaUsada && (
                  <p className="text-xs text-gray-600 mt-1">
                    Estrategia: {resultado.estrategiaUsada}
                  </p>
                )}
                
                {resultado.totalSaldos && (
                  <p className="text-xs text-gray-600 mt-1">
                    Total saldos: {resultado.totalSaldos.toLocaleString('es-CL')}
                  </p>
                )}
              </div>
            ))}
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
              {strategiaSaldosUsada && (
                <p className="text-xs text-green-600 mt-1">
                  Saldos obtenidos con: {strategiaSaldosUsada}
                </p>
              )}
            </div>
            
            {/* Controles del header */}
            <div className="flex items-center space-x-2">
              <button
                onClick={ejecutarPruebasFase2}
                disabled={loading}
                className={`px-3 py-1 rounded text-sm flex items-center ${
                  loading 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                <TestTube size={16} className="mr-1" />
                Probar Fase 2
              </button>
              
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
        {/* Panel de pruebas de Fase 2 */}
        <TestPanelFase2 />
        
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
            loading={loading}
            setLoading={setLoading}
          />
        </div>

        {/* Errores de adaptación */}
        {Object.keys(errors).length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium flex items-center mb-2">
              <AlertCircle size={16} className="mr-2" />
              Errores Detectados
            </h3>
            {Object.entries(errors).map(([key, error]) => (
              <p key={key} className="text-red-700 text-sm">
                <strong>{key}:</strong> {error}
              </p>
            ))}
          </div>
        )}

        {/* Información de paginación */}
        {Object.keys(paginationInfo).length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Info size={16} className="mr-2 text-blue-600" />
              Estado de Carga de Datos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {paginationInfo.saldosBancarios && (
                <PaginationInfoCard 
                  title="Saldos Bancarios" 
                  info={paginationInfo.saldosBancarios} 
                  total={saldosBancarios.length}
                />
              )}
              
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

        {/* Cards de resumen financiero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Saldos bancarios */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Saldos Bancarios</h3>
              <Wallet className="text-blue-600" size={24} />
            </div>
            <div className="flex items-center justify-between">
              {paginationInfo.saldosBancarios && (
                <div className={`text-xs px-2 py-1 rounded ${
                  paginationInfo.saldosBancarios.completenessPercent === 100 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {paginationInfo.saldosBancarios.completenessPercent.toFixed(0)}%
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatCurrency(calcularTotalSaldos())}
            </div>
            <div className="text-sm text-gray-500">
              {saldosBancarios.length} cuentas bancarias
            </div>
            {strategiaSaldosUsada && (
              <div className="mt-2 text-xs text-green-600">
                Método: {strategiaSaldosUsada}
              </div>
            )}
          </div>

          {/* Cuentas por cobrar */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Por Cobrar</h3>
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div className="flex items-center justify-between">
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
          </div>

          {/* Cuentas por pagar */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Por Pagar</h3>
              <PieChart className="text-red-600" size={24} />
            </div>
            <div className="flex items-center justify-between">
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
            {errors.cuentasPorPagar && (
              <div className="mt-2 text-xs text-red-600">
                ⚠️ Requiere corrección del adaptador
              </div>
            )}
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
    </div>
  );
};

export default DashboardFinancieroIntegrado;
