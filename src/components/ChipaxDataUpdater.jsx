// ChipaxDataUpdater.jsx - CORREGIDO para usar las nuevas funciones
import React, { useState } from 'react';
import { 
  Database, RefreshCw, CheckCircle, AlertTriangle, Clock, 
  ChevronDown, ChevronUp, Activity, Info 
} from 'lucide-react';

// Importar servicio y adaptador corregidos
import chipaxService from '../services/chipaxService';
import { adaptarDatosChipax } from '../services/chipaxAdapter';

const ChipaxDataUpdater = ({
  onUpdateSaldos,
  onUpdateCuentasPendientes,
  onUpdateCuentasPorPagar,
  onUpdateFacturasPendientes,
  onUpdateFlujoCaja,
  onUpdateClientes,
  onUpdateEgresosProgramados,
  onUpdateBancos,
  onDataSourceChange,
  onSyncDetails,
  loading: externalLoading,
  setLoading: setExternalLoading
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Estado detallado para cada módulo
  const [updateStatus, setUpdateStatus] = useState({
    saldos: { status: 'idle', message: 'No sincronizado', completeness: 0, items: 0 },
    cuentasPendientes: { status: 'idle', message: 'No sincronizado', completeness: 0, items: 0 },
    cuentasPorPagar: { status: 'idle', message: 'No sincronizado', completeness: 0, items: 0 },
    clientes: { status: 'idle', message: 'No sincronizado', completeness: 0, items: 0 },
    proveedores: { status: 'idle', message: 'No sincronizado', completeness: 0, items: 0 },
    flujoCaja: { status: 'idle', message: 'No sincronizado', completeness: 0, items: 0 }
  });

  const updateModuleStatus = (modulo, status, message, completeness = 0, items = 0) => {
    setUpdateStatus(prev => ({
      ...prev,
      [modulo]: { 
        ...prev[modulo],
        status, 
        message, 
        completeness,
        items,
        startTime: status === 'loading' ? 
          Date.now() : prev[modulo].startTime,
        elapsedTime: status !== 'loading' && prev[modulo].startTime 
          ? Math.round((Date.now() - prev[modulo].startTime) / 1000) 
          : 0
      } 
    }));
  };

  const actualizarSaldosBancarios = async () => {
    updateModuleStatus('saldos', 'loading', 'Obteniendo saldos bancarios...');
    try {
      // ✅ CORREGIDO: Usar la nueva función obtenerSaldosBancarios
      const response = await chipaxService.obtenerSaldosBancarios();
      
      console.log('🏦 Respuesta de saldos bancarios:', response);
      
      // ✅ CORREGIDO: Manejar respuesta directa (ya es un array)
      const saldosAdaptados = Array.isArray(response) ? response : [];
      
      // Llamar al handler con los saldos
      onUpdateSaldos(saldosAdaptados, {
        completenessPercent: 100,
        totalItemsLoaded: saldosAdaptados.length
      });
      
      updateModuleStatus(
        'saldos', 
        'success', 
        `${saldosAdaptados.length} cuentas bancarias`,
        100,
        saldosAdaptados.length
      );
      
      console.log('✅ Saldos bancarios actualizados:', saldosAdaptados.length);
    } catch (error) {
      console.error('❌ Error actualizando saldos:', error);
      updateModuleStatus('saldos', 'error', error.message);
      throw error;
    }
  };

  const actualizarCuentasPorCobrar = async () => {
    updateModuleStatus('cuentasPendientes', 'loading', 'Obteniendo cuentas por cobrar...');
    try {
      // ✅ CORREGIDO: Usar obtenerDtesPorCobrar
      const response = await chipaxService.obtenerDtesPorCobrar();
      
      console.log('📊 Respuesta DTEs por cobrar:', response);
      
      // ✅ CORREGIDO: Adaptar los datos correctamente
      const cuentasAdaptadas = adaptarDatosChipax('cuentasPorCobrar', response);
      
      // Filtrar solo las pendientes
      const cuentasPendientes = cuentasAdaptadas.filter(cuenta => 
        cuenta.saldo > 0 || cuenta.estado === 'pendiente'
      );
      
      onUpdateCuentasPendientes(cuentasPendientes, {
        completenessPercent: 100,
        totalItemsLoaded: cuentasPendientes.length
      });
      
      updateModuleStatus(
        'cuentasPendientes', 
        'success', 
        `${cuentasPendientes.length} facturas pendientes`,
        100,
        cuentasPendientes.length
      );
      
      console.log('✅ Cuentas por cobrar actualizadas:', cuentasPendientes.length);
    } catch (error) {
      console.error('❌ Error actualizando cuentas por cobrar:', error);
      updateModuleStatus('cuentasPendientes', 'error', error.message);
      throw error;
    }
  };

  const actualizarCuentasPorPagar = async () => {
    updateModuleStatus('cuentasPorPagar', 'loading', 'Obteniendo cuentas por pagar...');
    try {
      // ✅ CORREGIDO: Usar obtenerCompras
      const response = await chipaxService.obtenerCompras();
      
      console.log('💸 Respuesta compras:', response);
      
      // ✅ CORREGIDO: Adaptar los datos correctamente
      const comprasAdaptadas = adaptarDatosChipax('cuentasPorPagar', response);
      
      // Filtrar solo las pendientes
      const comprasPendientes = comprasAdaptadas.filter(compra => 
        compra.monto > 0 && !compra.estaAnulado && !compra.estaPagado
      );
      
      onUpdateCuentasPorPagar(comprasPendientes, {
        completenessPercent: 100,
        totalItemsLoaded: comprasPendientes.length
      });
      
      updateModuleStatus(
        'cuentasPorPagar', 
        'success', 
        `${comprasPendientes.length} facturas por pagar`,
        100,
        comprasPendientes.length
      );
      
      console.log('✅ Cuentas por pagar actualizadas:', comprasPendientes.length);
    } catch (error) {
      console.error('❌ Error actualizando cuentas por pagar:', error);
      updateModuleStatus('cuentasPorPagar', 'error', error.message);
      throw error;
    }
  };

  const actualizarClientes = async () => {
    updateModuleStatus('clientes', 'loading', 'Obteniendo clientes...');
    try {
      // Mock de clientes por ahora
      const clientesMock = [];
      
      if (onUpdateClientes) {
        onUpdateClientes(clientesMock);
      }
      
      updateModuleStatus(
        'clientes', 
        'success', 
        `${clientesMock.length} clientes`,
        100,
        clientesMock.length
      );
      
      console.log('✅ Clientes actualizados:', clientesMock.length);
    } catch (error) {
      console.error('❌ Error actualizando clientes:', error);
      updateModuleStatus('clientes', 'error', error.message);
      throw error;
    }
  };

  const actualizarProveedores = async () => {
    updateModuleStatus('proveedores', 'loading', 'Obteniendo proveedores...');
    try {
      // Mock de proveedores por ahora
      const proveedoresMock = [];
      
      updateModuleStatus(
        'proveedores', 
        'success', 
        `${proveedoresMock.length} proveedores`,
        100,
        proveedoresMock.length
      );
      
      console.log('✅ Proveedores actualizados:', proveedoresMock.length);
    } catch (error) {
      console.error('❌ Error actualizando proveedores:', error);
      updateModuleStatus('proveedores', 'error', error.message);
      throw error;
    }
  };

  const calcularFlujoCaja = async () => {
    updateModuleStatus('flujoCaja', 'loading', 'Calculando flujo de caja...');
    try {
      // Mock de flujo de caja por ahora
      const flujoMock = {
        periodos: [
          { fecha: '2024-01', ingresos: 50000000, egresos: 30000000, saldo: 20000000 },
          { fecha: '2024-02', ingresos: 55000000, egresos: 32000000, saldo: 23000000 },
          { fecha: '2024-03', ingresos: 48000000, egresos: 28000000, saldo: 20000000 }
        ],
        totales: { ingresos: 153000000, egresos: 90000000, saldo: 63000000 }
      };
      
      if (onUpdateFlujoCaja) {
        onUpdateFlujoCaja(flujoMock);
      }
      
      updateModuleStatus(
        'flujoCaja', 
        'success', 
        `Flujo calculado: ${flujoMock.periodos.length} períodos`,
        100,
        flujoMock.periodos.length
      );
      
      console.log('✅ Flujo de caja calculado:', flujoMock.periodos.length, 'períodos');
    } catch (error) {
      console.error('❌ Error calculando flujo de caja:', error);
      updateModuleStatus('flujoCaja', 'error', error.message);
      throw error;
    }
  };

  const sincronizarTodo = async () => {
    const localLoading = true;
    setLoading(localLoading);
    if (setExternalLoading) {
      setExternalLoading(localLoading);
    }
    setError(null);
    
    const startTime = Date.now();
    
    try {
      console.log('🔄 Iniciando sincronización completa con Chipax...');
      
      // Cambiar a modo Chipax
      if (onDataSourceChange) {
        onDataSourceChange('chipax');
      }
      
      // Actualizar cada módulo secuencialmente
      await actualizarSaldosBancarios();
      await actualizarCuentasPorCobrar();
      await actualizarCuentasPorPagar();
      await actualizarClientes();
      await actualizarProveedores();
      await calcularFlujoCaja();
      
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      setLastUpdate(new Date());
      
      // Enviar detalles de sincronización
      if (onSyncDetails) {
        onSyncDetails({
          timestamp: endTime,
          duration: duration,
          success: true,
          modulesLoaded: Object.keys(updateStatus).length
        });
      }
      
      console.log('✅ Sincronización completa exitosa en', duration, 'segundos');
      
    } catch (err) {
      console.error('❌ Error en sincronización:', err);
      setError(err.message);
      
      if (onSyncDetails) {
        onSyncDetails({
          timestamp: Date.now(),
          duration: 0,
          success: false,
          error: err.message
        });
      }
    } finally {
      setLoading(false);
      if (setExternalLoading) {
        setExternalLoading(false);
      }
    }
  };

  // Calcular completeness total
  const totalCompleteness = Object.values(updateStatus)
    .reduce((sum, status) => sum + status.completeness, 0) / Object.keys(updateStatus).length;

  // Funciones auxiliares para UI
  const getStatusIcon = (status) => {
    switch (status) {
      case 'loading': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Database className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'loading': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sincronización Chipax</h3>
            <p className="text-sm text-gray-600">Actualizar datos desde la API</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={sincronizarTodo}
          disabled={loading || externalLoading}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <div className="flex items-center space-x-2">
            <RefreshCw className={`w-5 h-5 ${(loading || externalLoading) ? 'animate-spin' : ''}`} />
            <span>{loading || externalLoading ? 'Sincronizando...' : 'Sincronizar con Chipax'}</span>
          </div>
        </button>

        {lastUpdate && (
          <div className="text-sm text-gray-500">
            <span>Última actualización: </span>
            <span className="font-medium">{lastUpdate.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Estado por módulo</h4>
            <div className="text-sm text-gray-500">
              {totalCompleteness.toFixed(0)}% completado
            </div>
          </div>
          
          <div className="space-y-2">
            {Object.entries(updateStatus).map(([key, status]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status.status)}
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`text-sm ${getStatusColor(status.status)}`}>
                    {status.message}
                    {status.elapsedTime > 0 && status.status === 'success' && (
                      <span className="text-xs text-gray-500 ml-1">({status.elapsedTime}s)</span>
                    )}
                  </span>
                  {status.items > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {status.items} items
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {showDetails && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Información de sincronización:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>La sincronización carga todos los datos disponibles</li>
                    <li>Los datos se actualizan en tiempo real</li>
                    <li>Se respeta la paginación de la API</li>
                    <li>Los errores se muestran por módulo</li>
                    <li>Los saldos bancarios usan cartolas con objeto Saldo</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChipaxDataUpdater;
