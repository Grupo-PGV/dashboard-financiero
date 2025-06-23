// chipaxService.js - VERSIÓN COMPLETA CON SALDOS BANCARIOS CORREGIDOS

const API_BASE_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
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
 * ✅ FUNCIÓN PARA OBTENER DATOS PAGINADOS - Maneja diferentes estructuras de respuesta
 */
const fetchAllPaginatedData = async (endpoint, options = {}) => {
  let allItems = [];
  let currentPage = 1;
  let hasMoreData = true;
  const limit = options.limit || 50;
  const maxPages = options.maxPages || 200;

  console.log(`📊 Obteniendo datos paginados de ${endpoint} (hasta ${maxPages} páginas)...`);

  while (hasMoreData && currentPage <= maxPages) {
    try {
      const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${currentPage}&limit=${limit}`;
      const response = await fetchFromChipax(url);

      // Manejar diferentes estructuras de respuesta
      let items = [];
      if (response && response.items && Array.isArray(response.items)) {
        items = response.items;
      } else if (response && response.docs && Array.isArray(response.docs)) {
        items = response.docs;
      } else if (Array.isArray(response)) {
        items = response;
      }

      if (items.length > 0) {
        allItems.push(...items);
        
        if (items.length < limit) {
          hasMoreData = false;
        } else {
          currentPage++;
        }
      } else {
        hasMoreData = false;
      }

      // Pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`❌ Error página ${currentPage}:`, error);
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        console.warn('⚠️ Rate limit detectado, pausando 10 segundos...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        hasMoreData = false;
      }
    }
  }

  console.log(`✅ Total obtenido de ${endpoint}: ${allItems.length} items`);
  return { items: allItems, total: allItems.length };
};

/**
 * 🆕 FUNCIÓN PRINCIPAL: Obtener saldos bancarios usando cartolas con objeto Saldo
 * Esta es la implementación correcta que usa /flujo-caja/cartolas
 */
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios (MÉTODO CORREGIDO - CARTOLAS CON SALDO)...');
  
  try {
    // PASO 1: Obtener cuentas corrientes para mapeo
    console.log('📋 Obteniendo cuentas corrientes...');
    const cuentasResponse = await fetchAllPaginatedData('/cuentas-corrientes');
    const cuentas = cuentasResponse.items;

    if (!Array.isArray(cuentas) || cuentas.length === 0) {
      console.warn('⚠️ No se pudieron obtener cuentas corrientes');
      return [];
    }

    console.log(`✅ ${cuentas.length} cuentas corrientes obtenidas`);

    // PASO 2: Obtener cartolas con objeto Saldo
    console.log('💰 Obteniendo cartolas con saldos...');
    const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas', { maxPages: 100 });
    const todasCartolas = cartolasResponse.items;

    if (!Array.isArray(todasCartolas) || todasCartolas.length === 0) {
      console.warn('⚠️ No se obtuvieron cartolas');
      return [];
    }

    console.log(`✅ ${todasCartolas.length} cartolas obtenidas`);

    // PASO 3: Encontrar cartolas más recientes con objeto Saldo por cuenta
    console.log('🎯 Procesando cartolas más recientes con saldos...');
    
    const saldosMasRecientesPorCuenta = {};

    todasCartolas.forEach(cartola => {
      const cuentaId = cartola.cuenta_corriente_id;
      const fecha = new Date(cartola.fecha);
      
      // Solo procesar cartolas que tienen objeto Saldo
      if (!cuentaId || !cartola.Saldo) return;

      // Mantener solo la cartola más reciente por cuenta
      if (!saldosMasRecientesPorCuenta[cuentaId] || 
          fecha > new Date(saldosMasRecientesPorCuenta[cuentaId].fecha)) {
        saldosMasRecientesPorCuenta[cuentaId] = cartola;
      }
    });

    console.log(`📊 Saldos encontrados para ${Object.keys(saldosMasRecientesPorCuenta).length} cuentas`);

    // PASO 4: Crear array final con saldos actuales
    const cuentasConSaldosActuales = cuentas.map(cuenta => {
      const nombreBanco = cuenta.banco || cuenta.Banco || 'desconocido';
      const numeroCuenta = cuenta.numeroCuenta || cuenta.numero || cuenta.nombre || '';
      
      // Obtener cartola más reciente para esta cuenta
      const cartolaReciente = saldosMasRecientesPorCuenta[cuenta.id];
      
      let saldoFinal = 0;
      let detalleCalculo = {
        tieneCartola: false,
        fechaUltimaCartola: null,
        debe: 0,
        haber: 0,
        saldo_deudor: 0,
        saldo_acreedor: 0,
        metodoCalculo: 'sin_cartola'
      };

      if (cartolaReciente && cartolaReciente.Saldo) {
        const saldo = cartolaReciente.Saldo;
        
        // Usar el método más común: haber - debe (saldo positivo en bancos)
        // Ajustar según tus necesidades específicas
        saldoFinal = saldo.haber - saldo.debe;
        
        detalleCalculo = {
          tieneCartola: true,
          fechaUltimaCartola: cartolaReciente.fecha,
          debe: saldo.debe,
          haber: saldo.haber,
          saldo_deudor: saldo.saldo_deudor,
          saldo_acreedor: saldo.saldo_acreedor,
          metodoCalculo: 'haber_menos_debe',
          descripcionCartola: cartolaReciente.descripcion || 'Sin descripción'
        };
      }

      return {
        id: cuenta.id,
        nombre: numeroCuenta,
        banco: nombreBanco,
        tipo: cuenta.TipoCuentaCorriente?.tipoCuenta || 'Cuenta Corriente',
        moneda: cuenta.Moneda?.moneda || 'CLP',
        saldo: saldoFinal,
        saldoCalculado: saldoFinal,
        
        // Información detallada para debugging
        detalleCalculo,
        
        ultimaActualizacion: cartolaReciente?.fecha || new Date().toISOString(),
        origenSaldo: 'cartola_con_objeto_saldo'
      };
    });

    // PASO 5: Mostrar resumen detallado
    const totalSaldos = cuentasConSaldosActuales.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    console.log('\n💰 RESUMEN DE SALDOS BANCARIOS (MÉTODO CORREGIDO):');
    console.log('=================================================');
    console.log(`🔧 Método: Cartolas más recientes con objeto Saldo`);
    console.log(`📊 Cartolas procesadas: ${todasCartolas.length}`);
    console.log(`🏦 Cuentas con saldos: ${Object.keys(saldosMasRecientesPorCuenta).length}`);
    console.log('--------------------------------');
    
    cuentasConSaldosActuales.forEach(cuenta => {
      const detalle = cuenta.detalleCalculo;
      console.log(`🏦 ${cuenta.banco} (${cuenta.nombre}):`);
      
      if (detalle.tieneCartola) {
        console.log(`   📅 Última cartola: ${detalle.fechaUltimaCartola}`);
        console.log(`   💰 Debe: $${detalle.debe.toLocaleString('es-CL')}`);
        console.log(`   💰 Haber: $${detalle.haber.toLocaleString('es-CL')}`);
        console.log(`   🎯 SALDO FINAL: $${cuenta.saldo.toLocaleString('es-CL')}`);
        console.log(`   📝 Descripción: ${detalle.descripcionCartola}`);
      } else {
        console.log(`   ❌ Sin cartolas disponibles`);
      }
      console.log('');
    });
    
    console.log('================================');
    console.log(`💵 TOTAL SALDOS: $${totalSaldos.toLocaleString('es-CL')}`);
    console.log(`📅 Calculado el: ${new Date().toLocaleString('es-CL')}`);
    console.log(`✅ ${cuentasConSaldosActuales.length} saldos procesados`);
    
    return cuentasConSaldosActuales;

  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    throw error;
  }
};

/**
 * ✅ FUNCIÓN: Obtener compras (cuentas por pagar)
 */
const obtenerCompras = async () => {
  console.log('💸 Obteniendo compras (cuentas por pagar)...');
  
  try {
    const response = await fetchAllPaginatedData('/compras', { maxPages: 50 });
    console.log(`✅ ${response.items.length} compras obtenidas`);
    return response.items;
  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    throw error;
  }
};

/**
 * ✅ FUNCIÓN: Obtener DTEs por cobrar
 */
const obtenerDtesPorCobrar = async () => {
  console.log('💰 Obteniendo DTEs por cobrar...');
  
  try {
    const response = await fetchAllPaginatedData('/dtes', { maxPages: 50 });
    const dtes = response.items.filter(dte => 
      dte.enviado === 1 && 
      !dte.anulado && 
      (dte.eventoReceptor !== 'D' || !dte.eventoReceptor)
    );
    
    console.log(`✅ ${dtes.length} DTEs por cobrar obtenidos (de ${response.items.length} total)`);
    return dtes;
  } catch (error) {
    console.error('❌ Error obteniendo DTEs por cobrar:', error);
    throw error;
  }
};

/**
 * ✅ FUNCIÓN: Verificar conectividad
 */
const verificarConectividad = async () => {
  console.log('Verificando conectividad con Chipax...');
  
  try {
    const token = await getChipaxToken();
    console.log('✅ Conectividad con Chipax verificada');
    return true;
  } catch (error) {
    console.error('❌ Error de conectividad:', error);
    return false;
  }
};

// Exportar funciones
const chipaxService = {
  // Funciones principales
  obtenerSaldosBancarios,
  obtenerCompras,
  obtenerDtesPorCobrar,
  
  // Funciones auxiliares
  verificarConectividad,
  fetchFromChipax,
  fetchAllPaginatedData,
  getChipaxToken,
  
  // Para debugging
  refreshToken
};

export default chipaxService;
