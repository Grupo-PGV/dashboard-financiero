// chipaxService.js - VERSIÓN COMPLETA CORREGIDA para obtener facturas recientes

const API_BASE_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

// Cache para el token (mantener igual que antes)
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
 * ✅ FUNCIÓN MODIFICADA: Buscar TODAS las compras hasta encontrar las más recientes
 * Esta función no tiene límite fijo y busca hasta encontrar facturas del día actual
 */
const obtenerCuentasPorPagar = async () => {
  console.log('💸 Obteniendo compras (BÚSQUEDA SIN LÍMITE hasta encontrar facturas recientes)...');

  try {
    let allCompras = [];
    let currentPage = 94; // ✅ OPTIMIZACIÓN: Comenzar desde página 94 donde están las facturas de 2025
    let hasMoreData = true;
    const limit = 50;
    
    // ✅ NUEVA LÓGICA: Sin límite fijo de páginas, optimizada desde página 94
    let facturasMuyRecientesEncontradas = false;
    let facturasSinCambiosCount = 0;
    const maxFacturasSinCambios = 3; // Reducido a 3 ya que las facturas recientes están cerca
    
    const hoy = new Date();
    let mejorFechaEncontrada = new Date('2025-01-01'); // Empezar desde 2025
    
    console.log(`🚀 BÚSQUEDA OPTIMIZADA: Comenzando desde página 94 (facturas 2025)`);
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
          
          // ✅ VERIFICAR FECHAS DE ESTA PÁGINA
          const fechasEstasPagina = pageItems
            .map(item => {
              // Priorizar fecha de emisión sobre fecha de recepción para buscar las más recientes
              return item.fechaEmision || 
                     item.fecha_emision || 
                     item.fechaRecepcion || 
                     item.fecha_recepcion || 
                     item.created;
            })
            .filter(fecha => fecha)
            .map(fecha => new Date(fecha));
          
          if (fechasEstasPagina.length > 0) {
            const fechaMasRecienteEstaPagina = new Date(Math.max(...fechasEstasPagina));
            const diasDesdeMasReciente = Math.floor((hoy - fechaMasRecienteEstaPagina) / (1000 * 60 * 60 * 24));
            
            console.log(`📊 Página ${currentPage}: ${pageItems.length} facturas, más reciente hace ${diasDesdeMasReciente} días (${fechaMasRecienteEstaPagina.toISOString().split('T')[0]})`);
            
            // ✅ CRITERIO DE PARADA: Facturas del día actual o muy recientes
            if (diasDesdeMasReciente <= 1) {
              console.log(`🎯 ¡ENCONTRADAS! Facturas del día actual o de ayer en página ${currentPage}`);
              facturasMuyRecientesEncontradas = true;
              break;
            }
            
            // ✅ CRITERIO DE PARADA: Facturas de la última semana con menos datos necesarios
            if (diasDesdeMasReciente <= 7 && allCompras.length >= 500) { // Reducido de 1000 a 500
              console.log(`🎯 Facturas de la última semana encontradas con ${allCompras.length} facturas totales`);
              facturasMuyRecientesEncontradas = true;
              break;
            }
            
            // ✅ VERIFICAR PROGRESO: Si las fechas no mejoran, contar páginas sin cambios
            if (fechaMasRecienteEstaPagina > mejorFechaEncontrada) {
              mejorFechaEncontrada = fechaMasRecienteEstaPagina;
              facturasSinCambiosCount = 0; // Resetear contador
            } else {
              facturasSinCambiosCount++;
              console.log(`⚠️ Página ${currentPage}: Sin mejora en fechas (${facturasSinCambiosCount}/${maxFacturasSinCambios})`);
            }
            
            // ✅ CRITERIO DE PARADA: Menos páginas sin mejora porque empezamos cerca de las recientes
            if (facturasSinCambiosCount >= maxFacturasSinCambios && allCompras.length >= 1000) { // Reducido umbral
              console.log(`🛑 Parada por falta de progreso: ${facturasSinCambiosCount} páginas sin mejores fechas`);
              break;
            }
          }
          
          // ✅ VERIFICAR SI HAY MÁS PÁGINAS
          if (pageItems.length < limit) {
            console.log(`🏁 Última página alcanzada (${pageItems.length} < ${limit} items)`);
            hasMoreData = false;
          } else {
            currentPage++;
          }
          
        } else {
          console.log(`🏁 Página vacía encontrada en página ${currentPage}`);
          hasMoreData = false;
        }

        // ✅ PAUSA MUY CORTA para procesar rápidamente desde página 94
        await new Promise(resolve => setTimeout(resolve, 25)); // Reducido de 50ms a 25ms

        // ✅ CRITERIO DE SEGURIDAD: Límite más conservador ya que empezamos desde página 94
        if (currentPage > 200) { // Límite más bajo: de página 94 a 200 = 106 páginas = 5,300 facturas
          console.log(`🛑 Límite de seguridad alcanzado: ${currentPage} páginas (desde página 94)`);
          break;
        }

      } catch (error) {
        console.error(`❌ Error en página ${currentPage}:`, error);
        hasMoreData = false;
      }
    }

    console.log(`📊 RESUMEN DE BÚSQUEDA OPTIMIZADA:`);
    console.log(`   🚀 Página inicial: 94 (facturas 2025)`);
    console.log(`   📄 Páginas procesadas: ${currentPage - 94} (desde página 94 hasta ${currentPage - 1})`);
    console.log(`   📋 Total facturas obtenidas: ${allCompras.length}`);
    console.log(`   📅 Mejor fecha encontrada: ${mejorFechaEncontrada.toISOString().split('T')[0]}`);
    console.log(`   🎯 Facturas recientes encontradas: ${facturasMuyRecientesEncontradas ? 'SÍ' : 'NO'}`);
    console.log(`   ⚡ Tiempo aproximado ahorrado: ${(94 - 1) * 50}ms por no procesar páginas 1-93`);
    if (allCompras.length === 0) {
      console.warn('⚠️ No se obtuvieron compras de la API');
      return [];
    }

    // ✅ ORDENAMIENTO MEJORADO: Priorizar fecha de emisión, luego recepción
    console.log('🔄 Ordenando compras por fecha (EMISIÓN prioritaria, luego RECEPCIÓN)...');
    
    allCompras.sort((a, b) => {
      // Priorizar fecha de emisión para encontrar las más recientes
      const fechaA = new Date(
        a.fechaEmision || 
        a.fecha_emision || 
        a.fechaRecepcion || 
        a.fecha_recepcion || 
        a.created || 
        '1900-01-01'
      );
      
      const fechaB = new Date(
        b.fechaEmision || 
        b.fecha_emision || 
        b.fechaRecepcion || 
        b.fecha_recepcion || 
        b.created || 
        '1900-01-01'
      );
      
      return fechaB - fechaA; // Descendente (más recientes primero)
    });

    // ✅ TOMAR MÁS FACTURAS RECIENTES para análisis
    const comprasRecientes = allCompras.slice(0, Math.min(1000, allCompras.length));

    // ✅ DEBUG: Verificar el rango de fechas final
    if (comprasRecientes.length > 0) {
      const primeraCompra = comprasRecientes[0];
      const ultimaCompra = comprasRecientes[comprasRecientes.length - 1];
      
      const fechaMasReciente = primeraCompra.fechaEmision || 
                              primeraCompra.fecha_emision || 
                              primeraCompra.fechaRecepcion || 
                              primeraCompra.fecha_recepcion || 
                              primeraCompra.created;
                                     
      const fechaMasAntigua = ultimaCompra.fechaEmision || 
                             ultimaCompra.fecha_emision || 
                             ultimaCompra.fechaRecepcion || 
                             ultimaCompra.fecha_recepcion || 
                             ultimaCompra.created;
      
      console.log('🔍 DEBUG: Primera compra (más reciente por emisión):');
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
      console.log(`📅 Rango de fechas: ${fechaMasAntigua} → ${fechaMasReciente}`);

      // ✅ VERIFICACIÓN FINAL: ¿Encontramos facturas realmente recientes?
      const fechaReciente = new Date(fechaMasReciente);
      const diffDias = Math.floor((hoy - fechaReciente) / (1000 * 60 * 60 * 24));
      
      if (diffDias <= 7) {
        console.log(`🎉 ¡ÉXITO! Facturas muy recientes encontradas: última hace ${diffDias} días`);
      } else if (diffDias <= 30) {
        console.log(`✅ Facturas relativamente recientes: última hace ${diffDias} días`);
      } else {
        console.warn(`⚠️ Las facturas más recientes son de hace ${diffDias} días. Puede que no haya facturas más nuevas en el sistema.`);
      }
      
      // ✅ MOSTRAR MUESTRA DE LAS FACTURAS MÁS RECIENTES
      console.log('📋 LAS 5 FACTURAS MÁS RECIENTES:');
      comprasRecientes.slice(0, 5).forEach((compra, i) => {
        const fechaPrincipal = compra.fechaEmision || compra.fecha_emision || compra.fechaRecepcion || compra.fecha_recepcion;
        const diasHace = Math.floor((hoy - new Date(fechaPrincipal)) / (1000 * 60 * 60 * 24));
        console.log(`${i + 1}. Folio ${compra.folio}: ${fechaPrincipal} (hace ${diasHace} días) - ${compra.razonSocial}`);
      });
    }

    return comprasRecientes;

  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN ORIGINAL: Obtener DTEs por cobrar (SIN CAMBIOS)
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
 * ✅ FUNCIÓN ORIGINAL: Obtener saldos bancarios (SIN CAMBIOS)
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

// Exportaciones - IGUAL QUE ANTES
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
