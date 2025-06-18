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
 * ✅ FUNCIÓN MEGA-OPTIMIZADA: Para procesar TODAS las facturas hasta encontrar las más recientes
 * OBJETIVO: Llegar a 2024-2025
 */
const obtenerCuentasPorPagar = async () => {
  console.log('💸 Obteniendo compras (MEGA-PROCESAMIENTO para llegar a 2024-2025)...');

  try {
    let allCompras = [];
    let currentPage = 1;
    let hasMoreData = true;
    const limit = 50;
    
    // ✅ MEGA AUMENTO: Para procesar todas las facturas necesarias
    const maxPages = 800; // 800 páginas = 40,000 facturas máximo
    
    console.log(`🚀 MEGA-PROCESAMIENTO: hasta ${maxPages} páginas (${maxPages * limit} facturas)`);
    console.log(`⏱️ Estimado: ~${Math.ceil(maxPages * 0.4 / 60)} minutos con optimizaciones`);
    console.log(`🎯 OBJETIVO: Encontrar facturas de 2024-2025\n`);

    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    let lastProgressReport = 0;

    while (hasMoreData && currentPage <= maxPages && consecutiveErrors < maxConsecutiveErrors) {
      try {
        // ✅ PAUSA OPTIMIZADA: Rápida pero segura
        let pausaMs = 150; // Pausa base más rápida
        if (currentPage > 200) pausaMs = 200;  // Ligeramente más lento después de 200
        if (currentPage > 500) pausaMs = 300;  // Más cuidadoso en páginas altas
        
        // ✅ LOG OPTIMIZADO: Solo cada 25 páginas para no saturar
        if (currentPage % 25 === 0) {
          console.log(`📄 Página ${currentPage}/${maxPages} (${allCompras.length} facturas | pausa: ${pausaMs}ms)`);
        }
        
        const url = `/compras?limit=${limit}&page=${currentPage}`;
        const data = await fetchFromChipax(url, { maxRetries: 3, retryDelay: 1000 });
        
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
          consecutiveErrors = 0;
          
          // ✅ ANÁLISIS INTELIGENTE cada 100 páginas
          if (currentPage % 100 === 0) {
            const ultimasFechas = allCompras
              .slice(-500) // Analizar las últimas 500 facturas
              .map(item => item.fechaRecepcion || item.fecha_recepcion || item.created)
              .filter(fecha => fecha)
              .map(fecha => new Date(fecha));
            
            if (ultimasFechas.length > 0) {
              const fechaMasReciente = new Date(Math.max(...ultimasFechas));
              const fechaMasAntigua = new Date(Math.min(...ultimasFechas));
              const hoy = new Date();
              const diasDesdeMasReciente = Math.floor((hoy - fechaMasReciente) / (1000 * 60 * 60 * 24));
              
              console.log(`\n📊 ANÁLISIS PÁGINA ${currentPage}:`);
              console.log(`   📅 Últimas 500 facturas: ${fechaMasAntigua.toISOString().split('T')[0]} → ${fechaMasReciente.toISOString().split('T')[0]}`);
              console.log(`   ⏰ Más reciente: hace ${diasDesdeMasReciente} días (${fechaMasReciente.getFullYear()})`);
              console.log(`   📈 Total: ${allCompras.length.toLocaleString()} facturas procesadas`);
              console.log(`   🎯 Progreso hacia 2024-2025: ${fechaMasReciente.getFullYear() >= 2024 ? '✅ ALCANZADO' : `📈 Año ${fechaMasReciente.getFullYear()}`}\n`);
              
              // ✅ DETECCIÓN DE ÉXITO: Facturas de 2024-2025
              if (fechaMasReciente.getFullYear() >= 2024) {
                console.log(`🎉 ¡OBJETIVO ALCANZADO! Facturas de ${fechaMasReciente.getFullYear()} encontradas`);
                
                // Continuar un poco más para asegurar que tenemos las más recientes
                if (diasDesdeMasReciente <= 180) { // Si son de los últimos 6 meses
                  console.log(`🎯 Facturas muy recientes encontradas. Procesando 50 páginas más para completitud...`);
                  maxPages = Math.min(maxPages, currentPage + 50);
                }
              }
              
              // ✅ OPTIMIZACIÓN: Si vamos muy lentos, acelerar
              if (fechaMasReciente.getFullYear() < 2023 && currentPage > 300) {
                console.log(`⚡ Acelerando búsqueda - aún en ${fechaMasReciente.getFullYear()}`);
                pausaMs = Math.max(100, pausaMs - 50); // Reducir pausa
              }
            }
          }
          
          if (pageItems.length < limit) {
            console.log(`📄 Última página disponible (${pageItems.length} items < ${limit})`);
            hasMoreData = false;
          } else {
            currentPage++;
          }
        } else {
          console.log(`📄 Página ${currentPage} vacía - fin de datos`);
          hasMoreData = false;
        }

        // ✅ PAUSA INTELIGENTE
        await new Promise(resolve => setTimeout(resolve, pausaMs));

      } catch (error) {
        consecutiveErrors++;
        console.error(`❌ Error página ${currentPage} (${consecutiveErrors}/${maxConsecutiveErrors}): ${error.message}`);
        
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          console.warn(`⚠️ Rate limit - pausa de 15 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
          consecutiveErrors = Math.max(0, consecutiveErrors - 1); // Reducir contador tras espera
        } else if (consecutiveErrors >= maxConsecutiveErrors) {
          console.warn(`⚠️ Demasiados errores. Procesando ${allCompras.length} facturas obtenidas...`);
          hasMoreData = false;
        } else {
          await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa más larga
        }
      }
    }

    // ✅ RESUMEN FINAL DETALLADO
    console.log(`\n🏁 PROCESAMIENTO COMPLETADO:`);
    console.log(`   📊 Total facturas: ${allCompras.length.toLocaleString()}`);
    console.log(`   📄 Páginas procesadas: ${currentPage - 1}/${maxPages}`);
    console.log(`   ⏱️ Tiempo transcurrido: ~${Math.ceil((currentPage - 1) * 0.3 / 60)} minutos\n`);

    if (allCompras.length === 0) {
      console.warn('⚠️ No se obtuvieron compras');
      return [];
    }

    // ✅ ANÁLISIS RÁPIDO PRE-ORDENAMIENTO
    console.log('🔍 Análisis rápido de distribución temporal...');
    
    const comprasConFechas = allCompras.filter(compra => {
      return compra.fechaRecepcion || compra.fecha_recepcion || compra.created || 
             compra.fechaEmision || compra.fecha_emision || compra.fecha;
    });
    
    console.log(`📊 ${comprasConFechas.length} facturas con fechas válidas`);

    // ✅ ANÁLISIS POR AÑOS para entender distribución
    const facturasPorAno = {};
    comprasConFechas.forEach(compra => {
      const fecha = new Date(
        compra.fechaRecepcion || compra.fecha_recepcion || compra.created || 
        compra.fechaEmision || compra.fecha_emision || compra.fecha
      );
      const ano = fecha.getFullYear();
      if (ano >= 2020 && ano <= 2025) { // Solo años relevantes
        facturasPorAno[ano] = (facturasPorAno[ano] || 0) + 1;
      }
    });

    console.log('\n📈 DISTRIBUCIÓN POR AÑO:');
    Object.keys(facturasPorAno)
      .sort((a, b) => b - a) // Más recientes primero
      .forEach(ano => {
        const cantidad = facturasPorAno[ano];
        const emoji = ano >= 2024 ? '🎯' : ano >= 2023 ? '📅' : '📜';
        console.log(`   ${emoji} ${ano}: ${cantidad.toLocaleString()} facturas`);
      });

    // ORDENAMIENTO COMPLETO
    console.log('\n🔄 Ordenamiento final por fecha de recepción...');
    
    comprasConFechas.sort((a, b) => {
      const fechaA = new Date(
        a.fechaRecepcion || a.fecha_recepcion || a.created || 
        a.fechaEmision || a.fecha_emision || a.fecha || '1900-01-01'
      );
      const fechaB = new Date(
        b.fechaRecepcion || b.fecha_recepcion || b.created || 
        b.fechaEmision || b.fecha_emision || b.fecha || '1900-01-01'
      );
      return fechaB - fechaA;
    });

    // ✅ SELECCIÓN FINAL MÁS GENEROSA
    const cantidadParaMostrar = Math.min(1500, comprasConFechas.length); // Aumentado a 1500
    const comprasRecientes = comprasConFechas.slice(0, cantidadParaMostrar);

    console.log(`\n✅ Seleccionadas las ${cantidadParaMostrar} facturas más recientes\n`);

    // ✅ RESULTADO FINAL ÉPICO
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
      
      const fechaReciente = new Date(fechaRecepcionReciente);
      const hoy = new Date();
      const diffDias = Math.floor((hoy - fechaReciente) / (1000 * 60 * 60 * 24));
      
      console.log('🎯 RESULTADO FINAL - MEGA PROCESAMIENTO:');
      console.log('========================================');
      console.log(`📅 FACTURA MÁS RECIENTE: ${fechaReciente.toISOString().split('T')[0]} (hace ${diffDias} días)`);
      console.log(`📅 Rango seleccionado: ${new Date(fechaRecepcionAntigua).toISOString().split('T')[0]} → ${fechaReciente.toISOString().split('T')[0]}`);
      console.log(`📊 Total procesadas: ${allCompras.length.toLocaleString()} facturas`);
      console.log(`📋 Facturas mostradas: ${comprasRecientes.length} (las más recientes)`);
      console.log(`🎯 Año más reciente: ${fechaReciente.getFullYear()}`);

      // ✅ EVALUACIÓN DE ÉXITO ÉPICA
      if (fechaReciente.getFullYear() >= 2024) {
        if (diffDias <= 30) {
          console.log(`\n🏆 ¡ÉXITO TOTAL! Facturas de ${fechaReciente.getFullYear()} muy recientes (${diffDias} días)`);
        } else if (diffDias <= 180) {
          console.log(`\n🎉 ¡ÉXITO! Facturas de ${fechaReciente.getFullYear()} (hace ${Math.floor(diffDias/30)} meses)`);
        } else {
          console.log(`\n✅ Facturas de ${fechaReciente.getFullYear()} encontradas (hace ${Math.floor(diffDias/30)} meses)`);
        }
      } else if (fechaReciente.getFullYear() >= 2023) {
        console.log(`\n📈 Progreso: Llegamos a ${fechaReciente.getFullYear()}. Considera aumentar maxPages para llegar a 2024.`);
      } else {
        console.log(`\n⚠️ Año ${fechaReciente.getFullYear()}: Necesitas procesar más páginas para llegar a facturas actuales.`);
      }

      // ✅ DETALLE DE LA FACTURA MÁS RECIENTE
      console.log('\n🔍 FACTURA MÁS RECIENTE ENCONTRADA:');
      console.log(`   📋 ID: ${primeraCompra.id}`);
      console.log(`   📄 Folio: ${primeraCompra.folio}`);
      console.log(`   🏢 Proveedor: ${primeraCompra.razonSocial}`);
      console.log(`   📅 Emisión: ${primeraCompra.fechaEmision}`);
      console.log(`   📥 Recepción: ${primeraCompra.fechaRecepcion || primeraCompra.fecha_recepcion || 'N/A'}`);
      console.log(`   💰 Monto: ${primeraCompra.montoTotal ? `$${primeraCompra.montoTotal.toLocaleString()}` : 'N/A'}`);
    }

    return comprasRecientes;

  } catch (error) {
    console.error('❌ Error en mega-procesamiento:', error);
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
