// ChipaxDataUpdater.jsx - Versión con paginación completa optimizada
import React, { useState } from 'react';
import { 
  Clock, RefreshCw, AlertTriangle, CheckCircle, Database, AlertCircle,
  BarChart, Zap, Settings, Info
} from 'lucide-react';
import chipaxService from '../services/chipaxService';
import chipaxAdapter from '../services/chipaxAdapter';

/**
 * Componente para actualizar los datos del dashboard desde Chipax
 * Versión optimizada con paginación completa
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
  onDataSourceChange
}) => {
  // Estados del componente
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  const [paginationStats, setPaginationStats] = useState({});
  const [loadMode, setLoadMode] = useState('complete'); // 'complete', 'limited', 'fast'
  const [updateStatus, setUpdateStatus] = useState({
    saldos: { status: 'pending', message: 'Pendiente' },
    cuentasPendientes: { status: 'pending', message: 'Pendiente' },
    cuentasPorPagar: { status: 'pending', message: 'Pendiente' },
    facturasPendientes: { status: 'pending', message: 'Pendiente' },
    flujoCaja: { status: 'pending', message: 'Pendiente' },
    clientes: { status: 'pending', message: 'Pendiente' },
    egresosProgramados: { status: 'pending', message: 'Pendiente' }
  });

  // Configuración de modos de carga
  const loadModes = {
    complete: { label: 'Completa', pages: null, icon: <Database size={16} />, desc: 'Cargar todas las páginas' },
    limited: { label: 'Limitada', pages: 10, icon: <BarChart size={16} />, desc: 'Máximo 10 páginas por endpoint' },
    fast: { label: 'Rápida', pages: 3, icon: <Zap size={16} />, desc: 'Solo 3 páginas para pruebas' }
  };

  // =====================================================
  // FUNCIONES DE UTILIDAD
  // =====================================================

  const addDebugInfo = (message, type = 'info', data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type, data };
    
    setDebugInfo(prev => [...prev.slice(-19), logEntry]);
    
    // Log en consola con formato mejorado
    const emoji = type === 'loading' ? '⏳' : 
                 type === 'success' ? '✅' : 
                 type === 'error' ? '❌' : 
                 type === 'warning' ? '⚠️' : '🔍';
    
    console.log(`${emoji} [${timestamp}] ${message}`, data || '');
  };

  const updateModuleStatus = (modulo, status, message, stats = null) => {
    setUpdateStatus(prev => ({
      ...prev,
      [modulo]: { status, message, stats }
    }));
    
    // Actualizar estadísticas de paginación si están disponibles
    if (stats) {
      setPaginationStats(prev => ({
        ...prev,
        [modulo]: stats
      }));
    }
    
    const emoji = status === 'loading' ? '⏳' : 
                 status === 'success' ? '✅' : 
                 status === 'error' ? '❌' : '⏸️';
    
    addDebugInfo(`${emoji} ${modulo}: ${message}`, status, stats);
  };

  const safeCallback = (callback, data, moduleName) => {
    try {
      if (callback && typeof callback === 'function') {
        callback(data);
        const count = Array.isArray(data) ? data.length : 
                     data.items ? data.items.length : 
                     typeof data === 'object' ? 'objeto' : 'dato';
        addDebugInfo(`📡 Callback ejecutado para ${moduleName}: ${count}`, 'success');
      } else {
        addDebugInfo(`⚠️ No hay callback definido para ${moduleName}`, 'warning');
      }
    } catch (error) {
      addDebugInfo(`❌ Error ejecutando callback para ${moduleName}: ${error.message}`, 'error');
      console.error(`Error en callback de ${moduleName}:`, error);
    }
  };

  // =====================================================
  // FUNCIONES DE CARGA DE DATOS CON PAGINACIÓN
  // =====================================================

  const loadSaldosBancarios = async () => {
    try {
      updateModuleStatus('saldos', 'loading', 'Obteniendo saldos bancarios...');
      
      const saldosBancarios = await chipaxService.Banco.getSaldosBancarios();
      addDebugInfo(`🏦 Datos bancarios recibidos`, 'info', {
        hasData: !!saldosBancarios,
        structure: Object.keys(saldosBancarios || {})
      });
      
      // Adaptar saldos
      const saldosAdaptados = chipaxAdapter.adaptSaldosBancarios(saldosBancarios);
      safeCallback(onUpdateSaldos, saldosAdaptados, 'saldos');
      
      // Adaptar y actualizar bancos
      const bancosAdaptados = chipaxAdapter.adaptBancos(saldosBancarios);
      safeCallback(onUpdateBancos, bancosAdaptados, 'bancos');
      
      updateModuleStatus('saldos', 'success', `${saldosAdaptados.length} cuentas cargadas`);
      
    } catch (error) {
      console.error('Error cargando saldos bancarios:', error);
      updateModuleStatus('saldos', 'error', `Error: ${error.message}`);
      
      // Fallbacks seguros
      safeCallback(onUpdateSaldos, [], 'saldos (fallback)');
      safeCallback(onUpdateBancos, [], 'bancos (fallback)');
      
      throw error;
    }
  };

  const loadCuentasPendientes = async () => {
    try {
      updateModuleStatus('cuentasPendientes', 'loading', 'Obteniendo cuentas por cobrar con paginación...');
      
      const limitPages = loadModes[loadMode].pages;
      const facturasPorCobrar = await chipaxService.Ingresos.getFacturasVenta(limitPages);
      
      // Estadísticas de paginación
      const stats = {
        totalItems: facturasPorCobrar.items?.length || 0,
        pagesLoaded: facturasPorCobrar.paginationAttributes?.pagesLoaded || 1,
        totalPages: facturasPorCobrar.paginationAttributes?.totalPages || 1,
        pagesFailed: facturasPorCobrar.paginationAttributes?.pagesFailed || 0,
        limited: !!limitPages
      };
      
      addDebugInfo(`📊 Facturas por cobrar obtenidas`, 'info', stats);
      
      // Adaptar cuentas pendientes
      const cuentasAdaptadas = chipaxAdapter.adaptCuentasPendientes(facturasPorCobrar);
      safeCallback(onUpdateCuentasPendientes, cuentasAdaptadas, 'cuentas pendientes');
      
      updateModuleStatus(
        'cuentasPendientes', 
        'success', 
        `${cuentasAdaptadas.length} cuentas de ${stats.pagesLoaded} páginas`,
        stats
      );
      
    } catch (error) {
      console.error('Error cargando cuentas por cobrar:', error);
      updateModuleStatus('cuentasPendientes', 'error', `Error: ${error.message}`);
      safeCallback(onUpdateCuentasPendientes, [], 'cuentas pendientes (fallback)');
      throw error;
    }
  };

  const loadCuentasPorPagar = async () => {
    try {
      updateModuleStatus('cuentasPorPagar', 'loading', 'Obteniendo cuentas por pagar con paginación...');
      
      const limitPages = loadModes[loadMode].pages;
      const facturasPorPagar = await chipaxService.Egresos.getFacturasCompra(limitPages);
      
      // Estadísticas de paginación
      const stats = {
        totalItems: facturasPorPagar.items?.length || 0,
        pagesLoaded: facturasPorPagar.paginationAttributes?.pagesLoaded || 1,
        totalPages: facturasPorPagar.paginationAttributes?.totalPages || 1,
        pagesFailed: facturasPorPagar.paginationAttributes?.pagesFailed || 0,
        limited: !!limitPages
      };
      
      addDebugInfo(`🛒 Facturas por pagar obtenidas`, 'info', stats);
      
      // Adaptar cuentas por pagar
      const cuentasAdaptadas = chipaxAdapter.adaptCuentasPorPagar(facturasPorPagar);
      safeCallback(onUpdateCuentasPorPagar, cuentasAdaptadas, 'cuentas por pagar');
      
      updateModuleStatus(
        'cuentasPorPagar', 
        'success', 
        `${cuentasAdaptadas.length} cuentas de ${stats.pagesLoaded} páginas`,
        stats
      );
      
    } catch (error) {
      console.error('Error cargando cuentas por pagar:', error);
      updateModuleStatus('cuentasPorPagar', 'error', `Error: ${error.message}`);
      safeCallback(onUpdateCuentasPorPagar, [], 'cuentas por pagar (fallback)');
      throw error;
    }
  };

  const loadFacturasPendientes = async () => {
    try {
      updateModuleStatus('facturasPendientes', 'loading', 'Obteniendo facturas pendientes...');
      
      const facturasPendientes = await chipaxService.Egresos.getFacturasPendientesAprobacion();
      addDebugInfo(`📋 Facturas pendientes obtenidas: ${Array.isArray(facturasPendientes) ? facturasPendientes.length : 'No array'}`);
      
      const facturasAdaptadas = chipaxAdapter.adaptFacturasPendientesAprobacion(facturasPendientes);
      safeCallback(onUpdateFacturasPendientes, facturasAdaptadas, 'facturas pendientes');
      
      updateModuleStatus('facturasPendientes', 'success', `${facturasAdaptadas.length} facturas cargadas`);
      
    } catch (error) {
      console.error('Error cargando facturas pendientes:', error);
      updateModuleStatus('facturasPendientes', 'error', `Error: ${error.message}`);
      safeCallback(onUpdateFacturasPendientes, [], 'facturas pendientes (fallback)');
      throw error;
    }
  };

  const loadFlujoCaja = async () => {
    try {
      updateModuleStatus('flujoCaja', 'loading', 'Obteniendo flujo de caja...');
      
      const flujoCaja = await chipaxService.Reportes.getFlujoCaja();
      addDebugInfo(`💰 Flujo de caja obtenido`, 'info', {
        hasData: !!flujoCaja,
        structure: Object.keys(flujoCaja || {})
      });
      
      const flujoAdaptado = chipaxAdapter.adaptFlujoCaja(flujoCaja, saldoInicial);
      safeCallback(onUpdateFlujoCaja, flujoAdaptado, 'flujo de caja');
      
      updateModuleStatus('flujoCaja', 'success', `${flujoAdaptado.periodos ? flujoAdaptado.periodos.length : 0} periodos cargados`);
      
    } catch (error) {
      console.error('Error cargando flujo de caja:', error);
      updateModuleStatus('flujoCaja', 'error', `Error: ${error.message}`);
      const emptyFlujoCaja = { saldoInicial, saldoFinal: saldoInicial, periodos: [] };
      safeCallback(onUpdateFlujoCaja, emptyFlujoCaja, 'flujo de caja (fallback)');
      throw error;
    }
  };

  const loadClientes = async () => {
    try {
      updateModuleStatus('clientes', 'loading', 'Obteniendo clientes con paginación...');
      
      const limitPages = loadModes[loadMode].pages;
      const clientes = await chipaxService.Ajustes.getClientes(limitPages);
      
      // Estadísticas de paginación
      const stats = {
        totalItems: clientes.items?.length || 0,
        pagesLoaded: clientes.paginationAttributes?.pagesLoaded || 1,
        totalPages: clientes.paginationAttributes?.totalPages || 1,
        pagesFailed: clientes.paginationAttributes?.pagesFailed || 0,
        limited: !!limitPages
      };
      
      addDebugInfo(`👥 Clientes obtenidos`, 'info', stats);
      
      const clientesData = clientes.items || clientes || [];
      safeCallback(onUpdateClientes, clientesData, 'clientes');
      
      updateModuleStatus(
        'clientes', 
        'success', 
        `${clientesData.length} clientes de ${stats.pagesLoaded} páginas`,
        stats
      );
      
    } catch (error) {
      console.error('Error cargando clientes:', error);
      updateModuleStatus('clientes', 'error', `Error: ${error.message}`);
      safeCallback(onUpdateClientes, [], 'clientes (fallback)');
      throw error;
    }
  };

  const loadEgresosProgramados = async () => {
    try {
      updateModuleStatus('egresosProgramados', 'loading', 'Obteniendo egresos programados...');
      
      const pagosProgramados = await chipaxService.Egresos.getPagosProgramados();
      addDebugInfo(`📅 Egresos programados obtenidos: ${Array.isArray(pagosProgramados) ? pagosProgramados.length : 'No array'}`);
      
      const egresosAdaptados = chipaxAdapter.adaptEgresosProgramados(pagosProgramados);
      safeCallback(onUpdateEgresosProgramados, egresosAdaptados, 'egresos programados');
      
      updateModuleStatus('egresosProgramados', 'success', `${egresosAdaptados.length} egresos cargados`);
      
    } catch (error) {
      console.error('Error cargando egresos programados:', error);
      updateModuleStatus('egresosProgramados', 'error', `Error: ${error.message}`);
      safeCallback(onUpdateEgresosProgramados, [], 'egresos programados (fallback)');
      throw error;
    }
  };

  // =====================================================
  // FUNCIÓN PRINCIPAL DE CARGA
  // =====================================================

  const loadAllChipaxData = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo([]);
    setPaginationStats({});
    
    const startTime = Date.now();
    addDebugInfo(`🚀 Iniciando sincronización completa con Chipax (modo: ${loadModes[loadMode].label})`);
    
    try {
              const loadPromises = [
        loadSaldosBancarios(),
        loadCuentasPendientes(),
        loadCuentasPorPagar(),
        loadFacturasPendientes(),
        loadFlujoCaja(),
        loadClientes(),
        loadEgresosProgramados()
      ];
      
      // Usar Promise.allSettled para que un error no detenga todo
      const results = await Promise.allSettled(loadPromises);
      
      // Contar éxitos y errores
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const errors = results.filter(r => r.status === 'rejected').length;
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Calcular estadísticas totales de paginación
      const totalPaginationStats = Object.values(paginationStats).reduce((acc, stats) => {
        acc.totalItems += stats.totalItems || 0;
        acc.totalPagesLoaded += stats.pagesLoaded || 0;
        acc.totalPagesFailed += stats.pagesFailed || 0;
        return acc;
      }, { totalItems: 0, totalPagesLoaded: 0, totalPagesFailed: 0 });
      
      addDebugInfo(`✅ Sincronización completada en ${duration}ms: ${successes} éxitos, ${errors} errores`);
      addDebugInfo(`📊 Total items obtenidos: ${totalPaginationStats.totalItems} de ${totalPaginationStats.totalPagesLoaded} páginas`);
      
      // Actualizar timestamp de última actualización
      setLastUpdate(new Date());
      
      // Notificar cambio de fuente de datos
      if (onDataSourceChange) {
        onDataSourceChange('chipax');
        addDebugInfo('📡 Fuente de datos actualizada a Chipax');
      }
      
      // Manejar errores parciales
      if (errors > 0 && successes > 0) {
        setError(`Sincronización parcial: ${errors} módulos fallaron`);
      } else if (errors === loadPromises.length) {
        setError('Error completo: No se pudo cargar ningún módulo');
      }
      
    } catch (err) {
      console.error('Error general cargando datos de Chipax:', err);
      setError(`Error al cargar datos: ${err.message}`);
      addDebugInfo(`❌ Error general: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      addDebugInfo('🏁 Proceso de sincronización finalizado');
    }
  };

  // =====================================================
  // FUNCIÓN DE PRUEBA DE CONEXIÓN
  // =====================================================

  const testChipaxConnection = async () => {
    try {
      setLoading(true);
      addDebugInfo('🔧 Probando conexión con Chipax...');
      
      const token = await chipaxService.getChipaxToken();
      addDebugInfo(`✅ Token obtenido: ${token.substring(0, 10)}...`);
      
      alert('✅ Conexión con Chipax establecida correctamente');
      
    } catch (error) {
      console.error('Error en la conexión con Chipax:', error);
      addDebugInfo(`❌ Error de conexión: ${error.message}`, 'error');
      alert(`❌ Error en la conexión con Chipax: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FUNCIONES DE RENDERIZADO
  // =====================================================

  const renderStatus = (status) => {
    const iconSize = 12;
    
    switch (status.status) {
      case 'pending':
        return <span className="text-gray-400 text-xs">Pendiente</span>;
      case 'loading':
        return (
          <span className="text-blue-500 text-xs flex items-center">
            <RefreshCw size={iconSize} className="mr-1 animate-spin" /> 
            Cargando...
          </span>
        );
      case 'success':
        return (
          <span className="text-green-500 text-xs flex items-center">
            <CheckCircle size={iconSize} className="mr-1" /> 
            {status.message}
          </span>
        );
      case 'error':
        return (
          <span className="text-red-500 text-xs flex items-center">
            <AlertTriangle size={iconSize} className="mr-1" /> 
            Error
          </span>
        );
      default:
        return null;
    }
  };

  const renderPaginationStats = () => {
    const stats = Object.entries(paginationStats);
    if (stats.length === 0) return null;
    
    return (
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Estadísticas de Paginación:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map(([module, stat]) => (
            <div key={module} className="bg-blue-50 rounded p-2 border border-blue-100">
              <div className="font-medium text-blue-800 text-xs mb-1 capitalize">
                {module.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
                <div>Items: {stat.totalItems}</div>
                <div>Páginas: {stat.pagesLoaded}/{stat.totalPages}</div>
                {stat.pagesFailed > 0 && (
                  <div className="col-span-2 text-red-600">
                    Fallos: {stat.pagesFailed}
                  </div>
                )}
                {stat.limited && (
                  <div className="col-span-2 text-amber-600">
                    Limitado
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDebugInfo = () => {
    if (debugInfo.length === 0) return null;
    
    return (
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Log de sincronización:</h4>
        <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto text-xs">
          {debugInfo.slice(-15).map((info, index) => (
            <div key={index} className={`mb-1 ${
              info.type === 'error' ? 'text-red-600' : 
              info.type === 'warning' ? 'text-amber-600' :
              info.type === 'success' ? 'text-green-600' : 'text-gray-600'
            }`}>
              <span className="text-gray-400">[{info.timestamp}]</span> {info.message}
              {info.data && (
                <details className="ml-4 mt-1">
                  <summary className="cursor-pointer text-blue-600">Ver datos</summary>
                  <pre className="mt-1 p-1 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(info.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Database size={18} className="mr-2 text-blue-600" /> 
            Integración con Chipax (Paginación Optimizada)
          </h2>
          
          {lastUpdate && (
            <p className="text-sm text-gray-500 flex items-center">
              <Clock size={14} className="mr-1" />
              Última actualización: {lastUpdate.toLocaleString()}
            </p>
          )}
          
          {error && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle size={14} className="mr-1" />
              {error}
            </p>
          )}
        </div>
        
        <div className="flex items-center">
          {/* Selector de modo de carga */}
          <div className="mr-4">
            <select
              value={loadMode}
              onChange={(e) => setLoadMode(e.target.value)}
              disabled={loading}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {Object.entries(loadModes).map(([key, mode]) => (
                <option key={key} value={key}>
                  {mode.label} - {mode.desc}
                </option>
              ))}
            </select>
          </div>
          
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
                {loadModes[loadMode].icon}
                <span className="ml-2">Sincronizar ({loadModes[loadMode].label})</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Panel expandible con detalles */}
      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Estado de la sincronización por módulo:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Saldos Bancarios</span>
              {renderStatus(updateStatus.saldos)}
            </div>
            
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Cuentas por Cobrar</span>
              {renderStatus(updateStatus.cuentasPendientes)}
            </div>
            
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Cuentas por Pagar</span>
              {renderStatus(updateStatus.cuentasPorPagar)}
            </div>
            
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Facturas Pendientes</span>
              {renderStatus(updateStatus.facturasPendientes)}
            </div>
            
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Flujo de Caja</span>
              {renderStatus(updateStatus.flujoCaja)}
            </div>
            
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Clientes</span>
              {renderStatus(updateStatus.clientes)}
            </div>
            
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Egresos Programados</span>
              {renderStatus(updateStatus.egresosProgramados)}
            </div>
          </div>
          
          {/* Información del modo de carga actual */}
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center mb-2">
              <Info size={16} className="text-blue-600 mr-2" />
              <span className="font-medium text-blue-800">Modo de Carga: {loadModes[loadMode].label}</span>
            </div>
            <p className="text-blue-700 text-sm">{loadModes[loadMode].desc}</p>
            {loadModes[loadMode].pages && (
              <p className="text-blue-600 text-xs mt-1">
                Límite: {loadModes[loadMode].pages} páginas por endpoint
              </p>
            )}
          </div>
          
          {/* Estadísticas de paginación */}
          {renderPaginationStats()}
          
          {/* Información del sistema */}
          <div className="mt-4 text-xs text-gray-500">
            <p>💡 La paginación optimizada carga datos de forma eficiente y configurable.</p>
            <p>🔄 Usa el selector de modo para ajustar la cantidad de datos a cargar.</p>
            <p>🛡️ Sistema robusto que maneja errores parciales sin interrumpir la carga.</p>
          </div>
          
          {/* Log de debugging */}
          {renderDebugInfo()}
        </div>
      )}
    </div>
  );
};

export default ChipaxDataUpdater;
