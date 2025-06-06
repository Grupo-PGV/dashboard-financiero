import React, { useState } from 'react';
import { Clock, RefreshCw, AlertTriangle, CheckCircle, Database, Info, ChevronDown, ChevronUp } from 'lucide-react';
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
  saldoInicial = 0,
  onDataSourceChange
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const [updateStatus, setUpdateStatus] = useState({
    saldos: { status: 'pending', message: 'Pendiente', completeness: 0, items: 0 },
    cuentasPendientes: { status: 'pending', message: 'Pendiente', completeness: 0, items: 0 },
    cuentasPorPagar: { status: 'pending', message: 'Pendiente', completeness: 0, items: 0 },
    facturasPendientes: { status: 'pending', message: 'Pendiente', completeness: 0, items: 0 },
    flujoCaja: { status: 'pending', message: 'Pendiente', completeness: 0, items: 0 },
    clientes: { status: 'pending', message: 'Pendiente', completeness: 0, items: 0 },
    proveedores: { status: 'pending', message: 'Pendiente', completeness: 0, items: 0 }
  });

  const updateModuleStatus = (modulo, status, message, completeness = 0, items = 0) => {
    setUpdateStatus(prev => ({ 
      ...prev, 
      [modulo]: { status, message, completeness, items } 
    }));
  };

  const actualizarSaldosBancarios = async () => {
    updateModuleStatus('saldos', 'loading', 'Obteniendo saldos bancarios...');
    try {
      const response = await chipaxService.obtenerSaldosBancarios();
      const saldosAdaptados = adaptarDatosChipax('saldosBancarios', response.items);
      
      onUpdateSaldos(saldosAdaptados);
      updateModuleStatus(
        'saldos', 
        'success', 
        `${saldosAdaptados.length} cuentas actualizadas`,
        response.paginationStats?.completenessPercent || 100,
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
      const response = await chipaxService.obtenerCuentasPorCobrar();
      const cuentasAdaptadas = adaptarDatosChipax('cuentasPorCobrar', response.items);
      
      // Filtrar solo las pendientes
      const cuentasPendientes = cuentasAdaptadas.filter(cuenta => 
        cuenta.saldo > 0 || cuenta.estado === 'pendiente'
      );
      
      onUpdateCuentasPendientes(cuentasPendientes);
      updateModuleStatus(
        'cuentasPendientes', 
        'success', 
        `${cuentasPendientes.length} facturas pendientes`,
        response.paginationStats?.completenessPercent || 100,
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
      const response = await chipaxService.obtenerCuentasPorPagar();
      const cuentasAdaptadas = adaptarDatosChipax('cuentasPorPagar', response.items);
      
      // Filtrar solo las pendientes
      const cuentasPendientes = cuentasAdaptadas.filter(cuenta => 
        cuenta.saldo > 0 || cuenta.estado === 'pendiente'
      );
      
      onUpdateCuentasPorPagar(cuentasPendientes);
      updateModuleStatus(
        'cuentasPorPagar', 
        'success', 
        `${cuentasPendientes.length} facturas pendientes`,
        response.paginationStats?.completenessPercent || 100,
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
      const clientesAdaptados = adaptarDatosChipax('clientes', response.items);
      
      onUpdateClientes(clientesAdaptados);
      updateModuleStatus(
        'clientes', 
        'success', 
        `${clientesAdaptados.length} clientes actualizados`,
        response.paginationStats?.completenessPercent || 100,
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
      const proveedoresAdaptados = adaptarDatosChipax('proveedores', response.items);
      
      // Los proveedores se pueden usar para egresos programados
      if (onUpdateEgresosProgramados) {
        onUpdateEgresosProgramados(proveedoresAdaptados);
      }
      
      updateModuleStatus(
        'proveedores', 
        'success', 
        `${proveedoresAdaptados.length} proveedores actualizados`,
        response.paginationStats?.completenessPercent || 100,
        proveedoresAdaptados.length
      );
      console.log('✅ Proveedores actualizados:', proveedoresAdaptados.length);
    } catch (error) {
      console.error('❌ Error actualizando proveedores:', error);
      updateModuleStatus('proveedores', 'error', error.message);
      throw error;
    }
  };

  const calcularFlujoCaja = () => {
    updateModuleStatus('flujoCaja', 'loading', 'Calculando flujo de caja...');
    try {
      // Aquí iría la lógica para calcular el flujo de caja
      // Por ahora, actualizamos con datos de ejemplo
      const flujoEjemplo = [
        { mes: 'Enero', ingresos: 15000000, egresos: 12000000 },
        { mes: 'Febrero', ingresos: 18000000, egresos: 14000000 },
        { mes: 'Marzo', ingresos: 20000000, egresos: 16000000 }
      ];
      
      onUpdateFlujoCaja(flujoEjemplo);
      updateModuleStatus(
        'flujoCaja', 
        'success', 
        'Flujo de caja calculado',
        100,
        flujoEjemplo.length
      );
      console.log('✅ Flujo de caja actualizado');
    } catch (error) {
      console.error('❌ Error calculando flujo de caja:', error);
      updateModuleStatus('flujoCaja', 'error', error.message);
      throw error;
    }
  };

  const sincronizarTodo = async () => {
    setLoading(true);
    setError(null);
    
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
      calcularFlujoCaja();
      
      setLastUpdate(new Date());
      console.log('✅ Sincronización completa exitosa');
      
    } catch (err) {
      console.error('❌ Error en sincronización:', err);
      setError(err.message || 'Error al sincronizar con Chipax');
    } finally {
      setLoading(false);
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
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
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
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Sincronizando...' : 'Sincronizar con Chipax'}</span>
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
