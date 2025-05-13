// ChipaxDataUpdater.jsx
import React, { useState } from 'react';
import { Clock, RefreshCw, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import chipaxService from '../services/chipaxService';
import chipaxAdapter from '../services/chipaxAdapter';

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
  const [updateStatus, setUpdateStatus] = useState({
    saldos: { status: 'pending', message: 'Pendiente' },
    cuentasPendientes: { status: 'pending', message: 'Pendiente' },
    cuentasPorPagar: { status: 'pending', message: 'Pendiente' },
    facturasPendientes: { status: 'pending', message: 'Pendiente' },
    flujoCaja: { status: 'pending', message: 'Pendiente' },
    clientes: { status: 'pending', message: 'Pendiente' },
    egresosProgramados: { status: 'pending', message: 'Pendiente' }
  });

  const updateModuleStatus = (modulo, status, message) => {
    setUpdateStatus(prev => ({ ...prev, [modulo]: { status, message } }));
  };

  const loadAllChipaxData = async () => {
    setLoading(true);
    setError(null);
    const fechaInicio = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    const fechaFin = new Date().toISOString().split('T')[0];

    try {
      const data = await chipaxService.fetchAllChipaxData(fechaInicio, fechaFin);

      const saldos = chipaxAdapter.adaptSaldosBancarios(data.saldosBancarios);
      onUpdateSaldos?.(saldos);
      onUpdateBancos?.(chipaxAdapter.adaptBancos(data.saldosBancarios));
      updateModuleStatus('saldos', 'success', 'Actualizado');

      onUpdateCuentasPendientes?.(chipaxAdapter.adaptCuentasPendientes(data.facturasPorCobrar));
      updateModuleStatus('cuentasPendientes', 'success', 'Actualizado');

      onUpdateCuentasPorPagar?.(chipaxAdapter.adaptCuentasPorPagar(data.facturasPorPagar));
      updateModuleStatus('cuentasPorPagar', 'success', 'Actualizado');

      onUpdateFacturasPendientes?.(chipaxAdapter.adaptFacturasPendientesAprobacion(data.facturasPendientes));
      updateModuleStatus('facturasPendientes', 'success', 'Actualizado');

      onUpdateFlujoCaja?.(chipaxAdapter.adaptFlujoCaja(data.flujoCaja, saldoInicial));
      updateModuleStatus('flujoCaja', 'success', 'Actualizado');

      onUpdateClientes?.(data.clientes);
      updateModuleStatus('clientes', 'success', 'Actualizado');

      onUpdateEgresosProgramados?.(chipaxAdapter.adaptEgresosProgramados(data.pagosProgramados));
      updateModuleStatus('egresosProgramados', 'success', 'Actualizado');

      setLastUpdate(new Date());
      onDataSourceChange?.('chipax');
    } catch (err) {
      setError(err.message);
      Object.keys(updateStatus).forEach(k => updateModuleStatus(k, 'error', err.message));
    } finally {
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

        <button 
          className={`bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={loadAllChipaxData}
          disabled={loading}
        >
          {loading ? <><RefreshCw size={16} className="mr-2 animate-spin" />Sincronizando...</> : <><RefreshCw size={16} className="mr-2" />Sincronizar con Chipax</>}
        </button>
      </div>
    </div>
  );
};

export default ChipaxDataUpdater;
