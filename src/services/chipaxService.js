// chipaxService.js - VERSIÓN COMPLETA CORREGIDA con saldos bancarios mejorados

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
 * ✅ NUEVA FUNCIÓN: Obtener datos paginados de manera eficiente
 */
const fetchAllPaginatedData = async (endpoint, options = {}) => {
  let allItems = [];
  let currentPage = 1;
  let hasMoreData = true;
  const limit = options.limit || 50;
  const maxPages = options.maxPages || 100; // Límite de seguridad

  console.log(`📊 Obteniendo datos paginados de ${endpoint}...`);

  while (hasMoreData && currentPage <= maxPages) {
    try {
      const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${currentPage}&limit=${limit}`;
      const response = await fetchFromChipax(url, { maxRetries: 3 });

      let pageItems = [];
      
      // Manejar diferentes estructuras de respuesta
      if (Array.isArray(response)) {
        pageItems = response;
      } else if (response.items && Array.isArray(response.items)) {
        pageItems = response.items;
      } else if (response.data && Array.isArray(response.data)) {
        pageItems = response.data;
      }

      if (pageItems.length > 0) {
        allItems.push(...pageItems);
        
        // Log de progreso cada 10 páginas
        if (currentPage % 10 === 0) {
          console.log(`📄 Página ${currentPage}: ${allItems.length} items totales`);
        }

        // Si recibimos menos items que el límite, probablemente es la última página
        if (pageItems.length < limit) {
          hasMoreData = false;
        } else {
          currentPage++;
        }
      } else {
        hasMoreData = false;
      }

      // Pausa pequeña para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error en página ${currentPage}:`, error);
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.warn('⚠️ Rate limit detectado, pausando 5 segundos...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // No incrementar currentPage para reintentar
      } else {
        hasMoreData = false; // Terminar en otros errores
      }
    }
  }

  console.log(`✅ Total obtenido de ${endpoint}: ${allItems.length} items`);

  return {
    items: allItems,
    totalItems: allItems.length,
    paginationInfo: {
      totalPages: currentPage - 1,
      itemsPerPage: limit,
      lastPage: currentPage - 1
    }
  };
};

/**
 * 🏦 NUEVA FUNCIÓN MEJORADA: Obtener saldos bancarios usando cartolas 2025 + saldos iniciales
 */
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios mejorados...');

  try {
    // PASO 1: Definir saldos iniciales conocidos al 31-12-2024
    const saldosIniciales = {
      'Banco de Chile': { saldoInicial: 129969864, cuenta: '00-800-10734-09' },
      'banconexion2': { saldoInicial: 129969864, cuenta: '00-800-10734-09' },
      'Banco Santander': { saldoInicial: 0, cuenta: '0-000-7066661-8' },
      'santander': { saldoInicial: 0, cuenta: '0-000-7066661-8' },
      'Banco BCI': { saldoInicial: 178098, cuenta: '89107021' },
      'BCI': { saldoInicial: 178098, cuenta: '89107021' },
      'Banco Internacional': { saldoInicial: 0, cuenta: 'generico' },
      'generico': { saldoInicial: 0, cuenta: '9117726' },
      'chipax_wallet': { saldoInicial: 0, cuenta: '0000000803' }
    };

    // PASO 2: Obtener cuentas corrientes para mapear información básica
    console.log('📋 Obteniendo cuentas corrientes...');
    const cuentasResponse = await fetchAllPaginatedData('/cuentas-corrientes');
    const cuentas = cuentasResponse.items;

    if (!Array.isArray(cuentas) || cuentas.length === 0) {
      console.warn('⚠️ No se pudieron obtener cuentas corrientes');
      return [];
    }

    console.log(`✅ ${cuentas.length} cuentas corrientes obtenidas`);

    // PASO 3: Obtener todas las cartolas bancarias
    console.log('💰 Obteniendo cartolas bancarias...');
    const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas', { maxPages: 200 });
    const cartolas = cartolasResponse.items;

    if (!Array.isArray(cartolas) || cartolas.length === 0) {
      console.warn('⚠️ No se pudieron obtener cartolas');
      return [];
    }

    console.log(`✅ ${cartolas.length} cartolas obtenidas`);

    // PASO 4: Filtrar cartolas de 2025 y extraer saldos más recientes
    const cartolas2025 = cartolas.filter(cartola => {
      const fecha = new Date(cartola.fecha);
      return fecha.getFullYear() === 2025;
    });

    console.log(`📅 ${cartolas2025.length} cartolas de 2025 encontradas`);

    // PASO 5: Procesar saldos por cuenta corriente
    const saldosPorCuenta = {};

    cartolas2025.forEach(cartola => {
      const cuentaId = cartola.cuenta_corriente_id;
      
      if (!cuentaId) return;

      // Buscar saldos en la cartola
      let saldosEnCartola = [];
      
      if (cartola.Saldos && Array.isArray(cartola.Saldos)) {
        saldosEnCartola = cartola.Saldos;
      } else if (cartola.Saldo) {
        saldosEnCartola = [cartola.Saldo];
      }

      saldosEnCartola.forEach(saldo => {
        // Solo procesar saldos marcados como últimos registros
        if (saldo.last_record === 1) {
          const fechaCartola = new Date(cartola.fecha);
          
          if (!saldosPorCuenta[cuentaId] || fechaCartola > new Date(saldosPorCuenta[cuentaId].fecha)) {
            saldosPorCuenta[cuentaId] = {
              saldoDeudor: parseFloat(saldo.saldo_deudor || 0),
              saldoAcreedor: parseFloat(saldo.saldo_acreedor || 0),
              debe: parseFloat(saldo.debe || 0),
              haber: parseFloat(saldo.haber || 0),
              fecha: cartola.fecha,
              cartola_id: cartola.id,
              cuenta_corriente_id: cuentaId
            };
          }
        }
      });
    });

    console.log(`📊 Saldos procesados para ${Object.keys(saldosPorCuenta).length} cuentas`);

    // PASO 6: Combinar con información de cuentas y calcular saldos finales
    const cuentasConSaldos = cuentas.map(cuenta => {
      const saldoInfo = saldosPorCuenta[cuenta.id];
      
      // Identificar el banco para buscar saldo inicial
      const nombreBanco = cuenta.banco || cuenta.Banco || 'desconocido';
      const numeroCuenta = cuenta.numero || cuenta.numeroCuenta || cuenta.nombre || '';
      
      // Buscar saldo inicial
      let saldoInicial = 0;
      const clavesBanco = Object.keys(saldosIniciales);
      const claveBanco = clavesBanco.find(clave => 
        nombreBanco.toLowerCase().includes(clave.toLowerCase()) ||
        clave.toLowerCase().includes(nombreBanco.toLowerCase()) ||
        saldosIniciales[clave].cuenta === numeroCuenta
      );
      
      if (claveBanco) {
        saldoInicial = saldosIniciales[claveBanco].saldoInicial;
      }

      // Calcular saldo actual
      let saldoActual = saldoInicial; // Default: mantener saldo inicial si no hay movimientos
      
      if (saldoInfo) {
        // Usar saldo_deudor como saldo actual (más común en cuentas bancarias)
        saldoActual = saldoInfo.saldoDeudor;
        
        // Si saldo_deudor es 0, probar con otras combinaciones
        if (saldoActual === 0) {
          // Intentar con diferencia deudor - acreedor
          const diferencia = saldoInfo.saldoDeudor - saldoInfo.saldoAcreedor;
          if (Math.abs(diferencia) > 0) {
            saldoActual = diferencia;
          }
          
          // Si aún es 0, intentar con haber - debe
          if (saldoActual === 0) {
            const diferenciaHaberDebe = saldoInfo.haber - saldoInfo.debe;
            if (Math.abs(diferenciaHaberDebe) > 0) {
              saldoActual = diferenciaHaberDebe;
            }
          }
        }
      }

      return {
        id: cuenta.id,
        nombre: numeroCuenta,
        banco: nombreBanco,
        tipo: cuenta.tipo || 'Cuenta Corriente',
        moneda: cuenta.moneda || 'CLP',
        saldo: saldoActual,
        saldoCalculado: saldoActual, // Para compatibilidad
        
        // Información adicional para debugging
        detalleCalculo: {
          saldoInicial,
          saldoDeCartola: saldoInfo?.saldoDeudor || 0,
          metodoCalculo: saldoInfo ? 'cartola_2025' : 'saldo_inicial',
          ultimaCartola: saldoInfo?.cartola_id || null,
          fechaUltimaCartola: saldoInfo?.fecha || null
        },
        
        ultimaActualizacion: saldoInfo?.fecha || new Date().toISOString(),
        saldoInfo: saldoInfo || null,
        origenSaldo: 'cartolas_2025_con_inicial'
      };
    });

    // PASO 7: Calcular totales y mostrar resumen
    const totalSaldos = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    console.log('\n💰 RESUMEN DE SALDOS BANCARIOS:');
    console.log('================================');
    cuentasConSaldos.forEach(cuenta => {
      const saldoFormateado = cuenta.saldo.toLocaleString('es-CL');
      const metodo = cuenta.detalleCalculo.metodoCalculo;
      console.log(`🏦 ${cuenta.banco} (${cuenta.nombre}): $${saldoFormateado} [${metodo}]`);
    });
    console.log('================================');
    console.log(`💵 TOTAL SALDOS: $${totalSaldos.toLocaleString('es-CL')}`);
    console.log(`🎯 Objetivo esperado: $165.872.421`);
    console.log(`✅ Diferencia: $${(totalSaldos - 165872421).toLocaleString('es-CL')}`);
    console.log(`📅 Calculado el: ${new Date().toLocaleString('es-CL')}`);

    return cuentasConSaldos;

  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    return [];
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
        }

        if (pageItems && pageItems.length > 0) {
          allCompras.push(...pageItems);
          consecutiveErrors = 0; // Reset counter en éxito
          
          // ✅ ANÁLISIS DE FECHAS: Verificar si estamos llegando a 2024-2025
          if (pageItems.length > 0) {
            const fechas = pageItems
              .map(item => item.fechaEmision || item.fecha_emision || item.fecha || '')
              .filter(fecha => fecha && fecha.length > 0)
              .map(fecha => new Date(fecha))
              .filter(fecha => !isNaN(fecha.getTime()));
            
            if (fechas.length > 0) {
              const fechaMasReciente = new Date(Math.max(...fechas));
              const diasDesdeMasReciente = Math.floor((new Date() - fechaMasReciente) / (1000 * 60 * 60 * 24));
              
              // ✅ LOG INTELIGENTE: Solo cuando hay cambios significativos
              if (currentPage % 50 === 0) {
                console.log(`📅 Fecha más reciente: ${fechaMasReciente.toLocaleDateString()} (${diasDesdeMasReciente} días) ${fechaMasReciente.getFullYear() >= 2024 ? '✅ ALCANZADO' : `📈 Año ${fechaMasReciente.getFullYear()}`}\n`);
              }
              
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
          console.warn(`⚠️ Demasiados errores. Finalizando con ${allCompras.length} facturas obtenidas.`);
          hasMoreData = false;
        } else {
          // ✅ PEQUEÑA PAUSA antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 2000));
          currentPage++; // Continuar con la siguiente página
        }
      }
    }

    console.log(`\n🏁 PROCESAMIENTO COMPLETADO:`);
    console.log(`📄 Páginas procesadas: ${currentPage - 1}`);
    console.log(`📊 Total facturas obtenidas: ${allCompras.length}`);
    
    // ✅ ANÁLISIS FINAL: Mostrar distribución por años
    const facturasPorAno = {};
    allCompras.forEach(factura => {
      const fecha = factura.fechaEmision || factura.fecha_emision || factura.fecha || '';
      if (fecha) {
        const year = new Date(fecha).getFullYear();
        if (!isNaN(year)) {
          facturasPorAno[year] = (facturasPorAno[year] || 0) + 1;
        }
      }
    });
    
    console.log('\n📅 DISTRIBUCIÓN POR AÑOS:');
    Object.keys(facturasPorAno)
      .sort((a, b) => b - a) // Ordenar por año descendente
      .slice(0, 5) // Mostrar solo los 5 años más recientes
      .forEach(year => {
        console.log(`${year}: ${facturasPorAno[year]} facturas`);
      });

    return allCompras;

  } catch (error) {
    console.error('❌ Error obteniendo cuentas por pagar:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN ORIGINAL: Obtener cuentas por cobrar (SIN CAMBIOS)
 */
const obtenerCuentasPorCobrar = async () => {
  console.log('📊 Obteniendo DTEs (facturas de venta)...');

  try {
    let allDtes = [];
    let currentPage = 1;
    let hasMoreData = true;
    const limit = 50;
    const maxPages = 100; // Límite razonable

    while (hasMoreData && currentPage <= maxPages) {
      try {
        const url = `/dtes?limit=${limit}&page=${currentPage}`;
        console.log(`📄 Obteniendo página ${currentPage} de DTEs...`);
        
        const data = await fetchFromChipax(url, { maxRetries: 3, retryDelay: 1000 });
        
        let pageItems = [];
        if (Array.isArray(data)) {
          pageItems = data;
        } else if (data.items && Array.isArray(data.items)) {
          pageItems = data.items;
        }

        if (pageItems && pageItems.length > 0) {
          allDtes.push(...pageItems);
          
          if (pageItems.length < limit) {
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

    console.log(`✅ ${allDtes.length} DTEs obtenidos`);
    return allDtes;

  } catch (error) {
    console.error('❌ Error obteniendo cuentas por cobrar:', error);
    return [];
  }
};

// Exportaciones
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
};

export default chipaxService;

export {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
};
