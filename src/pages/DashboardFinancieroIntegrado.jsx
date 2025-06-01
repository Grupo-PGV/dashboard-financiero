// DashboardFinancieroIntegrado.jsx - Versión autocontenida
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Filter, Info, Wallet, PieChart, 
  TrendingUp, AlertTriangle, BarChart3, DollarSign,
  FileText, Clock, Users, Building2, Database, RefreshCw,
  Loader2, CheckCircle, Eye, EyeOff, Download, ChevronRight,
  TrendingDown, X, Bell, Activity
} from 'lucide-react';

// ===== MINI COMPONENTES INTEGRADOS =====

// Componente de tarjeta de saldo bancario
const BankBalanceCard = ({ cuenta, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  const formatCurrency = (amount, currency = 'CLP') => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border-l-4 border-blue-500">
      <h3 className="font-medium text-gray-800 mb-2">{cuenta.nombre || 'Cuenta sin nombre'}</h3>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {formatCurrency(cuenta.saldo, cuenta.moneda)}
      </div>
      <p className="text-sm text-gray-600">{cuenta.banco || 'Sin banco'}</p>
    </div>
  );
};

// Mini tabla de cuentas por cobrar
const SimpleAccountsTable = ({ cuentas, title, type = 'receivable' }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (dias) => {
    if (type === 'receivable') {
      if (dias > 30) return 'text-red-600';
      if (dias > 15) return 'text-amber-600';
      return 'text-green-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Folio</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                {type === 'receivable' ? 'Cliente' : 'Proveedor'}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Monto</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Saldo</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Vencimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cuentas.slice(0, 5).map((cuenta) => (
              <tr key={cuenta.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{cuenta.folio}</td>
                <td className="px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {type === 'receivable' ? cuenta.cliente?.nombre : cuenta.proveedor?.nombre}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {type === 'receivable' ? cuenta.cliente?.rut : cuenta.proveedor?.rut}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(cuenta.monto)}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(cuenta.saldo)}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={getStatusColor(cuenta.diasVencidos)}>
                    {cuenta.diasVencidos > 0 ? `Vencido (${cuenta.diasVencidos} días)` : 'Al día'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cuentas.length > 5 && (
          <div className="p-3 text-center border-t">
            <span className="text-sm text-gray-500">
              Mostrando 5 de {cuentas.length} registros
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Mini gráfico de flujo de caja
const SimpleCashFlowChart = ({ data }) => {
  if (!data || !data.periodos || data.periodos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <BarChart3 size={48} className="mx-auto mb-2 text-gray-300" />
        <p className="text-gray-500">No hay datos de flujo de caja disponibles</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.periodos.map(p => Math.max(p.ingresos, p.egresos)));
  const scale = 100 / maxValue;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <TrendingUp size={20} className="mr-2 text-blue-600" />
        Flujo de Caja
      </h2>
      
      <div className="space-y-4">
        {data.periodos.slice(-6).map((periodo, index) => (
          <div key={index} className="space-y-2">
            <div className="text-sm text-gray-600">{periodo.fecha}</div>
            <div className="flex items-center space-x-2">
              <span className="text-xs w-16">Ingresos</span>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-green-500 rounded-full"
                  style={{ width: `${periodo.ingresos * scale}%` }}
                />
              </div>
              <span className="text-xs w-24 text-right">${periodo.ingresos.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs w-16">Egresos</span>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-red-500 rounded-full"
                  style={{ width: `${periodo.egresos * scale}%` }}
                />
              </div>
              <span className="text-xs w-24 text-right">${periodo.egresos.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== COMPONENTE PRINCIPAL DEL DASHBOARD =====
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
  
  // Estados de control
  const [dataSource, setDataSource] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showDataPanel, setShowDataPanel] = useState(false);
  
  // Estado para métricas
  const [dataCompleteness, setDataCompleteness] = useState({
    overall: 0,
    modules: {
      compras: { loaded: false, completeness: 0, itemCount: 0 },
      ventas: { loaded: false, completeness: 0, itemCount: 0 },
      bancos: { loaded: false, completeness: 0, itemCount: 0 },
      clientes: { loaded: false, completeness: 0, itemCount: 0 }
    }
  });

  // Datos de demostración
  const loadDemoData = () => {
    setLoading(true);
    
    setTimeout(() => {
      // Saldos bancarios demo
      setSaldosBancarios([
        { id: 1, nombre: 'Cuenta Corriente', banco: 'Banco Estado', saldo: 5420000, moneda: 'CLP' },
        { id: 2, nombre: 'Cuenta Vista', banco: 'Banco Santander', saldo: 1250000, moneda: 'CLP' },
        { id: 3, nombre: 'Cuenta USD', banco: 'Banco Chile', saldo: 3500, moneda: 'USD' }
      ]);
      
      // Cuentas por cobrar demo
      setCuentasPendientes([
        { id: 1, folio: '001', cliente: { nombre: 'Empresa ABC', rut: '76.123.456-7' }, monto: 1500000, saldo: 1500000, diasVencidos: 5 },
        { id: 2, folio: '002', cliente: { nombre: 'Comercial XYZ', rut: '76.234.567-8' }, monto: 2300000, saldo: 2300000, diasVencidos: 15 },
        { id: 3, folio: '003', cliente: { nombre: 'Servicios 123', rut: '76.345.678-9' }, monto: 890000, saldo: 890000, diasVencidos: -3 }
      ]);
      
      // Cuentas por pagar demo
      setCuentasPorPagar([
        { id: 1, folio: '101', proveedor: { nombre: 'Proveedor Sur', rut: '76.456.789-0' }, monto: 750000, saldo: 750000, diasVencidos: -7 },
        { id: 2, folio: '102', proveedor: { nombre: 'Distribuidora Norte', rut: '76.567.890-1' }, monto: 1200000, saldo: 1200000, diasVencidos: 0 }
      ]);
      
      // Flujo de caja demo
      setFlujoCaja({
        periodos: [
          { fecha: 'Enero 2024', ingresos: 8500000, egresos: 6200000 },
          { fecha: 'Febrero 2024', ingresos: 9200000, egresos: 7100000 },
          { fecha: 'Marzo 2024', ingresos: 7800000, egresos: 8500000 },
          { fecha: 'Abril 2024', ingresos: 10500000, egresos: 7900000 },
          { fecha: 'Mayo 2024', ingresos: 9800000, egresos: 8200000 },
          { fecha: 'Junio 2024', ingresos: 11200000, egresos: 9100000 }
        ]
      });
      
      setClientes([1, 2, 3, 4, 5]);
      setBancos([1, 2, 3]);
      
      setDataSource('demo');
      setLastUpdate(new Date());
      updateDataCompleteness();
      setLoading(false);
    }, 1500);
  };

  // Actualizar métricas
  const updateDataCompleteness = () => {
    const modules = {
      compras: {
        loaded: cuentasPorPagar.length > 0,
        completeness: 100,
        itemCount: cuentasPorPagar.length
      },
      ventas: {
        loaded: cuentasPendientes.length > 0,
        completeness: 100,
        itemCount: cuentasPendientes.length
      },
      bancos: {
        loaded: saldosBancarios.length > 0,
        completeness: 100,
        itemCount: saldosBancarios.length
      },
      clientes: {
        loaded: clientes.length > 0,
        completeness: 100,
        itemCount: clientes.length
      }
    };

    const loadedModules = Object.values(modules).filter(m => m.loaded);
    const overall = loadedModules.length > 0
      ? loadedModules.reduce((sum, m) => sum + m.completeness, 0) / loadedModules.length
      : 0;

    setDataCompleteness({ overall, modules });
  };

  useEffect(() => {
    updateDataCompleteness();
  }, [cuentasPorPagar, cuentasPendientes, saldosBancarios, clientes]);

  // Cálculos
  const calcularSaldoTotal = () => saldosBancarios.reduce((acc, c) => acc + c.saldo, 0);
  const calcularTotalPorCobrar = () => cuentasPendientes.reduce((acc, c) => acc + c.saldo, 0);
  const calcularTotalPorPagar = () => cuentasPorPagar.reduce((acc, c) => acc + c.saldo, 0);

  const formatCurrency = (amount, currency = 'CLP') =>
    new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency, 
      maximumFractionDigits: currency === 'CLP' ? 0 : 2 
    }).format(amount);

  // Componente de tarjeta de métrica
  const MetricCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => (
    <div className={`bg-white rounded-lg shadow p-4 border-l-4 border-${color}-500`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 bg-${color}-100 rounded-lg`}>
          <Icon size={20} className={`text-${color}-600`} />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm text-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Financiero</h1>
              <p className="text-gray-600">Gestiona tus finanzas en tiempo real</p>
            </div>
            {lastUpdate && (
              <div className="flex items-center text-sm text-gray-600">
                <Clock size={16} className="mr-1" />
                <span>Actualizado: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Panel de sincronización simplificado */}
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Database size={20} className="text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Sincronización de Datos</h2>
            </div>
            <button
              onClick={loadDemoData}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <RefreshCw size={16} className="mr-2" />
                  Cargar Datos Demo
                </>
              )}
            </button>
          </div>
        </div>

        {/* Alerta de completitud */}
        {dataCompleteness.overall > 0 && dataCompleteness.overall < 100 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle size={20} className="text-amber-600 mr-2 mt-0.5" />
              <div>
                <h3 className="text-amber-800 font-medium">Datos incompletos</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Completitud: {dataCompleteness.overall.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={Wallet}
            title="Saldo Total"
            value={formatCurrency(calcularSaldoTotal())}
            subtitle={`${saldosBancarios.length} cuentas`}
            color="blue"
          />
          
          <MetricCard
            icon={TrendingUp}
            title="Por Cobrar"
            value={formatCurrency(calcularTotalPorCobrar())}
            subtitle={`${cuentasPendientes.length} facturas`}
            color="green"
          />
          
          <MetricCard
            icon={DollarSign}
            title="Por Pagar"
            value={formatCurrency(calcularTotalPorPagar())}
            subtitle={`${cuentasPorPagar.length} facturas`}
            color="red"
          />
          
          <MetricCard
            icon={FileText}
            title="Clientes"
            value={clientes.length.toString()}
            subtitle="Registrados"
            color="purple"
          />
        </div>

        {/* Saldos bancarios */}
        <div className="mb-6">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Wallet size={20} className="mr-2 text-blue-600" />
              Saldos Bancarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {saldosBancarios.map(cuenta => (
                <BankBalanceCard key={cuenta.id} cuenta={cuenta} loading={loading} />
              ))}
            </div>
          </div>
        </div>

        {/* Flujo de caja */}
        <div className="mb-6">
          <SimpleCashFlowChart data={flujoCaja} />
        </div>

        {/* Tablas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SimpleAccountsTable 
            cuentas={cuentasPendientes} 
            title="Cuentas por Cobrar" 
            type="receivable" 
          />
          <SimpleAccountsTable 
            cuentas={cuentasPorPagar} 
            title="Cuentas por Pagar" 
            type="payable" 
          />
        </div>

        {/* Panel de estado */}
        {dataSource && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <div className="text-sm text-gray-600">
              <span>Fuente de datos: <strong className="capitalize">{dataSource}</strong></span>
              {dataCompleteness.overall > 0 && (
                <>
                  <span className="mx-2">•</span>
                  <span>Completitud: <strong>{dataCompleteness.overall.toFixed(1)}%</strong></span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
