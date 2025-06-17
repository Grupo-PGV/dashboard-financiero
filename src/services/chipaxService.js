// chipaxService.js - Servicio completo para integración con API de Chipax
// VERSIÓN ACTUALIZADA CON SOPORTE PARA SALDOS INICIALES 2025
// chipaxService.js - VERSIÓN CORREGIDA PARA PROBLEMAS DE AUTENTICACIÓN

import { calcularSaldosActualesCorrectos, verificarTotalConChipax } from './chipaxSaldosService';

// === CONFIGURACIÓN DE LA API ===
// === CONFIGURACIÓN MEJORADA ===
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';
const COMPANY_NAME = 'PGR Seguridad S.p.A';

// Cache del token para evitar múltiples autenticaciones
// Cache del token mejorado con protección contra bucles
let tokenCache = {
  token: null,
  expiresAt: null,
  isRefreshing: false, // ✅ NUEVO: Prevenir múltiples refreshes simultáneos
  lastFailedEndpoint: null, // ✅ NUEVO: Detectar endpoints problemáticos
  failureCount: 0 // ✅ NUEVO: Contar fallos consecutivos
};

// Configuración de paginación optimizada
// Configuración con timeouts más largos para Chipax
const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 3, // ✅ REDUCIDO: Menos carga en Chipax
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000, // ✅ AUMENTADO: Más tiempo entre reintentos
  REQUEST_DELAY: 500, // ✅ AUMENTADO: Más pausa entre peticiones
  TIMEOUT: 30000, // ✅ AUMENTADO: 30 segundos timeout
  PAGE_SIZE: 50, // ✅ REDUCIDO: Páginas más pequeñas
  MAX_AUTH_RETRIES: 3 // ✅ NUEVO: Límite de reintentos de auth
};

// === FUNCIONES DE AUTENTICACIÓN ===

/**
 * Obtiene el token de autenticación de Chipax
 * @returns {Promise<string>} Token JWT
 * VERSIÓN MEJORADA: Obtiene token con protección contra bucles infinitos
 */
export const getChipaxToken = async () => {
  const now = new Date();

  // Verificar si ya se está renovando el token
  if (tokenCache.isRefreshing) {
    console.log('🔄 Token refresh en progreso, esperando...');
    // Esperar hasta que termine el refresh
    let attempts = 0;
    while (tokenCache.isRefreshing && attempts < 30) { // Max 30 segundos
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }
  
  // Verificar si el token en cache es válido
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token válido en cache');
    return tokenCache.token;
  }

  // Verificar límite de fallos
  if (tokenCache.failureCount >= PAGINATION_CONFIG.MAX_AUTH_RETRIES) {
    throw new Error(`🚫 Demasiados fallos de autenticación (${tokenCache.failureCount}). Revisa credenciales.`);
  }

  // Marcar como refreshing para prevenir bucles
  tokenCache.isRefreshing = true;

  console.log('🔐 Obteniendo nuevo token de Chipax...');
  console.log('🔑 APP_ID:', APP_ID.substring(0, 8) + '...');
  
  try {
    const response = await fetch(`${CHIPAX_API_URL}/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Dashboard-PGR/1.0' // ✅ NUEVO: User agent específico
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
      tokenCache.failureCount++;
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa:', {
      message: data.message,
      empresa: data.nombre,
      tokenRecibido: !!data.token
    });

    // Guardar token con margen de seguridad
    const expirationTime = new Date(data.tokenExpiration * 1000);
    const safeExpirationTime = new Date(expirationTime.getTime() - 60000); // ✅ 1 minuto antes
    
    tokenCache = {
      token: data.token,
      expiresAt: safeExpirationTime, // ✅ MEJORADO: Expira 1 minuto antes para seguridad
      isRefreshing: false,
      lastFailedEndpoint: null,
      failureCount: 0 // ✅ Reset contador en éxito
    };

    console.log('✅ Token obtenido exitosamente');
    console.log('⏰ Expira:', safeExpirationTime.toLocaleString());

    return data.token;

  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache.isRefreshing = false;
    tokenCache.failureCount++;
    throw error;
  }
};

/**
 * Realiza petición a la API de Chipax
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} options - Opciones adicionales
 * @param {boolean} showLogs - Mostrar logs detallados
 * @returns {Promise<Object>} Respuesta de la API
 * VERSIÓN MEJORADA: fetchFromChipax con mejor manejo de errores 401
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    if (showLogs) {
      console.log(`📡 Petición a: ${endpoint}`);
    }

    const token = await getChipaxToken();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGINATION_CONFIG.TIMEOUT);

    const requestOptions = {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Dashboard-PGR/1.0' // ✅ NUEVO: User agent específico
      },
      ...options
    };

    const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, requestOptions);
    clearTimeout(timeoutId);

    if (showLogs) {
      console.log(`📊 Status: ${response.status}`);
    }

    // ✅ MEJORADO: Manejo más inteligente del 401
    if (response.status === 401) {
      console.log('🔄 Error 401 detectado');
      
      // Verificar si este endpoint ya falló antes
      if (tokenCache.lastFailedEndpoint === endpoint) {
        console.error('🚫 El mismo endpoint falló múltiples veces:', endpoint);
        tokenCache.failureCount++;
        
        if (tokenCache.failureCount >= PAGINATION_CONFIG.MAX_AUTH_RETRIES) {
          throw new Error(`🚫 Endpoint ${endpoint} falla persistentemente. Posible problema de permisos.`);
        }
      }
      
      // Marcar endpoint problemático
      tokenCache.lastFailedEndpoint = endpoint;
      
      // Invalidar token y reintentar SOLO UNA VEZ
      console.log('🔄 Invalidando token y reintentando...');
      tokenCache = { 
        token: null, 
        expiresAt: null, 
        isRefreshing: false,
        lastFailedEndpoint: endpoint,
        failureCount: tokenCache.failureCount + 1
      };
      
      // ✅ CRÍTICO: Pausa antes de reintentar para evitar spam
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return await fetchFromChipax(endpoint, options, showLogs);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // ✅ Reset contadores en éxito
    if (tokenCache.lastFailedEndpoint === endpoint) {
      tokenCache.lastFailedEndpoint = null;
      tokenCache.failureCount = Math.max(0, tokenCache.failureCount - 1);
    }
    
    if (showLogs) {
      console.log(`✅ Datos recibidos exitosamente`);
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

// === FUNCIONES DE PAGINACIÓN ===

/**
 * Carga todos los datos paginados de un endpoint
 * @param {string} endpoint - Endpoint a consultar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Datos completos con estadísticas de paginación
 */
const fetchAllPaginatedDataOriginal = async (endpoint, options = {}) => {
  console.log(`\n📄 Iniciando carga paginada de: ${endpoint}`);
  
  const startTime = new Date();
  let allItems = [];
  let currentPage = 1;
  let totalItems = 0;
  let totalPages = 0;
  let hasMore = true;

  // Estadísticas de paginación
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
    while (hasMore && currentPage <= 150) { // Límite de seguridad
      try {
        const pageEndpoint = endpoint.includes('?') 
          ? `${endpoint}&page=${currentPage}&per_page=${PAGINATION_CONFIG.PAGE_SIZE}`
          : `${endpoint}?page=${currentPage}&per_page=${PAGINATION_CONFIG.PAGE_SIZE}`;

        console.log(`📄 Cargando página ${currentPage}...`);
        
        const data = await fetchFromChipax(pageEndpoint, options, false);
        
        if (data && data.data && Array.isArray(data.data)) {
          // Estructura estándar de Chipax
          allItems.push(...data.data);
          
          if (currentPage === 1) {
            totalItems = data.total || data.data.length;
            totalPages = data.last_page || Math.ceil(totalItems / PAGINATION_CONFIG.PAGE_SIZE);
            paginationStats.totalItems = totalItems;
            paginationStats.totalPages = totalPages;
          }
          
          hasMore = data.current_page < data.last_page;
          
          console.log(`✅ Página ${currentPage}: ${data.data.length} items (${allItems.length}/${totalItems})`);
          
        } else if (data && Array.isArray(data)) {
          // Estructura alternativa
          allItems.push(...data);
          hasMore = data.length === PAGINATION_CONFIG.PAGE_SIZE;
          
          console.log(`✅ Página ${currentPage}: ${data.length} items`);
          
        } else {
          console.log(`⚠️ Estructura inesperada en página ${currentPage}:`, data);
          hasMore = false;
        }
        
        paginationStats.loadedPages = currentPage;
        paginationStats.loadedItems = allItems.length;
        
      } catch (pageError) {
        console.error(`❌ Error en página ${currentPage}:`, pageError.message);
        paginationStats.failedPages.push(currentPage);
        
        if (paginationStats.failedPages.length >= 3) {
          console.log('🛑 Demasiados errores, deteniendo carga');
          break;
        }
      }
      
      currentPage++;
      
      // Pequeña pausa entre peticiones
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));
      }
    }

  } catch (error) {
    console.error('❌ Error general en carga paginada:', error);
    paginationStats.error = error.message;
  }
  
  // Calcular estadísticas finales
  paginationStats.endTime = new Date();
  paginationStats.duration = (paginationStats.endTime - paginationStats.startTime) / 1000;
  paginationStats.completenessPercent = paginationStats.totalItems > 0 
    ? (paginationStats.loadedItems / paginationStats.totalItems) * 100 
    : 100;
  paginationStats.avgItemsPerPage = paginationStats.loadedPages > 0 
    ? paginationStats.loadedItems / paginationStats.loadedPages 
    : 0;

  console.log(`\n📊 RESUMEN DE CARGA PAGINADA:`);
  console.log(`📄 Endpoint: ${endpoint}`);
  console.log(`📦 Items cargados: ${paginationStats.loadedItems}/${paginationStats.totalItems || 'N/A'}`);
  console.log(`📄 Páginas cargadas: ${paginationStats.loadedPages}/${paginationStats.totalPages || 'N/A'}`);
  console.log(`⏱️ Duración: ${paginationStats.duration.toFixed(2)} segundos`);
  console.log(`✅ Completitud: ${paginationStats.completenessPercent.toFixed(1)}%`);
  
  if (paginationStats.failedPages.length > 0) {
    console.log(`⚠️ Páginas fallidas: ${paginationStats.failedPages.join(', ')}`);
  }

  return {
    items: allItems,
    paginationStats
  };
};

/**
 * ✅ NUEVA FUNCIÓN: Verificar conectividad con Chipax antes de sincronizar
 */
export const verificarConectividadChipax = async () => {
  console.log('🔍 Verificando conectividad con Chipax...');
  
  try {
    // Resetear contadores
    tokenCache.failureCount = 0;
    tokenCache.lastFailedEndpoint = null;
    
    // Probar endpoint simple primero
    const response = await fetchFromChipax('/ping', {}, false);
    console.log('✅ Chipax responde correctamente');
    return { ok: true, message: 'Conexión exitosa' };
    
  } catch (error) {
    console.error('❌ Error de conectividad:', error);
    return { 
      ok: false, 
      message: error.message,
      suggestion: error.message.includes('401') 
        ? 'Verificar credenciales de API'
        : error.message.includes('timeout')
        ? 'Chipax puede estar lento, reintentar en unos minutos'
        : 'Error de red o servidor'
    };
  }
};

/**
 * VERSIÓN NUEVA: Obtiene saldos bancarios usando saldos iniciales + movimientos 2025
 * Reemplaza la función anterior que tenía problemas de precisión
 * ✅ VERSIÓN MEJORADA: obtenerSaldosBancarios con mejor manejo de errores
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo saldos bancarios con saldos iniciales...');

  try {
    // ✅ PASO 0: Verificar conectividad primero
    const conectividad = await verificarConectividadChipax();
    if (!conectividad.ok) {
      console.warn('⚠️ Problema de conectividad:', conectividad.message);
      console.log('🔄 Usando método sin flujo de caja...');
      // Continuar con saldos iniciales solamente
    }
    
    // PASO 1: Leer el archivo de saldos iniciales
    let contenidoSaldosIniciales;

    try {
      // Intentar leer el archivo TXT de saldos iniciales
      contenidoSaldosIniciales = await window.fs.readFile('saldos_iniciales_2025.txt', { encoding: 'utf8' });
      console.log('📁 Archivo de saldos iniciales leído correctamente');
    } catch (error) {
      console.warn('⚠️ No se pudo leer el archivo de saldos iniciales, usando contenido por defecto');

      // Contenido por defecto basado en tu TXT
      contenidoSaldosIniciales = `BCI
cte cte:89107021
$178.098

BCI
vista: 85207765
$-23.399

Banco Scotiabank
cte cte:90999996
$31.149.652

Banco Santander Chile
cte cte: 90999998
$13.871.623

Banco BancoEstado
cte cte:90800036
$331.003

Banco BancoEstado
vista: 89209984
$-17.859.354

Banco Estado
Vista : 8920999
$-1.200.000

Saldo al 31 de diciembre 2024`;
    }

    // PASO 2: Calcular saldos actuales correctos
    const { calcularSaldosActualesCorrectos, verificarTotalConChipax } = await import('./chipaxSaldosService');
    const resultado = await calcularSaldosActualesCorrectos(contenidoSaldosIniciales);

    console.log(`✅ ${resultado.saldosBancarios.length} cuentas procesadas con nuevo método`);
    console.log(`💰 Total calculado: $${resultado.totalCalculado.toLocaleString('es-CL')}`);

    // PASO 3: Verificar con total de Chipax (si hay conectividad)
    if (conectividad.ok) {
      const verificacion = await verificarTotalConChipax(resultado.totalCalculado);
      resultado.verificacionChipax = verificacion;
    }

    if (resultado.verificacionChipax?.esCorrecta) {
      console.log('🎉 ¡ÉXITO! El total calculado coincide con Chipax');
    } else {
      console.warn('⚠️ El total calculado no coincide exactamente con Chipax');
    }

    // Retornar en formato compatible con el dashboard
    return {
      items: resultado.saldosBancarios,
      detalleCalculo: resultado.detalleCalculo,
      paginationStats: {
        totalItems: resultado.saldosBancarios.length,
        loadedItems: resultado.saldosBancarios.length,
        completenessPercent: 100,
        loadedPages: 1,
        totalPages: 1,
        failedPages: [],
        duration: 0,
        metodo: 'saldos_iniciales_2025',
        verificacionChipax: resultado.verificacionChipax
      }
    };

  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    
    // FALLBACK: Si falla el nuevo método, usar el método anterior
    console.log('🔄 Intentando con método fallback...');
    return await obtenerSaldosBancariosLegacy();
  }
};

/**
 * FUNCIÓN LEGACY: Método anterior como respaldo
 * Mantener por si el nuevo método falla
 */
export const obtenerSaldosBancariosLegacy = async () => {
  console.log('\n💰 Obteniendo cuentas corrientes (método legacy)...');
  try {
    const data = await fetchAllPaginatedDataOriginal('/cuentas-corrientes');
    
    console.log(`✅ ${data.items.length} cuentas corrientes obtenidas`);
    
    // Loggear estructura de la primera cuenta para debugging
    if (data.items.length > 0) {
      console.log('🔍 Estructura de la primera cuenta corriente:', JSON.stringify(data.items[0], null, 2));
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas corrientes:', error);
    throw error;
  }
};

/**
 * Obtiene las cuentas por cobrar (DTEs)
 * Endpoint: /dtes?porCobrar=1
 */
export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo DTEs (facturas por cobrar)...');
  try {
    const data = await fetchAllPaginatedDataOriginal('/dtes?porCobrar=1');
    
    console.log(`✅ ${data.items.length} DTEs por cobrar obtenidos`);
    
    // Log detallado para entender la estructura
    if (data.items && data.items.length > 0) {
      console.log('📋 Estructura completa del primer DTE:');
      console.log(JSON.stringify(data.items[0], null, 2));
      
      // Ver qué campos están disponibles
      console.log('🔍 Campos disponibles:', Object.keys(data.items[0]));
      
      // Ver si hay objetos anidados importantes
      const dte = data.items[0];
      if (dte.ClienteProveedor) {
        console.log('👤 ClienteProveedor:', dte.ClienteProveedor);
      }
      if (dte.Saldo) {
        console.log('💰 Saldo:', dte.Saldo);
      }
    }
    
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
    const data = await fetchAllPaginatedDataOriginal('/compras');
    
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
    const data = await fetchAllPaginatedDataOriginal('/clientes');
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
    const data = await fetchAllPaginatedDataOriginal('/proveedores');
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
    const data = await fetchAllPaginatedDataOriginal('/flujo-caja/cartolas');
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
    const data = await fetchAllPaginatedDataOriginal('/honorarios');
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
    const data = await fetchAllPaginatedDataOriginal('/boletas-terceros');
    console.log(`✅ ${data.items.length} boletas de terceros obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo boletas de terceros:', error);
    throw error;
  }
};

// ✅ FUNCIÓN PARA DEBUGGING: Información del estado de autenticación
export const obtenerEstadoAutenticacion = () => {
  return {
    tieneToken: !!tokenCache.token,
    expira: tokenCache.expiresAt,
    isRefreshing: tokenCache.isRefreshing,
    failureCount: tokenCache.failureCount,
    lastFailedEndpoint: tokenCache.lastFailedEndpoint,
    minutosParaExpirar: tokenCache.expiresAt 
      ? Math.round((tokenCache.expiresAt - new Date()) / 60000)
      : null
  };
};

// === EXPORTACIÓN ===

// ✅ Exportar todas las funciones (mantener las existentes)
const chipaxService = {
  // Funciones de autenticación
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData: async (endpoint, options = {}) => {
    // ✅ Versión con mejor manejo de errores de la función existente
    try {
      return await fetchAllPaginatedDataOriginal(endpoint, options);
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('autenticación')) {
        console.warn('⚠️ Error de autenticación en paginación, usando método simplificado...');
        // Retornar estructura mínima en caso de error
        return {
          items: [],
          paginationStats: {
            totalItems: 0,
            loadedItems: 0,
            completenessPercent: 0,
            error: error.message
          }
        };
      }
      throw error;
    }
  },

  // Funciones principales
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerProveedores,
  obtenerFlujoCaja,
  obtenerHonorarios,
  obtenerBoletasTerceros,

  // Funciones auxiliares
  obtenerSaldosBancariosLegacy,

  // Nuevas funciones de utilidad
  verificarConectividadChipax,
  obtenerEstadoAutenticacion
};

export default chipaxService;
