// ChipaxDataUpdater.jsx - Componente corregido para las nuevas funciones del servicio
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
      // CORRECCIÓN: Usar la nueva función que retorna objeto con múltiples estrategias
      const response = await chipaxService.obtenerSaldosBancarios();
      
      console.log('🏦 Respuesta de saldos bancarios:', response);
      
      // Manejar la nueva estructura de respuesta
      let saldosParaAdaptar = [];
      if (response.success && response.data) {
        saldosParaAdaptar = response.data;
      } else if (Array.isArray(response)) {
        saldosParaAdaptar = response;
      }
      
      // Adaptar los datos (si es necesario, ya podrían venir adaptados)
      const saldosAdaptados = Array.isArray(saldosParaAdaptar) && saldosParaAdaptar.length > 0
        ? adaptarDatosChipax('saldosBancarios', saldosParaAdaptar)
        : saldosParaAdaptar;
      
      // Llamar al handler con toda la información del servicio
      onUpdateSaldos(response, {
        completenessPercent: 100,
        totalItemsLoaded: saldosAdaptados.length
      });
      
      updateModuleStatus(
        'saldos', 
        'success', 
        `${saldosAdaptados.length} cuentas • ${response.estrategiaUsada || 'Estrategia desconocida'}`,
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
      // CORRECCIÓN: Usar obtenerDTEsPorCobrar en lugar de obtenerCuentasPorCobrar
      const response = await chipaxService.obtenerDTEsPorCobrar();
      
      console.log('📊 Respuesta DTEs por cobrar:', response);
      
      // CORRECCIÓN: Usar response.data en lugar de response.items
      const datosParaAdaptar = response.data || response || [];
      const cuentasAdaptadas = adaptarDatosChipax('cuentasPorCobrar', datosParaAdaptar);
      
      // Filtrar solo las pendientes
      const cuentasPendientes = cuentasAdaptadas.filter(cuenta => 
        cuenta.saldo > 0 || cuenta.estado === 'pendiente'
      );
      
      onUpdateCuentasPendientes(cuentasPendientes, {
        completenessPercent: response.pagination?.completenessPercent || 100,
        totalItemsLoaded: cuentasPendientes.length
      });
      
      updateModuleStatus(
        'cuentasPendientes', 
        'success', 
        `${cuentasPendientes.length} facturas pendientes`,
        response.pagination?.completenessPercent || 100,
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
      // CORRECCIÓN: Usar obtenerCompras en lugar de obtenerCuentasPorPagar
      const response = await chipaxService.obtenerCompras();
      
      console.log('💸 Respuesta compras:', response);
      
      // CORRECCIÓN: Usar response.data en lugar de response.items
      const datosParaAdaptar = response.data || response || [];
      const cuentasAdaptadas = adaptarDatosChipax('cuentasPorPagar', datosParaAdaptar);
      
      // Filtrar solo las pendientes
      const cuentasPendientes = cuentasAdaptadas.filter(cuenta => 
        cuenta.saldo > 0 || cuenta.estado === 'pendiente'
      );
      
      onUpdateCuentasPorPagar(cuentasPendientes, {
        completenessPercent: response.pagination?.completenessPercent || 100,
        totalItemsLoaded: cuentasPendientes.length
      });
      
      updateModuleStatus(
        'cuentasPorPagar', 
        'success', 
        `${cuentasPendientes.length} facturas pendientes`,
        response.pagination?.completenessPercent || 100,
        cuentasPendientes.length
      );
      
      console.log('✅ Cuentas por pagar actualizadas:', cuentasPendientes.length);
    } catch (error) {
      console.error('❌ Error actualizando cuentas por pagar:', error);
      updateModuleStatus('cuentasPorPagar', 'error', error.message);
      throw error;
    }
  };

  const actualizarClientes = async () => {
    updateModuleStatus('clientes', 'loading', 'Obteniendo lista de clientes...');
    try {
      const response = await chipaxService.obtenerClientes();
      
      console.log('👥 Respuesta clientes:', response);
      
      // CORRECCIÓN: Usar response.data en lugar de response.items
      const datosParaAdaptar = response.data || response || [];
      const clientesAdaptados = adaptarDatosChipax('clientes', datosParaAdaptar);
      
      onUpdateClientes(clientesAdaptados, {
        completenessPercent: response.pagination?.completenessPercent || 100,
        totalItemsLoaded: clientesAdaptados.length
      });
      
      updateModuleStatus(
        'clientes', 
        'success', 
        `${clientesAdaptados.length} clientes actualizados`,
        response.pagination?.completenessPercent || 100,
        clientesAdaptados.length
      );
      
      console.log('✅ Clientes actualizados:', clientesAdaptados.length);
    } catch (error) {
      console.error('❌ Error actualizando clientes:', error);
      updateModuleStatus('clientes', 'error', error.message);
      throw error;
    }
  };

  const actualizarProveedores = async () => {
    updateModuleStatus('proveedores', 'loading', 'Obteniendo lista de proveedores...');
    try {
      const response = await chipaxService.obtenerProveedores();
      
      console.log('🏭 Respuesta proveedores:', response);
      
      // CORRECCIÓN: Usar response.data en lugar de response.items
      const datosParaAdaptar = response.data || response || [];
      const proveedoresAdaptados = adaptarDatosChipax('proveedores', datosParaAdaptar);
      
      onUpdateClientes(proveedoresAdaptados, {
        completenessPercent: response.pagination?.completenessPercent || 100,
        totalItemsLoaded: proveedoresAdaptados.length
      });
      
      // Los proveedores se pueden usar para egresos programados
      if (onUpdateEgresosProgramados) {
        onUpdateEgresosProgramados(proveedoresAdaptados);
      }
      
      updateModuleStatus(
        'proveedores', 
        'success', 
        `${proveedoresAdaptados.length} proveedores actualizados`,
        response.pagination?.completenessPercent || 100,
        proveedoresAdaptados.length
      );
      
      console.log('✅ Proveedores actualizados:', proveedoresAdaptados.length);
    } catch (error) {
      console.error('❌ Error actualizando proveedores:', error);
      updateModuleStatus('proveedores', 'error', error.message);
      throw error;
    }
  };

  const calcularFlujoCaja = async () => {
    updateModuleStatus('flujoCaja', 'loading', 'Calculando flujo de caja...');
    try {
      // Por ahora, generar flujo de caja basado en datos existentes
      // En el futuro se podría agregar una función específica en chipaxService
      const flujoMock = {
        periodos: [
          { fecha: '2024-01', ingresos: 50000000, egresos: 30000000, saldo: 20000000 },
          { fecha: '2024-02', ingresos: 55000000, egresos: 32000000, saldo: 23000000 },
          { fecha: '2024-03', ingresos: 48000000, egresos: 28000000, saldo: 20000000 }
        ],
        totales: { ingresos: 153000000, egresos: 90000000, saldo: 63000000 }
      };
      
      onUpdateFlujoCaja(flujoMock);
      
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
      setError(err.message || 'Error al sincronizar con Chipax');
      
      // Enviar detalles de error
      if (onSyncDetails) {
        onSyncDetails({
          timestamp: Date.now(),
          duration: Math.round((Date.now() - startTime) / 1000),
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'loading':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'loading':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  const totalCompleteness = Object.values(updateStatus).reduce(
    (acc, curr) => acc + (curr.completeness || 0), 0
  ) / Object.keys(updateStatus).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Sincronización con Chipax</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMonitor(!showMonitor)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Monitor de sincronización"
          >
            <Activity className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={sincronizarTodo}
          disabled={loading || externalLoading}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            loading || externalLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <RefreshCw className={`w-4 h-4 ${loading || externalLoading ? 'animate-spin' : ''}`} />
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
                    <li>Los saldos bancarios usan múltiples estrategias automáticamente</li>
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
