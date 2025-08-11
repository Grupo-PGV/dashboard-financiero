// chipaxService.js - CORRECCIÓN FINAL
// ✅ ELIMINA la dependencia de /saldos (que no existe)
// ✅ Usa solo endpoints que SÍ funcionan

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // ✅ Netlify redirect
  : 'https://api.chipax.com/v2';

const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

// Cache para el token
let tokenCache = {
  token: null,
  expiry: null,
  isRefreshing: false,
  refreshPromise: null
};

const getChipaxToken = async () => {
  if (tokenCache.isRefreshing && tokenCache.refreshPromise) {
    console.log('🔄 Esperando refresh de token en curso...');
    return await tokenCache.refreshPromise;
  }

  const now = Date.now();
  const tokenMargin = 5 * 60 * 1000;
  
  if (tokenCache.token && tokenCache.expiry && now < (tokenCache.expiry - tokenMargin)) {
    console.log('🔑 Usando token válido en cache');
    return tokenCache.token;
  }

  tokenCache.isRefreshing = true;
  tokenCache.refreshPromise = refreshToken();
  
  try {
    const newToken = await tokenCache.refreshPromise;
    return newToken;
  } finally {
    tokenCache.isRefreshing = false;
    tokenCache.refreshPromise = null;
  }
};

const refreshToken = async () => {
  console.log('🔐 Obteniendo nuevo token de Chipax...');
  console.log('🌐 API_BASE_URL:', API_BASE_URL);
  
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
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

    console.log('📡 Respuesta login status:', response.status);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.access_token || data.token || data.jwt || data.accessToken;
    
    if (!token) {
      console.error('🔍 DEBUG - Estructura de respuesta:', Object.keys(data));
      throw new Error('No se encontró access_token en la respuesta');
    }

    tokenCache.token = token;
    tokenCache.expiry = Date.now() + (50 * 60 * 1000);
    
    console.log('✅ Token obtenido exitosamente');
    return token;

  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache.token = null;
    tokenCache.expiry = null;
    throw new Error(`Error de autenticación: ${error.message}`);
  }
};

const fetchFromChipax = async (endpoint, options = {}) => {
  const { maxRetries = 2, retryDelay = 1000 } = options;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const token = await getChipaxToken();
      const url = `${API_BASE_URL}${endpoint}`;

      console.log(`📡 Fetch a: ${url} (intento ${attempt})`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `JWT ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ ${endpoint} exitoso`);
      return data;

    } catch (error) {
      console.error(`❌ Error en ${endpoint} (intento ${attempt}):`, error);
      
      if (attempt <= maxRetries) {
        console.log(`🔄 Reintentando en ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      throw error;
    }
  }
};

// ===== FUNCIONES PRINCIPALES =====

/**
 * ✅ SALDOS BANCARIOS: Usar /cuentas-corrientes (que SÍ funciona)
 * ❌ NO usar /saldos (que NO existe)
 */
const obtenerSaldosBancarios = async () => {
  try {
    console.log('🏦 Obteniendo saldos desde /cuentas-corrientes...');
    
    // ✅ Endpoint que SÍ existe
    const response = await fetchFromChipax('/cuentas-corrientes');
    const cuentas = response.data || response || [];
    
    console.log(`📊 Respuesta cuentas-corrientes:`, typeof response, Array.isArray(cuentas));
    
    if (!Array.isArray(cuentas)) {
      console.warn('⚠️ Cuentas no es array, devolviendo array vacío');
      return [];
    }
    
    // Mapear a formato estándar
    const saldosFormateados = cuentas.map(cuenta => ({
      id: cuenta.id,
      nombre: cuenta.nombreBanco || cuenta.nombre || `Cuenta ${cuenta.numeroCuenta}`,
      numeroCuenta: cuenta.numeroCuenta || cuenta.numero_cuenta,
      saldo: cuenta.saldo || cuenta.saldo_actual || 0,
      saldoCalculado: cuenta.saldo || cuenta.saldo_actual || 0,
      tipo: cuenta.tipoCuenta || cuenta.tipo_cuenta || 'Cuenta Corriente',
      banco: cuenta.nombreBanco || cuenta.nombre_banco || 'Banco',
      moneda: cuenta.moneda || 'CLP',
      ultimoMovimiento: cuenta.ultimoMovimiento || cuenta.updated_at
    }));
    
    console.log(`✅ ${saldosFormateados.length} saldos bancarios obtenidos`);
    return saldosFormateados;
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    
    // ✅ Si falla, devolver array vacío en lugar de fallar
    console.log('📝 Devolviendo array vacío - usar cartolas manuales');
    return [];
  }
};

/**
 * ✅ CUENTAS POR COBRAR: Usar /dtes?porCobrar=1 (que SÍ funciona)
 */
const obtenerCuentasPorCobrar = async () => {
  try {
    console.log('📋 Obteniendo cuentas por cobrar...');
    
    const response = await fetchFromChipax('/dtes?porCobrar=1');
    console.log('💵 Respuesta DTEs por cobrar:', typeof response);
    
    // Extraer datos de diferentes estructuras posibles
    let dtes = [];
    if (Array.isArray(response)) {
      dtes = response;
    } else if (response && response.data && Array.isArray(response.data)) {
      dtes = response.data;
    } else if (response && response.items && Array.isArray(response.items)) {
      dtes = response.items;
    }
    
    console.log(`✅ ${dtes.length} DTEs por cobrar obtenidos`);
    return dtes;
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por cobrar:', error);
    return [];
  }
};

/**
 * ✅ CUENTAS POR PAGAR: Usar /compras (que SÍ funciona)
 */
const obtenerCuentasPorPagar = async () => {
  try {
    console.log('📄 Obteniendo cuentas por pagar...');
    
    const response = await fetchFromChipax('/compras');
    console.log('💸 Respuesta compras:', typeof response);
    
    // Extraer datos de diferentes estructuras posibles
    let compras = [];
    if (Array.isArray(response)) {
      compras = response;
    } else if (response && response.data && Array.isArray(response.data)) {
      compras = response.data;
    } else if (response && response.items && Array.isArray(response.items)) {
      compras = response.items;
    }
    
    console.log(`✅ ${compras.length} compras obtenidas`);
    return compras;
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por pagar:', error);
    return [];
  }
};

// Exportaciones
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
};

export default chipaxService;

export {
  getChipaxToken,
  fetchFromChipax,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
};
