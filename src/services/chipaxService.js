// chipaxService.js - Versión corregida con manejo robusto de errores

const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache para el token de autenticación
let tokenCache = {
  token: null,
  expiresAt: null,
  isRefreshing: false,
  failureCount: 0
};

// === FUNCIÓN DE AUTENTICACIÓN ===
const getChipaxToken = async () => {
  console.log('🔐 Obteniendo token de Chipax...');
  
  // Verificar si tenemos un token válido en cache
  if (tokenCache.token && tokenCache.expiresAt && new Date() < tokenCache.expiresAt) {
    console.log('🔑 Usando token válido en cache');
    return tokenCache.token;
  }

  // Evitar múltiples requests simultáneos
  if (tokenCache.isRefreshing) {
    console.log('🔄 Token refresh en progreso, esperando...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return tokenCache.token;
  }

  tokenCache.isRefreshing = true;

  try {
    console.log('🔑 APP_ID:', APP_ID.substring(0, 8) + '...');

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
      throw new Error(`Error de autenticación: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa:', typeof data);

    if (!data.token) {
      throw new Error('Token no recibido en la respuesta de autenticación');
    }

    tokenCache.token = data.token;
    tokenCache.expiresAt = new Date(Date.now() + (50 * 60 * 1000)); // 50 minutos
    tokenCache.isRefreshing = false;
    tokenCache.failureCount = 0;

    console.log('🔐 Token guardado en cache. Longitud:', data.token.length);
    console.log('🕒 Token expira en:', tokenCache.expiresAt.toISOString());

    return data.token;

  } catch (error) {
    tokenCache.isRefreshing = false;
    tokenCache.failureCount++;
    console.error('❌ Error en autenticación:', error);
    throw error;
  }
};

// === FUNCIÓN BASE PARA LLAMADAS A LA API ===
const fetchFromChipax = async (endpoint, options = {}) => {
  const token = await getChipaxToken();
  
  const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
    headers: {
      'Authorization': `JWT ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText} en ${endpoint}`);
  }

  return response.json();
};

// === FUNCIÓN CORREGIDA PARA OBTENER SALDOS BANCARIOS ===
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios...');
  
  try {
    // CORRECCIÓN: Usar el endpoint que sabemos que funciona
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

// === FUNCIÓN CORREGIDA PARA OBTENER DTEs POR COBRAR ===
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

// === FUNCIÓN CORREGIDA PARA OBTENER COMPRAS ===
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

// === FUNCIÓN CORREGIDA PARA OBTENER CLIENTES ===
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

// === FUNCIONES DE ADAPTACIÓN ===

/**
 * Adapta cuentas corrientes al formato esperado por el dashboard
 */
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

/**
 * Adapta DTEs al formato esperado por el dashboard
 */
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

// === EXPORTACIONES ===
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  obtenerSaldosBancarios,
  obtenerDTEsPorCobrar,
  obtenerCompras,
  obtenerClientes
};

export default chipaxService;

export {
  getChipaxToken,
  fetchFromChipax,
  obtenerSaldosBancarios,
  obtenerDTEsPorCobrar,
  obtenerCompras,
  obtenerClientes
};
