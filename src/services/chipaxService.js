// chipaxService.js - Configuración con variables de entorno

// Configuración base desde variables de entorno
const CHIPAX_API_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

// Verificar que las credenciales estén configuradas
if (!APP_ID || !SECRET_KEY) {
  console.error('❌ ERROR: Credenciales de Chipax no configuradas.');
  console.error('Por favor, configura REACT_APP_CHIPAX_APP_ID y REACT_APP_CHIPAX_SECRET_KEY en el archivo .env');
}

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
  
  // Verificar si tenemos token válido en caché
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token en caché');
    return tokenCache.token;
  }

  console.log('🔐 Obteniendo nuevo token de Chipax...');
  console.log('📋 Usando app_id:', APP_ID ? `${APP_ID.substring(0, 8)}...` : 'NO CONFIGURADO');
  
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

    console.log('📡 Respuesta status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      
      if (response.status === 401) {
        throw new Error('Credenciales inválidas. Verifica tu app_id y secret_key en https://app.chipax.com/secret_keys');
      }
      
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Token obtenido exitosamente');
    console.log('🏢 Empresa:', data.nombre || 'N/A');
    console.log('👤 Usuario:', data.user || 'N/A');
    
    // Guardar token en caché (generalmente dura 24 horas)
    tokenCache = {
      token: data.token,
      expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000) // 23 horas
    };
    
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error.message);
    tokenCache = { token: null, expiresAt: null };
    throw error;
  }
};

/**
 * Realiza petición a la API con reintentos automáticos
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    const headers = {
      ...options.headers,
      'Authorization': `JWT ${token}`, // Formato correcto según Chipax
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (showLogs) {
      console.log(`🔍 Llamando a: ${endpoint}`);
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (showLogs) {
      console.log(`📍 ${endpoint} - Status: ${response.status}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      
      // Si es 401, el token expiró - reintentar con nuevo token
      if (response.status === 401 && !options._retry) {
        console.log('🔄 Token expirado, obteniendo nuevo token...');
        tokenCache = { token: null, expiresAt: null };
        return fetchFromChipax(endpoint, { ...options, _retry: true }, showLogs);
      }
      
      throw new Error(`Error ${response.status}: ${text}`);
    }

    const responseData = await response.json();
    
    // Log de respuesta exitosa
    if (showLogs) {
      console.log(`✅ ${endpoint} - Respuesta recibida`);
    }
    
    return responseData;
    
  } catch (error) {
    console.error(`❌ Error en ${endpoint}:`, error.message);
    throw error;
  }
};
