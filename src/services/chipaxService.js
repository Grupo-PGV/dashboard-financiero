// chipaxService.js - Servicio con endpoints oficiales de Chipax

const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token
let tokenCache = {
  token: null,
  expiresAt: null,
  isRefreshing: false
};

// Configuración de paginación
const PAGINATION_CONFIG = {
  PAGE_SIZE: 50,
  MAX_PAGES: 150
};

/**
 * Obtiene el token de autenticación
 */
export const getChipaxToken = async () => {
  const now = new Date();
  
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token en cache');
    return tokenCache.token;
  }

  if (tokenCache.isRefreshing) {
    console.log('🔄 Token refresh en progreso, esperando...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return tokenCache.token;
  }

  tokenCache.isRefreshing = true;
  console.log('🔐 Obteniendo nuevo token de Chipax...');
  
  try {
    const response = await fetch(`${CHIPAX_API_URL}/auth`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        app_id: APP_ID, 
        secret_key: SECRET_KEY 
      })
    });

    console.log('📡 Respuesta status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Token obtenido exitosamente');
    
    tokenCache = {
      token: data.token,
      expiresAt: new Date(Date.now() + (50 * 60 * 1000)), // 50 minutos
      isRefreshing: false
    };
    
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache = { token: null, expiresAt: null, isRefreshing: false };
    throw error;
  }
};

/**
 * Realiza petición a la API con Authorization header
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    const headers = {
      'Authorization': `JWT ${token}`,  // ✅ Header de autorización
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (showLogs) {
      console.log(`🔍 ${endpoint} - Status: ${response.status}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      
      // Si es 401, reintentar con nuevo token
      if (response.status === 401 && !options._retry) {
        console.log('🔄 Token expirado, reintentando...');
        tokenCache = { token: null, expiresAt: null, isRefreshing: false };
        return fetchFromChipax(endpoint, { ...options, _retry: true }, showLogs);
      }
      
      throw new Error(`Error ${response.status}: ${text}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error(`❌ Error en ${endpoint}:`, error.message);
    throw error;
  }
};

/**
 * Obtiene todas las páginas de un endpoint
 */
export const fetchAllPaginatedData = async (baseEndpoint) => {
  console.log(`📊 Cargando datos paginados de ${baseEndpoint}...`);
  
  let allItems = [];
  let page = 1;
  let hasMore = true;
  
  try {
    while (hasMore && page <= PAGINATION_CONFIG.MAX_PAGES) {
      const separator = baseEndpoint.includes('?') ? '&' : '?';
      const endpoint = `${baseEndpoint}${separator}page=${page}&limit=${PAGINATION_CONFIG.PAGE_SIZE}`;
      
      const data = await fetchFromChipax(endpoint, {}, page === 1);
      
      // Manejo de diferentes estructuras de respuesta
      if (data.items && Array.isArray(data.items)) {
        allItems = [...allItems, ...data.items];
        
        if (data.paginationAttributes) {
          const { currentPage, totalPages } = data.paginationAttributes;
          hasMore = currentPage < totalPages;
          
          if (page === 1) {
            console.log(`📄 Total: ${data.paginationAttributes.count || data.paginationAttributes.totalCount} items en ${totalPages} páginas`);
          }
        } else {
          hasMore = false;
        }
      } else if (Array.isArray(data)) {
        // Si la respuesta es directamente un array
        allItems = [...allItems, ...data];
        hasMore = data.length === PAGINATION_CONFIG.PAGE_SIZE;
      } else if (data.docs && Array.isArray(data.docs)) {
        // Para flujo de caja que usa 'docs' en lugar de 'items'
        allItems = [...allItems, ...data.docs];
        hasMore = data.pages ? page < data.pages : false;
      } else {
        hasMore = false;
      }
      
      page++;
    }
    
    console.log(`✅ Total cargado: ${allItems.length} items`);
    
    return {
      items: allItems,
      paginationStats: {
        totalItems: allItems.length,
        pagesLoaded: page - 1
      }
    };
    
  } catch (error) {
    console.error('❌ Error en carga paginada:', error);
    return {
      items: allItems,
      error: error.message
    };
  }
};

// === ENDPOINTS ESPECÍFICOS CORREGIDOS ===

/**
 * ✅ CORREGIDO: Obtiene cuentas corrientes y calcula saldos desde cartolas
 * Endpoints: /cuentas-corrientes + /flujo-caja/cartolas
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo saldos bancarios...');
  
  try {
    // 1. Obtener cuentas corrientes
    console.log('📋 Obteniendo cuentas corrientes...');
    const cuentasData = await fetchAllPaginatedData('/cuentas-corrientes');
    const cuentas = cuentasData.items;
    
    if (cuentas.length === 0) {
      console.warn('⚠️ No se encontraron cuentas corrientes');
      return { items: [], paginationStats: { totalItems: 0, pagesLoaded: 0 } };
    }
    
    console.log(`✅ ${cuentas.length} cuentas corrientes obtenidas`);
    
    // 2. Obtener cartolas para calcular saldos
    console.log('📊 Obteniendo cartolas para calcular saldos...');
    const cartolasData = await fetchAllPaginatedData('/flujo-caja/cartolas');
    const cartolas = cartolasData.items;
    
    console.log(`✅ ${cartolas.length} movimientos de cartola obtenidos`);
    
    // 3. Calcular saldos por cuenta corriente
    const saldosPorCuenta = {};
    
    cartolas.forEach(cartola => {
      const cuentaId = cartola.cuentaCorriente;
      if (!saldosPorCuenta[cuentaId]) {
        saldosPorCuenta[cuentaId] = {
          totalIngresos: 0,
          totalEgresos: 0,
          saldoFinal: 0,
          ultimaFecha: null
        };
      }
      
      const monto = parseFloat(cartola.monto) || 0;
      const fecha = new Date(cartola.fecha);
      
      if (cartola.tipo === 'ingreso') {
        saldosPorCuenta[cuentaId].totalIngresos += monto;
      } else if (cartola.tipo === 'egreso') {
        saldosPorCuenta[cuentaId].totalEgresos += monto;
      }
      
      // Actualizar fecha más reciente
      if (!saldosPorCuenta[cuentaId].ultimaFecha || fecha > saldosPorCuenta[cuentaId].ultimaFecha) {
        saldosPorCuenta[cuentaId].ultimaFecha = fecha;
      }
    });
    
    // Calcular saldo final por cuenta
    Object.keys(saldosPorCuenta).forEach(cuentaId => {
      const cuenta = saldosPorCuenta[cuentaId];
      cuenta.saldoFinal = cuenta.totalIngresos - cuenta.totalEgresos;
    });
    
    // 4. Combinar cuentas con sus saldos calculados
    const cuentasConSaldos = cuentas.map(cuenta => ({
      ...cuenta,
      saldoCalculado: saldosPorCuenta[cuenta.id]?.saldoFinal || 0,
      movimientos: {
        ingresos: saldosPorCuenta[cuenta.id]?.totalIngresos || 0,
        egresos: saldosPorCuenta[cuenta.id]?.totalEgresos || 0,
        ultimaActualizacion: saldosPorCuenta[cuenta.id]?.ultimaFecha || null
      }
    }));
    
    console.log(`💰 Saldos calculados para ${cuentasConSaldos.length} cuentas`);
    
    // Log de resumen
    const totalSaldos = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.saldoCalculado, 0);
    console.log(`💵 Saldo total calculado: $${totalSaldos.toLocaleString('es-CL')}`);
    
    return {
      items: cuentasConSaldos,
      paginationStats: {
        totalItems: cuentasConSaldos.length,
        pagesLoaded: cuentasData.paginationStats.pagesLoaded + cartolasData.paginationStats.pagesLoaded
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    throw error;
  }
};

/**
 * ✅ CORREGIDO: Obtiene DTEs de venta (cuentas por cobrar)
 * Endpoint: /dtes (Documentos Tributarios Electrónicos de venta)
 */
export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo DTEs de venta (cuentas por cobrar)...');
  
  try {
    // Obtener DTEs de venta con filtro por cobrar si existe
    let endpoint = '/dtes';
    
    // Intentar primero con filtro porCobrar
    try {
      const dataConFiltro = await fetchAllPaginatedData('/dtes?porCobrar=1');
      if (dataConFiltro.items && dataConFiltro.items.length > 0) {
        console.log(`✅ ${dataConFiltro.items.length} DTEs por cobrar obtenidos (con filtro)`);
        return dataConFiltro;
      }
    } catch (error) {
      console.log('⚠️ Filtro porCobrar no disponible, obteniendo todos los DTEs...');
    }
    
    // Si no funciona el filtro, obtener todos los DTEs
    const data = await fetchAllPaginatedData(endpoint);
    
    // Filtrar solo los que tienen saldo pendiente
    if (data.items && data.items.length > 0) {
      const dtesConSaldo = data.items.filter(dte => {
        if (dte.Saldo && dte.Saldo.saldoDeudor) {
          return parseFloat(dte.Saldo.saldoDeudor) > 0;
        }
        return true; // Incluir todos si no hay información de saldo
      });
      
      console.log(`📊 De ${data.items.length} DTEs, ${dtesConSaldo.length} tienen saldo pendiente`);
      
      return {
        items: dtesConSaldo,
        paginationStats: data.paginationStats
      };
    }
    
    console.log(`✅ ${data.items.length} DTEs de venta obtenidos`);
    return data;
    
  } catch (error) {
    console.error('❌ Error obteniendo DTEs de venta:', error);
    throw error;
  }
};

/**
 * ✅ CORREGIDO: Obtiene compras (cuentas por pagar)
 * Endpoint: /compras (Documentos Tributarios Electrónicos de compra)
 */
export const obtenerCuentasPorPagar = async () => {
  console.log('\n💸 Obteniendo compras (cuentas por pagar)...');
  
  try {
    const data = await fetchAllPaginatedData('/compras');
    
    // Filtrar solo las pendientes de pago si es necesario
    if (data.items && data.items.length > 0) {
      const todasLasCompras = data.items.length;
      
      // Filtrar las que no tienen fecha de pago o están pendientes
      const comprasPendientes = data.items.filter(compra => {
        // Si no tiene fecha de pago, está pendiente
        if (!compra.fechaPago && !compra.fechaPagoInterna) {
          return true;
        }
        
        // Si tiene saldo acreedor, está pendiente
        if (compra.Saldo && compra.Saldo.saldoAcreedor) {
          return parseFloat(compra.Saldo.saldoAcreedor) > 0;
        }
        
        // Si el estado indica que está pendiente
        if (compra.estado && ['pendiente', 'aceptado', 'aprobado'].includes(compra.estado.toLowerCase())) {
          return true;
        }
        
        return false;
      });
      
      console.log(`📊 De ${todasLasCompras} compras, ${comprasPendientes.length} están pendientes de pago`);
      
      return {
        items: comprasPendientes,
        paginationStats: data.paginationStats
      };
    }
    
    console.log(`✅ ${data.items.length} compras obtenidas`);
    return data;
    
  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    throw error;
  }
};

/**
 * ✅ Obtiene clientes
 * Endpoint: /clientes
 */
export const obtenerClientes = async () => {
  console.log('\n👥 Obteniendo clientes...');
  try {
    const data = await fetchAllPaginatedData('/clientes');
    console.log(`✅ ${data.items.length} clientes obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    throw error;
  }
};

/**
 * ✅ Obtiene el flujo de caja desde cartolas
 * Endpoint: /flujo-caja/cartolas
 */
export const obtenerFlujoCaja = async () => {
  console.log('\n💵 Obteniendo flujo de caja...');
  try {
    const data = await fetchAllPaginatedData('/flujo-caja/cartolas');
    console.log(`✅ ${data.items.length} movimientos de flujo de caja obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo flujo de caja:', error);
    throw error;
  }
};

/**
 * ✅ Obtiene movimientos
 * Endpoint: /movimientos
 */
export const obtenerMovimientos = async () => {
  console.log('\n🔄 Obteniendo movimientos...');
  try {
    const data = await fetchAllPaginatedData('/movimientos');
    console.log(`✅ ${data.items.length} movimientos obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo movimientos:', error);
    throw error;
  }
};

// Exportar todo
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerFlujoCaja,
  obtenerMovimientos
};

export default chipaxService;
