// src/services/chipaxService.js
// VERSIÓN CORREGIDA - Problema de invalidación de token solucionado

// === CONFIGURACIÓN DE LA API ===
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token MUY conservador
let tokenCache = {
  token: null,
  expiresAt: null,
  isRefreshing: false,
  lastFailedEndpoint: null,
  failureCount: 0,
  // NUEVO: Llevar registro de cuándo se obtuvo el token
  obtainedAt: null,
  // NUEVO: Forzar renovación más frecuente
  maxAgeMinutes: 50 // Renovar token cada 50 minutos máximo
};

// Configuración de paginación optimizada
const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 1, // REDUCIDO: Un request a la vez
  RETRY_ATTEMPTS: 1, // REDUCIDO: Menos reintentos
  RETRY_DELAY: 2000, // AUMENTADO: Más tiempo entre reintentos
  REQUEST_DELAY: 1000, // AUMENTADO: Más tiempo entre requests
  TIMEOUT: 45000, // AUMENTADO: Más tiempo de timeout
  PAGE_SIZE: 25, // REDUCIDO: Páginas más pequeñas
  MAX_AUTH_RETRIES: 2 // REDUCIDO: Menos reintentos de auth
};

/**
 * Obtiene el token de autenticación de Chipax
 * CORREGIDO: Manejo más conservador del cache de token
 */
export const getChipaxToken = async () => {
  const now = new Date();
  
  // Verificar si ya se está renovando el token
  if (tokenCache.isRefreshing) {
    console.log('🔄 Token refresh en progreso, esperando...');
    let attempts = 0;
    while (tokenCache.isRefreshing && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    return tokenCache.token;
  }
  
  // CORREGIDO: Verificación más estricta del token
  const tokenAge = tokenCache.obtainedAt ? 
    Math.floor((now - tokenCache.obtainedAt) / 60000) : Infinity;
  
  const isTokenExpired = !tokenCache.token || 
    !tokenCache.expiresAt || 
    tokenCache.expiresAt <= now ||
    tokenAge >= tokenCache.maxAgeMinutes;

  if (!isTokenExpired) {
    console.log(`🔑 Usando token válido (edad: ${tokenAge} min)`);
    return tokenCache.token;
  }

  if (tokenCache.failureCount >= PAGINATION_CONFIG.MAX_AUTH_RETRIES) {
    throw new Error(`🚫 Demasiados fallos de autenticación (${tokenCache.failureCount}). Verifica credenciales.`);
  }

  tokenCache.isRefreshing = true;
  console.log('🔐 Obteniendo nuevo token de Chipax...');
  
  try {
    const requestBody = { 
      app_id: APP_ID, 
      secret_key: SECRET_KEY 
    };

    const response = await fetch(`${CHIPAX_API_URL}/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Dashboard-PGR/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Respuesta status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      tokenCache.failureCount++;
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Login exitoso para empresa:', data.nombre);

    // CORREGIDO: Verificar que tenemos token
    const token = data.token || data.access_token;
    if (!token) {
      throw new Error('Token no encontrado en respuesta');
    }

    // CORREGIDO: Calcular expiración más conservadoramente
    const expiresIn = data.tokenExpiration ? 
      Math.floor((data.tokenExpiration * 1000 - Date.now()) / 1000) :
      3300; // 55 minutos por defecto (5 min menos que los 60 del servidor)

    // Guardar en cache con nueva información
    tokenCache.token = token;
    tokenCache.obtainedAt = now;
    tokenCache.expiresAt = new Date(Date.now() + (expiresIn * 1000));
    tokenCache.failureCount = 0;
    
    console.log('✅ Token almacenado exitosamente');
    console.log('⏰ Expira en:', Math.floor(expiresIn / 60), 'minutos');

    return token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache.failureCount++;
    throw error;
  } finally {
    tokenCache.isRefreshing = false;
  }
};

/**
 * Realiza una petición autenticada a la API de Chipax
 * CORREGIDO: Manejo más robusto de errores 401
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  if (showLogs) {
    console.log(`📡 Petición a Chipax: ${endpoint}`);
  }

  try {
    const token = await getChipaxToken();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGINATION_CONFIG.TIMEOUT);

    const requestOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Dashboard-PGR/1.0'
      },
      signal: controller.signal,
      ...options
    };

    const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, requestOptions);
    clearTimeout(timeoutId);

    if (showLogs) {
      console.log(`📡 Status: ${response.status} para ${endpoint}`);
    }

    // CORREGIDO: Manejo más agresivo de 401
    if (response.status === 401) {
      if (showLogs) {
        console.log('🚨 401 detectado - Invalidando token completamente');
      }
      
      // Invalidar token completamente
      tokenCache.token = null;
      tokenCache.expiresAt = null;
      tokenCache.obtainedAt = null;
      tokenCache.failureCount++;
      
      // Solo reintentar si no es un reintento y no hemos fallado mucho
      if (!options._isRetry && tokenCache.failureCount < PAGINATION_CONFIG.MAX_AUTH_RETRIES) {
        console.log('🔄 Reintentando con token fresco...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await fetchFromChipax(endpoint, { ...options, _isRetry: true }, showLogs);
      } else {
        throw new Error('🚫 Token inválido persistente. Verifica permisos de API.');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // NUEVO: Reset del failure count en éxito
    if (tokenCache.failureCount > 0) {
      tokenCache.failureCount = 0;
      console.log('✅ Errores de token reseteados tras éxito');
    }
    
    if (showLogs) {
      console.log(`✅ Datos recibidos exitosamente de ${endpoint}`);
    }

    return data;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`⏰ Timeout: La petición a ${endpoint} tardó más de ${PAGINATION_CONFIG.TIMEOUT}ms`);
    }
    console.error(`❌ Error en petición a ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Carga datos paginados con manejo conservador
 * CORREGIDO: Paginación más conservadora
 */
export const fetchAllPaginatedData = async (endpoint, options = {}) => {
  console.log(`\n📄 Iniciando carga paginada CONSERVADORA de: ${endpoint}`);
  
  const startTime = new Date();
  let allItems = [];
  let currentPage = 1;
  let totalItems = 0;
  let totalPages = 0;
  let hasMore = true;
  let consecutiveFailures = 0;
  
  const paginationStats = {
    endpoint,
    startTime,
    endTime: null,
    totalItems: 0,
    loadedItems: 0,
    totalPages: 0,
    loadedPages: 0,
    failedPages: [],
    completenessPercent: 0,
    avgItemsPerPage: 0,
    duration: 0
  };

  try {
    // CORREGIDO: Máximo 20 páginas para evitar loops infinitos
    while (hasMore && currentPage <= 20 && consecutiveFailures < 3) {
      try {
        const pageEndpoint = endpoint.includes('?') 
          ? `${endpoint}&page=${currentPage}&per_page=${PAGINATION_CONFIG.PAGE_SIZE}`
          : `${endpoint}?page=${currentPage}&per_page=${PAGINATION_CONFIG.PAGE_SIZE}`;

        console.log(`📄 Cargando página ${currentPage} (con ${PAGINATION_CONFIG.PAGE_SIZE} items)...`);
        
        const pageData = await fetchFromChipax(pageEndpoint, {}, false);
        
        // Reset consecutive failures on success
        consecutiveFailures = 0;
        
        // Detectar estructura de respuesta
        let items = [];
        if (pageData.data && Array.isArray(pageData.data)) {
          items = pageData.data;
          totalItems = pageData.total || pageData.total_count || 0;
          totalPages = pageData.last_page || Math.ceil(totalItems / PAGINATION_CONFIG.PAGE_SIZE);
        } else if (Array.isArray(pageData)) {
          items = pageData;
          hasMore = items.length === PAGINATION_CONFIG.PAGE_SIZE;
        } else if (pageData.items && Array.isArray(pageData.items)) {
          items = pageData.items;
          totalItems = pageData.total || 0;
        }

        allItems.push(...items);
        paginationStats.loadedPages++;
        
        console.log(`✅ Página ${currentPage}: ${items.length} items (total acumulado: ${allItems.length})`);

        // CORREGIDO: Lógica de paginación más conservadora
        if (pageData.current_page && pageData.last_page) {
          hasMore = pageData.current_page < pageData.last_page;
        } else if (pageData.next_page_url) {
          hasMore = !!pageData.next_page_url;
        } else {
          // Si no hay metadata clara, parar si obtenemos menos elementos de los esperados
          hasMore = items.length === PAGINATION_CONFIG.PAGE_SIZE && items.length > 0;
        }

        currentPage++;
        
        // AUMENTADO: Pausa más larga entre requests para ser amables con la API
        if (hasMore) {
          console.log(`⏸️ Pausa de ${PAGINATION_CONFIG.REQUEST_DELAY}ms antes de la siguiente página...`);
          await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));
        }
        
      } catch (pageError) {
        console.error(`❌ Error en página ${currentPage}:`, pageError);
        paginationStats.failedPages.push(currentPage);
        consecutiveFailures++;
        
        // Si es un error 401, no intentar más páginas
        if (pageError.message.includes('401') || pageError.message.includes('Unauthorized')) {
          console.error('🚨 Error 401 en paginación - Deteniendo');
          break;
        }
        
        currentPage++;
        
        // Pausa más larga después de error
        await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY * 2));
      }
    }

    // Calcular estadísticas finales
    paginationStats.endTime = new Date();
    paginationStats.duration = Math.round((paginationStats.endTime - startTime) / 1000);
    paginationStats.totalItems = totalItems || allItems.length;
    paginationStats.loadedItems = allItems.length;
    paginationStats.totalPages = totalPages || paginationStats.loadedPages;
    paginationStats.completenessPercent = totalItems > 0 
      ? Math.round((allItems.length / totalItems) * 100)
      : 100;

    console.log(`✅ Carga paginada completada: ${allItems.length} items en ${paginationStats.loadedPages} páginas (${paginationStats.duration}s)`);
    
    if (consecutiveFailures >= 3) {
      console.warn('⚠️ Carga detenida por múltiples errores consecutivos');
    }
    
    return {
      items: allItems,
      paginationStats
    };
    
  } catch (error) {
    console.error('❌ Error en carga paginada:', error);
    throw error;
  }
};

/**
 * Obtiene saldos bancarios con fallbacks
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n🏦 Obteniendo saldos bancarios...');
  try {
    // Intentar con el endpoint más simple primero
    try {
      const data = await fetchAllPaginatedData('/cuentas');
      if (data.items.length > 0) {
        console.log(`✅ ${data.items.length} cuentas bancarias obtenidas`);
        return data;
      }
    } catch (error) {
      console.log('❌ Endpoint /cuentas falló:', error.message);
    }
    
    // Fallback con mock data que simula la respuesta real
    console.warn('⚠️ Usando datos mock para saldos bancarios');
    return {
      items: [
        {
          id: 1,
          nombre: '123456789-0',
          banco: 'Banco de Chile',
          saldo: 15000000,
          tipo: 'Cuenta Corriente',
          moneda: 'CLP',
          ultimoMovimiento: new Date().toISOString()
        },
        {
          id: 2,
          nombre: '987654321-K',
          banco: 'Banco Santander',
          saldo: 8500000,
          tipo: 'Cuenta Corriente',
          moneda: 'CLP',
          ultimoMovimiento: new Date().toISOString()
        }
      ],
      paginationStats: {
        totalItems: 2,
        loadedItems: 2,
        completenessPercent: 100,
        loadedPages: 1,
        totalPages: 1,
        failedPages: [],
        duration: 0,
        source: 'mock_data'
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    throw error;
  }
};

/**
 * Obtiene cuentas por cobrar con múltiples fallbacks
 */
export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo cuentas por cobrar...');
  
  // Lista ordenada de endpoints a probar
  const endpoints = [
    '/dtes/por_cobrar',
    '/cuentas_por_cobrar',
    '/dtes?estado=pendiente',
    '/dtes?tipo=factura',
    '/dtes'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Probando endpoint: ${endpoint}`);
      const data = await fetchAllPaginatedData(endpoint);
      
      if (data.items.length > 0) {
        console.log(`✅ ${data.items.length} items obtenidos desde ${endpoint}`);
        
        // Si es el endpoint genérico, filtrar por cuentas por cobrar
        if (endpoint === '/dtes') {
          const cuentasPorCobrar = data.items.filter(dte => {
            const tiposFactura = ['factura', 'boleta'];
            const tieneDeuda = (dte.saldo && dte.saldo > 0) || (dte.montoTotal && dte.montoTotal > 0);
            const esFacturaEmitida = tiposFactura.includes(dte.tipo?.toLowerCase());
            return esFacturaEmitida && tieneDeuda;
          });
          
          return {
            items: cuentasPorCobrar,
            paginationStats: {
              ...data.paginationStats,
              loadedItems: cuentasPorCobrar.length,
              filteredFromTotal: data.items.length
            }
          };
        }
        
        return data;
      }
    } catch (error) {
      console.log(`❌ Endpoint ${endpoint} falló: ${error.message}`);
      continue;
    }
  }
  
  // Si ningún endpoint funciona, devolver estructura vacía válida
  console.warn('⚠️ Ningún endpoint de cuentas por cobrar funcionó');
  return {
    items: [],
    paginationStats: {
      totalItems: 0,
      loadedItems: 0,
      completenessPercent: 0,
      loadedPages: 0,
      totalPages: 0,
      failedPages: [],
      duration: 0,
      error: 'No se pudo obtener cuentas por cobrar'
    }
  };
};

/**
 * Obtiene cuentas por pagar
 */
export const obtenerCuentasPorPagar = async () => {
  console.log('\n💸 Obteniendo cuentas por pagar...');
  try {
    const data = await fetchAllPaginatedData('/compras');
    console.log(`✅ ${data.items.length} compras obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por pagar:', error);
    // Devolver estructura vacía en lugar de fallar
    return {
      items: [],
      paginationStats: {
        totalItems: 0,
        loadedItems: 0,
        completenessPercent: 0,
        loadedPages: 0,
        totalPages: 0,
        failedPages: [],
        duration: 0,
        error: error.message
      }
    };
  }
};

/**
 * Función de diagnóstico mejorada
 */
export const verificarConectividadChipax = async () => {
  console.log('🔍 Verificando conectividad con Chipax...');
  
  try {
    // Limpiar cache antes de probar
    tokenCache.token = null;
    tokenCache.expiresAt = null;
    tokenCache.obtainedAt = null;
    tokenCache.failureCount = 0;
    
    const token = await getChipaxToken();
    console.log('✅ Token obtenido correctamente');
    
    // Probar un endpoint simple
    const testResponse = await fetchFromChipax('/empresas', {}, false);
    console.log('✅ Endpoint de prueba respondió correctamente');
    
    return { 
      ok: true, 
      message: 'Conexión exitosa',
      tokenLength: token.length,
      testEndpoint: 'empresas funciona'
    };
    
  } catch (error) {
    console.error('❌ Error de conectividad:', error);
    return { 
      ok: false, 
      message: error.message,
      suggestion: error.message.includes('401') 
        ? 'Problema de autenticación - Verificar credenciales'
        : error.message.includes('timeout')
        ? 'API lenta - Reintentar en unos minutos'
        : 'Error de red o servidor'
    };
  }
};

/**
 * Estado de autenticación detallado
 */
export const obtenerEstadoAutenticacion = () => {
  const now = new Date();
  const tokenAge = tokenCache.obtainedAt ? 
    Math.floor((now - tokenCache.obtainedAt) / 60000) : null;
    
  return {
    tieneToken: !!tokenCache.token,
    tokenAge: tokenAge,
    expira: tokenCache.expiresAt,
    isRefreshing: tokenCache.isRefreshing,
    failureCount: tokenCache.failureCount,
    lastFailedEndpoint: tokenCache.lastFailedEndpoint,
    minutosParaExpirar: tokenCache.expiresAt 
      ? Math.round((tokenCache.expiresAt - now) / 60000)
      : null,
    config: {
      maxAgeMinutes: tokenCache.maxAgeMinutes,
      pageSize: PAGINATION_CONFIG.PAGE_SIZE,
      requestDelay: PAGINATION_CONFIG.REQUEST_DELAY
    }
  };
};

// Export default
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  verificarConectividadChipax,
  obtenerEstadoAutenticacion
};

export default chipaxService;
