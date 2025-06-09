// chipaxService.js - Servicio corregido con endpoints v2 correctos
const CHIPAX_API_URL = 'https://api.chipax.com/v2'; // URL directa (sin proxy por ahora)
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
  MAX_PAGES: 20,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Token obtenido exitosamente');
    
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
      
      if (data.items && Array.isArray(data.items)) {
        allItems = [...allItems, ...data.items];
        
        if (data.paginationAttributes) {
          const { currentPage, totalPages } = data.paginationAttributes;
          hasMore = currentPage < totalPages;
          
          if (page === 1) {
            console.log(`📄 Total: ${data.paginationAttributes.totalCount} items en ${totalPages} páginas`);
          }
        } else {
          hasMore = false;
        }
      } else if (Array.isArray(data)) {
        // Si la respuesta es directamente un array
        allItems = [...allItems, ...data];
        hasMore = data.length === PAGINATION_CONFIG.PAGE_SIZE;
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
 * Obtiene saldos bancarios
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo saldos bancarios...');
  try {
    // Primero obtener bancos
    const bancosData = await fetchAllPaginatedData('/bancos');
    
    // Luego obtener cuentas bancarias
    const cuentasData = await fetchAllPaginatedData('/cuentas_bancarias');
    
    // Combinar información
    const saldos = cuentasData.items.map(cuenta => ({
      ...cuenta,
      banco: bancosData.items.find(b => b.id === cuenta.banco_id) || { nombre: 'Banco desconocido' }
    }));
    
    console.log(`✅ ${saldos.length} cuentas bancarias obtenidas`);
    return { items: saldos };
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos:', error);
    // Si falla, intentar endpoint alternativo
    try {
      const data = await fetchAllPaginatedData('/arrFlujoCaja');
      return data;
    } catch (altError) {
      throw error;
    }
  }
};

/**
 * Obtiene cuentas por cobrar (facturas de venta pendientes)
 */
export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo cuentas por cobrar...');
  try {
    // Usar endpoint /dtes con filtro porCobrar
    const data = await fetchAllPaginatedData('/dtes?porCobrar=1');
    
    if (!data.items || data.items.length === 0) {
      // Alternativa: obtener todas y filtrar localmente
      console.log('🔄 Intentando con todas las facturas...');
      const allData = await fetchAllPaginatedData('/dtes');
      
      data.items = allData.items.filter(doc => 
        doc.saldo_pendiente > 0 || 
        doc.estado === 'pendiente' ||
        !doc.pagado
      );
    }
    
    console.log(`✅ ${data.items.length} cuentas por cobrar obtenidas`);
    return data;
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por cobrar:', error);
    throw error;
  }
};

/**
 * Obtiene cuentas por pagar (facturas de compra pendientes)
 */
export const obtenerCuentasPorPagar = async () => {
  console.log('\n💸 Obteniendo cuentas por pagar...');
  try {
    // Usar endpoint /compras con filtro pagado=false
    let data = await fetchAllPaginatedData('/compras?pagado=false');
    
    if (!data.items || data.items.length === 0) {
      // Alternativa: obtener todas y filtrar
      console.log('🔄 Intentando con todas las compras...');
      const allData = await fetchAllPaginatedData('/compras');
      
      data.items = allData.items.filter(compra => 
        !compra.pagado || 
        compra.saldo_pendiente > 0 ||
        compra.estado === 'pendiente'
      );
    }
    
    console.log(`✅ ${data.items.length} cuentas por pagar obtenidas`);
    return data;
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por pagar:', error);
    throw error;
  }
};

/**
 * Obtiene lista de clientes
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
 * Obtiene lista de proveedores
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

// Exportar todo
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerProveedores
};

export default chipaxService;
