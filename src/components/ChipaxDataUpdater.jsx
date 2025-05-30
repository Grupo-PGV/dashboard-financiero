// ChipaxDataUpdater.jsx - Versión final con paginación mejorada
import React, { useState } from 'react';
import { 
  Clock, RefreshCw, AlertTriangle, CheckCircle, Database, 
  Activity, BarChart3, Users, FileText, TrendingUp, Zap
} from 'lucide-react';
import chipaxService from '../services/chipaxService';
import chipaxAdapter from '../services/chipaxAdapter';

/**
 * Componente mejorado para actualizar datos del dashboard desde Chipax
 * Incluye manejo avanzado de paginación y diagnósticos detallados
 */
const ChipaxDataUpdater = ({ 
  onUpdateSaldos,
  onUpdateCuentasPendientes,
  onUpdateCuentasPorPagar,
  onUpdateFacturasPendientes,
  onUpdateFlujoCaja,
  onUpdateClientes,
  onUpdateEgresosProgramados,
  onUpdateBancos,
  saldoInicial = 0,
  onDataSourceChange,
  onSyncDetails
}) => {
  // Estados del componente
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  
  // Estados detallados por módulo
  const [updateStatus, setUpdateStatus] = useState({
    saldos: { status: 'pending', message: 'Pendiente', stats: null },
    cuentasPendientes: { status: 'pending', message: 'Pendiente', stats: null },
    cuentasPorPagar: { status: 'pending', message: 'Pendiente', stats: null },
    facturasPendientes: { status: 'pending', message: 'Pendiente', stats: null },
    flujoCaja: { status: 'pending', message: 'Pendiente', stats: null },
    clientes: { status: 'pending', message: 'Pendiente', stats: null },
    egresosProgramados: { status: 'pending', message: 'Pendiente', stats: null }
  });

  /**
   * Actualiza el estado de un módulo específico con estadísticas detalladas
   */
  const updateModuleStatus = (modulo, status, message, stats = null) => {
    setUpdateStatus(prevStatus => ({
      ...prevStatus,
      [modulo]: { status, message, stats, timestamp: new Date() }
    }));
  };

  /**
   * 🏦 Carga datos de saldos bancarios
   */
  const loadSaldosBancarios = async () => {
    try {
      updateModuleStatus('saldos', 'loading', 'Cargando saldos bancarios...');
      
      console.log('🏦 Iniciando carga de saldos bancarios...');
      const saldosBancarios = await chipaxService.Banco.getSaldosBancarios();
      
      // Adaptar y actualizar saldos
      const saldosAdaptados = chipaxAdapter.adaptSaldosBancarios(saldosBancarios);
      if (onUpdateSaldos) {
        onUpdateSaldos(saldosAdaptados);
      }
      
      // Adaptar y actualizar bancos
      const bancosAdaptados = chipaxAdapter.adaptBancos(saldosBancarios);
      if (onUpdateBancos) {
        onUpdateBancos(bancosAdaptados);
      }
      
      // Estadísticas del módulo
      const stats = {
        totalCuentas: saldosAdaptados.length,
        saldoTotal: saldosAdaptados.reduce((sum, c) => sum + c.saldo, 0),
        bancosUnicos: bancosAdaptados.length
      };
      
      updateModuleStatus('saldos', 'success', `${saldosAdaptados.length} cuentas cargadas`, stats);
      return { success: true, data: saldosAdaptados, stats };
      
    } catch (error) {
      console.error('❌ Error cargando saldos bancarios:', error);
      updateModuleStatus('saldos', 'error', `Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  /**
   * 📊 Carga datos de cuentas por cobrar (CON PAGINACIÓN MEJORADA)
   */
  const loadCuentasPendientes = async () => {
    try {
      updateModuleStatus('cuentasPendientes', 'loading', 'Cargando facturas por cobrar...');
      
      console.log('📊 Iniciando carga de cuentas por cobrar con paginación...');
      const facturasPorCobrar = await chipaxService.Ingresos.getFacturasVenta();
      
      // Adaptar cuentas pendientes
      const cuentasAdaptadas = chipaxAdapter.adaptCuentasPendientes(facturasPorCobrar);
      
      if (onUpdateCuentasPendientes) {
        onUpdateCuentasPendientes(cuentasAdaptadas, facturasPorCobrar.paginationInfo);
      }
      
      // Estadísticas del módulo
      const stats = {
        totalFacturas: cuentasAdaptadas.length,
        totalPorCobrar: cuentasAdaptadas.reduce((sum, c) => sum + c.saldo, 0),
        facturasVencidas: cuentasAdaptadas.filter(c => c.diasVencidos > 0).length,
        paginationInfo: facturasPorCobrar.paginationInfo
      };
      
      const completeness = facturasPorCobrar.paginationInfo ? 
        facturasPorCobrar.paginationInfo.completenessPercent : 100;
      
      updateModuleStatus('cuentasPendientes', 'success', 
        `${cuentasAdaptadas.length} facturas (${completeness.toFixed(1)}% completo)`, stats);
      
      return { success: true, data: cuentasAdaptadas, stats };
      
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
      updateModuleStatus('cuentasPendientes', 'error', `Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  /**
   * 🛒 Carga datos de cuentas por pagar (CON PAGINACIÓN MEJORADA)
   */
  const loadCuentasPorPagar = async () => {
    try {
      updateModuleStatus('cuentasPorPagar', 'loading', 'Cargando facturas por pagar...');
      
      console.log('🛒 Iniciando carga de cuentas por pagar con paginación...');
      const facturasPorPagar = await chipaxService.Egresos.getFacturasCompra();
      
      // Adaptar cuentas por pagar
      const cuentasAdaptadas = chipaxAdapter.adaptCuentasPorPagar(facturasPorPagar);
      
      if (onUpdateCuentasPorPagar) {
        onUpdateCuentasPorPagar(cuentasAdaptadas, facturasPorPagar.paginationInfo);
      }
      
      // Estadísticas del módulo
      const stats = {
        totalFacturas: cuentasAdaptadas.length,
        totalPorPagar: cuentasAdaptadas.reduce((sum, c) => sum + c.saldo, 0),
        facturasVencidas: cuentasAdaptadas.filter(c => c.diasVencidos > 0).length,
        paginationInfo: facturasPorPagar.paginationInfo
      };
      
      const completeness = facturasPorPagar.paginationInfo ? 
        facturasPorPagar.paginationInfo.completenessPercent : 100;
      
      updateModuleStatus('cuentasPorPagar', 'success', 
        `${cuentasAdaptadas.length} facturas (${completeness.toFixed(1)}% completo)`, stats);
      
      return { success: true, data: cuentasAdaptadas, stats };
      
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      updateModuleStatus('cuentasPorPagar', 'error', `Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  /**
   * ⏳ Carga datos de facturas pendientes de aprobación
   */
  const loadFacturasPendientes = async () => {
    try {
      updateModuleStatus('facturasPendientes', 'loading', 'Cargando facturas pendientes...');
      
      const facturasPendientes = await chipaxService.Egresos.getFacturasPendientesAprobacion();
      
      // Adaptar facturas pendientes
      const facturasAdaptadas = chipaxAdapter.adaptFacturasPendientesAprobacion(facturasPendientes);
      if (onUpdateFacturasPendientes) {
        onUpdateFacturasPendientes(facturasAdaptadas);
      }
      
      const stats = {
        totalFacturas: facturasAdaptadas.length,
        montoTotal: facturasAdaptadas.reduce((sum, f) => sum + f.monto, 0)
      };
      
      updateModuleStatus('facturasPendientes', 'success', `${facturasAdaptadas.length} facturas`, stats);
      return { success: true, data: facturasAdaptadas, stats };
      
    } catch (error) {
      console.error('❌ Error cargando facturas pendientes:', error);
      updateModuleStatus('facturasPendientes', 'error', `Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  /**
   * 📈 Carga datos de flujo de caja
   */
  const loadFlujoCaja = async () => {
    try {
      updateModuleStatus('flujoCaja', 'loading', 'Cargando flujo de caja...');
      
      const flujoCaja = await chipaxService.Reportes.getFlujoCaja();
      
      // Adaptar flujo de caja
      const flujoAdaptado = chipaxAdapter.adaptFlujoCaja(flujoCaja, saldoInicial);
      if (onUpdateFlujoCaja) {
        onUpdateFlujoCaja(flujoAdaptado);
      }
      
      const stats = {
        totalPeriodos: flujoAdaptado.periodos?.length || 0,
        saldoFinal: flujoAdaptado.saldoFinal || 0,
        flujoNetoTotal: flujoAdaptado.resumen?.flujoNetoTotal || 0
      };
      
      updateModuleStatus('flujoCaja', 'success', `${stats.totalPeriodos} períodos`, stats);
      return { success: true, data: flujoAdaptado, stats };
      
    } catch (error) {
      console.error('❌ Error cargando flujo de caja:', error);
      updateModuleStatus('flujoCaja', 'error', `Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  /**
   * 👥 Carga datos de clientes (CON PAGINACIÓN)
   */
  const loadClientes = async () => {
    try {
      updateModuleStatus('clientes', 'loading', 'Cargando clientes...');
      
      const clientes = await chipaxService.Ajustes.getClientes();
      
      if (onUpdateClientes) {
        onUpdateClientes(clientes.items || clientes, clientes.paginationInfo);
      }
      
      const clientesArray = clientes.items || clientes || [];
      const stats = {
        totalClientes: clientesArray.length,
        paginationInfo: clientes.paginationInfo
      };
      
      const completeness = clientes.paginationInfo ? 
        clientes.paginationInfo.completenessPercent : 100;
      
      updateModuleStatus('clientes', 'success', 
        `${clientesArray.length} clientes (${completeness.toFixed(1)}% completo)`, stats);
      
      return { success: true, data: clientesArray, stats };
      
    } catch (error) {
      console.error('❌ Error cargando clientes:', error);
      updateModuleStatus('clientes', 'error', `Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  /**
   * 📅 Carga datos de egresos programados
   */
  const loadEgresosProgramados = async () => {
    try {
      updateModuleStatus('egresosProgramados', 'loading', 'Cargando egresos programados...');
      
      const pagosProgramados = await chipaxService.Egresos.getPagosProgramados();
      
      // Adaptar egresos programados
      const egresosAdaptados = chipaxAdapter.adaptEgresosProgramados(pagosProgramados);
      if (onUpdateEgresosProgramados) {
        onUpdateEgresosProgramados(egresosAdaptados);
      }
      
      const stats = {
        totalEgresos: egresosAdaptados.length,
        montoTotal: egresosAdaptados.reduce((sum, e) => sum + e.monto, 0)
      };
      
      updateModuleStatus('egresosProgramados', 'success', `${egresosAdaptados.length} egresos`, stats);
      return { success: true, data: egresosAdaptados, stats };
      
    } catch (error) {
      console.error('❌ Error cargando egresos programados:', error);
      updateModuleStatus('egresosProgramados', 'error', `Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  /**
   * 🚀 Carga todos los datos de Chipax de forma optimizada
   */
  const loadAllChipaxData = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);
    
    console.log('🚀 🔄 INICIANDO SINCRONIZACIÓN COMPLETA CON CHIPAX...');
    
    try {
      // Cargar todos los módulos en paralelo
      const loadPromises = [
        loadSaldosBancarios(),
        loadCuentasPendientes(),
        loadCuentasPorPagar(),
        loadFacturasPendientes(),
        loadFlujoCaja(),
        loadClientes(),
        loadEgresosProgramados()
      ];
      
      // Ejecutar todas las operaciones
      const results = await Promise.allSettled(loadPromises);
      
      // Analizar resultados
      const moduleNames = ['saldos', 'cuentasPendientes', 'cuentasPorPagar', 'facturasPendientes', 'flujoCaja', 'clientes', 'egresosProgramados'];
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const errorCount = results.length - successCount;
      
      // Recopilar estadísticas globales
      const globalStats = {
        modulesLoaded: successCount,
        modulesTotal: results.length,
        errors: errorCount,
        duration: (Date.now() - startTime) / 1000,
        timestamp: new Date(),
        success: errorCount === 0
      };
      
      // Calcular estadísticas detalladas
      const detailedStats = {};
      results.forEach((result, index) => {
        const moduleName = moduleNames[index];
        if (result.status === 'fulfilled' && result.value?.stats) {
          detailedStats[moduleName] = result.value.stats;
        }
      });
      
      setSyncStats({ ...globalStats, details: detailedStats });
      
      // Actualizar timestamp de última actualización
      setLastUpdate(new Date());
      
      // Notificar cambio de fuente de datos
      if (onDataSourceChange) {
        onDataSourceChange('chipax');
      }
      
      // Enviar detalles de sincronización al componente padre
      if (onSyncDetails) {
        onSyncDetails(globalStats);
      }
      
      // Log de resumen
      console.log(`\n🎯 ✅ SINCRONIZACIÓN COMPLETADA:`);
      console.log(`   ⏱️ Duración: ${globalStats.duration.toFixed(1)}s`);
      console.log(`   ✅ Módulos exitosos: ${successCount}/${results.length}`);
      console.log(`   ❌ Módulos con errores: ${errorCount}`);
      console.log(`   📊 Estado general: ${globalStats.success ? 'ÉXITO' : 'CON ERRORES'}\n`);
      
    } catch (err) {
      console.error('💥 ERROR CRÍTICO en sincronización:', err);
      setError(`Error crítico: ${err.message}`);
      
      // Notificar error al componente padre
      if (onSyncDetails) {
        onSyncDetails({
          success: false,
          error: err.message,
          duration: (Date.now() - startTime) / 1000,
          timestamp: new Date()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🧪 Probar conexión con Chipax
   */
  const testChipaxConnection = async () => {
    try {
      setLoading(true);
      console.log('🧪 Probando conexión con Chipax...');
      
      const token = await chipaxService.getChipaxToken();
      console.log('✅ Token obtenido correctamente:', token.substring(0, 10) + '...');
      
      // Hacer una petición de prueba
      const testResponse = await chipaxService.fetchFromChipax('/flujo-caja/init');
      console.log('✅ Conexión verificada exitosamente');
      
      alert('✅ Conexión con Chipax establecida correctamente');
    } catch (error) {
      console.error('❌ Error en conexión con Chipax:', error);
      alert(`❌ Error en la conexión con Chipax: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renderiza indicador de estado mejorado
   */
  const renderStatus = (status) => {
    const { status: state, message, stats, timestamp } = status;
    
    switch (state) {
      case 'pending':
        return (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs">Pendiente</span>
          </div>
        );
      case 'loading':
        return (
          <div className="flex items-center justify-between">
            <span className="text-blue-500 text-xs flex items-center">
              <RefreshCw size={10} className="mr-1 animate-spin" /> 
              Cargando...
            </span>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col">
            <span className="text-green-500 text-xs flex items-center">
              <CheckCircle size={10} className="mr-1" /> 
              {message}
            </span>
            {stats && (
              <div className="text-xs text-gray-500 mt-1">
                {stats.paginationInfo && `${stats.paginationInfo.completenessPercent.toFixed(0)}% completo`}
              </div>
            )}
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col">
            <span className="text-red-500 text-xs flex items-center">
              <AlertTriangle size={10} className="mr-1" /> 
              Error
            </span>
            <span className="text-red-400 text-xs">{message}</span>
          </div>
        );
      default:
        return null;
    }
  };

  /**
   * Obtiene el icono del módulo
   */
  const getModuleIcon = (moduleName) => {
    const icons = {
      saldos: <Database size={14} className="text-blue-600" />,
      cuentasPendientes: <TrendingUp size={14} className="text-green-600" />,
      cuentasPorPagar: <BarChart3 size={14} className="text-red-600" />,
      facturasPendientes: <FileText size={14} className="text-amber-600" />,
      flujoCaja: <Activity size={14} className="text-purple-600" />,
      clientes: <Users size={14} className="text-indigo-600" />,
      egresosProgramados: <Clock size={14} className="text-gray-600" />
    };
    
    return icons[moduleName] || <Database size={14} className="text-gray-600" />;
  };

  /**
   * Formatear números para estadísticas
   */
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Database size={18} className="mr-2 text-blue-600" /> 
            Integración con Chipax
            {syncStats?.success && (
              <Zap size={16} className="ml-2 text-green-500" />
            )}
          </h2>
          
          {lastUpdate && (
            <p className="text-sm text-gray-500 flex items-center">
              <Clock size={14} className="mr-1" />
              Última actualización: {lastUpdate.toLocaleString()}
              {syncStats && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {syncStats.duration.toFixed(1)}s
                </span>
              )}
            </p>
          )}
          
          {error && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertTriangle size={14} className="mr-1" />
              {error}
            </p>
          )}
        </div>
        
        <div className="flex items-center">
          <button 
            className="text-blue-600 hover:text-blue-800 mr-4 text-sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
          </button>
          
          <button 
            className="bg-gray-200 text-gray-800 mr-2 px-4 py-2 rounded-md text-sm hover:bg-gray-300 disabled:opacity-50"
            onClick={testChipaxConnection}
            disabled={loading}
          >
            Probar conexión
          </button>
          
          <button 
            className={`bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={loadAllChipaxData}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw size={16} className="mr-2" />
                Sincronizar con Chipax
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Panel expandible con detalles de la sincronización */}
      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Estado de la sincronización por módulo:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {Object.entries(updateStatus).map(([moduleName, status]) => (
              <div key={moduleName} className="flex justify-between items-start p-3 bg-gray-50 rounded border">
                <div className="flex items-start">
                  <div className="mr-2 mt-0.5">
                    {getModuleIcon(moduleName)}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      {moduleName === 'saldos' && 'Saldos Bancarios'}
                      {moduleName === 'cuentasPendientes' && 'Cuentas por Cobrar'}
                      {moduleName === 'cuentasPorPagar' && 'Cuentas por Pagar'}
                      {moduleName === 'facturasPendientes' && 'Facturas Pendientes'}
                      {moduleName === 'flujoCaja' && 'Flujo de Caja'}
                      {moduleName === 'clientes' && 'Clientes'}
                      {moduleName === 'egresosProgramados' && 'Egresos Programados'}
                    </span>
                    
                    {/* Estadísticas del módulo */}
                    {status.stats && status.status === 'success' && (
                      <div className="text-xs text-gray-500 mt-1">
                        {status.stats.totalFacturas && `${formatNumber(status.stats.totalFacturas)} facturas`}
                        {status.stats.totalCuentas && `${formatNumber(status.stats.totalCuentas)} cuentas`}
                        {status.stats.totalClientes && `${formatNumber(status.stats.totalClientes)} clientes`}
                        {status.stats.totalPeriodos && `${formatNumber(status.stats.totalPeriodos)} períodos`}
                        {status.stats.totalEgresos && `${formatNumber(status.stats.totalEgresos)} egresos`}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  {renderStatus(status)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Estadísticas globales */}
          {syncStats && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Estadísticas de la última sincronización:</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-blue-50 rounded p-2">
                  <span className="text-blue-700 font-medium">Duración</span>
                  <p className="text-blue-900 font-bold">{syncStats.duration.toFixed(1)}s</p>
                </div>
                
                <div className="bg-green-50 rounded p-2">
                  <span className="text-green-700 font-medium">Módulos</span>
                  <p className="text-green-900 font-bold">{syncStats.modulesLoaded}/{syncStats.modulesTotal}</p>
                </div>
                
                <div className={`rounded p-2 ${syncStats.errors > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <span className={`font-medium ${syncStats.errors > 0 ? 'text-red-700' : 'text-gray-700'}`}>Errores</span>
                  <p className={`font-bold ${syncStats.errors > 0 ? 'text-red-900' : 'text-gray-900'}`}>{syncStats.errors}</p>
                </div>
                
                <div className={`rounded p-2 ${syncStats.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className={`font-medium ${syncStats.success ? 'text-green-700' : 'text-red-700'}`}>Estado</span>
                  <p className={`font-bold ${syncStats.success ? 'text-green-900' : 'text-red-900'}`}>
                    {syncStats.success ? 'Exitoso' : 'Con errores'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <p className="font-medium mb-1">📊 Funcionalidades mejoradas:</p>
            <ul className="space-y-1">
              <li>✅ Paginación automática para obtener TODOS los datos</li>
              <li>✅ Estadísticas detalladas de completitud por módulo</li>
              <li>✅ Manejo robusto de errores con reintentos</li>
              <li>✅ Carga paralela optimizada para mayor velocidad</li>
              <li>✅ Diagnósticos avanzados de conexión y datos</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChipaxDataUpdater;
