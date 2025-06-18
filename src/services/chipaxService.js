// chipaxService.js - VERSIÓN CORREGIDA CON MANEJO ROBUSTO DE TOKENS

const API_BASE_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

// Cache mejorado para el token
let tokenCache = {
  token: null,
  expiry: null,
  isRefreshing: false,
  refreshPromise: null
};

/**
 * ✅ FUNCIÓN MEJORADA: Obtener token con manejo de concurrencia
 */
const getChipaxToken = async () => {
  // Si ya hay un proceso de refresh en curso, esperar a que termine
  if (tokenCache.isRefreshing && tokenCache.refreshPromise) {
    console.log('🔄 Esperando refresh de token en curso...');
    return await tokenCache.refreshPromise;
  }

  // Verificar si el token existe y no ha expirado (con margen de 5 minutos)
  const now = Date.now();
  const tokenMargin = 5 * 60 * 1000; // 5 minutos de margen
  
  if (tokenCache.token && tokenCache.expiry && now < (tokenCache.expiry - tokenMargin)) {
    console.log('🔑 Usando token válido en cache');
    return tokenCache.token;
  }

  // Marcar que se está refrescando el token
  tokenCache.isRefreshing = true;
  
  // Crear promesa de refresh para que otros requests esperen
  tokenCache.refreshPromise = refreshToken();
  
  try {
    const newToken = await tokenCache.refreshPromise;
    return newToken;
  } finally {
    // Limpiar el estado de refresh
    tokenCache.isRefreshing = false;
    tokenCache.refreshPromise = null;
  }
};

/**
 * ✅ FUNCIÓN INTERNA: Refrescar token
 */
const refreshToken = async () => {
  console.log('🔐 Obteniendo nuevo token de Chipax...');
  console.log('🔑 APP_ID:', APP_ID ? `${APP_ID.substring(0, 10)}...` : 'NO CONFIGURADO');

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

    console.log('📡 Respuesta status:', response.status);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa:', typeof data);

    // ✅ VALIDACIÓN MEJORADA DE LA RESPUESTA
    if (!data || typeof data !== 'object') {
      throw new Error('Respuesta inválida del servidor');
    }

    // Buscar el token en diferentes campos posibles
    const token = data.access_token || data.token || data.jwt || data.accessToken;
    
    if (!token) {
      console.error('🔍 DEBUG - Estructura de respuesta:', Object.keys(data));
      console.error('🔍 DEBUG - Respuesta completa:', data);
      throw new Error('No se encontró access_token en la respuesta');
    }

    // Actualizar cache con nuevo token
    tokenCache.token = token;
    tokenCache.expiry = Date.now() + (50 * 60 * 1000); // 50 minutos
    
    console.log('🔐 Token guardado exitosamente');
    console.log('🔐 Token longitud:', token.length, 'caracteres');
    
    return token;

  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    
    // Limpiar cache en caso de error
    tokenCache.token = null;
    tokenCache.expiry = null;
    
    throw new Error(`Error de autenticación: ${error.message}`);
  }
};

/**
 * ✅ FUNCIÓN MEJORADA: Hacer request a Chipax con retry
 */
const fetchFromChipax = async (endpoint, options = {}) => {
  const { maxRetries = 2, retryDelay = 1000 } = options;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const token = await getChipaxToken();
      const url = `${API_BASE_URL}${endpoint}`;

      console.log(`🔐 Token para ${endpoint}: ${token.substring(0, 20)}... (intento ${attempt})`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `JWT ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`📡 Status de ${endpoint}: ${response.status}`);

      if (response.status === 401) {
        // Token expirado, limpiar cache y reintentar
        console.log('🔄 Token expirado, limpiando cache...');
        tokenCache.token = null;
        tokenCache.expiry = null;
        
        if (attempt <= maxRetries) {
          console.log(`🔄 Reintentando en ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
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

/**
 * ✅ FUNCIÓN MEJORADA: Obtener datos paginados de forma secuencial
 */
const fetchPaginatedDataWithDateFilter = async (endpoint, options = {}) => {
  const {
    limit = 50,
    maxPages = 4,
    sortBy = 'fechaEmision',
    sortOrder = 'desc',
    startDate = null,
    endDate = null,
    maxItems = 200
  } = options;

  console.log(`📄 Obteniendo datos paginados de ${endpoint}...`);
  console.log(`⚙️ Configuración: límite=${limit}, máx páginas=${maxPages}, máx items=${maxItems}`);

  let allData = [];
  let currentPage = 1;
  let hasMoreData = true;

  // ✅ PROCESAR PÁGINAS DE FORMA SECUENCIAL (no paralela)
  while (hasMoreData && currentPage <= maxPages && allData.length < maxItems) {
    try {
      console.log(`📄 Cargando página ${currentPage}...`);
      
      // Construir URL con parámetros
      let url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&page=${currentPage}`;
      
      // Agregar filtros de fecha si se proporcionan
      if (startDate) {
        url += `&fechaInicio=${startDate}`;
      }
      if (endDate) {
        url += `&fechaFin=${endDate}`;
      }
      
      // Agregar ordenamiento
      if (sortBy) {
        url += `&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      }

      // ✅ USAR FETCH CON RETRY
      const data = await fetchFromChipax(url, { maxRetries: 1, retryDelay: 500 });
      
      // Manejar diferentes estructuras de respuesta
      let pageItems = [];
      if (Array.isArray(data)) {
        pageItems = data;
      } else if (data.items && Array.isArray(data.items)) {
        pageItems = data.items;
      } else if (data.data && Array.isArray(data.data)) {
        pageItems = data.data;
      }

      if (pageItems.length > 0) {
        allData.push(...pageItems);
        console.log(`✅ Página ${currentPage}: ${pageItems.length} items (total: ${allData.length})`);
        
        // Si recibimos menos items que el límite, es la última página
        if (pageItems.length < limit) {
          hasMoreData = false;
        } else {
          currentPage++;
        }
        
        // Si alcanzamos el límite máximo de items, parar
        if (allData.length >= maxItems) {
          allData = allData.slice(0, maxItems);
          hasMoreData = false;
        }
      } else {
        hasMoreData = false;
      }

      // ✅ PAUSA AUMENTADA entre requests para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error(`❌ Error en página ${currentPage}:`, error);
      hasMoreData = false;
    }
  }

  console.log(`📊 ${endpoint}: ${allData.length} items obtenidos`);
  return allData;
};

/**
 * ✅ FUNCIÓN MEJORADA: Obtener compras con manejo de errores
 */
const obtenerCuentasPorPagar = async () => {
  console.log('💸 Obteniendo compras (200 más recientes desde 2025)...');

  try {
    // ✅ USAR ENDPOINT SIMPLE SIN FILTROS COMPLEJOS PRIMERO
    const compras = await fetchPaginatedDataWithDateFilter('/compras', {
      limit: 50,
      maxPages: 4,
      maxItems: 200,
      sortBy: 'fechaEmision',
      sortOrder: 'desc'
      // Quitar filtros de fecha inicialmente para asegurar que funcione
    });

    if (!Array.isArray(compras)) {
      console.warn('⚠️ Compras: Respuesta no es array:', typeof compras);
      return [];
    }

    if (compras.length > 0) {
      console.log('🔍 DEBUG: Primera compra (estructura):');
      const primeraCompra = compras[0];
      console.log({
        id: primeraCompra.id,
        folio: primeraCompra.folio,
        razonSocial: primeraCompra.razonSocial,
        fechaEmision: primeraCompra.fechaEmision,
        montoTotal: primeraCompra.montoTotal
      });

      // Ordenar por fecha localmente
      compras.sort((a, b) => {
        const fechaA = new Date(a.fechaEmision || a.fecha || '1900-01-01');
        const fechaB = new Date(b.fechaEmision || b.fecha || '1900-01-01');
        return fechaB - fechaA;
      });

      console.log(`✅ ${compras.length} compras obtenidas y ordenadas`);
      if (compras.length > 0) {
        console.log(`📅 Rango: ${compras[compras.length-1].fechaEmision} → ${compras[0].fechaEmision}`);
      }
    }

    return compras;

  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN MEJORADA: Obtener DTEs por cobrar con mejor manejo
 */
const obtenerCuentasPorCobrar = async () => {
  console.log('📋 Obteniendo DTEs por cobrar...');

  try {
    const data = await fetchFromChipax('/dtes?porCobrar=1', { maxRetries: 1 });
    
    console.log('🔍 DEBUG DTEs - Estructura de respuesta:');
    console.log('- Tipo de respuesta:', typeof data);
    console.log('- Es array:', Array.isArray(data));
    console.log('- Llaves del objeto:', Object.keys(data || {}));

    let dtes = [];

    if (Array.isArray(data)) {
      dtes = data;
      console.log('✅ DTEs encontrados como array directo');
    } else if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0) {
          if (value[0].id && (value[0].folio || value[0].montoTotal)) {
            dtes = value;
            console.log(`✅ DTEs encontrados en '${key}': ${value.length} items`);
            break;
          }
        }
      }
    }

    console.log(`✅ ${dtes.length} DTEs por cobrar obtenidos`);
    return dtes;

  } catch (error) {
    console.error('❌ Error obteniendo DTEs por cobrar:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN MEJORADA: Obtener saldos bancarios con mejor manejo
 */
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios...');

  try {
    console.log('📋 Obteniendo cuentas corrientes...');
    const cuentas = await fetchFromChipax('/cuentas-corrientes', { maxRetries: 1 });

    if (!Array.isArray(cuentas)) {
      console.warn('⚠️ Cuentas corrientes no es array');
      return [];
    }

    console.log(`✅ ${cuentas.length} cuentas corrientes obtenidas`);

    console.log('💰 Obteniendo cartolas para calcular saldos...');
    const cartolasData = await fetchFromChipax('/flujo-caja/cartolas', { maxRetries: 1 });

    let cartolas = [];
    if (Array.isArray(cartolasData)) {
      cartolas = cartolasData;
    } else if (cartolasData.items && Array.isArray(cartolasData.items)) {
      cartolas = cartolasData.items;
    }

    console.log(`✅ ${cartolas.length} cartolas obtenidas`);

    // Calcular saldos (mantener lógica existente)
    const saldosPorCuenta = {};
    cartolas.forEach(cartola => {
      const cuentaId = cartola.idCuentaCorriente;
      if (!saldosPorCuenta[cuentaId]) {
        saldosPorCuenta[cuentaId] = {
          saldoDeudor: 0,
          saldoAcreedor: 0,
          ultimaFecha: cartola.fecha
        };
      }

      const fechaCartola = new Date(cartola.fecha);
      const fechaActual = new Date(saldosPorCuenta[cuentaId].ultimaFecha);

      if (fechaCartola >= fechaActual) {
        saldosPorCuenta[cuentaId] = {
          saldoDeudor: cartola.saldo || 0,
          saldoAcreedor: 0,
          ultimaFecha: cartola.fecha
        };
      }
    });

    const cuentasConSaldos = cuentas.map(cuenta => ({
      ...cuenta,
      saldoCalculado: saldosPorCuenta[cuenta.id]?.saldoDeudor || 0,
      ultimaActualizacion: saldosPorCuenta[cuenta.id]?.ultimaFecha || null,
      saldoInfo: saldosPorCuenta[cuenta.id] || null
    }));

    const totalSaldos = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.saldoCalculado, 0);
    console.log(`💰 Saldos calculados para ${cuentasConSaldos.length} cuentas`);
    console.log(`💵 Saldo total: ${totalSaldos.toLocaleString('es-CL')}`);

    return cuentasConSaldos;

  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    return [];
  }
};

// Exportaciones
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  fetchPaginatedDataWithDateFilter,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
};

export default chipaxService;

export {
  getChipaxToken,
  fetchFromChipax,
  fetchPaginatedDataWithDateFilter,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
};
