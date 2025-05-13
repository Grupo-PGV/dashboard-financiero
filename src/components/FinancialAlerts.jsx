// FinancialAlerts.jsx
import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Calendar, DollarSign, TrendingDown, Settings, X, Plus, Save } from 'lucide-react';

/**
 * Componente para mostrar y gestionar alertas financieras
 * 
 * @param {Object} props
 * @param {Array} props.cuentasPendientes - Cuentas por cobrar
 * @param {Array} props.cuentasPorPagar - Cuentas por pagar
 * @param {Array} props.facturasPendientes - Facturas pendientes de aprobación
 * @param {Array} props.saldosBancarios - Saldos bancarios
 * @param {Array} props.egresosProgramados - Egresos programados
 * @param {Object} props.flujoCaja - Datos de flujo de caja
 * @param {Function} props.onCreateAlert - Función al crear una alerta
 * @param {Function} props.onDeleteAlert - Función al eliminar una alerta
 */
const FinancialAlerts = ({ 
  cuentasPendientes = [],
  cuentasPorPagar = [],
  facturasPendientes = [],
  saldosBancarios = [],
  egresosProgramados = [],
  flujoCaja = {},
  onCreateAlert,
  onDeleteAlert
}) => {
  // Estado para alertas generadas automáticamente y configuradas
  const [autoAlerts, setAutoAlerts] = useState([]);
  const [configuredAlerts, setConfiguredAlerts] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'balance',
    condition: 'less_than',
    value: 1000000,
    enabled: true
  });

  // Formatear moneda
  const formatCurrency = (amount, currency = 'CLP') => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2
    }).format(amount);
  };

  // Generar alertas automáticamente basadas en los datos
  useEffect(() => {
    const alerts = [];

    // Alertas para cuentas por cobrar vencidas
    const cuentasVencidas = cuentasPendientes.filter(cuenta => {
      if (!cuenta.fechaVencimiento) return false;
      const fechaVencimiento = new Date(cuenta.fechaVencimiento);
      return fechaVencimiento < new Date();
    });

    if (cuentasVencidas.length > 0) {
      alerts.push({
        id: 'auto-cxc-vencidas',
        type: 'accounts_receivable',
        icon: <Calendar className="text-red-500" size={16} />,
        title: 'Cuentas por cobrar vencidas',
        description: `Tienes ${cuentasVencidas.length} facturas vencidas por un total de ${
          formatCurrency(cuentasVencidas.reduce((sum, cuenta) => sum + cuenta.saldo, 0))
        }`,
        severity: 'high',
        timestamp: new Date(),
        data: cuentasVencidas
      });
    }

    // Alertas para facturas pendientes de aprobación
    const facturasPendientesUrgentes = facturasPendientes.filter(
      factura => factura.diasEnEspera > 5
    );

    if (facturasPendientesUrgentes.length > 0) {
      alerts.push({
        id: 'auto-facturas-urgentes',
        type: 'pending_invoices',
        icon: <AlertTriangle className="text-amber-500" size={16} />,
        title: 'Facturas pendientes de aprobación urgentes',
        description: `Tienes ${facturasPendientesUrgentes.length} facturas con más de 5 días en espera`,
        severity: 'medium',
        timestamp: new Date(),
        data: facturasPendientesUrgentes
      });
    }

    // Alertas para saldos bancarios bajos
    const saldosBajos = saldosBancarios.filter(cuenta => cuenta.saldo < 500000);

    if (saldosBajos.length > 0) {
      alerts.push({
        id: 'auto-saldos-bajos',
        type: 'bank_balance',
        icon: <DollarSign className="text-red-500" size={16} />,
        title: 'Saldos bancarios bajos',
        description: `Tienes ${saldosBajos.length} cuentas con saldo inferior a ${formatCurrency(500000)}`,
        severity: 'high',
        timestamp: new Date(),
        data: saldosBajos
      });
    }

    // Alertas para flujo de caja negativo
    const periodos = flujoCaja?.periodos || [];
    const periodosNegativos = periodos.filter(periodo => periodo.flujoNeto < 0);

    if (periodosNegativos.length > 0) {
      alerts.push({
        id: 'auto-flujo-negativo',
        type: 'cash_flow',
        icon: <TrendingDown className="text-amber-500" size={16} />,
        title: 'Períodos con flujo de caja negativo',
        description: `Tienes ${periodosNegativos.length} períodos con flujo de caja negativo`,
        severity: 'medium',
        timestamp: new Date(),
        data: periodosNegativos
      });
    }

    // Actualizar alertas automáticas
    setAutoAlerts(alerts);
  }, [cuentasPendientes, cuentasPorPagar, facturasPendientes, saldosBancarios, egresosProgramados, flujoCaja]);

  // Obtener el ícono según el tipo de alerta
  const getAlertIcon = (type, severity) => {
    const color = severity === 'high' ? 'text-red-500' : 
                 severity === 'medium' ? 'text-amber-500' : 
                 'text-blue-500';

    switch (type) {
      case 'accounts_receivable':
        return <Calendar className={color} size={16} />;
      case 'accounts_payable':
        return <Calendar className={color} size={16} />;
      case 'cash_flow':
        return <TrendingDown className={color} size={16} />;
      case 'bank_balance':
        return <DollarSign className={color} size={16} />;
      case 'pending_invoices':
        return <AlertTriangle className={color} size={16} />;
      default:
        return <Bell className={color} size={16} />;
    }
  };

  // Obtener la clase de color según la severidad
  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-amber-500 bg-amber-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  // Manejar la creación de una nueva alerta personalizada
  const handleCreateAlert = () => {
    // Generar ID único
    const id = `config-${Date.now()}`;
    
    // Crear objeto de alerta
    const alertObj = {
      id,
      type: newAlert.type,
      condition: newAlert.condition,
      value: Number(newAlert.value),
      enabled: newAlert.enabled,
      timestamp: new Date()
    };
    
    // Personalizar título y descripción según tipo y condición
    let title = '';
    let description = '';
    let severity = 'medium';
    
    switch (newAlert.type) {
      case 'balance':
        title = 'Alerta de saldo bancario';
        description = `Alerta cuando el saldo sea ${
          newAlert.condition === 'less_than' ? 'menor que' : 'mayor que'
        } ${formatCurrency(newAlert.value)}`;
        severity = newAlert.condition === 'less_than' ? 'high' : 'low';
        break;
      case 'cash_flow':
        title = 'Alerta de flujo de caja';
        description = `Alerta cuando el flujo neto sea ${
          newAlert.condition === 'less_than' ? 'menor que' : 'mayor que'
        } ${formatCurrency(newAlert.value)}`;
        severity = newAlert.condition === 'less_than' ? 'medium' : 'low';
        break;
      case 'accounts_receivable':
        title = 'Alerta de cuentas por cobrar';
        description = `Alerta cuando el total a cobrar sea ${
          newAlert.condition === 'greater_than' ? 'mayor que' : 'menor que'
        } ${formatCurrency(newAlert.value)}`;
        severity = newAlert.condition === 'greater_than' ? 'medium' : 'low';
        break;
      case 'accounts_payable':
        title = 'Alerta de cuentas por pagar';
        description = `Alerta cuando el total a pagar sea ${
          newAlert.condition === 'greater_than' ? 'mayor que' : 'menor que'
        } ${formatCurrency(newAlert.value)}`;
        severity = newAlert.condition === 'greater_than' ? 'high' : 'medium';
        break;
    }
    
    alertObj.title = title;
    alertObj.description = description;
    alertObj.severity = severity;
    alertObj.icon = getAlertIcon(newAlert.type, severity);
    
    // Agregar a la lista de alertas configuradas
    setConfiguredAlerts([...configuredAlerts, alertObj]);
    
    // Limpiar formulario
    setNewAlert({
      type: 'balance',
      condition: 'less_than',
      value: 1000000,
      enabled: true
    });
    
    // Notificar al componente padre si existe el callback
    if (onCreateAlert) {
      onCreateAlert(alertObj);
    }
  };

  // Manejar la eliminación de una alerta
  const handleDeleteAlert = (id) => {
    const updatedAlerts = configuredAlerts.filter(alert => alert.id !== id);
    setConfiguredAlerts(updatedAlerts);
    
    // Notificar al componente padre si existe el callback
    if (onDeleteAlert) {
      onDeleteAlert(id);
    }
  };

  // Manejar el cambio de estado de una alerta
  const handleToggleAlert = (id) => {
    const updatedAlerts = configuredAlerts.map(alert => {
      if (alert.id === id) {
        return { ...alert, enabled: !alert.enabled };
      }
      return alert;
    });
    setConfiguredAlerts(updatedAlerts);
  };

  // Todas las alertas combinadas
  const allAlerts = [...autoAlerts, ...configuredAlerts.filter(a => a.enabled)];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bell size={20} className="mr-2 text-blue-600" />
            Alertas Financieras
          </h2>
          <p className="text-sm text-gray-500">
            {allAlerts.length} alertas activas
          </p>
        </div>
        
        <div>
          <button
            className="flex items-center text-sm py-1 px-3 border border-gray-300 rounded hover:bg-gray-50"
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings size={16} className="mr-1" />
            Configurar
          </button>
        </div>
      </div>
      
      {/* Panel de configuración */}
      {showConfig && (
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Configurar Alertas</h3>
          
          <div className="bg-white border border-gray-200 rounded p-3 mb-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tipo de alerta</label>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({...newAlert, type: e.target.value})}
                >
                  <option value="balance">Saldo bancario</option>
                  <option value="cash_flow">Flujo de caja</option>
                  <option value="accounts_receivable">Cuentas por cobrar</option>
                  <option value="accounts_payable">Cuentas por pagar</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Condición</label>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  value={newAlert.condition}
                  onChange={(e) => setNewAlert({...newAlert, condition: e.target.value})}
                >
                  <option value="less_than">Menor que</option>
                  <option value="greater_than">Mayor que</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Valor</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  value={newAlert.value}
                  onChange={(e) => setNewAlert({...newAlert, value: e.target.value})}
                />
              </div>
              
              <div className="flex items-end">
                <button
                  className="flex items-center text-sm py-1 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 w-full justify-center"
                  onClick={handleCreateAlert}
                >
                  <Plus size={16} className="mr-1" />
                  Crear Alerta
                </button>
              </div>
            </div>
          </div>
          
          {/* Lista de alertas configuradas */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Alertas personalizadas
            </h4>
            
            {configuredAlerts.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hay alertas personalizadas configuradas</p>
            ) : (
              configuredAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between bg-white border border-gray-200 rounded p-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={alert.enabled}
                      onChange={() => handleToggleAlert(alert.id)}
                      className="mr-2"
                    />
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-gray-500">{alert.description}</p>
                    </div>
                  </div>
                  <button
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => handleDeleteAlert(alert.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Lista de alertas */}
      <div className="p-4">
        <div className="space-y-3">
          {allAlerts.length > 0 ? (
            allAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`border-l-4 rounded-r-lg p-3 ${getSeverityClass(alert.severity)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <div className="mt-0.5 mr-2">
                      {alert.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      {alert.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {alert.id.startsWith('config-') && (
                    <button
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => handleDeleteAlert(alert.id)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Bell size={24} className="text-blue-500" />
              </div>
              <h3 className="text-gray-900 font-medium mb-1">No hay alertas activas</h3>
              <p className="text-gray-500 text-sm">
                Todos los indicadores financieros están en niveles normales
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialAlerts;
