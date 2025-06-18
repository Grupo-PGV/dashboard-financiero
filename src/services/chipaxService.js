// chipaxService.js - VERSIÓN COMPLETA CORREGIDA
// ✅ CORRECCIÓN PRINCIPAL: Aumentar maxPages y mejorar ordenamiento por fecha de recepción

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
 * ✅ FUNCIÓN DE AUTENTICACIÓN
 */
const getChipaxToken = async () => {
  if (tokenCache.isRefreshing && tokenCache.refreshPromise) {
    console.log('🔄 Esperando refresh de token en curso...');
    return await tokenCache.refreshPromise;
  }

  const now = Date.now();
  const tokenMargin = 5 * 60 * 1000; // 5 minutos de margen
  
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
  console.log('🔑 APP_ID:', APP_ID ? 
    `${APP_ID.substring(0, 10)}...` : 'NO CONFIGURADO');

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
    tokenCache.expiry = Date.now() + (50 * 60 * 1000); // 50 minutos
    
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

/**
 * ✅ FUNCIÓN BASE PARA HACER PETICIONES A CHIPAX
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
 * ✅ FUNCIÓN AUXILIAR: Obtener datos paginados completos
 */
const fetchAllPaginatedData = async (endpoint, maxItems = 1000) => {
  console.log(`📊 Obteniendo datos completos de ${endpoint}...`);
  
  let allItems = [];
  let currentPage = 1;
  let hasMoreData = true;
  const limit = 50;
  const maxPages = Math.ceil(maxItems / limit);

  while (hasMoreData && currentPage <= maxPages) {
    try {
      console.log(`📄 Cargando página ${currentPage}...`);
      
      const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&page=${currentPage}`;
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
        allItems.push(...pageItems);
        console.log(`✅ Página ${currentPage}: ${pageItems.length} items (total: ${allItems.length})`);
        
        if (pageItems.length < limit) {
          hasMoreData = false;
        } else {
          currentPage++;
        }
      } else {
        hasMoreData = false;
      }

      // Pausa para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error en página ${currentPage}:`, error);
      hasMoreData = false;
    }
  }

  console.log(`📊 Total items obtenidos: ${allItems.length}`);

  return {
    items: allItems,
    pagination: {
      currentPage: currentPage - 1,
      totalPages: currentPage - 1,
      totalItems: allItems.length,
      completenessPercent: 100
    }
  };
};

/**
 * ✅ FUNCIÓN PRINCIPAL CORREGIDA: Obtener compras MÁS RECIENTES
 * CORRECCIÓN: Aumentar maxPages de 10 a 50 para obtener facturas más recientes
 */
const obtenerCuentasPorPagar = async () => {
  console.log('💸 Obteniendo compras (CORREGIDO - ordenadas por fecha de recepción)...');

  try {
    let allCompras = [];
    let currentPage = 1;
    let hasMoreData = true;
    const limit = 50;
    
    // ✅ CORRECCIÓN PRINCIPAL: Aumentar maxPages de 10 a 50
    const maxPages = 50; // AUMENTADO para obtener más facturas recientes
    
    console.log(`🔍 Buscando facturas recientes en hasta ${maxPages} páginas...`);

    // ✅ ESTRATEGIA MEJORADA: Obtener más páginas para encontrar facturas recientes
    while (hasMoreData && currentPage <= maxPages) {
      try {
        console.log(`📄 Cargando página ${currentPage}/${maxPages}...`);
        
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
          
          // ✅ CORRECCIÓN: Verificar si encontramos facturas recientes en esta página
          const fechasRecepcion = pageItems
            .map(item => item.fechaRecepcion || item.fecha_recepcion || item.created)
            .filter(fecha => fecha)
            .map(fecha => new Date(fecha));
          
          if (fechasRecepcion.length > 0) {
            const fechaMasReciente = new Date(Math.max(...fechasRecepcion));
            const hoy = new Date();
            const diasDesdeMasReciente = Math.floor((hoy - fechaMasReciente) / (1000 * 60 * 60 * 24));
            
            console.log(`📅 Página ${currentPage}: factura más reciente hace ${diasDesdeMasReciente} días (${fechaMasReciente.toISOString().split('T')[0]})`);
            
            // Si encontramos facturas muy recientes (menos de 7 días), podríamos parar antes si ya tenemos suficientes
            if (diasDesdeMasReciente <= 7 && allCompras.length >= 1000) {
              console.log(`✅ Encontradas facturas muy recientes (${diasDesdeMasReciente} días), tenemos suficientes datos`);
              hasMoreData = false;
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

        // Pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error en página ${currentPage}:`, error);
        hasMoreData = false;
      }
    }

    console.log(`📊 Total compras obtenidas: ${allCompras.length}`);

    if (allCompras.length === 0) {
      console.warn('⚠️ No se obtuvieron compras de la API');
      return { data: [], pagination: { completenessPercent: 0, totalItems: 0 } };
    }

    // ✅ CORRECCIÓN: ORDENAMIENTO MEJORADO por fecha de RECEPCIÓN
    console.log('🔄 Ordenando compras por fecha de RECEPCIÓN (más recientes primero)...');
    
    allCompras.sort((a, b) => {
      // ✅ USAR FECHA DE RECEPCIÓN como prioridad absoluta
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

    // ✅ CORRECCIÓN: Tomar más facturas recientes
    const comprasRecientes = allCompras.slice(0, 800); // AUMENTADO de 300 a 800

    // ✅ VERIFICACIÓN mejorada del rango de fechas de RECEPCIÓN
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

      // ✅ VERIFICACIÓN de datos recientes POR RECEPCIÓN
      const fechaReciente = new Date(fechaRecepcionReciente);
      const hoy = new Date();
      const diffDias = Math.floor((hoy - fechaReciente) / (1000 * 60 * 60 * 24));
      
      if (diffDias > 30) {
        console.warn(`⚠️ ADVERTENCIA: La factura más reciente fue recibida hace ${diffDias} días (${fechaReciente.toISOString().split('T')[0]})`);
        console.warn(`⚠️ Considera verificar si hay facturas más recientes en la API o aumentar maxPages`);
      } else {
        console.log(`✅ Datos recientes: última factura recibida hace ${diffDias} días`);
      }

      // ✅ MOSTRAR muestra de fechas para debugging
      console.log('🔍 DEBUG: Primeras 5 compras (recepción vs emisión):');
      comprasRecientes.slice(0, 5).forEach((compra, i) => {
        console.log(`${i + 1}. Folio: ${compra.folio} | Emisión: ${compra.fechaEmision} | Recepción: ${compra.fechaRecepcion || compra.fecha_recepcion || 'N/A'} | Created: ${compra.created || 'N/A'}`);
      });
    }

    // ✅ RETORNAR en el formato esperado
    return {
      data: comprasRecientes,
      pagination: {
        currentPage: currentPage - 1,
        totalPages: currentPage - 1,
        totalItems: comprasRecientes.length,
        completenessPercent: Math.min(100, Math.round((comprasRecientes.length / allCompras.length) * 100))
      }
    };

  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    throw error;
  }
};

/**
 * ✅ FUNCIÓN: Obtener cuentas por cobrar (DTEs)
 */
const obtenerCuentasPorCobrar = async () => {
  console.log('💰 Obteniendo cuentas por cobrar (DTEs)...');

  try {
    return await fetchAllPaginatedData('/dtes');
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por cobrar:', error);
    throw error;
  }
};

/**
 * ✅ FUNCIÓN: Obtener saldos bancarios
 */
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios...');

  try {
    // Obtener cuentas bancarias
    const cuentasResponse = await fetchFromChipax('/cuentas_bancarias');
    let cuentas = [];
    
    if (Array.isArray(cuentasResponse)) {
      cuentas = cuentasResponse;
    } else if (cuentasResponse.items && Array.isArray(cuentasResponse.items)) {
      cuentas = cuentasResponse.items;
    } else if (cuentasResponse.data && Array.isArray(cuentasResponse.data)) {
      cuentas = cuentasResponse.data;
    }

    console.log(`🏦 ${cuentas.length} cuentas bancarias encontradas`);

    // Obtener cartolas para calcular saldos
    const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas');
    const cartolas = cartolasResponse.items;

    console.log(`📊 ${cartolas.length} cartolas obtenidas`);

    // Calcular saldos por cuenta usando la cartola más reciente
    const saldosPorCuenta = {};
    
    cartolas.forEach(cartola => {
      const cuentaId = cartola.cuenta_corriente_id;
      
      if (!saldosPorCuenta[cuentaId]) {
        saldosPorCuenta[cuentaId] = {
          saldoDeudor: cartola.saldo || 0,
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

    // Combinar cuentas con saldos calculados
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

/**
 * ✅ FUNCIÓN: Obtener clientes
 */
const obtenerClientes = async () => {
  console.log('👥 Obteniendo clientes...');

  try {
    return await fetchAllPaginatedData('/clientes');
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    throw error;
  }
};

/**
 * ✅ FUNCIÓN: Obtener proveedores
 */
const obtenerProveedores = async () => {
  console.log('🏭 Obteniendo proveedores...');

  try {
    return await fetchAllPaginatedData('/proveedores');
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    throw error;
  }
};

/**
 * ✅ ALIAS: Crear alias para compatibilidad
 */
const obtenerCompras = obtenerCuentasPorPagar;

// ✅ EXPORTACIONES DEL SERVICIO
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerCompras, // Alias
  obtenerClientes,
  obtenerProveedores,
};

export default chipaxService;

// ✅ EXPORTACIONES INDIVIDUALES
export {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerCompras,
  obtenerClientes,
  obtenerProveedores,
};
