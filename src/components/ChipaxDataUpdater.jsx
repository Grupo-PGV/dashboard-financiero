// ChipaxDataUpdater.jsx - Versión corregida con manejo robusto de errores
import React, { useState } from 'react';
import { Clock, RefreshCw, AlertTriangle, CheckCircle, Database, AlertCircle } from 'lucide-react';
import chipaxService from '../services/chipaxService';
import chipaxAdapter from '../services/chipaxAdapter';

/**
 * Componente para actualizar los datos del dashboard desde Chipax
 * Versión mejorada con manejo robusto de errores y debugging
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
  const [updateStatus, setUpdateStatus] = useState({
    saldos: { status: 'pending', message: 'Pendiente' },
    cuentasPendientes: { status: 'pending', message: 'Pendiente' },
    cuentasPorPagar: { status: 'pending', message: 'Pendiente' },
    facturasPendientes: { status: 'pending', message: 'Pendiente' },
    flujoCaja: { status: 'pending', message: 'Pendiente' },
    clientes: { status: 'pending', message: 'Pendiente' },
    egresosProgramados: { status: 'pending', message: 'Pendiente' }
  });

  // =====================================================
  // FUNCIONES DE UTILIDAD
  // =====================================================

  const addDebugInfo = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev, { timestamp, message, type }]);
    console.log(`🔍 [${timestamp}] ${message}`);
  };

  const updateModuleStatus = (modulo, status, message, data = null) => {
    setUpdateStatus(prev => ({
      ...prev,
      [modulo]: { status, message, data }
    }));
    
    const emoji = status === 'loading' ? '⏳' : 
                 status === 'success' ? '✅' : 
                 status === 'error' ? '❌' : '⏸️';
    
    addDebugInfo(`${emoji} ${modulo}: ${message}`, status);
  };

  const safeCallback = (callback, data, moduleName) => {
    try {
      if (callback && typeof callback === 'function') {
        callback(data);
        addDebugInfo(`Callback ejecutado para ${moduleName}: ${Array.isArray(data) ? data.length : typeof data} items`, 'success');
      } else {
        addDebugInfo(`No hay callback definido para ${moduleName}`, 'warning');
      }
    } catch (error) {
      addDebugInfo(`Error ejecutando callback para ${moduleName}: ${error.message}`, 'error');
      console.error(`Error en callback de ${moduleName}:`, error);
    }
  };

  // =====================================================
  // FUNCIONES DE CARGA DE DATOS
  // =====================================================

  const loadSaldosBancarios = async () => {
    try {
      updateModuleStatus('saldos', 'loading', 'Obteniendo saldos bancarios...');
      
      const saldosBancarios = await chipaxService.Banco.getSaldosBancarios();
      addDebugInfo(`Datos recibidos de saldos: ${JSON.stringify(saldosBancarios).substring(0, 100)}...`);
      
      // Adaptar saldos
      const saldosAdaptados = chipaxAdapter.adaptSaldosBancarios(saldosBancarios);
      addDebugInfo(`Saldos adaptados: ${saldosAdaptados.length} cuentas`);
      
      // Ejecutar callback de saldos
      safeCallback(onUpdateSaldos, saldosAdaptados, 'saldos');
      
      // Adaptar y actualizar bancos
      const bancosAdaptados = chipaxAdapter.adaptBancos(saldosBancarios);
      addDebugInfo(`Bancos adaptados: ${bancosAdaptados.length} bancos`);
      
      // Ejecutar callback de bancos
      safeCallback(onUpdateBancos, bancosAdaptados, 'bancos');
      
      updateModuleStatus('saldos', 'success', `${saldosAdaptados.length} cuentas cargadas`, saldosAdaptados);
      
    } catch (error) {
      console.error('Error cargando saldos bancarios:', error);
      updateModuleStatus('saldos', 'error', `Error: ${error.message}`);
      
      // En caso de error, enviar arrays vacíos para evitar crashes
      safeCallback(onUpdateSaldos, [], 'saldos (fallback)');
      safeCallback(onUpdateBancos, [], 'bancos (fallback)');
      
      throw error;
    }
  };

  const loadCuentasPendientes = async () => {
    try {
      updateModuleStatus('cuentasPendientes', 'loading', 'Obteniendo cuentas por cobrar...');
      
      const facturasPorCobrar = await chipaxService.Ingresos.getFacturasVenta();
      addDebugInfo(`Facturas por cobrar recibidas: ${facturasPorCobrar.items ? facturasPorCobrar.items.length : 'No items'}`);
      
      // Adaptar cuentas pendientes
      const cuentasAdaptadas = chipaxAdapter.adaptCuentasPendientes(facturasPorCobrar);
      addDebugInfo(`Cuentas por cobrar adaptadas: ${cuentasAdaptadas.length} cuentas`);
      
      // Ejecutar callback
      safeCallback(onUpdateCuentasPendientes, cuentasAdaptadas, 'cuentas pendientes');
      
      updateModuleStatus('cuentasPendientes', 'success', `${cuentasAdaptadas.length} cuentas cargadas`, cuentasAdaptadas);
      
    } catch (error) {
      console.error('Error cargando cuentas por cobrar:', error);
      updateModuleStatus('cuentasPendientes', 'error', `Error: ${error.message}`);
      
      // Fallback
      safeCallback(onUpdateCuentasPendientes, [], 'cuentas pendientes (fallback)');
      throw error;
    }
  };

  const loadCuentasPorPagar = async () => {
    try {
      updateModuleStatus('cuentasPorPagar', 'loading', 'Obteniendo cuentas por pagar...');
      
      const facturasPorPagar = await chipaxService.Egresos.getFacturasCompra();
      addDebugInfo(`Facturas por pagar recibidas: ${facturasPorPagar.items ? facturasPorPagar.items.length : 'No items'}`);
      
      // Adaptar cuentas por pagar
      const cuentasAdaptadas = chipaxAdapter.adaptCuentasPorPagar(facturasPorPagar);
      addDebugInfo(`Cuentas por pagar adaptadas: ${cuentasAdaptadas.length} cuentas`);
      
      // Ejecutar callback
      safeCallback(onUpdateCuentasPorPagar, cuentasAdaptadas, 'cuentas por pagar');
      
      updateModuleStatus('cuentasPorPagar', 'success', `${cuentasAdaptadas.length} cuentas cargadas`, cuentasAdaptadas);
      
    } catch (error) {
      console.error('Error cargando cuentas por pagar:', error);
      updateModuleStatus('cuentasPorPagar', 'error', `Error: ${error.message}`);
      
      // Fallback
      safeCallback(onUpdateCuentasPorPagar, [], 'cuentas por pagar (fallback)');
      throw error;
    }
  };

  const loadFacturasPendientes = async () => {
    try {
      updateModuleStatus('facturasPendientes', 'loading', 'Obteniendo facturas pendientes...');
      
      const facturasPendientes = await chipaxService.Egresos.getFacturasPendientesAprobacion();
      addDebugInfo(`Facturas pendientes recibidas: ${Array.isArray(facturasPendientes) ? facturasPendientes.length : 'No array'}`);
      
      // Adaptar facturas pendientes
      const facturasAdaptadas = chipaxAdapter.adaptFacturasPendientesAprobacion(facturasPendientes);
      addDebugInfo(`Facturas pendientes adaptadas: ${facturasAdaptadas.length} facturas`);
      
      // Ejecutar callback
      safeCallback(onUpdateFacturasPendientes, facturasAdaptadas, 'facturas pendientes');
      
      updateModuleStatus('facturasPendientes', 'success', `${facturasAdaptadas.length} facturas cargadas`, facturasAdaptadas);
      
    } catch (error) {
      console.error('Error cargando facturas pendientes:', error);
      updateModuleStatus('facturasPendientes', 'error', `Error: ${error.message}`);
      
      // Fallback
      safeCallback(onUpdateFacturasPendientes, [], 'facturas pendientes (fallback)');
      throw error;
    }
  };

  const loadFlujoCaja = async () => {
    try {
      updateModuleStatus('flujoCaja', 'loading', 'Obteniendo flujo de caja...');
      
      const flujoCaja = await chipaxService.Reportes.getFlujoCaja();
      addDebugInfo(`Flujo de caja recibido: ${JSON.stringify(flujoCaja).substring(0, 100)}...`);
      
      // Adaptar flujo de caja
      const flujoAdaptado = chipaxAdapter.adaptFlujoCaja(flujoCaja, saldoInicial);
      addDebugInfo(`Flujo de caja adaptado: ${flujoAdaptado.periodos ? flujoAdaptado.periodos.length : 0} periodos`);
      
      // Ejecutar callback
      safeCallback(onUpdateFlujoCaja, flujoAdaptado, 'flujo de caja');
      
      updateModuleStatus('flujoCaja', 'success', `${flujoAdaptado.periodos ? flujoAdaptado.periodos.length : 0} periodos cargados`, flujoAdaptado);
      
    } catch (error) {
      console.error('Error cargando flujo de caja:', error);
      updateModuleStatus('flujoCaja', 'error', `Error: ${error.message}`);
      
      // Fallback
      const emptyFlujoCaja = { saldoInicial, saldoFinal: saldoInicial, periodos: [] };
      safeCallback(onUpdateFlujoCaja, emptyFlujoCaja, 'flujo de caja (fallback)');
      throw error;
    }
  };

  const loadClientes = async () => {
    try {
      updateModuleStatus('clientes', 'loading', 'Obteniendo clientes...');
      
      const clientes = await chipaxService.Ajustes.getClientes();
      addDebugInfo(`Clientes recibidos: ${clientes.items ? clientes.items.length : 'No items'}`);
      
      // Los clientes no necesitan adaptación especial por ahora
      const clientesData = clientes.items || clientes || [];
      
      // Ejecutar callback
      safeCallback(onUpdateClientes, clientesData, 'clientes');
      
      updateModuleStatus('clientes', 'success', `${clientesData.length} clientes cargados`, clientesData);
      
    } catch (error) {
      console.error('Error cargando clientes:', error);
      updateModuleStatus('clientes', 'error', `Error: ${error.message}`);
      
      // Fallback
      safeCallback(onUpdateClientes, [], 'clientes (fallback)');
      throw error;
    }
  };

  const loadEgresosProgramados = async () => {
    try {
      updateModuleStatus('egresosProgramados', 'loading', 'Obteniendo egresos programados...');
      
      const pagosProgramados = await chipaxService.Egresos.getPagosProgramados();
      addDebugInfo(`Egresos programados recibidos: ${Array.isArray(pagosProgramados) ? pagosProgramados.length : 'No array'}`);
      
      // Adaptar egresos programados
      const egresosAdaptados = chipaxAdapter.adaptEgresosProgramados(pagosProgramados);
      addDebugInfo(`Egresos adaptados: ${egresosAdaptados.length} egresos`);
      
      // Ejecutar callback
      safeCallback(onUpdateEgresosProgramados, egresosAdaptados, 'egresos programados');
      
      updateModuleStatus('egresosProgramados', 'success', `${egresosAdaptados.length} egresos cargados`, egresosAdaptados);
      
    } catch (error) {
      console.error('Error cargando egresos programados:', error);
      updateModuleStatus('egresosProgramados', 'error', `Error: ${error.message}`);
      
      // Fallback
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
    
    addDebugInfo('🚀 Iniciando sincronización completa con Chipax');
    
    try {
      // Ejecutar todas las cargas de datos
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
      
      addDebugInfo(`✅ Sincronización completada: ${successes} éxitos, ${errors} errores`);
      
      // Actualizar timestamp de última actualización
      setLastUpdate(new Date());
      
      // Notificar cambio de fuente de datos
      if (onDataSourceChange) {
        onDataSourceChange('chipax');
        addDebugInfo('📡 Fuente de datos actualizada a Chipax');
      }
      
      // Si hubo errores pero algunos módulos funcionaron, mostrar warning
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

  const renderDebugInfo = () => {
    if (debugInfo.length === 0) return null;
    
    return (
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Log de sincronización:</h4>
        <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto text-xs">
          {debugInfo.slice(-10).map((info, index) => (
            <div key={index} className={`mb-1 ${
              info.type === 'error' ? 'text-red-600' : 
              info.type === 'warning' ? 'text-amber-600' :
              info.type === 'success' ? 'text-green-600' : 'text-gray-600'
            }`}>
              <span className="text-gray-400">[{info.timestamp}]</span> {info.message}
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
            Integración con Chipax
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
          
          {/* Información del sistema */}
          <div className="mt-4 text-xs text-gray-500">
            <p>💡 Los datos se obtienen de Chipax a través de su API oficial.</p>
            <p>🔄 La sincronización actualiza todos los módulos disponibles con datos en tiempo real.</p>
            <p>🛡️ Sistema con manejo robusto de errores para evitar interrupciones.</p>
          </div>
          
          {/* Log de debugging */}
          {renderDebugInfo()}
        </div>
      )}
    </div>
  );
};

export default ChipaxDataUpdater;
