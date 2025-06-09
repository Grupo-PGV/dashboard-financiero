// chipaxService.js - Servicio con endpoints correctos según documentación
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token
let tokenCache = {
  token: null,
  expiresAt: null
};

// Configuración de paginación
const PAGINATION_CONFIG = {
  PAGE_SIZE: 50,
  MAX_PAGES: 150, // Aumentado para poder cargar todos los datos de compras
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000
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

  console.log('🔐 Obteniendo nuevo token de Chipax...');
  
  try {
    const response = await fetch(`${CHIPAX_API_URL}/login`, {
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
    console.log('🏢 Empresa:', data.nombre || 'N/A');
    
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache = { token: null, expiresAt: null };
    throw error;
  }
};

/**
 * Realiza petición a la API
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    const headers = {
      ...options.headers,
      'Authorization': `JWT ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
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
        tokenCache = { token: null, expiresAt: null };
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

// === ENDPOINTS ESPECÍFICOS CORREGIDOS SEGÚN DOCUMENTACIÓN ===

/**
 * Obtiene las cuentas corrientes (saldos bancarios)
 * Endpoint: /cuentas-corrientes
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo cuentas corrientes...');
  try {
    const data = await fetchAllPaginatedData('/cuentas-corrientes');
    console.log(`✅ ${data.items.length} cuentas corrientes obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo cuentas corrientes:', error);
    throw error;
  }
};

/**
 * Obtiene los DTEs (facturas de venta/cuentas por cobrar)
 * Endpoint: /dtes?porCobrar=1
 */
export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo DTEs (facturas por cobrar)...');
  try {
    // Usar el parámetro porCobrar=1 para obtener solo las facturas pendientes de cobro
    const data = await fetchAllPaginatedData('/dtes?porCobrar=1');
    
    console.log(`✅ ${data.items.length} facturas por cobrar obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo DTEs:', error);
    throw error;
  }
};

/**
 * Obtiene las compras (cuentas por pagar)
 * Endpoint: /compras
 */
export const obtenerCuentasPorPagar = async () => {
  console.log('\n💸 Obteniendo compras (cuentas por pagar)...');
  try {
    const data = await fetchAllPaginatedData('/compras');
    
    // Filtrar solo las pendientes de pago si es necesario
    if (data.items && data.items.length > 0) {
      const todasLasCompras = data.items.length;
      
      // Filtrar las que no tienen fecha de pago interna o están pendientes
      data.items = data.items.filter(compra => 
        !compra.fechaPagoInterna || 
        compra.estado === 'pendiente' ||
        compra.estado === 'aceptado' // Las aceptadas pueden estar pendientes de pago
      );
      
      console.log(`📊 De ${todasLasCompras} compras, ${data.items.length} están pendientes de pago`);
    }
    
    console.log(`✅ ${data.items.length} compras por pagar obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    throw error;
  }
};

/**
 * Obtiene la lista de clientes
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
 * Obtiene la lista de proveedores
 * Endpoint: /proveedores
 */
export const obtenerProveedores = async () => {
  console.log('\n🏭 Obteniendo proveedores...');
  try {
    const data = await fetchAllPaginatedData('/proveedores');
    console.log(`✅ ${data.items.length} proveedores obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    throw error;
  }
};

/**
 * Obtiene el flujo de caja desde cartolas
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
 * Obtiene honorarios
 * Endpoint: /honorarios
 */
export const obtenerHonorarios = async () => {
  console.log('\n📄 Obteniendo honorarios...');
  try {
    const data = await fetchAllPaginatedData('/honorarios');
    console.log(`✅ ${data.items.length} honorarios obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo honorarios:', error);
    throw error;
  }
};

/**
 * Obtiene boletas de terceros
 * Endpoint: /boletas-terceros
 */
export const obtenerBoletasTerceros = async () => {
  console.log('\n📋 Obteniendo boletas de terceros...');
  try {
    const data = await fetchAllPaginatedData('/boletas-terceros');
    console.log(`✅ ${data.items.length} boletas de terceros obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo boletas de terceros:', error);
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
  obtenerProveedores,
  obtenerFlujoCaja,
  obtenerHonorarios,
  obtenerBoletasTerceros
};

export default chipaxService;
