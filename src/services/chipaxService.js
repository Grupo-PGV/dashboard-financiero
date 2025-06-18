// chipaxService.js - VERSIÓN MEJORADA CON PAGINACIÓN Y FILTROS

const API_BASE_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

// Cache para el token
let cachedToken = null;
let tokenExpiry = null;

/**
 * ✅ FUNCIÓN MEJORADA: Obtener token con cache
 */
const getChipaxToken = async () => {
  // Verificar si el token existe y no ha expirado
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('🔑 Usando token válido en cache');
    return cachedToken;
  }

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

    if (data.access_token) {
      cachedToken = data.access_token;
      // Configurar expiración para 50 minutos (tokens suelen durar 1 hora)
      tokenExpiry = Date.now() + (50 * 60 * 1000);
      
      console.log('🔐 Token guardado exitosamente');
      console.log('🔐 Token longitud:', cachedToken.length, 'caracteres');
      
      return cachedToken;
    } else {
      throw new Error('No se recibió access_token en la respuesta');
    }

  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    throw new Error(`Error de autenticación: ${error.message}`);
  }
};

/**
 * ✅ FUNCIÓN BASE: Hacer request a Chipax
 */
const fetchFromChipax = async (endpoint) => {
  const token = await getChipaxToken();
  const url = `${API_BASE_URL}${endpoint}`;

  console.log(`🔐 Token para ${endpoint}: ${token.substring(0, 20)}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(`📡 Status de ${endpoint}: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error(`❌ Error en ${endpoint}:`, error);
    throw error;
  }
};

/**
 * ✅ FUNCIÓN NUEVA: Obtener datos paginados con filtros de fecha
 */
const fetchPaginatedDataWithDateFilter = async (endpoint, options = {}) => {
  const {
    limit = 50,
    maxPages = 10,
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

      const data = await fetchFromChipax(url);
      
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

      // Pausa entre requests para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error en página ${currentPage}:`, error);
      hasMoreData = false;
    }
  }

  console.log(`📊 ${endpoint}: ${allData.length} items obtenidos`);
  return allData;
};

/**
 * ✅ FUNCIÓN MEJORADA: Obtener compras con filtro de fechas recientes
 */
const obtenerCuentasPorPagar = async () => {
  console.log('💸 Obteniendo compras (200 más recientes desde 2025)...');

  try {
    // Obtener compras desde enero 2025 hacia atrás, ordenadas por fecha descendente
    const compras = await fetchPaginatedDataWithDateFilter('/compras', {
      limit: 50,           // Límite por página
      maxPages: 4,         // 4 páginas = 200 items máximo
      maxItems: 200,       // Límite total de items
      sortBy: 'fechaEmision',
      sortOrder: 'desc',   // Más recientes primero
      startDate: '2024-01-01',  // Desde enero 2024
      endDate: null        // Sin fecha límite (hasta hoy)
    });

    // Validar estructura de datos
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
        montoTotal: primeraCompra.montoTotal,
        fechaPagoInterna: primeraCompra.fechaPagoInterna
      });

      // Ordenar por fecha de emisión descendente (más recientes primero)
      compras.sort((a, b) => {
        const fechaA = new Date(a.fechaEmision || a.fecha || '1900-01-01');
        const fechaB = new Date(b.fechaEmision || b.fecha || '1900-01-01');
        return fechaB - fechaA;
      });

      console.log(`✅ ${compras.length} compras obtenidas y ordenadas por fecha`);
      console.log(`📅 Rango: ${compras[compras.length-1].fechaEmision} → ${compras[0].fechaEmision}`);
    }

    return compras;

  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN MEJORADA: Obtener DTEs por cobrar con mejor debugging
 */
const obtenerCuentasPorCobrar = async () => {
  console.log('📋 Obteniendo DTEs por cobrar...');

  try {
    const data = await fetchFromChipax('/dtes?porCobrar=1');
    
    console.log('🔍 DEBUG DTEs - Estructura de respuesta:');
    console.log('- Tipo de respuesta:', typeof data);
    console.log('- Es array:', Array.isArray(data));
    console.log('- Llaves del objeto:', Object.keys(data || {}));

    let dtes = [];

    // Manejar diferentes estructuras de respuesta
    if (Array.isArray(data)) {
      dtes = data;
      console.log('✅ DTEs encontrados como array directo');
    } else if (data && typeof data === 'object') {
      // Buscar array de DTEs en las propiedades del objeto
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0) {
          // Verificar que sea un array de DTEs válido
          if (value[0].id && (value[0].folio || value[0].montoTotal)) {
            dtes = value;
            console.log(`✅ DTEs encontrados en '${key}': ${value.length} items`);
            break;
          }
        }
      }
    }

    if (dtes.length === 0) {
      console.warn('⚠️ No se encontraron DTEs por cobrar');
      return [];
    }

    // Debug de estructura de DTEs
    if (dtes.length > 0) {
      console.log('🔍 DEBUG: Primer DTE (campos importantes):');
      const primerDTE = dtes[0];
      console.log({
        id: primerDTE.id,
        folio: primerDTE.folio,
        razonSocial: primerDTE.razonSocial,
        montoTotal: primerDTE.montoTotal,
        montoNeto: primerDTE.montoNeto,
        fechaEmision: primerDTE.fechaEmision,
        Saldo: primerDTE.Saldo,
        Cartolas: primerDTE.Cartolas?.length || 0,
        anulado: primerDTE.anulado
      });

      // Analizar saldos
      const dtesConSaldo = dtes.filter(dte => {
        if (dte.Saldo && dte.Saldo.saldoDeudor > 0) return true;
        if (dte.montoTotal > 0 && !dte.anulado) return true;
        return false;
      });

      console.log(`💰 DTEs con saldo/monto > 0: ${dtesConSaldo.length}/${dtes.length}`);
      
      if (dtesConSaldo.length > 0) {
        console.log('🔍 DEBUG: Primeros 3 DTEs con saldo:');
        dtesConSaldo.slice(0, 3).forEach((dte, i) => {
          console.log(`DTE ${i + 1}:`, {
            folio: dte.folio,
            montoTotal: dte.montoTotal,
            saldoDeudor: dte.Saldo?.saldoDeudor || 0,
            estado: dte.anulado === 'S' ? 'Anulado' : 'Activo'
          });
        });
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
 * ✅ FUNCIÓN EXISTENTE: Obtener saldos bancarios (mantener como está)
 */
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios...');

  try {
    // 1. Obtener cuentas corrientes
    console.log('📋 Obteniendo cuentas corrientes...');
    const cuentas = await fetchFromChipax('/cuentas-corrientes');

    if (!Array.isArray(cuentas)) {
      console.warn('⚠️ Cuentas corrientes no es array');
      return [];
    }

    console.log(`✅ ${cuentas.length} cuentas corrientes obtenidas`);

    // 2. Obtener cartolas para calcular saldos
    console.log('💰 Obteniendo cartolas para calcular saldos...');
    const cartolasData = await fetchFromChipax('/flujo-caja/cartolas');

    let cartolas = [];
    if (Array.isArray(cartolasData)) {
      cartolas = cartolasData;
    } else if (cartolasData.items && Array.isArray(cartolasData.items)) {
      cartolas = cartolasData.items;
    }

    console.log(`✅ ${cartolas.length} cartolas obtenidas`);

    // 3. Calcular saldos por cuenta
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

      // Usar el saldo más reciente
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

    // 4. Combinar cuentas con saldos calculados
    const cuentasConSaldos = cuentas.map(cuenta => ({
      ...cuenta,
      saldoCalculado: saldosPorCuenta[cuenta.id]?.saldoDeudor || 
                     saldosPorCuenta[cuenta.id]?.saldoAcreedor || 0,
      ultimaActualizacion: saldosPorCuenta[cuenta.id]?.ultimaFecha || null,
      saldoInfo: saldosPorCuenta[cuenta.id] || null
    }));

    const totalSaldos = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.saldoCalculado, 0);
    console.log(`💰 Saldos calculados para ${cuentasConSaldos.length} cuentas`);
    console.log(`💵 Saldo total calculado: ${totalSaldos.toLocaleString('es-CL')}`);

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
