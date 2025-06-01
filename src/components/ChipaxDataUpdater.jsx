import React, { useState } from 'react';
import { Clock, RefreshCw, AlertTriangle, CheckCircle, Database, Info, ChevronDown, ChevronUp } from 'lucide-react';

// Configuración integrada de Chipax
const CHIPAX_API_URL = '/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

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

  let tokenCache = null;

  const updateModuleStatus = (modulo, status, message, completeness = 0, items = 0) => {
    setUpdateStatus(prev => ({ 
      ...prev, 
      [modulo]: { status, message, completeness, items } 
    }));
  };

  // Obtener token de autenticación
  const getChipaxToken = async () => {
    if (tokenCache) return tokenCache;
    
    try {
      const response = await fetch(`${CHIPAX_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, secret_key: SECRET_KEY })
      });

      if (!response.ok) throw new Error(`Error de autenticación ${response.status}`);

      const data = await response.json();
      tokenCache = data.token;
      return tokenCache;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      throw error;
    }
  };

  // Fetch con autenticación
  const fetchFromChipax = async (endpoint) => {
    const token = await getChipaxToken();
    
    const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) return { items: [] };
      throw new Error(`Error ${response.status}`);
    }
    
    return await response.json();
  };

  // Cargar todas las páginas de un endpoint
  const fetchAllPages = async (endpoint) => {
    const firstPage = await fetchFromChipax(`${endpoint}?page=1&limit=50`);
    
    if (!firstPage.paginationAttributes || firstPage.paginationAttributes.totalPages === 1) {
      return {
        items: firstPage.items || firstPage || [],
        completeness: 100
      };
    }
    
    const { totalPages, totalCount } = firstPage.paginationAttributes;
    let allItems = [...(firstPage.items || [])];
    let loadedPages = 1;
    
    // Cargar páginas restantes
    for (let page = 2; page <= totalPages; page++) {
      try {
        const pageData = await fetchFromChipax(`${endpoint}?page=${page}&limit=50`);
        if (pageData.items) {
          allItems = [...allItems, ...pageData.items];
          loadedPages++;
        }
      } catch (error) {
        console.error(`Error cargando página ${page}:`, error);
      }
    }
    
    const completeness = totalCount > 0 ? (allItems.length / totalCount) * 100 : 100;
    
    return {
      items: allItems,
      completeness,
      totalPages,
      loadedPages
    };
  };

  // Adaptadores de datos
  const adaptSaldosBancarios = (data) => {
    const items = data.items || data || [];
    return items.map(cuenta => ({
      id: cuenta.id,
      nombre: cuenta.nombre || `Cuenta ${cuenta.numero || cuenta.id}`,
      banco: cuenta.banco?.nombre || cuenta.nombre_banco || 'Banco no especificado',
      numeroCuenta: cuenta.numero || cuenta.numero_cuenta || '',
      moneda: cuenta.moneda || 'CLP',
      saldo: parseFloat(cuenta.saldo || cuenta.saldo_actual || 0)
    }));
  };

  const adaptCuentasPendientes = (data) => {
    const items = data.items || data || [];
    return items
      .filter(f => !f.pagado || f.saldo_pendiente > 0)
      .map(f => ({
        id: f.id,
        folio: f.folio || f.numero || 'Sin folio',
        cliente: {
          nombre: f.razon_social_receptor || f.cliente?.nombre || 'Cliente no especificado',
          rut: f.rut_receptor || f.cliente?.rut || 'Sin RUT'
        },
        monto: parseFloat(f.monto_total || f.total || 0),
        saldo: parseFloat(f.saldo_pendiente || f.saldo || f.monto_total || 0),
        moneda: f.moneda || 'CLP',
        fechaEmision: f.fecha_emision || f.fecha,
        fechaVencimiento: f.fecha_vencimiento || f.fecha_pago,
        diasVencidos: calcularDiasVencidos(f.fecha_vencimiento || f.fecha_pago)
      }));
  };

  const adaptCuentasPorPagar = (data) => {
    const items = data.items || data || [];
    return items
      .filter(f => f.pagado === false || f.fecha_pago_interna === null)
      .map(f => ({
        id: f.id,
        folio: f.folio || f.numero || 'Sin folio',
        proveedor: {
          nombre: f.razon_social || f.proveedor?.nombre || 'Proveedor no especificado',
          rut: f.rut_emisor || f.proveedor?.rut || 'Sin RUT'
        },
        monto: parseFloat(f.monto_total || f.total || 0),
        saldo: parseFloat(f.saldo || f.saldo_pendiente || f.monto_total || 0),
        moneda: f.moneda || 'CLP',
        fechaEmision: f.fecha_emision || f.fecha,
        fechaVencimiento: f.fecha_vencimiento || f.fecha_pago,
        diasVencidos: calcularDiasVencidos(f.fecha_vencimiento || f.fecha_pago)
      }));
  };

  const calcularDiasVencidos = (fecha) => {
    if (!fecha) return 0;
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    return Math.floor((hoy - vencimiento) / (1000 * 60 * 60 * 24));
  };

  const generarFlujoCaja = (ventas, compras) => {
    const transaccionesPorMes = new Map();
    
    // Procesar ingresos
    ventas.forEach(venta => {
      const fecha = new Date(venta.fechaEmision);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!transaccionesPorMes.has(mesKey)) {
        transaccionesPorMes.set(mesKey, { fecha: mesKey, ingresos: 0, egresos: 0 });
      }
      
      transaccionesPorMes.get(mesKey).ingresos += venta.monto;
    });
    
    // Procesar egresos
    compras.forEach(compra => {
      const fecha = new Date(compra.fechaEmision);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!transaccionesPorMes.has(mesKey)) {
        transaccionesPorMes.set(mesKey, { fecha: mesKey, ingresos: 0, egresos: 0 });
      }
      
      transaccionesPorMes.get(mesKey).egresos += compra.monto;
    });
    
    const periodos = Array.from(transaccionesPorMes.values())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((p, index, array) => {
        p.flujoNeto = p.ingresos - p.egresos;
        p.saldoAcumulado = index === 0 
          ? saldoInicial + p.flujoNeto 
          : array[index - 1].saldoAcumulado + p.flujoNeto;
        
        const [year, month] = p.fecha.split('-');
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        p.etiqueta = `${monthNames[parseInt(month) - 1]} ${year}`;
        
        return p;
      });
    
    const totalIngresos = periodos.reduce((sum, p) => sum + p.ingresos, 0);
    const totalEgresos = periodos.reduce((sum, p) => sum + p.egresos, 0);
    
    return {
      saldoInicial,
      saldoFinal: saldoInicial + totalIngresos - totalEgresos,
      totalIngresos,
      totalEgresos,
      periodos
    };
  };

  const loadAllChipaxData = async () => {
    setLoading(true);
    setError(null);
    setShowDetails(true);
    tokenCache = null;

    try {
      console.log('🚀 Iniciando carga completa de datos Chipax');
      
      // Cargar saldos bancarios
      updateModuleStatus('saldos', 'loading', 'Cargando...');
      try {
        const saldosData = await fetchAllPages('/cuentas_corrientes');
        const saldos = adaptSaldosBancarios(saldosData);
        onUpdateSaldos?.(saldos);
        updateModuleStatus('saldos', 'success', `${saldos.length} cuentas`, saldosData.completeness, saldos.length);
      } catch (err) {
        updateModuleStatus('saldos', 'error', err.message);
      }

      // Cargar ventas/cuentas por cobrar
      updateModuleStatus('cuentasPendientes', 'loading', 'Cargando...');
      try {
        const ventasData = await fetchAllPages('/ventas');
        const cuentas = adaptCuentasPendientes(ventasData);
        onUpdateCuentasPendientes?.(cuentas);
        updateModuleStatus('cuentasPendientes', 'success', 
          `${cuentas.length} de ${ventasData.items?.length || 0} facturas`, 
          ventasData.completeness, cuentas.length);
      } catch (err) {
        updateModuleStatus('cuentasPendientes', 'error', err.message);
      }

      // Cargar compras/cuentas por pagar
      updateModuleStatus('cuentasPorPagar', 'loading', 'Cargando...');
      try {
        const comprasData = await fetchAllPages('/compras');
        const cuentas = adaptCuentasPorPagar(comprasData);
        onUpdateCuentasPorPagar?.(cuentas);
        updateModuleStatus('cuentasPorPagar', 'success', 
          `${cuentas.length} de ${comprasData.items?.length || 0} facturas`, 
          comprasData.completeness, cuentas.length);
      } catch (err) {
        updateModuleStatus('cuentasPorPagar', 'error', err.message);
      }

      // Generar flujo de caja
      updateModuleStatus('flujoCaja', 'loading', 'Generando...');
      try {
        const flujo = generarFlujoCaja(
          onUpdateCuentasPendientes ? [] : [], 
          onUpdateCuentasPorPagar ? [] : []
        );
        onUpdateFlujoCaja?.(flujo);
        updateModuleStatus('flujoCaja', 'success', `${flujo.periodos.length} períodos`, 100, flujo.periodos.length);
      } catch (err) {
        updateModuleStatus('flujoCaja', 'error', err.message);
      }

      // Cargar clientes
      updateModuleStatus('clientes', 'loading', 'Cargando...');
      try {
        const clientesData = await fetchAllPages('/clientes');
        const clientes = clientesData.items || [];
        onUpdateClientes?.(clientes);
        updateModuleStatus('clientes', 'success', `${clientes.length} clientes`, clientesData.completeness, clientes.length);
      } catch (err) {
        updateModuleStatus('clientes', 'error', err.message);
      }

      setLastUpdate(new Date());
      onDataSourceChange?.('chipax');
      
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status) => {
    const getIcon = () => {
      switch (status.status) {
        case 'pending': return <Clock size={12} className="text-gray-400" />;
        case 'loading': return <RefreshCw size={12} className="animate-spin text-blue-500" />;
        case 'success': return <CheckCircle size={12} className="text-green-500" />;
        case 'error': return <AlertTriangle size={12} className="text-red-500" />;
        default: return null;
      }
    };

    const getCompleteness = () => {
      if (status.status === 'success' && status.completeness < 100) {
        return (
          <span className={`text-xs ${status.completeness < 80 ? 'text-amber-600' : 'text-green-600'}`}>
            ({status.completeness.toFixed(0)}%)
          </span>
        );
      }
      return null;
    };

    return (
      <div className="flex items-center space-x-2">
        {getIcon()}
        <span className="text-xs">{status.message}</span>
        {getCompleteness()}
      </div>
    );
  };

  // Calcular completitud general
  const calculateOverallCompleteness = () => {
    const modules = Object.values(updateStatus).filter(m => m.status === 'success');
    if (modules.length === 0) return 0;
    
    const total = modules.reduce((sum, m) => sum + (m.completeness || 100), 0);
    return total / modules.length;
  };

  const overallCompleteness = calculateOverallCompleteness();

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database size={20} className="text-blue-600 mr-2" />
            <div>
              <h2 className="text-lg font-semibold">Integración con Chipax</h2>
              {lastUpdate && (
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  <Clock size={14} className="mr-1" />
                  Última actualización: {lastUpdate.toLocaleString()}
                </p>
              )}
            </div>
          </div>

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

        {/* Barra de progreso general */}
        {overallCompleteness > 0 && overallCompleteness < 100 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Completitud de datos</span>
              <span className={`font-medium ${overallCompleteness < 80 ? 'text-amber-600' : 'text-green-600'}`}>
                {overallCompleteness.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${overallCompleteness < 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${overallCompleteness}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertTriangle size={16} className="text-red-600 mr-2 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Error al sincronizar</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel expandible con detalles */}
      {showDetails && (
        <div className="border-t">
          <button
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="text-sm font-medium text-gray-700">
              Detalles de sincronización
            </span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isExpanded && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3">
                  <h4 className="text-sm font-medium mb-2">Datos principales</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Saldos Bancarios</span>
                      {renderStatus(updateStatus.saldos)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cuentas por Cobrar</span>
                      {renderStatus(updateStatus.cuentasPendientes)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cuentas por Pagar</span>
                      {renderStatus(updateStatus.cuentasPorPagar)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Flujo de Caja</span>
                      {renderStatus(updateStatus.flujoCaja)}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-3">
                  <h4 className="text-sm font-medium mb-2">Datos complementarios</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Facturas Pendientes</span>
                      {renderStatus(updateStatus.facturasPendientes)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Clientes</span>
                      {renderStatus(updateStatus.clientes)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Proveedores</span>
                      {renderStatus(updateStatus.proveedores)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Advertencia si hay datos incompletos */}
              {overallCompleteness > 0 && overallCompleteness < 100 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start">
                    <Info size={16} className="text-amber-600 mr-2 mt-0.5" />
                    <div className="text-sm text-amber-700">
                      <p className="font-medium">Datos parcialmente cargados</p>
                      <p className="mt-1">
                        Algunos módulos no se cargaron completamente. Esto puede deberse a límites de la API o errores de red.
                        Los datos mostrados son parciales pero funcionales.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChipaxDataUpdater;
