// chipaxService.js - VERSIÓN CORREGIDA PARA PROBLEMAS DE AUTENTICACIÓN

// === CONFIGURACIÓN MEJORADA ===
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token mejorado con protección contra bucles
let tokenCache = {
  token: null,
  expiresAt: null,
  isRefreshing: false, // ✅ NUEVO: Prevenir múltiples refreshes simultáneos
  lastFailedEndpoint: null, // ✅ NUEVO: Detectar endpoints problemáticos
  failureCount: 0 // ✅ NUEVO: Contar fallos consecutivos
};

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

/**
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
    console.log('⏰ Expira:', tokenCache.expiresAt.toLocaleString());
    
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache.isRefreshing = false;
    tokenCache.failureCount++;
    throw error;
  }
};

/**
 * VERSIÓN MEJORADA: fetchFromChipax con mejor manejo de errores 401
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    if (showLogs) {
      console.log(`🌐 Petición a: ${url}`);
    }

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Dashboard-PGR/1.0' // ✅ NUEVO: User agent específico
      },
      ...options
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGINATION_CONFIG.TIMEOUT);

    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal
    });

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
      contenidoSaldosIniciales = await window.fs.readFile('saldos_iniciales_2025.txt', { encoding: 'utf8' });
      console.log('📁 Archivo de saldos iniciales leído correctamente');
    } catch (error) {
      console.warn('⚠️ No se pudo leer el archivo de saldos iniciales, usando contenido por defecto');
      
      contenidoSaldosIniciales = `BCI
cte cte:89107021
$178.098
Saldo al 31 de diciembre 2024

chipax_wallet
cte cte: 0000000803
$0
Saldo al 31 de diciembre 2024

generico
cte cte: 9117726
$0
Saldo al 31 de diciembre 2024

banconexion2
cte cte: 00-800-10734-09
$129.969.864
Saldo al 31 de diciembre 2024

santander
cte cte: 0-000-7066661-8
$0
Saldo al 31 de diciembre 2024`;
    }
    
    // PASO 2: Calcular saldos actuales correctos
    const { calcularSaldosActualesCorrectos, verificarTotalConChipax } = await import('./chipaxSaldosService');
    const resultado = await calcularSaldosActualesCorrectos(contenidoSaldosIniciales);
    
    console.log(`✅ ${resultado.saldosBancarios.length} cuentas procesadas con nuevo método`);
    console.log(`💰 Total calculado: $${resultado.totalSaldos.toLocaleString('es-CL')}`);
    
    // PASO 3: Verificar que el total sea correcto
    const verificacion = verificarTotalConChipax(resultado.totalSaldos);
    
    if (verificacion.esCorrectoTotal) {
      console.log('🎉 ¡ÉXITO! El total calculado coincide con Chipax');
    } else {
      console.warn('⚠️ El total calculado no coincide exactamente con Chipax');
    }
    
    return {
      items: resultado.saldosBancarios,
      detalleCalculo: resultado.detalleCalculo,
      verificacion,
      paginationStats: {
        totalItems: resultado.saldosBancarios.length,
        loadedItems: resultado.saldosBancarios.length,
        completenessPercent: 100,
        loadedPages: 1,
        totalPages: 1,
        failedPages: [],
        duration: 0
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
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

// ✅ Exportar todas las funciones (mantener las existentes)
const chipaxService = {
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
  
  // Nuevas funciones de utilidad
  verificarConectividadChipax,
  obtenerEstadoAutenticacion
};

export default chipaxService;
