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
  expiresAt: null
  expiresAt: null,
  isRefreshing: false, // ✅ NUEVO: Prevenir múltiples refreshes simultáneos
  lastFailedEndpoint: null, // ✅ NUEVO: Detectar endpoints problemáticos
  failureCount: 0 // ✅ NUEVO: Contar fallos consecutivos
};

// Configuración de paginación optimizada
// Configuración con timeouts más largos para Chipax
const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 5,
  MAX_CONCURRENT_REQUESTS: 3, // ✅ REDUCIDO: Menos carga en Chipax
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 500,
  REQUEST_DELAY: 100,
  TIMEOUT: 15000,
  PAGE_SIZE: 100
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
    console.log('🔑 Usando token en cache');
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

@@ -48,7 +64,8 @@ export const getChipaxToken = async () => {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        'Accept': 'application/json',
        'User-Agent': 'Dashboard-PGR/1.0' // ✅ NUEVO: User agent específico
      },
      body: JSON.stringify({ 
        app_id: APP_ID, 
@@ -57,11 +74,11 @@ export const getChipaxToken = async () => {
    });

    console.log('📡 Respuesta status:', response.status);
    console.log('📍 URL utilizada:', `${CHIPAX_API_URL}/login`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      tokenCache.failureCount++;
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

@@ -72,10 +89,16 @@ export const getChipaxToken = async () => {
      tokenRecibido: !!data.token
    });

    // Guardar token en cache
    // Guardar token con margen de seguridad
    const expirationTime = new Date(data.tokenExpiration * 1000);
    const safeExpirationTime = new Date(expirationTime.getTime() - 60000); // ✅ 1 minuto antes
    
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
      expiresAt: safeExpirationTime, // ✅ MEJORADO: Expira 1 minuto antes para seguridad
      isRefreshing: false,
      lastFailedEndpoint: null,
      failureCount: 0 // ✅ Reset contador en éxito
    };

    console.log('✅ Token obtenido exitosamente');
@@ -85,17 +108,14 @@ export const getChipaxToken = async () => {

  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache = { token: null, expiresAt: null };
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
@@ -111,7 +131,8 @@ export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) =
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        'Accept': 'application/json',
        'User-Agent': 'Dashboard-PGR/1.0' // ✅ NUEVO: User agent específico
      },
      ...options
    };
@@ -130,9 +151,36 @@ export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) =
      console.log(`📊 Status: ${response.status}`);
    }

    // ✅ MEJORADO: Manejo más inteligente del 401
    if (response.status === 401) {
      console.log('🔄 Token expirado, renovando...');
      tokenCache = { token: null, expiresAt: null };
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

@@ -143,6 +191,12 @@ export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) =

    const data = await response.json();

    // ✅ Reset contadores en éxito
    if (tokenCache.lastFailedEndpoint === endpoint) {
      tokenCache.lastFailedEndpoint = null;
      tokenCache.failureCount = Math.max(0, tokenCache.failureCount - 1);
    }
    
    if (showLogs) {
      console.log(`✅ Datos recibidos exitosamente`);
    }
@@ -151,158 +205,67 @@ export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) =

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout: La petición a ${endpoint} tardó más de ${PAGINATION_CONFIG.TIMEOUT}ms`);
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
 * ✅ NUEVA FUNCIÓN: Verificar conectividad con Chipax antes de sincronizar
 */
export const fetchAllPaginatedData = async (endpoint, options = {}) => {
  console.log(`\n📄 Iniciando carga paginada de: ${endpoint}`);
  
  const startTime = new Date();
  let allItems = [];
  let currentPage = 1;
  let totalItems = 0;
  let totalPages = 0;
  let hasMore = true;
export const verificarConectividadChipax = async () => {
  console.log('🔍 Verificando conectividad con Chipax...');

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
    // Resetear contadores
    tokenCache.failureCount = 0;
    tokenCache.lastFailedEndpoint = null;
    
    // Probar endpoint simple primero
    const response = await fetchFromChipax('/ping', {}, false);
    console.log('✅ Chipax responde correctamente');
    return { ok: true, message: 'Conexión exitosa' };

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

  return {
    items: allItems,
    paginationStats
  };
};

// === FUNCIONES ESPECÍFICAS DE ENDPOINTS ===

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
@@ -330,6 +293,7 @@ Saldo al 31 de diciembre 2024`;
    }

    // PASO 2: Calcular saldos actuales correctos
    const { calcularSaldosActualesCorrectos, verificarTotalConChipax } = await import('./chipaxSaldosService');
    const resultado = await calcularSaldosActualesCorrectos(contenidoSaldosIniciales);

    console.log(`✅ ${resultado.saldosBancarios.length} cuentas procesadas con nuevo método`);
@@ -342,10 +306,8 @@ Saldo al 31 de diciembre 2024`;
      console.log('🎉 ¡ÉXITO! El total calculado coincide con Chipax');
    } else {
      console.warn('⚠️ El total calculado no coincide exactamente con Chipax');
      console.warn('📋 Revisar saldos iniciales o lógica de movimientos');
    }

    // Retornar en formato compatible con el dashboard
    return {
      items: resultado.saldosBancarios,
      detalleCalculo: resultado.detalleCalculo,
@@ -363,360 +325,61 @@ Saldo al 31 de diciembre 2024`;

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
    const data = await fetchAllPaginatedData('/cuentas-corrientes');
    
    console.log(`✅ ${data.items.length} cuentas corrientes obtenidas`);
    
    // Loggear estructura de la primera cuenta para debugging
    if (data.items.length > 0) {
      console.log('🔍 Estructura de la primera cuenta corriente:', JSON.stringify(data.items[0], null, 2));
    }
    
    // Calcular saldos desde flujo de caja
    console.log('🔄 Calculando saldos desde flujo de caja...');
    
    try {
      const saldosPorCuenta = await obtenerSaldosDesdeFlujoCaja();
      
      // Combinar cuentas con saldos calculados
      data.items = data.items.map(cuenta => {
        const saldoInfo = saldosPorCuenta[cuenta.id];
        
        if (saldoInfo) {
          console.log(`✅ Saldo encontrado para cuenta ${cuenta.numeroCuenta || cuenta.id}: $${saldoInfo.saldo.toLocaleString('es-CL')}`);
          
          return {
            ...cuenta,
            // Crear objeto Saldo compatible con el formato esperado
            Saldo: {
              debe: saldoInfo.egresos,
              haber: saldoInfo.ingresos,
              saldo_deudor: saldoInfo.saldo > 0 ? saldoInfo.saldo : 0,
              saldo_acreedor: saldoInfo.saldo < 0 ? Math.abs(saldoInfo.saldo) : 0
            },
            saldoCalculado: saldoInfo.saldo,
            totalMovimientos: saldoInfo.movimientos
          };
        } else {
          console.warn(`⚠️ No se encontró saldo para cuenta ${cuenta.numeroCuenta || cuenta.id}`);
          return cuenta;
        }
      });
      
    } catch (saldoError) {
      console.warn('⚠️ Error calculando saldos desde flujo de caja:', saldoError);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas corrientes:', error);
    throw error;
  }
};

/**
 * Obtiene los saldos bancarios desde el flujo de caja
 * Como el endpoint /saldos no existe, calculamos los saldos desde los movimientos
 */
export const obtenerSaldosDesdeFlujoCaja = async () => {
  console.log('\n💰 Calculando saldos desde flujo de caja...');
  
  try {
    // Obtener todos los movimientos del flujo de caja
    const flujoResponse = await fetchAllPaginatedData('/flujo-caja/cartolas');
    const movimientos = flujoResponse.items;
    console.log(`📊 ${movimientos.length} movimientos encontrados`);
    
    // Loggear estructura del primer movimiento para debugging
    if (movimientos.length > 0) {
      console.log('🔍 Estructura del primer movimiento:', JSON.stringify(movimientos[0], null, 2));
    }
    
    // Agrupar movimientos por cuenta corriente
    const saldosPorCuenta = {};
    
    movimientos.forEach(mov => {
      // Verificar diferentes nombres de campo para cuenta
      const cuentaId = mov.cuenta_corriente_id || mov.cuentaCorrienteId || mov.cuenta_id;
      
      if (cuentaId) {
        if (!saldosPorCuenta[cuentaId]) {
          saldosPorCuenta[cuentaId] = {
            saldo: 0,
            ingresos: 0,
            egresos: 0,
            movimientos: 0
          };
        }
        
        // Procesar saldos del movimiento
        if (mov.Saldos && Array.isArray(mov.Saldos)) {
          mov.Saldos.forEach(saldo => {
            if (saldo.last_record === 1) { // Solo el último registro
              const debe = saldo.debe || 0;
              const haber = saldo.haber || 0;
              const saldoDeudor = saldo.saldo_deudor || 0;
              const saldoAcreedor = saldo.saldo_acreedor || 0;
              
              saldosPorCuenta[cuentaId].ingresos += haber;
              saldosPorCuenta[cuentaId].egresos += debe;
              saldosPorCuenta[cuentaId].saldo = saldoDeudor - saldoAcreedor;
              saldosPorCuenta[cuentaId].movimientos++;
            }
          });
        }
      }
    });
    
    // Log de resumen
    console.log(`🏦 Cuentas procesadas: ${Object.keys(saldosPorCuenta).length}`);
    Object.entries(saldosPorCuenta).forEach(([cuentaId, stats]) => {
      console.log(`💰 Cuenta ${cuentaId}: $${stats.saldo.toLocaleString('es-CL')} (${stats.movimientos} movimientos)`);
    });
    
    return saldosPorCuenta;
    
  } catch (error) {
    console.error('❌ Error calculando saldos desde flujo de caja:', error);
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
    const data = await fetchAllPaginatedData('/dtes?porCobrar=1');
    
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

/**
 * FUNCIÓN DE DEBUG: Para probar ambos métodos y comparar
 */
export const compararMetodosSaldos = async () => {
  console.log('\n🔍 COMPARANDO MÉTODOS DE CÁLCULO DE SALDOS');
  console.log('==========================================');
  
  try {
    // Método nuevo
    console.log('\n1️⃣ MÉTODO NUEVO (con saldos iniciales):');
    const resultadoNuevo = await obtenerSaldosBancarios();
    const totalNuevo = resultadoNuevo.items.reduce((sum, c) => sum + c.saldo, 0);
    
    // Método legacy
    console.log('\n2️⃣ MÉTODO LEGACY (solo flujo de caja):');
    const resultadoLegacy = await obtenerSaldosBancariosLegacy();
    const totalLegacy = resultadoLegacy.items.reduce((sum, c) => sum + (c.saldoCalculado || 0), 0);
    
    // Comparación
    console.log('\n📊 COMPARACIÓN DE RESULTADOS:');
    console.log(`Método nuevo: $${totalNuevo.toLocaleString('es-CL')}`);
    console.log(`Método legacy: $${totalLegacy.toLocaleString('es-CL')}`);
    console.log(`Diferencia: $${(totalNuevo - totalLegacy).toLocaleString('es-CL')}`);
    
    // Target de Chipax
    const targetChipax = 186648977;
    console.log(`Target Chipax: $${targetChipax.toLocaleString('es-CL')}`);
    
    const errorNuevo = Math.abs(totalNuevo - targetChipax);
    const errorLegacy = Math.abs(totalLegacy - targetChipax);
    
    console.log(`Error método nuevo: $${errorNuevo.toLocaleString('es-CL')}`);
    console.log(`Error método legacy: $${errorLegacy.toLocaleString('es-CL')}`);
    
    const mejorMetodo = errorNuevo < errorLegacy ? 'nuevo' : 'legacy';
    console.log(`🏆 Mejor método: ${mejorMetodo}`);
    
    return {
      nuevo: { total: totalNuevo, error: errorNuevo, data: resultadoNuevo },
      legacy: { total: totalLegacy, error: errorLegacy, data: resultadoLegacy },
      mejorMetodo,
      targetChipax
    };
    
  } catch (error) {
    console.error('❌ Error en comparación de métodos:', error);
    throw error;
  }
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

// Exportar como objeto default para compatibilidad
// ✅ Exportar todas las funciones (mantener las existentes)
const chipaxService = {
  // Funciones de autenticación
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
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

  // Funciones principales (NUEVAS)
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
  obtenerSaldosDesdeFlujoCaja,
  obtenerSaldosBancariosLegacy,
  compararMetodosSaldos
  // Nuevas funciones de utilidad
  verificarConectividadChipax,
  obtenerEstadoAutenticacion
};

export default chipaxService;
