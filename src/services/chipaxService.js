// chipaxService.js - Versión con debug detallado para encontrar el error 404
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token
let tokenCache = {
  token: null,
  expiresAt: null
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

  console.log('🔐 === INICIANDO AUTENTICACIÓN ===');
  console.log('📍 URL de login:', `${CHIPAX_API_URL}/login`);
  console.log('🔑 APP_ID:', APP_ID.substring(0, 10) + '...');
  
  try {
    const loginUrl = `${CHIPAX_API_URL}/login`;
    const loginBody = { 
      app_id: APP_ID, 
      secret_key: SECRET_KEY 
    };
    
    console.log('📤 Enviando petición POST a:', loginUrl);
    console.log('📦 Body:', { app_id: APP_ID.substring(0, 10) + '...', secret_key: '***' });
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(loginBody)
    });

    console.log('📨 Respuesta recibida:');
    console.log('   - Status:', response.status);
    console.log('   - StatusText:', response.statusText);
    console.log('   - Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response body:', errorText);
      
      // Intentar parsear el error si es JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.error('❌ Error parseado:', errorJson);
      } catch (e) {
        console.error('❌ Error no es JSON válido');
      }
      
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa:');
    console.log('   - Mensaje:', data.message);
    console.log('   - Empresa:', data.nombre);
    console.log('   - Token recibido:', !!data.token);
    console.log('   - Token expiration:', new Date(data.tokenExpiration * 1000).toLocaleString());
    
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ === ERROR EN AUTENTICACIÓN ===');
    console.error('   - Tipo:', error.name);
    console.error('   - Mensaje:', error.message);
    console.error('   - Stack:', error.stack);
    
    // Verificar si es un error de red
    if (error.message.includes('Failed to fetch')) {
      console.error('🌐 Posible problema de CORS o red');
      console.error('💡 Sugerencias:');
      console.error('   1. Verificar que la URL es correcta');
      console.error('   2. Verificar CORS en el navegador');
      console.error('   3. Probar con un proxy o backend');
    }
    
    tokenCache = { token: null, expiresAt: null };
    throw error;
  }
};

/**
 * Realiza petición a la API con debug detallado
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  console.log('\n🔍 === INICIANDO PETICIÓN ===');
  console.log('📍 Endpoint:', endpoint);
  
  try {
    const token = await getChipaxToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    console.log('🌐 URL completa:', url);
    console.log('🔐 Token:', token.substring(0, 20) + '...');
    
    const headers = {
      ...options.headers,
      'Authorization': `JWT ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    console.log('📋 Headers:', {
      ...headers,
      'Authorization': 'JWT ' + token.substring(0, 20) + '...'
    });
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    console.log('📨 Respuesta:');
    console.log('   - Status:', response.status);
    console.log('   - StatusText:', response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Error response:', text);
      
      // Si es 401, reintentar con nuevo token
      if (response.status === 401 && !options._retry) {
        console.log('🔄 Token expirado, obteniendo nuevo token...');
        tokenCache = { token: null, expiresAt: null };
        return fetchFromChipax(endpoint, { ...options, _retry: true }, showLogs);
      }
      
      throw new Error(`Error ${response.status}: ${text}`);
    }

    const data = await response.json();
    console.log('✅ Datos recibidos correctamente');
    console.log('   - Tipo:', Array.isArray(data) ? 'Array' : typeof data);
    if (data.items) {
      console.log('   - Items:', data.items.length);
    }
    if (data.paginationAttributes) {
      console.log('   - Paginación:', data.paginationAttributes);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ === ERROR EN PETICIÓN ===');
    console.error('   - Endpoint:', endpoint);
    console.error('   - Error:', error.message);
    console.error('   - Stack:', error.stack);
    throw error;
  }
};

/**
 * Función de prueba simple para verificar conexión
 */
export const testConnection = async () => {
  console.log('🧪 === INICIANDO TEST DE CONEXIÓN ===');
  
  try {
    // Paso 1: Obtener token
    console.log('\n📌 Paso 1: Obteniendo token...');
    const token = await getChipaxToken();
    console.log('✅ Token obtenido:', token.substring(0, 30) + '...');
    
    // Paso 2: Hacer una petición simple
    console.log('\n📌 Paso 2: Probando endpoint /clientes...');
    const response = await fetchFromChipax('/clientes?page=1&limit=1');
    console.log('✅ Respuesta obtenida:', response);
    
    console.log('\n✅ === TEST COMPLETADO EXITOSAMENTE ===');
    return { success: true, token, response };
    
  } catch (error) {
    console.error('\n❌ === TEST FALLÓ ===');
    console.error(error);
    return { success: false, error: error.message };
  }
};

// Funciones de obtención de datos (simplificadas para debug)
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo saldos bancarios...');
  return fetchFromChipax('/bancos?page=1&limit=10');
};

export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo cuentas por cobrar...');
  return fetchFromChipax('/dtes?page=1&limit=10');
};

export const obtenerCuentasPorPagar = async () => {
  console.log('\n💸 Obteniendo cuentas por pagar...');
  return fetchFromChipax('/compras?page=1&limit=10');
};

export const obtenerClientes = async () => {
  console.log('\n👥 Obteniendo clientes...');
  return fetchFromChipax('/clientes?page=1&limit=10');
};

export const obtenerProveedores = async () => {
  console.log('\n🏭 Obteniendo proveedores...');
  return fetchFromChipax('/proveedores?page=1&limit=10');
};

// Exportar todo
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  testConnection,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerProveedores
};

export default chipaxService;
