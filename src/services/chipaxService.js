// chipaxService.js - VERSIÓN BASADA EN EL CÓDIGO QUE FUNCIONABA
// Con endpoint /login en lugar de /auth

const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token
let tokenCache = {
  token: null,
  expiresAt: null,
  isRefreshing: false,
  lastFailedEndpoint: null,
  failureCount: 0
};

// Configuración de paginación
const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 3,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000,
  REQUEST_DELAY: 500,
  TIMEOUT: 30000,
  PAGE_SIZE: 50,
  MAX_AUTH_RETRIES: 3
};

/**
 * ✅ FUNCIÓN DE AUTENTICACIÓN QUE FUNCIONABA
 * DIFERENCIA CLAVE: USA /login EN LUGAR DE /auth
 */
const getChipaxToken = async () => {
  const now = new Date();
  console.log('🔐 Obteniendo token de Chipax...');

  // Verificar si ya se está renovando el token
  if (tokenCache.isRefreshing) {
    console.log('🔄 Token refresh en progreso, esperando...');
    let attempts = 0;
    while (tokenCache.isRefreshing && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }
  
  // Verificar si el token en cache es válido
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token válido en cache');
    return tokenCache.token;
  }

  if (tokenCache.failureCount >= PAGINATION_CONFIG.MAX_AUTH_RETRIES) {
    throw new Error(`🚫 Demasiados fallos de autenticación (${tokenCache.failureCount}). Revisa credenciales.`);
  }

  tokenCache.isRefreshing = true;
  console.log('🔐 Obteniendo nuevo token de Chipax...');
  console.log('🔑 APP_ID:', APP_ID.substring(0, 8) + '...');
  
  try {
    // ✅ DIFERENCIA CLAVE: /login en lugar de /auth
    const response = await fetch(`${CHIPAX_API_URL}/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Dashboard-PGR/1.0'
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

    // ✅ VALIDACIÓN CRÍTICA: Verificar que el token existe
    if (!data.token) {
      throw new Error('Token no recibido en la respuesta de autenticación');
    }

    // Guardar token en cache con logging adicional
    tokenCache.token = data.token;
    tokenCache.expiresAt = new Date(Date.now() + (50 * 60 * 1000)); // 50 minutos
    tokenCache.isRefreshing = false;
    tokenCache.failureCount = 0; // Reset counter on success
    
    console.log('🔐 Token guardado exitosamente');
    console.log('🔐 Token longitud:', data.token.length, 'caracteres');
    
    return tokenCache.token;
    
  } catch (error) {
    tokenCache.isRefreshing = false;
    tokenCache.failureCount++;
    console.error('❌ Error completo en autenticación:', error);
    throw error;
  }
};

/**
 * ✅ FUNCIÓN BASE PARA LLAMADAS A LA API - BASADA EN EL CÓDIGO QUE FUNCIONABA
 */
const fetchFromChipax = async (endpoint, options = {}) => {
  // ✅ OBTENER TOKEN FRESCO PARA CADA REQUEST (como en el código original)
  const tokenFresco = await getChipaxToken();
  console.log(`🔐 Token para ${endpoint}: ${tokenFresco.substring(0, 20)}...`);

  const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
    headers: {
      'Authorization': `JWT ${tokenFresco}`,  // ✅ Usando token fresco
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    ...options
  });

  console.log(`📡 Status de ${endpoint}: ${response.status}`);

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText} en ${endpoint}`);
  }

  return response.json();
};

/**
 * ✅ FUNCIÓN CORREGIDA PARA OBTENER SALDOS BANCARIOS
 */
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios...');

  try {
    // Usar el endpoint que sabemos que funciona
    const data = await fetchFromChipax('/cuentas-corrientes');

    // VALIDACIÓN CRÍTICA: Verificar que sea un array
    if (!Array.isArray(data)) {
      console.warn('⚠️ Respuesta no es array:', typeof data);

      // Si es un objeto, buscar arrays dentro
      if (data && typeof data === 'object') {
        // Buscar propiedades que contengan arrays
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) {
            console.log(`✅ Encontrado array en propiedad '${key}':`, value.length, 'items');
            return adaptarCuentasCorrientes(value);
          }
        }
        
        // Si no hay arrays, crear array con el objeto
        console.log('🔄 Convirtiendo objeto único a array');
        return adaptarCuentasCorrientes([data]);
      }

      // Si no es ni array ni objeto válido, retornar array vacío
      console.warn('⚠️ Datos inválidos, retornando array vacío');
      return [];
    }

    console.log(`✅ ${data.length} cuentas corrientes obtenidas`);
    return adaptarCuentasCorrientes(data);

  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    // FALLBACK: Retornar array vacío en lugar de fallar
    return [];
  }
};

/**
 * ✅ FUNCIÓN CORREGIDA PARA OBTENER DTEs POR COBRAR
 */
const obtenerDTEsPorCobrar = async () => {
  console.log('📋 Obteniendo DTEs por cobrar...');

  try {
    const data = await fetchFromChipax('/dtes?porCobrar=1');
    
    // VALIDACIÓN CRÍTICA: Verificar estructura
    if (!Array.isArray(data)) {
      console.warn('⚠️ DTEs: Respuesta no es array:', typeof data);

      if (data && typeof data === 'object') {
        // Buscar arrays de DTEs
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) {
            console.log(`✅ DTEs encontrados en '${key}':`, value.length, 'items');
            return adaptarDTEs(value);
          }
        }
        
        // Si es un objeto único, convertir a array
        return adaptarDTEs([data]);
      }

      return [];
    }

    console.log(`✅ ${data.length} DTEs por cobrar obtenidos`);
    return adaptarDTEs(data);

  } catch (error) {
    console.error('❌ Error obteniendo DTEs por cobrar:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN CORREGIDA PARA OBTENER COMPRAS
 */
const obtenerCompras = async () => {
  console.log('💸 Obteniendo compras...');

  try {
    const data = await fetchFromChipax('/compras');
    
    // VALIDACIÓN CRÍTICA: Verificar estructura
    if (!Array.isArray(data)) {
      console.warn('⚠️ Compras: Respuesta no es array:', typeof data);

      if (data && typeof data === 'object') {
        // Buscar arrays de compras
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) {
            console.log(`✅ Compras encontradas en '${key}':`, value.length, 'items');
            return value; // Retornar raw data para que el adaptador la procese
          }
        }
        
        // Si es un objeto único, convertir a array
        return [data];
      }

      return [];
    }

    console.log(`✅ ${data.length} compras obtenidas`);
    return data; // Retornar raw data para el adaptador

  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN CORREGIDA PARA OBTENER CLIENTES
 */
const obtenerClientes = async () => {
  console.log('👥 Obteniendo clientes...');

  try {
    const data = await fetchFromChipax('/clientes');
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ Clientes: Respuesta no es array:', typeof data);
      
      if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) {
            console.log(`✅ Clientes encontrados en '${key}':`, value.length, 'items');
            return value;
          }
        }
        return [data];
      }
      
      return [];
    }

    console.log(`✅ ${data.length} clientes obtenidos`);
    return data;

  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    return [];
  }
};

/**
 * ✅ OBTENER PROVEEDORES
 */
const obtenerProveedores = async () => {
  console.log('🏭 Obteniendo proveedores...');
  
  try {
    const data = await fetchFromChipax('/proveedores');
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ Proveedores: Respuesta no es array:', typeof data);
      
      if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) {
            console.log(`✅ Proveedores encontrados en '${key}':`, value.length, 'items');
            return value;
          }
        }
        return [data];
      }
      
      return [];
    }

    console.log(`✅ ${data.length} proveedores obtenidos`);
    return data;

  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN DE PAGINACIÓN GENÉRICA
 */
async function fetchPaginatedData(token, endpoint, entityName) {
  const allData = [];
  let currentPage = 1;
  const limit = PAGINATION_CONFIG.PAGE_SIZE;
  let hasMoreData = true;
  let totalPagesRequested = 0;
  let totalPagesLoaded = 0;
  let failedPages = [];

  console.log(`📊 Iniciando carga paginada de ${entityName}`);

  while (hasMoreData) {
    try {
      totalPagesRequested++;
      
      // OBTENER TOKEN FRESCO PARA CADA PÁGINA (como en el código original)
      const tokenFresco = await getChipaxToken();
      
      const url = `${CHIPAX_API_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&page=${currentPage}`;
      console.log(`📄 Cargando página ${currentPage} de ${entityName}...`);
      console.log(`🔐 Token para página ${currentPage}: ${tokenFresco.substring(0, 20)}...`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `JWT ${tokenFresco}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`📡 Status página ${currentPage}: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const pageData = await response.json();
      
      if (Array.isArray(pageData) && pageData.length > 0) {
        allData.push(...pageData);
        totalPagesLoaded++;
        console.log(`✅ Página ${currentPage}: ${pageData.length} items cargados`);
        
        // Si recibimos menos items que el límite, probablemente es la última página
        if (pageData.length < limit) {
          hasMoreData = false;
        } else {
          currentPage++;
        }
      } else {
        hasMoreData = false;
      }

      // Pausa entre requests
      await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));

    } catch (error) {
      console.error(`❌ Error en página ${currentPage}:`, error.message);
      failedPages.push(currentPage);
      
      if (failedPages.length >= 3) {
        console.log('🚫 Demasiados errores, deteniendo carga paginada');
        break;
      }
      
      currentPage++;
    }
  }

  const success = allData.length > 0;
  const completenessPercent = totalPagesRequested > 0 ? (totalPagesLoaded / totalPagesRequested) * 100 : 0;

  console.log(`📊 Resumen ${entityName}: ${allData.length} items, ${completenessPercent.toFixed(1)}% completitud`);

  return {
    success,
    data: allData,
    pagination: {
      totalPagesRequested,
      totalPagesLoaded,
      failedPages,
      completenessPercent,
      totalItemsLoaded: allData.length
    }
  };
}

/**
 * ✅ FUNCIONES DE ADAPTACIÓN DE DATOS
 */

// Adapta cuentas corrientes al formato esperado por el dashboard
const adaptarCuentasCorrientes = (cuentas) => {
  if (!Array.isArray(cuentas)) {
    console.warn('⚠️ adaptarCuentasCorrientes: datos no son array');
    return [];
  }

  return cuentas.map((cuenta, index) => {
    // Extraer saldo con múltiples estrategias
    let saldo = 0;

    // Buscar saldo en diferentes campos
    if (cuenta.saldo !== undefined) saldo = cuenta.saldo;
    else if (cuenta.saldoActual !== undefined) saldo = cuenta.saldoActual;
    else if (cuenta.saldoContable !== undefined) saldo = cuenta.saldoContable;
    else if (cuenta.balance !== undefined) saldo = cuenta.balance;
    else if (cuenta.Saldo && cuenta.Saldo.saldoDeudor !== undefined) saldo = cuenta.Saldo.saldoDeudor;

    // Convertir a número
    saldo = parseFloat(saldo) || 0;
    
    return {
      id: cuenta.id || index,
      nombre: cuenta.numeroCuenta || cuenta.nombre || `Cuenta ${index + 1}`,
      banco: cuenta.banco || cuenta.Banco?.nombre || 'Banco no especificado',
      saldo: saldo,
      tipo: 'Cuenta Corriente',
      moneda: 'CLP'
    };
  });
};

// Adapta DTEs al formato esperado por el dashboard
const adaptarDTEs = (dtes) => {
  if (!Array.isArray(dtes)) {
    console.warn('⚠️ adaptarDTEs: datos no son array');
    return [];
  }

  return dtes.map((dte, index) => {
    // Extraer saldo pendiente
    let saldo = 0;
    
    if (dte.Saldo && dte.Saldo.saldoDeudor !== undefined) {
      saldo = parseFloat(dte.Saldo.saldoDeudor) || 0;
    } else if (dte.montoTotal !== undefined) {
      saldo = parseFloat(dte.montoTotal) || 0;
    }

    return {
      id: dte.id || index,
      folio: dte.folio || 'S/N',
      razonSocial: dte.razonSocial || 'Cliente no especificado',
      monto: saldo,
      fecha: dte.fecha || new Date().toISOString().split('T')[0],
      tipo: dte.tipo || 'DTE'
    };
  });
};

/**
 * ✅ FUNCIONES DE TESTING Y DEBUGGING
 */

// Función para testing en desarrollo
const testearSaldosBancarios = async () => {
  console.log('🧪 INICIANDO PRUEBAS DE SALDOS BANCARIOS');
  const resultado = await obtenerSaldosBancarios();
  console.log('📊 Resultado de la prueba:', resultado);
  return resultado;
};

// Función para investigar todos los endpoints disponibles
const investigarEndpointsDisponibles = async () => {
  console.log('🔍 INVESTIGANDO ENDPOINTS DISPONIBLES');
  
  const endpointsAProbar = [
    '/cuentas-corrientes', '/saldos', '/bancos', '/finanzas', '/tesoreria',
    '/contabilidad', '/balance', '/estado-financiero', '/cartolas',
    '/movimientos-bancarios', '/dashboard', '/resumen-financiero'
  ];

  const token = await getChipaxToken();
  const resultados = [];
  
  for (const endpoint of endpointsAProbar) {
    try {
      const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `JWT ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      resultados.push({
        endpoint,
        status: response.status,
        existe: response.ok,
        tieneContenido: response.ok ? 'Por revisar' : 'No disponible'
      });
      
      console.log(`${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      
    } catch (error) {
      resultados.push({
        endpoint,
        status: 'Error',
        existe: false,
        error: error.message
      });
      console.log(`${endpoint}: Error - ${error.message}`);
    }

    // Pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return resultados;
};

/**
 * ✅ EXPORTACIONES - EXACTAS COMO EN EL CÓDIGO ORIGINAL
 */
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  obtenerSaldosBancarios,
  obtenerCompras,
  obtenerDTEsPorCobrar,
  obtenerClientes,
  obtenerProveedores,
  fetchPaginatedData,
  investigarEndpointsDisponibles,
  testearSaldosBancarios
};

export default chipaxService;

export {
  getChipaxToken,
  fetchFromChipax,
  obtenerSaldosBancarios,
  obtenerCompras,
  obtenerDTEsPorCobrar,
  obtenerClientes,
  obtenerProveedores,
  fetchPaginatedData,
  investigarEndpointsDisponibles,
  testearSaldosBancarios
};
