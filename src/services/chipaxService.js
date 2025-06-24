// chipaxService.js - VERSIÓN CORREGIDA: Regresando a la configuración que funcionaba

const API_BASE_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

// ✅ CORRECCIÓN #1: Usar el mismo cache que funcionaba antes
let tokenCache = {
  token: null,
  expiry: null,
  isRefreshing: false,
  refreshPromise: null
};

// ✅ CORRECCIÓN #2: Función de autenticación IDÉNTICA a la que funcionaba
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

// ✅ CORRECCIÓN #3: Función refreshToken IDÉNTICA a la que funcionaba
const refreshToken = async () => {
  console.log('🔐 Obteniendo nuevo token de Chipax...');
  console.log('🔑 APP_ID:', APP_ID ? 
    `${APP_ID.substring(0, 10)}...` : 'NO CONFIGURADO');

  try {
    // ✅ CLAVE: Usar el endpoint /login que SÍ funcionaba
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
    // ✅ CLAVE: Buscar token en múltiples campos como funcionaba antes
    const token = data.access_token || data.token || data.jwt || data.accessToken;
    
    if (!token) {
      console.error('🔍 DEBUG - Estructura de respuesta:', Object.keys(data));
      throw new Error('No se encontró access_token en la respuesta');
    }

    tokenCache.token = token;
    tokenCache.expiry = Date.now() + (50 * 60 * 1000);
    
    console.log('🔐 Token guardado exitosamente');
    console.log('🔐 Token longitud:', token.length, 'caracteres');
    
    return token;

  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache.token = null;
    tokenCache.expiry = null;
    throw new Error(`Error de autenticación: ${error.message}`);
  }
};

// ✅ CORRECCIÓN #4: fetchFromChipax IDÉNTICO al que funcionaba
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
 * ✅ FUNCIÓN: Obtener compras (USANDO la lógica optimizada que funcionaba)
 */
const obtenerCuentasPorPagar = async () => {
  console.log('💸 Obteniendo compras (BÚSQUEDA OPTIMIZADA desde página 117)...');

  try {
    let allCompras = [];
    let currentPage = 117; // ✅ Comenzar desde página 117 donde están las facturas de diciembre 2024
    let hasMoreData = true;
    const limit = 50;
    
    // ✅ CONFIGURACIÓN OPTIMIZADA: Procesar las páginas necesarias
    let facturasMuyRecientesEncontradas = false;
    let facturasSinCambiosCount = 0;
    const maxFacturasSinCambios = 3;
    
    const hoy = new Date();
    let mejorFechaEncontrada = new Date('2024-12-27'); // Empezar desde la fecha que ya sabemos existe
    
    console.log(`🚀 BÚSQUEDA CORREGIDA: Comenzando desde página 117 (facturas diciembre 2024)`);
    console.log(`🔍 Buscando facturas hasta encontrar las de hoy: ${hoy.toISOString().split('T')[0]}...`);

    while (hasMoreData && !facturasMuyRecientesEncontradas) {
      try {
        console.log(`📄 Cargando página ${currentPage}...`);
        
        const url = `/compras?limit=${limit}&page=${currentPage}`;
        const data = await fetchFromChipax(url, { maxRetries: 1, retryDelay: 300 });
        
        let pageItems = [];
        if (Array.isArray(data)) {
          pageItems = data;
        } else if (data.items && Array.isArray(data.items)) {
          pageItems = data.items;
        } else if (data.data && Array.isArray(data.data)) {
          pageItems = data.data;
        }

        if (pageItems.length > 0) {
          allCompras.push(...pageItems);
          console.log(`✅ Página ${currentPage}: ${pageItems.length} items (total: ${allCompras.length})`);
          
          // Verificar fechas para decidir si seguir
          const fechasRecepcion = pageItems
            .map(item => item.fechaRecepcion || item.fecha_recepcion || item.created)
            .filter(fecha => fecha)
            .map(fecha => new Date(fecha));
          
          if (fechasRecepcion.length > 0) {
            const fechaMasReciente = new Date(Math.max(...fechasRecepcion));
            const fechaMasAntigua = new Date(Math.min(...fechasRecepcion));
            
            if (fechaMasReciente > mejorFechaEncontrada) {
              mejorFechaEncontrada = fechaMasReciente;
              facturasSinCambiosCount = 0;
            } else {
              facturasSinCambiosCount++;
            }
            
            const diasDesdeMasReciente = Math.floor((hoy - fechaMasReciente) / (1000 * 60 * 60 * 24));
            
            console.log(`📅 Página ${currentPage}: ${fechaMasAntigua.toISOString().split('T')[0]} → ${fechaMasReciente.toISOString().split('T')[0]} (hace ${diasDesdeMasReciente} días)`);
            
            // ✅ CONDICIÓN DE PARADA: Facturas muy recientes o suficientes datos
            if (diasDesdeMasReciente <= 30) {
              console.log(`🎯 ¡EXCELENTE! Encontradas facturas recientes (hace ${diasDesdeMasReciente} días)`);
              facturasMuyRecientesEncontradas = true;
            } else if (facturasSinCambiosCount >= maxFacturasSinCambios) {
              console.log(`⏰ Parando: ${maxFacturasSinCambios} páginas sin mejora en fechas`);
              facturasMuyRecientesEncontradas = true;
            } else if (allCompras.length >= 3000) {
              console.log(`📊 Parando: Suficientes datos recolectados (${allCompras.length} facturas)`);
              facturasMuyRecientesEncontradas = true;
            }
          }
          
          if (pageItems.length < limit) {
            hasMoreData = false;
          } else {
            currentPage++;
          }
        } else {
          hasMoreData = false;
        }

        // Pausa breve para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`❌ Error en página ${currentPage}:`, error);
        hasMoreData = false;
      }
    }

    console.log(`📊 RESUMEN DE BÚSQUEDA CORREGIDA:`);
    console.log(`    🚀 Página inicial: 117 (facturas diciembre 2024)`);
    console.log(`    📄 Páginas procesadas: ${currentPage - 117} (desde página 117 hasta ${currentPage - 1})`);
    console.log(`    📋 Total facturas obtenidas: ${allCompras.length}`);
    console.log(`    📅 Mejor fecha encontrada: ${mejorFechaEncontrada.toISOString().split('T')[0]}`);
    console.log(`    🎯 Facturas recientes encontradas: ${facturasMuyRecientesEncontradas ? 'SÍ' : 'NO'}`);
    console.log(`    ⚡ Tiempo aproximado ahorrado: ${(117 - 1) * 25}ms por no procesar páginas 1-116`);

    if (allCompras.length === 0) {
      console.warn('⚠️ No se obtuvieron compras de la API');
      return [];
    }

    // ✅ ORDENAMIENTO por fecha de RECEPCIÓN (más recientes primero)
    console.log('🔄 Ordenando compras por fecha de RECEPCIÓN (más recientes primero)...');
    
    allCompras.sort((a, b) => {
      const fechaA = new Date(
        a.fechaRecepcion || 
        a.fecha_recepcion || 
        a.created || 
        a.fechaEmision || 
        a.fecha_emision || 
        a.fecha || 
        '1900-01-01'
      );
      
      const fechaB = new Date(
        b.fechaRecepcion || 
        b.fecha_recepcion || 
        b.created || 
        b.fechaEmision || 
        b.fecha_emision || 
        b.fecha || 
        '1900-01-01'
      );
      
      return fechaB - fechaA; // Descendente (más recientes primero)
    });

    // Tomar las más recientes
    const comprasRecientes = allCompras.slice(0, 500);

    // Debug: verificar el rango de fechas
    if (comprasRecientes.length > 0) {
      const primeraCompra = comprasRecientes[0];
      const ultimaCompra = comprasRecientes[comprasRecientes.length - 1];
      
      const fechaRecepcionReciente = primeraCompra.fechaRecepcion || 
                                     primeraCompra.fecha_recepcion || 
                                     primeraCompra.created ||
                                     primeraCompra.fechaEmision;
                                     
      const fechaRecepcionAntigua = ultimaCompra.fechaRecepcion || 
                                   ultimaCompra.fecha_recepcion || 
                                   ultimaCompra.created ||
                                   ultimaCompra.fechaEmision;
      
      console.log('🔍 DEBUG: Primera compra (más reciente por recepción):');
      console.log({
        id: primeraCompra.id,
        folio: primeraCompra.folio,
        razonSocial: primeraCompra.razonSocial,
        fechaEmision: primeraCompra.fechaEmision,
        fechaRecepcion: primeraCompra.fechaRecepcion || primeraCompra.fecha_recepcion,
        created: primeraCompra.created,
        montoTotal: primeraCompra.montoTotal
      });

      console.log(`✅ ${comprasRecientes.length} compras más recientes seleccionadas`);
      console.log(`📅 Rango de RECEPCIÓN: ${fechaRecepcionAntigua} → ${fechaRecepcionReciente}`);

      // Verificar si tenemos datos recientes
      const fechaReciente = new Date(fechaRecepcionReciente);
      const hoy = new Date();
      const diffDias = Math.floor((hoy - fechaReciente) / (1000 * 60 * 60 * 24));
      
      if (diffDias <= 30) {
        console.log(`✅ ¡ÉXITO! Datos muy recientes: última factura recibida hace ${diffDias} días`);
      } else if (diffDias <= 90) {
        console.log(`✅ ÉXITO PARCIAL: Datos relativamente recientes hace ${diffDias} días`);
      } else {
        console.warn(`⚠️ ADVERTENCIA: La factura más reciente fue recibida hace ${diffDias} días (${fechaReciente.toISOString().split('T')[0]})`);
      }
    }

    return comprasRecientes;

  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN: Obtener DTEs por cobrar (SIN CAMBIOS)
 */
const obtenerCuentasPorCobrar = async () => {
  console.log('📋 Obteniendo DTEs por cobrar...');

  try {
    const data = await fetchFromChipax('/dtes?porCobrar=1', { maxRetries: 1 });
    
    console.log('🔍 DEBUG DTEs - Estructura de respuesta:');
    console.log('- Tipo de respuesta:', typeof data);
    console.log('- Es array:', Array.isArray(data));

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
 * ✅ FUNCIÓN: Obtener saldos bancarios (SIN CAMBIOS)
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

    // Calcular saldos por cuenta usando la cartola más reciente
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

// ✅ EXPORTACIONES: Iguales a la versión que funcionaba
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
