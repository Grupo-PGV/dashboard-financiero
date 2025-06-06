// chipaxService.js - Servicio corregido con APP_ID y SECRET_KEY
const CHIPAX_API_URL = 'https://api.chipax.com/v2'; // URL base de la API v2
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token para evitar múltiples autenticaciones
let tokenCache = {
  token: null,
  expiresAt: null
};

// Configuración de paginación
const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 3,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  REQUEST_DELAY: 200,
  TIMEOUT: 30000
};

/**
 * Obtiene el token de autenticación de Chipax
 * @returns {Promise<string>} Token JWT
 */
export const getChipaxToken = async () => {
  const now = new Date();
  
  // Verificar si el token en cache es válido
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token en cache');
    return tokenCache.token;
  }

  console.log('🔐 Obteniendo nuevo token de Chipax...');
  console.log('🔑 APP_ID:', APP_ID.substring(0, 8) + '...');
  
  try {
    // Intentar con la URL directa primero
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
    console.log('📍 URL utilizada:', `${CHIPAX_API_URL}/login`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa, estructura:', Object.keys(data));
    
    // La API puede devolver el token en diferentes campos
    const token = data.token || data.access_token || data.jwt;
    
    if (!token) {
      console.error('❌ No se encontró token en la respuesta:', data);
      throw new Error('Token no encontrado en la respuesta');
    }
    
    // Guardar token en cache
    tokenCache = {
      token: token,
      // Manejar diferentes formatos de expiración
      expiresAt: data.tokenExpiration 
        ? new Date(data.tokenExpiration * 1000)
        : data.expires_at 
        ? new Date(data.expires_at)
        : new Date(now.getTime() + 3600000) // 1 hora por defecto
    };
    
    console.log('✅ Token obtenido exitosamente. Expira:', tokenCache.expiresAt.toLocaleString());
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    console.error('💡 Verifica que la URL y credenciales sean correctas');
    // Limpiar cache en caso de error
    tokenCache = { token: null, expiresAt: null };
    throw error;
  }
};

/**
 * Realiza una petición a la API de Chipax
 * @param {string} endpoint - Endpoint a consultar
 * @param {object} options - Opciones de fetch
 * @param {boolean} showLogs - Mostrar logs detallados
 * @returns {Promise<object>} Respuesta de la API
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    
    // Construir URL completa
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Probar diferentes formatos de autorización
    if (token.startsWith('JWT ') || token.startsWith('Bearer ')) {
      headers['Authorization'] = token;
    } else {
      // Por defecto usar JWT
      headers['Authorization'] = `JWT ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (showLogs) {
      console.log(`🔍 Llamando a: ${endpoint} - Status: ${response.status}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      if (showLogs) console.error(`❌ Error en ${endpoint}:`, text);
      
      // Si es 401, limpiar cache y reintentar una vez
      if (response.status === 401 && !options._retry) {
        console.log('🔄 Token expirado, reintentando...');
        tokenCache = { token: null, expiresAt: null };
        return fetchFromChipax(endpoint, { ...options, _retry: true }, showLogs);
      }
      
      if (response.status === 404) {
        console.log(`⚠️ Endpoint no encontrado: ${url}`);
        return { items: [] };
      }
      
      throw new Error(`Error ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    if (showLogs) {
      console.log(`📦 Datos recibidos de ${endpoint}`);
      if (data.paginationAttributes) {
        console.log('📄 Info de paginación:', data.paginationAttributes);
      }
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error en petición a ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Obtiene todas las páginas de un endpoint con paginación
 * @param {string} baseEndpoint - Endpoint base sin parámetros de página
 * @returns {Promise<object>} Todos los items combinados con estadísticas
 */
export const fetchAllPaginatedData = async (baseEndpoint) => {
  console.log(`\n📊 === INICIANDO CARGA PAGINADA DE ${baseEndpoint} ===`);
  
  const paginationStats = {
    totalPages: 0,
    loadedPages: 0,
    failedPages: [],
    totalItems: 0,
    loadedItems: 0,
    startTime: new Date(),
    endTime: null,
    completenessPercent: 0
  };
  
  try {
    // Obtener primera página para conocer el total
    const separator = baseEndpoint.includes('?') ? '&' : '?';
    const firstPageEndpoint = `${baseEndpoint}${separator}page=1&limit=50`;
    
    console.log(`📄 Obteniendo primera página...`);
    const firstPageData = await fetchFromChipax(firstPageEndpoint, {}, false);
    
    // Verificar si hay paginación
    if (!firstPageData.paginationAttributes) {
      console.log('📋 No hay paginación, devolviendo respuesta directa');
      
      const items = Array.isArray(firstPageData) ? 
        firstPageData : 
        (firstPageData.items || [firstPageData]);
      
      paginationStats.totalItems = items.length;
      paginationStats.loadedItems = items.length;
      paginationStats.completenessPercent = 100;
      paginationStats.endTime = new Date();
      
      return {
        items,
        paginationStats,
        rawResponse: firstPageData
      };
    }
    
    const totalPages = firstPageData.paginationAttributes.totalPages || 1;
    const totalCount = firstPageData.paginationAttributes.totalCount || 0;
    
    paginationStats.totalPages = totalPages;
    paginationStats.totalItems = totalCount;
    
    console.log(`📊 Total: ${totalCount} items en ${totalPages} páginas`);
    
    // Si solo hay una página
    if (totalPages === 1) {
      paginationStats.loadedPages = 1;
      paginationStats.loadedItems = firstPageData.items.length;
      paginationStats.completenessPercent = 100;
      paginationStats.endTime = new Date();
      
      return {
        items: firstPageData.items,
        paginationStats
      };
    }
    
    // Preparar para cargar múltiples páginas
    const allItems = [...firstPageData.items];
    paginationStats.loadedPages = 1;
    paginationStats.loadedItems = firstPageData.items.length;
    
    // Función helper para cargar una página
    const loadPage = async (pageNum) => {
      try {
        const pageEndpoint = `${baseEndpoint}${separator}page=${pageNum}&limit=50`;
        const pageData = await fetchFromChipax(pageEndpoint, {}, false);
        
        if (pageData.items && pageData.items.length > 0) {
          return { success: true, items: pageData.items, page: pageNum };
        }
        
        return { success: false, items: [], page: pageNum, error: 'No items' };
      } catch (error) {
        console.error(`❌ Error cargando página ${pageNum}:`, error.message);
        return { success: false, items: [], page: pageNum, error: error.message };
      }
    };
    
    // Cargar páginas en lotes para evitar sobrecarga
    console.log(`🚀 Cargando ${totalPages - 1} páginas adicionales...`);
    
    for (let i = 2; i <= totalPages; i += PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS) {
      const batch = [];
      const batchEnd = Math.min(i + PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS - 1, totalPages);
      
      // Crear batch de promesas
      for (let j = i; j <= batchEnd; j++) {
        batch.push(loadPage(j));
      }
      
      // Ejecutar batch
      console.log(`📦 Cargando páginas ${i} a ${batchEnd}...`);
      const batchResults = await Promise.all(batch);
      
      // Procesar resultados
      for (const result of batchResults) {
        if (result.success) {
          allItems.push(...result.items);
          paginationStats.loadedPages++;
          paginationStats.loadedItems += result.items.length;
        } else {
          paginationStats.failedPages.push(result.page);
        }
      }
      
      // Actualizar progreso
      paginationStats.completenessPercent = Math.round(
        (paginationStats.loadedItems / paginationStats.totalItems) * 100
      );
      
      console.log(`📊 Progreso: ${paginationStats.completenessPercent}% (${paginationStats.loadedItems}/${paginationStats.totalItems})`);
      
      // Delay entre lotes
      if (batchEnd < totalPages) {
        await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));
      }
    }
    
    paginationStats.endTime = new Date();
    const duration = (paginationStats.endTime - paginationStats.startTime) / 1000;
    
    console.log(`\n✅ === CARGA COMPLETADA ===`);
    console.log(`📊 Items cargados: ${paginationStats.loadedItems}/${paginationStats.totalItems}`);
    console.log(`📄 Páginas cargadas: ${paginationStats.loadedPages}/${paginationStats.totalPages}`);
    console.log(`⏱️ Duración: ${duration.toFixed(2)} segundos`);
    
    if (paginationStats.failedPages.length > 0) {
      console.log(`⚠️ Páginas fallidas: ${paginationStats.failedPages.join(', ')}`);
    }
    
    return {
      items: allItems,
      paginationStats
    };
    
  } catch (error) {
    console.error('❌ Error en carga paginada:', error);
    paginationStats.endTime = new Date();
    
    return {
      items: [],
      paginationStats,
      error: error.message
    };
  }
};

// === FUNCIONES ESPECÍFICAS DE ENDPOINTS ===

/**
 * Obtiene los saldos bancarios
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo saldos bancarios...');
  try {
    const data = await fetchAllPaginatedData('/cuentas_corrientes');
    console.log(`✅ ${data.items.length} cuentas bancarias obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo saldos:', error);
    throw error;
  }
};

/**
 * Obtiene las cuentas por cobrar (ventas)
 */
export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo cuentas por cobrar...');
  try {
    // Intentar con diferentes endpoints según la documentación
    let data = await fetchAllPaginatedData('/ventas?pendiente=true');
    
    // Si no hay datos, intentar sin filtro
    if (!data.items || data.items.length === 0) {
      console.log('🔄 Intentando sin filtro de pendientes...');
      data = await fetchAllPaginatedData('/ventas');
    }
    
    console.log(`✅ ${data.items.length} cuentas por cobrar obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por cobrar:', error);
    throw error;
  }
};

/**
 * Obtiene las cuentas por pagar (compras)
 */
export const obtenerCuentasPorPagar = async () => {
  console.log('\n💸 Obteniendo cuentas por pagar...');
  try {
    // Intentar con diferentes endpoints según la documentación
    let data = await fetchAllPaginatedData('/compras?pendiente=true');
    
    // Si no hay datos, intentar sin filtro
    if (!data.items || data.items.length === 0) {
      console.log('🔄 Intentando sin filtro de pendientes...');
      data = await fetchAllPaginatedData('/compras');
    }
    
    console.log(`✅ ${data.items.length} cuentas por pagar obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por pagar:', error);
    throw error;
  }
};

/**
 * Obtiene la lista de clientes
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

// Exportar como objeto default para compatibilidad
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
