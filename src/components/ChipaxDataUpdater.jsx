// ChipaxDataUpdater.jsx - Componente completo con toda la lógica integrada
import React, { useState, useEffect } from 'react';
import { 
  Clock, RefreshCw, AlertTriangle, CheckCircle, Database, 
  TrendingUp, TrendingDown, Info, AlertCircle, BarChart,
  Download, Eye, EyeOff, Loader2
} from 'lucide-react';

// ===== CONFIGURACIÓN Y CONSTANTES =====
const CHIPAX_API_URL = '/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 3,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  REQUEST_DELAY: 200,
  TIMEOUT: 30000
};

// ===== SERVICIO CHIPAX (chipaxService integrado) =====
let tokenCache = {
  token: null,
  expiresAt: null
};

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
      const errorText = await response.text();
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    return tokenCache.token;
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    throw error;
  }
};

const fetchFromChipaxWithRetry = async (endpoint, options = {}, retryCount = PAGINATION_CONFIG.RETRY_ATTEMPTS) => {
  try {
    const token = await getChipaxToken();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGINATION_CONFIG.TIMEOUT);
    
    const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 404) {
        return { items: [], paginationAttributes: null };
      }
      
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    if (retryCount > 0 && !error.message.includes('404')) {
      await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.RETRY_DELAY));
      return fetchFromChipaxWithRetry(endpoint, options, retryCount - 1);
    }
    
    throw error;
  }
};

const fetchAllPaginatedData = async (baseEndpoint) => {
  console.log(`📊 Iniciando carga paginada de ${baseEndpoint}...`);
  
  const paginationStats = {
    totalPages: 0,
    loadedPages: 0,
    failedPages: [],
    totalItems: 0,
    loadedItems: 0,
    startTime: new Date()
  };
  
  try {
    const separator = baseEndpoint.includes('?') ? '&' : '?';
    const firstPageEndpoint = `${baseEndpoint}${separator}page=1&limit=50`;
    
    const firstPageData = await fetchFromChipaxWithRetry(firstPageEndpoint);
    
    if (!firstPageData.paginationAttributes) {
      if (Array.isArray(firstPageData)) {
        return {
          items: firstPageData,
          paginationStats: {
            ...paginationStats,
            totalItems: firstPageData.length,
            loadedItems: firstPageData.length
          }
        };
      }
      
      if (firstPageData.items) {
        return {
          items: firstPageData.items,
          paginationStats: {
            ...paginationStats,
            totalItems: firstPageData.items.length,
            loadedItems: firstPageData.items.length
          }
        };
      }
      
      return { items: [], paginationStats };
    }
    
    const { totalPages, totalCount } = firstPageData.paginationAttributes;
    paginationStats.totalPages = totalPages;
    paginationStats.totalItems = totalCount;
    paginationStats.loadedPages = 1;
    paginationStats.loadedItems = firstPageData.items.length;
    
    if (totalPages === 1) {
      return {
        items: firstPageData.items,
        paginationStats
      };
    }
    
    let allItems = [...firstPageData.items];
    
    // Cargar páginas restantes
    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const batches = [];
    
    for (let i = 0; i < pageNumbers.length; i += PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS) {
      batches.push(pageNumbers.slice(i, i + PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS));
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map(page => {
        const endpoint = `${baseEndpoint}${separator}page=${page}&limit=50`;
        return fetchFromChipaxWithRetry(endpoint)
          .then(data => ({ page, data, success: true }))
          .catch(error => ({ page, error, success: false }));
      });
      
      const results = await Promise.all(batchPromises);
      
      results.forEach(result => {
        if (result.success && result.data.items) {
          allItems = [...allItems, ...result.data.items];
          paginationStats.loadedPages++;
          paginationStats.loadedItems += result.data.items.length;
        } else {
          paginationStats.failedPages.push(result.page);
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));
    }
    
    return {
      items: allItems,
      paginationStats
    };
    
  } catch (error) {
    console.error('Error en carga paginada:', error);
    return {
      items: [],
      paginationStats,
      error: error.message
    };
  }
};

// ===== ADAPTADORES (chipaxAdapter integrado) =====
const calcularDiasVencidos = (fecha) => {
  if (!fecha) return 0;
  
  try {
    const fechaVencimiento = new Date(fecha);
    const hoy = new Date();
    const diffTime = hoy - fechaVencimiento;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
};

const adaptSaldosBancarios = (response) => {
  if (!response || !response.items) {
    return [];
  }

  return response.items.map(cuenta => ({
    id: cuenta.id,
    nombre: cuenta.nombre || `Cuenta ${cuenta.numero_cuenta || cuenta.id}`,
    banco: cuenta.banco?.nombre || cuenta.nombre_banco || 'Banco no especificado',
    numeroCuenta: cuenta.numero_cuenta || cuenta.numero || '',
    tipo: cuenta.tipo || 'cuenta_corriente',
    moneda: cuenta.moneda || 'CLP',
    saldo: parseFloat(cuenta.saldo || cuenta.saldo_actual || 0),
    disponible: parseFloat(cuenta.saldo_disponible || cuenta.saldo || 0),
    ultimoMovimiento: cuenta.ultimo_movimiento || cuenta.fecha_actualizacion || new Date().toISOString()
  }));
};

const adaptCuentasPendientes = (response) => {
  if (!response || !response.items) {
    return [];
  }

  return response.items
    .filter(factura => 
      !factura.pagado || 
      factura.saldo_pendiente > 0 ||
      factura.estado === 'pendiente'
    )
    .map(factura => {
      const montoTotal = parseFloat(factura.monto_total || factura.total || 0);
      const montoPagado = parseFloat(factura.monto_pagado || 0);
      const saldoPendiente = parseFloat(factura.saldo_pendiente || factura.saldo || (montoTotal - montoPagado) || montoTotal);
      const diasVencidos = calcularDiasVencidos(factura.fecha_vencimiento || factura.fecha_emision);
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero || 'Sin folio',
        cliente: {
          nombre: factura.razon_social_receptor || factura.nombre_receptor || 'Cliente no especificado',
          rut: factura.rut_receptor || 'Sin RUT'
        },
        monto: montoTotal,
        saldo: saldoPendiente,
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision || factura.fecha,
        fechaVencimiento: factura.fecha_vencimiento,
        diasVencidos: diasVencidos,
        estado: factura.estado || 'pendiente'
      };
    });
};

const adaptCuentasPorPagar = (response) => {
  if (!response || !response.items) {
    return [];
  }

  return response.items
    .filter(factura => 
      factura.pagado === false || 
      factura.fecha_pago_interna === null ||
      factura.estado === 'pendiente'
    )
    .map(factura => {
      const montoTotal = parseFloat(factura.monto_total || factura.total || 0);
      const montoPagado = parseFloat(factura.monto_pagado || 0);
      const saldoPendiente = parseFloat(factura.saldo_pendiente || factura.saldo || (montoTotal - montoPagado) || montoTotal);
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero || 'Sin folio',
        proveedor: {
          nombre: factura.razon_social || factura.nombre_emisor || 'Proveedor no especificado',
          rut: factura.rut_emisor || 'Sin RUT'
        },
        monto: montoTotal,
        saldo: saldoPendiente,
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision || factura.fecha,
        fechaVencimiento: factura.fecha_vencimiento,
        estado: factura.estado || 'pendiente'
      };
    });
};

const adaptFlujoCaja = (data, saldoInicial = 0) => {
  const { compras, ventas, saldosBancarios } = data;
  
  const saldoActual = saldosBancarios?.reduce((sum, cuenta) => sum + cuenta.saldo, 0) || saldoInicial;
  const transaccionesPorMes = new Map();
  
  // Procesar ingresos
  if (ventas?.items) {
    ventas.items.forEach(venta => {
      const fecha = new Date(venta.fecha_emision || venta.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!transaccionesPorMes.has(mesKey)) {
        transaccionesPorMes.set(mesKey, {
          fecha: mesKey,
          ingresos: 0,
          egresos: 0
        });
      }
      
      const periodo = transaccionesPorMes.get(mesKey);
      periodo.ingresos += parseFloat(venta.monto_total || venta.total || 0);
    });
  }
  
  // Procesar egresos
  if (compras?.items) {
    compras.items.forEach(compra => {
      const fecha = new Date(compra.fecha_emision || compra.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!transaccionesPorMes.has(mesKey)) {
        transaccionesPorMes.set(mesKey, {
          fecha: mesKey,
          ingresos: 0,
          egresos: 0
        });
      }
      
      const periodo = transaccionesPorMes.get(mesKey);
      periodo.egresos += parseFloat(compra.monto_total || compra.total || 0);
    });
  }
  
  const periodos = Array.from(transaccionesPorMes.values())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((periodo, index, array) => {
      periodo.flujoNeto = periodo.ingresos - periodo.egresos;
      
      if (index === 0) {
        periodo.saldoAcumulado = saldoActual + periodo.flujoNeto;
      } else {
        periodo.saldoAcumulado = array[index - 1].saldoAcumulado + periodo.flujoNeto;
      }
      
      return periodo;
    });
  
  const totalIngresos = periodos.reduce((sum, p) => sum + p.ingresos, 0);
  const totalEgresos = periodos.reduce((sum, p) => sum + p.egresos, 0);
  
  return {
    saldoInicial: saldoActual,
    saldoFinal: saldoActual + (totalIngresos - totalEgresos),
    periodos
  };
};

// ===== COMPONENTE PRINCIPAL =====
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const [moduleStatus, setModuleStatus] = useState({
    compras: { status: 'idle', message: 'Sin cargar', items: 0, completitud: 0 },
    ventas: { status: 'idle', message: 'Sin cargar', items: 0, completitud: 0 },
    cuentasCorrientes: { status: 'idle', message: 'Sin cargar', items: 0, completitud: 0 },
    clientes: { status: 'idle', message: 'Sin cargar', items: 0, completitud: 0 },
    flujoCaja: { status: 'idle', message: 'Sin cargar', items: 0, completitud: 0 }
  });
  
  const [generalStats, setGeneralStats] = useState({
    totalItems: 0,
    totalFacturas: 0,
    montoPorCobrar: 0,
    montoPorPagar: 0,
    saldoTotal: 0,
    completitudGeneral: 0,
    tiempoCarga: 0
  });

  const updateModuleStatus = (module, updates) => {
    setModuleStatus(prev => ({
      ...prev,
      [module]: { ...prev[module], ...updates }
    }));
  };

  const loadAllChipaxData = async () => {
    console.log('🚀 Iniciando carga completa de datos Chipax...');
    setLoading(true);
    setError(null);
    setLoadingProgress(0);
    
    const startTime = Date.now();
    
    try {
      // Resetear estados
      Object.keys(moduleStatus).forEach(module => {
        updateModuleStatus(module, { status: 'loading', message: 'Cargando...', items: 0, completitud: 0 });
      });
      
      // 1. Cargar Compras
      updateModuleStatus('compras', { message: 'Obteniendo facturas de compra...' });
      const comprasResult = await fetchAllPaginatedData('/compras');
      
      if (comprasResult.items) {
        const cuentasPorPagar = adaptCuentasPorPagar(comprasResult);
        onUpdateCuentasPorPagar?.(cuentasPorPagar);
        
        const completitud = comprasResult.paginationStats 
          ? (comprasResult.paginationStats.loadedItems / comprasResult.paginationStats.totalItems) * 100
          : 100;
          
        updateModuleStatus('compras', {
          status: 'success',
          message: 'Cargado exitosamente',
          items: cuentasPorPagar.length,
          completitud: completitud
        });
      }
      setLoadingProgress(20);
      
      // 2. Cargar Ventas
      updateModuleStatus('ventas', { message: 'Obteniendo facturas de venta...' });
      const ventasResult = await fetchAllPaginatedData('/ventas');
      
      if (ventasResult.items) {
        const cuentasPorCobrar = adaptCuentasPendientes(ventasResult);
        onUpdateCuentasPendientes?.(cuentasPorCobrar);
        
        const completitud = ventasResult.paginationStats 
          ? (ventasResult.paginationStats.loadedItems / ventasResult.paginationStats.totalItems) * 100
          : 100;
          
        updateModuleStatus('ventas', {
          status: 'success',
          message: 'Cargado exitosamente',
          items: cuentasPorCobrar.length,
          completitud: completitud
        });
      }
      setLoadingProgress(40);
      
      // 3. Cargar Cuentas Corrientes
      updateModuleStatus('cuentasCorrientes', { message: 'Obteniendo saldos bancarios...' });
      const cuentasResult = await fetchAllPaginatedData('/cuentas_corrientes');
      
      if (cuentasResult.items) {
        const saldosBancarios = adaptSaldosBancarios(cuentasResult);
        onUpdateSaldos?.(saldosBancarios);
        
        updateModuleStatus('cuentasCorrientes', {
          status: 'success',
          message: 'Cargado exitosamente',
          items: saldosBancarios.length,
          completitud: 100
        });
      }
      setLoadingProgress(60);
      
      // 4. Cargar Clientes
      updateModuleStatus('clientes', { message: 'Obteniendo lista de clientes...' });
      const clientesResult = await fetchAllPaginatedData('/clientes');
      
      if (clientesResult.items) {
        onUpdateClientes?.(clientesResult.items);
        
        updateModuleStatus('clientes', {
          status: 'success',
          message: 'Cargado exitosamente',
          items: clientesResult.items.length,
          completitud: 100
        });
      }
      setLoadingProgress(80);
      
      // 5. Generar Flujo de Caja
      updateModuleStatus('flujoCaja', { message: 'Generando flujo de caja...' });
      
      const flujoCajaData = adaptFlujoCaja({
        compras: comprasResult,
        ventas: ventasResult,
        saldosBancarios: adaptSaldosBancarios(cuentasResult)
      }, saldoInicial);
      
      onUpdateFlujoCaja?.(flujoCajaData);
      
      updateModuleStatus('flujoCaja', {
        status: 'success',
        message: 'Generado exitosamente',
        items: flujoCajaData.periodos?.length || 0,
        completitud: 100
      });
      
      setLoadingProgress(100);
      
      // Calcular estadísticas generales
      const endTime = Date.now();
      const tiempoCarga = (endTime - startTime) / 1000;
      
      const completitudes = Object.values(moduleStatus).map(m => m.completitud || 0).filter(c => c > 0);
      const completitudGeneral = completitudes.length > 0
        ? completitudes.reduce((sum, c) => sum + c, 0) / completitudes.length
        : 0;
      
      setGeneralStats({
        totalItems: Object.values(moduleStatus).reduce((sum, m) => sum + (m.items || 0), 0),
        completitudGeneral,
        tiempoCarga
      });
      
      setLastUpdate(new Date());
      onDataSourceChange?.('chipax');
      
    } catch (err) {
      console.error('❌ Error en carga de datos:', err);
      setError(err.message || 'Error desconocido al cargar datos');
      
      Object.keys(moduleStatus).forEach(module => {
        if (moduleStatus[module].status === 'loading') {
          updateModuleStatus(module, { status: 'error', message: 'Error al cargar' });
        }
      });
      
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const renderModuleStatus = (module, status) => {
    const getStatusIcon = () => {
      switch (status.status) {
        case 'idle': return <Clock size={16} className="text-gray-400" />;
        case 'loading': return <Loader2 size={16} className="text-blue-500 animate-spin" />;
        case 'success': return <CheckCircle size={16} className="text-green-500" />;
        case 'error': return <AlertTriangle size={16} className="text-red-500" />;
        default: return null;
      }
    };
    
    const getCompletitudColor = (completitud) => {
      if (completitud >= 95) return 'text-green-600';
      if (completitud >= 80) return 'text-yellow-600';
      return 'text-red-600';
    };
    
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="font-medium text-gray-700 capitalize">
              {module.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
          {status.items > 0 && (
            <span className="text-sm text-gray-500">{status.items} items</span>
          )}
        </div>
        
        <div className="text-sm text-gray-600 mb-2">{status.message}</div>
        
        {status.completitud > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Completitud:</span>
              <span className={getCompletitudColor(status.completitud)}>
                {status.completitud.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  status.completitud >= 95 ? 'bg-green-500' :
                  status.completitud >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${status.completitud}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Database size={20} className="mr-2 text-blue-600" /> 
              Integración con Chipax
            </h2>
            
            {lastUpdate && (
              <p className="text-sm text-gray-600 flex items-center mt-1">
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
          
          <div className="flex items-center space-x-2">
            <button
              className="text-gray-600 hover:text-gray-800 p-2"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Contraer' : 'Expandir'}
            >
              <BarChart size={18} />
            </button>
            
            <button 
              className={`bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={loadAllChipaxData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Sincronizando... {loadingProgress}%
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
      </div>
      
      {loading && loadingProgress > 0 && (
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}
      
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(moduleStatus).map(([module, status]) => (
              <div key={module}>
                {renderModuleStatus(module, status)}
              </div>
            ))}
          </div>
          
          {generalStats.tiempoCarga > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <Info size={16} className="text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p>
                    Última sincronización completada en {generalStats.tiempoCarga.toFixed(2)} segundos.
                  </p>
                  {generalStats.completitudGeneral < 100 && (
                    <p className="mt-1 text-amber-700">
                      ⚠️ La completitud general es del {generalStats.completitudGeneral.toFixed(1)}%. 
                      Algunos datos podrían estar incompletos.
                    </p>
                  )}
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
