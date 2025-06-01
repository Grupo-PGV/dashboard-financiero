// DashboardFinancieroIntegrado.jsx - Versión completa con integración Chipax
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Filter, Info, Wallet, PieChart, 
  TrendingUp, AlertTriangle, BarChart3, DollarSign,
  FileText, Clock, Users, Building2, Database, RefreshCw,
  Loader2, CheckCircle, Eye, EyeOff, Download, ChevronRight,
  TrendingDown, X, Bell, Activity, ChevronLeft
} from 'lucide-react';

// ===== CONFIGURACIÓN CHIPAX =====
const CHIPAX_API_URL = '/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token
let tokenCache = {
  token: null,
  expiresAt: null
};

// ===== SERVICIOS CHIPAX INTEGRADOS =====
const getChipaxToken = async () => {
  const now = new Date();
  
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  try {
    const response = await fetch(`${CHIPAX_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, secret_key: SECRET_KEY })
    });

    if (!response.ok) {
      throw new Error(`Error de autenticación ${response.status}`);
    }

    const data = await response.json();
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    return tokenCache.token;
  } catch (error) {
    console.error('Error obteniendo token:', error);
    throw error;
  }
};

const fetchFromChipax = async (endpoint) => {
  const token = await getChipaxToken();
  
  const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return { items: [] };
    }
    throw new Error(`Error ${response.status}`);
  }
  
  return await response.json();
};

const fetchAllPages = async (endpoint) => {
  console.log(`Cargando datos de ${endpoint}...`);
  
  // Primera página
  const firstPage = await fetchFromChipax(`${endpoint}?page=1&limit=50`);
  
  if (!firstPage.paginationAttributes || firstPage.paginationAttributes.totalPages === 1) {
    return firstPage.items || firstPage;
  }
  
  let allItems = [...(firstPage.items || [])];
  const totalPages = firstPage.paginationAttributes.totalPages;
  
  console.log(`Total de páginas a cargar: ${totalPages}`);
  
  // Cargar páginas restantes
  for (let page = 2; page <= totalPages; page++) {
    try {
      const pageData = await fetchFromChipax(`${endpoint}?page=${page}&limit=50`);
      if (pageData.items) {
        allItems = [...allItems, ...pageData.items];
      }
      console.log(`Página ${page}/${totalPages} cargada`);
    } catch (error) {
      console.error(`Error cargando página ${page}:`, error);
    }
  }
  
  console.log(`Total items cargados: ${allItems.length}`);
  return allItems;
};

// ===== COMPONENTES =====

// Tarjeta de saldo bancario
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
      {cuenta.numeroCuenta && (
        <p className="text-xs text-gray-500 mt-1">N° {cuenta.numeroCuenta}</p>
      )}
    </div>
  );
};

// Tabla de cuentas
const AccountsTable = ({ cuentas, title, type = 'receivable', onViewAll }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calcularDiasVencidos = (fechaVencimiento) => {
    if (!fechaVencimiento) return 0;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diff = Math.floor((hoy - vencimiento) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusColor = (cuenta) => {
    const dias = calcularDiasVencidos(cuenta.fechaVencimiento);
    if (dias > 30) return 'text-red-600';
    if (dias > 15) return 'text-amber-600';
    if (dias > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusText = (cuenta) => {
    const dias = calcularDiasVencidos(cuenta.fechaVencimiento);
    if (dias > 0) return `Vencido (${dias} días)`;
    if (dias === 0) return 'Vence hoy';
    return `Vence en ${Math.abs(dias)} días`;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-500">{cuentas.length} registros</span>
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
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Estado</th>
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
                  <span className={getStatusColor(cuenta)}>
                    {getStatusText(cuenta)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cuentas.length > 5 && (
          <div className="p-3 text-center border-t">
            <button 
              onClick={onViewAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Ver todos ({cuentas.length} registros)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Gráfico de flujo de caja
const CashFlowChart = ({ data }) => {
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
                  className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${periodo.ingresos * scale}%` }}
                />
              </div>
              <span className="text-xs w-24 text-right">${periodo.ingresos.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs w-16">Egresos</span>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${periodo.egresos * scale}%` }}
                />
              </div>
              <span className="text-xs w-24 text-right">${periodo.egresos.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">Saldo Inicial</p>
          <p className="font-semibold">${(data.saldoInicial || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Flujo Neto</p>
          <p className="font-semibold text-blue-600">
            ${((data.totalIngresos || 0) - (data.totalEgresos || 0)).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Saldo Final</p>
          <p className="font-semibold">${(data.saldoFinal || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

// ===== COMPONENTE PRINCIPAL =====
const DashboardFinancieroIntegrado = () => {
  // Estados
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [cuentasPendientes, setCuentasPendientes] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [flujoCaja, setFlujoCaja] = useState(null);
  const [clientes, setClientes] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingModule, setLoadingModule] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  
  const [dataStats, setDataStats] = useState({
    compras: { total: 0, filtered: 0, completeness: 0 },
    ventas: { total: 0, filtered: 0, completeness: 0 },
    cuentas: { total: 0, completeness: 100 },
    clientes: { total: 0, completeness: 100 }
  });

  // Adaptadores de datos
  const adaptarCuentasCorrientes = (cuentas) => {
    if (!Array.isArray(cuentas)) return [];
    
    return cuentas.map(cuenta => ({
      id: cuenta.id,
      nombre: cuenta.nombre || `Cuenta ${cuenta.numero || cuenta.id}`,
      banco: cuenta.banco?.nombre || cuenta.nombre_banco || 'Banco no especificado',
      numeroCuenta: cuenta.numero || cuenta.numero_cuenta || '',
      moneda: cuenta.moneda || 'CLP',
      saldo: parseFloat(cuenta.saldo || cuenta.saldo_actual || 0)
    }));
  };

  const adaptarFacturasVenta = (facturas) => {
    if (!Array.isArray(facturas)) return [];
    
    return facturas
      .filter(f => !f.pagado || f.saldo_pendiente > 0)
      .map(f => ({
        id: f.id,
        folio: f.folio || f.numero || 'S/N',
        cliente: {
          nombre: f.razon_social_receptor || f.cliente?.nombre || 'Sin nombre',
          rut: f.rut_receptor || f.cliente?.rut || 'Sin RUT'
        },
        monto: parseFloat(f.monto_total || f.total || 0),
        saldo: parseFloat(f.saldo_pendiente || f.saldo || f.monto_total || 0),
        fechaEmision: f.fecha_emision || f.fecha,
        fechaVencimiento: f.fecha_vencimiento,
        moneda: f.moneda || 'CLP'
      }));
  };

  const adaptarFacturasCompra = (facturas) => {
    if (!Array.isArray(facturas)) return [];
    
    return facturas
      .filter(f => f.pagado === false || f.fecha_pago_interna === null)
      .map(f => ({
        id: f.id,
        folio: f.folio || f.numero || 'S/N',
        proveedor: {
          nombre: f.razon_social || f.proveedor?.nombre || 'Sin nombre',
          rut: f.rut_emisor || f.proveedor?.rut || 'Sin RUT'
        },
        monto: parseFloat(f.monto_total || f.total || 0),
        saldo: parseFloat(f.saldo_pendiente || f.saldo || f.monto_total || 0),
        fechaEmision: f.fecha_emision || f.fecha,
        fechaVencimiento: f.fecha_vencimiento,
        moneda: f.moneda || 'CLP'
      }));
  };

  const generarFlujoCaja = (ventas, compras, saldos) => {
    const transaccionesPorMes = new Map();
    
    // Procesar ingresos
    ventas.forEach(venta => {
      const fecha = new Date(venta.fechaEmision);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!transaccionesPorMes.has(key)) {
        transaccionesPorMes.set(key, { fecha: key, ingresos: 0, egresos: 0 });
      }
      
      transaccionesPorMes.get(key).ingresos += venta.monto;
    });
    
    // Procesar egresos
    compras.forEach(compra => {
      const fecha = new Date(compra.fechaEmision);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!transaccionesPorMes.has(key)) {
        transaccionesPorMes.set(key, { fecha: key, ingresos: 0, egresos: 0 });
      }
      
      transaccionesPorMes.get(key).egresos += compra.monto;
    });
    
    const periodos = Array.from(transaccionesPorMes.values())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(p => {
        const [year, month] = p.fecha.split('-');
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        p.fecha = `${monthNames[parseInt(month) - 1]} ${year}`;
        return p;
      });
    
    const saldoInicial = saldos.reduce((sum, s) => sum + s.saldo, 0);
    const totalIngresos = periodos.reduce((sum, p) => sum + p.ingresos, 0);
    const totalEgresos = periodos.reduce((sum, p) => sum + p.egresos, 0);
    
    return {
      periodos,
      saldoInicial,
      saldoFinal: saldoInicial + totalIngresos - totalEgresos,
      totalIngresos,
      totalEgresos
    };
  };

  // Cargar datos de Chipax
  const loadChipaxData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Cargar cuentas corrientes
      setLoadingModule('Cargando cuentas bancarias...');
      const cuentasData = await fetchAllPages('/cuentas_corrientes');
      const cuentasAdaptadas = adaptarCuentasCorrientes(cuentasData);
      setSaldosBancarios(cuentasAdaptadas);
      
      // 2. Cargar ventas
      setLoadingModule('Cargando facturas de venta...');
      const ventasData = await fetchAllPages('/ventas');
      const ventasAdaptadas = adaptarFacturasVenta(ventasData);
      setCuentasPendientes(ventasAdaptadas);
      
      setDataStats(prev => ({
        ...prev,
        ventas: {
          total: ventasData.length,
          filtered: ventasAdaptadas.length,
          completeness: 100
        }
      }));
      
      // 3. Cargar compras
      setLoadingModule('Cargando facturas de compra...');
      const comprasData = await fetchAllPages('/compras');
      const comprasAdaptadas = adaptarFacturasCompra(comprasData);
      setCuentasPorPagar(comprasAdaptadas);
      
      setDataStats(prev => ({
        ...prev,
        compras: {
          total: comprasData.length,
          filtered: comprasAdaptadas.length,
          completeness: 100
        }
      }));
      
      // 4. Cargar clientes
      setLoadingModule('Cargando clientes...');
      const clientesData = await fetchAllPages('/clientes');
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      
      // 5. Generar flujo de caja
      setLoadingModule('Generando flujo de caja...');
      const flujo = generarFlujoCaja(ventasAdaptadas, comprasAdaptadas, cuentasAdaptadas);
      setFlujoCaja(flujo);
      
      setLastUpdate(new Date());
      console.log('✅ Datos cargados exitosamente');
      
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingModule('');
    }
  };

  // Cálculos
  const calcularSaldoTotal = () => saldosBancarios.reduce((sum, c) => sum + c.saldo, 0);
  const calcularTotalPorCobrar = () => cuentasPendientes.reduce((sum, c) => sum + c.saldo, 0);
  const calcularTotalPorPagar = () => cuentasPorPagar.reduce((sum, c) => sum + c.saldo, 0);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);

  // Componente de métrica
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
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Financiero - Chipax</h1>
              <p className="text-gray-600">Datos en tiempo real desde la API de Chipax</p>
            </div>
            {lastUpdate && (
              <div className="flex items-center text-sm text-gray-600">
                <Clock size={16} className="mr-1" />
                <span>Actualizado: {lastUpdate.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Panel de sincronización */}
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <Database size={20} className="text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold">Sincronización con Chipax</h2>
              </div>
              {loading && loadingModule && (
                <p className="text-sm text-gray-600 mt-1">{loadingModule}</p>
              )}
            </div>
            <button
              onClick={loadChipaxData}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
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
          
          {/* Estadísticas de carga */}
          {dataStats.compras.total > 0 && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Facturas de compra:</span>
                <p className="font-semibold">{dataStats.compras.filtered} de {dataStats.compras.total}</p>
              </div>
              <div>
                <span className="text-gray-500">Facturas de venta:</span>
                <p className="font-semibold">{dataStats.ventas.filtered} de {dataStats.ventas.total}</p>
              </div>
              <div>
                <span className="text-gray-500">Cuentas bancarias:</span>
                <p className="font-semibold">{saldosBancarios.length}</p>
              </div>
              <div>
                <span className="text-gray-500">Clientes:</span>
                <p className="font-semibold">{clientes.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle size={20} className="text-red-600 mr-2 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-medium">Error al cargar datos</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
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
            icon={Users}
            title="Clientes"
            value={clientes.length.toString()}
            subtitle="Registrados"
            color="purple"
          />
        </div>

        {/* Saldos bancarios */}
        {saldosBancarios.length > 0 && (
          <div className="mb-6">
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Wallet size={20} className="mr-2 text-blue-600" />
                Saldos Bancarios
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {saldosBancarios.map(cuenta => (
                  <BankBalanceCard key={cuenta.id} cuenta={cuenta} loading={loading} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Flujo de caja */}
        {flujoCaja && (
          <div className="mb-6">
            <CashFlowChart data={flujoCaja} />
          </div>
        )}

        {/* Tablas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {cuentasPendientes.length > 0 && (
            <AccountsTable 
              cuentas={cuentasPendientes} 
              title="Cuentas por Cobrar" 
              type="receivable" 
            />
          )}
          
          {cuentasPorPagar.length > 0 && (
            <AccountsTable 
              cuentas={cuentasPorPagar} 
              title="Cuentas por Pagar" 
              type="payable" 
            />
          )}
        </div>

        {/* Estado vacío */}
        {!loading && saldosBancarios.length === 0 && cuentasPendientes.length === 0 && (
          <div className="text-center py-12">
            <Database size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos cargados</h3>
            <p className="text-gray-500 mb-4">
              Haz clic en "Sincronizar con Chipax" para cargar los datos financieros
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
