// ChipaxDataUpdater.jsx
import React, { useState } from 'react';
import { Clock, RefreshCw, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import ChipaxDataUpdater from './components/ChipaxDataUpdater';
import chipaxService from './services/chipaxService';
import chipaxAdapter from './services/chipaxAdapter';

/**
 * Componente para actualizar los datos del dashboard desde Chipax
 * @param {Object} props - Propiedades del componente
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
  const [updateStatus, setUpdateStatus] = useState({
    saldos: { status: 'pending', message: 'Pendiente' },
    cuentasPendientes: { status: 'pending', message: 'Pendiente' },
    cuentasPorPagar: { status: 'pending', message: 'Pendiente' },
    facturasPendientes: { status: 'pending', message: 'Pendiente' },
    flujoCaja: { status: 'pending', message: 'Pendiente' },
    clientes: { status: 'pending', message: 'Pendiente' },
    egresosProgramados: { status: 'pending', message: 'Pendiente' }
  });

  /**
   * Actualiza el estado de un módulo específico
   * @param {string} modulo - Nombre del módulo
   * @param {string} status - Estado ('pending', 'loading', 'success', 'error')
   * @param {string} message - Mensaje descriptivo
   */
  const updateModuleStatus = (modulo, status, message) => {
    setUpdateStatus(prevStatus => ({
      ...prevStatus,
      [modulo]: { status, message }
    }));
  };

  /**
   * Carga datos de saldos bancarios
   * @returns {Promise<void>}
   */
  const loadSaldosBancarios = async () => {
    try {
      updateModuleStatus('saldos', 'loading', 'Cargando...');
      
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
      
      updateModuleStatus('saldos', 'success', 'Actualizado');
    } catch (error) {
      console.error('Error cargando saldos bancarios:', error);
      updateModuleStatus('saldos', 'error', `Error: ${error.message}`);
      throw error;
    }
  };

  /**
   * Carga datos de cuentas por cobrar
   * @returns {Promise<void>}
   */
  const loadCuentasPendientes = async () => {
    try {
      updateModuleStatus('cuentasPendientes', 'loading', 'Cargando...');
      
      const facturasPorCobrar = await chipaxService.Ingresos.getFacturasVenta();
      
      // Adaptar y actualizar cuentas pendientes
      const cuentasAdaptadas = chipaxAdapter.adaptCuentasPendientes(facturasPorCobrar);
      if (onUpdateCuentasPendientes) {
        onUpdateCuentasPendientes(cuentasAdaptadas);
      }
      
      updateModuleStatus('cuentasPendientes', 'success', 'Actualizado');
    } catch (error) {
      console.error('Error cargando cuentas por cobrar:', error);
      updateModuleStatus('cuentasPendientes', 'error', `Error: ${error.message}`);
      throw error;
    }
  };

  /**
   * Carga datos de cuentas por pagar
   * @returns {Promise<void>}
   */
  const loadCuentasPorPagar = async () => {
    try {
      updateModuleStatus('cuentasPorPagar', 'loading', 'Cargando...');
      
      const facturasPorPagar = await chipaxService.Egresos.getFacturasCompra();
      
      // Adaptar y actualizar cuentas por pagar
      const cuentasAdaptadas = chipaxAdapter.adaptCuentasPorPagar(facturasPorPagar);
      if (onUpdateCuentasPorPagar) {
        onUpdateCuentasPorPagar(cuentasAdaptadas);
      }
      
      updateModuleStatus('cuentasPorPagar', 'success', 'Actualizado');
    } catch (error) {
      console.error('Error cargando cuentas por pagar:', error);
      updateModuleStatus('cuentasPorPagar', 'error', `Error: ${error.message}`);
      throw error;
    }
  };

  /**
   * Carga datos de facturas pendientes de aprobación
   * @returns {Promise<void>}
   */
  const loadFacturasPendientes = async () => {
    try {
      updateModuleStatus('facturasPendientes', 'loading', 'Cargando...');
      
      const facturasPendientes = await chipaxService.Egresos.getFacturasPendientesAprobacion();
      
      // Adaptar y actualizar facturas pendientes
      const facturasAdaptadas = chipaxAdapter.adaptFacturasPendientesAprobacion(facturasPendientes);
      if (onUpdateFacturasPendientes) {
        onUpdateFacturasPendientes(facturasAdaptadas);
      }
      
      updateModuleStatus('facturasPendientes', 'success', 'Actualizado');
    } catch (error) {
      console.error('Error cargando facturas pendientes:', error);
      updateModuleStatus('facturasPendientes', 'error', `Error: ${error.message}`);
      throw error;
    }
  };

  /**
   * Carga datos de flujo de caja
   * @returns {Promise<void>}
   */
  const loadFlujoCaja = async () => {
    try {
      updateModuleStatus('flujoCaja', 'loading', 'Cargando...');
      
      const flujoCaja = await chipaxService.Reportes.getFlujoCaja();
      
      // Adaptar y actualizar flujo de caja
      const flujoAdaptado = chipaxAdapter.adaptFlujoCaja(flujoCaja, saldoInicial);
      if (onUpdateFlujoCaja) {
        onUpdateFlujoCaja(flujoAdaptado);
      }
      
      updateModuleStatus('flujoCaja', 'success', 'Actualizado');
    } catch (error) {
      console.error('Error cargando flujo de caja:', error);
      updateModuleStatus('flujoCaja', 'error', `Error: ${error.message}`);
      throw error;
    }
  };

  /**
   * Carga datos de clientes
   * @returns {Promise<void>}
   */
  const loadClientes = async () => {
    try {
      updateModuleStatus('clientes', 'loading', 'Cargando...');
      
      const clientes = await chipaxService.Ajustes.getClientes();
      
      if (onUpdateClientes) {
        onUpdateClientes(clientes);
      }
      
      updateModuleStatus('clientes', 'success', 'Actualizado');
    } catch (error) {
      console.error('Error cargando clientes:', error);
      updateModuleStatus('clientes', 'error', `Error: ${error.message}`);
      throw error;
    }
  };

  /**
   * Carga datos de egresos programados
   * @returns {Promise<void>}
   */
  const loadEgresosProgramados = async () => {
    try {
      updateModuleStatus('egresosProgramados', 'loading', 'Cargando...');
      
      // Obtener fechas para filtro
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      
      const formatoFecha = (fecha) => {
        return fecha.toISOString().split('T')[0];
      };
      
      const fechaInicio = formatoFecha(today);
      const fechaFin = formatoFecha(nextMonth);
      
      const pagosProgramados = await chipaxService.Egresos.getPagosProgramados(fechaInicio, fechaFin);
      
      // Adaptar y actualizar egresos programados
      const egresosAdaptados = chipaxAdapter.adaptEgresosProgramados(pagosProgramados);
      if (onUpdateEgresosProgramados) {
        onUpdateEgresosProgramados(egresosAdaptados);
      }
      
      updateModuleStatus('egresosProgramados', 'success', 'Actualizado');
    } catch (error) {
      console.error('Error cargando egresos programados:', error);
      updateModuleStatus('egresosProgramados', 'error', `Error: ${error.message}`);
      throw error;
    }
  };

  /**
   * Carga todos los datos de Chipax
   * @returns {Promise<void>}
   */
  const loadAllChipaxData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Cargar todos los módulos en paralelo
      const loadModules = [
        loadSaldosBancarios(),
        loadCuentasPendientes(),
        loadCuentasPorPagar(),
        loadFacturasPendientes(),
        loadFlujoCaja(),
        loadClientes(),
        loadEgresosProgramados()
      ];
      
      // Esperar a que se completen todas las operaciones
      await Promise.allSettled(loadModules);
      
      // Actualizar timestamp de última actualización
      setLastUpdate(new Date());
      
      // Notificar cambio de fuente de datos
      if (onDataSourceChange) {
        onDataSourceChange('chipax');
      }
    } catch (err) {
      console.error('Error general cargando datos de Chipax:', err);
      setError(`Error al cargar datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renderiza indicador de estado
   * @param {Object} status - Estado del módulo
   * @returns {JSX.Element}
   */
  const renderStatus = (status) => {
    switch (status.status) {
      case 'pending':
        return <span className="text-gray-400 text-xs">Pendiente</span>;
      case 'loading':
        return <span className="text-blue-500 text-xs flex items-center"><RefreshCw size={10} className="mr-1 animate-spin" /> Cargando...</span>;
      case 'success':
        return <span className="text-green-500 text-xs flex items-center"><CheckCircle size={10} className="mr-1" /> Actualizado</span>;
      case 'error':
        return <span className="text-red-500 text-xs flex items-center"><AlertTriangle size={10} className="mr-1" /> {status.message}</span>;
      default:
        return null;
    }
  };

  // Probar la conexión con Chipax
  const testChipaxConnection = async () => {
    try {
      setLoading(true);
      const token = await chipaxService.getChipaxToken();
      console.log('Token obtenido correctamente:', token.substring(0, 10) + '...');
      alert('Conexión con Chipax establecida correctamente');
      setLoading(false);
    } catch (error) {
      console.error('Error en la conexión con Chipax:', error);
      alert('Error en la conexión con Chipax: ' + error.message);
      setLoading(false);
    }
  };

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
            className="bg-gray-200 text-gray-800 mr-2 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
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
          
          <div className="mt-4 text-xs text-gray-500">
            <p>Los datos se obtienen de Chipax a través de su API, utilizando las credenciales proporcionadas.</p>
            <p>Al sincronizar, se actualizan todos los módulos disponibles del dashboard con datos en tiempo real.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChipaxDataUpdater;
