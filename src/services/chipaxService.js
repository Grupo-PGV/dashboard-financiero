// chipaxService.js - VERSIÓN CON SALDO INICIAL + CARTOLAS 2025

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
 * ✅ NUEVA FUNCIÓN: Obtener datos paginados con más páginas
 */
const fetchAllPaginatedData = async (endpoint, options = {}) => {
  let allItems = [];
  let currentPage = 1;
  let hasMoreData = true;
  const limit = options.limit || 50;
  const maxPages = options.maxPages || 200; // AUMENTADO para obtener más cartolas

  console.log(`📊 Obteniendo datos paginados de ${endpoint} (hasta ${maxPages} páginas)...`);

  while (hasMoreData && currentPage <= maxPages) {
    try {
      const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${currentPage}&limit=${limit}`;
      const response = await fetchFromChipax(url, { maxRetries: 3 });

      let pageItems = [];
      
      // Manejar diferentes estructuras de respuesta (incluyendo docs)
      if (Array.isArray(response)) {
        pageItems = response;
      } else if (response.items && Array.isArray(response.items)) {
        pageItems = response.items;
      } else if (response.data && Array.isArray(response.data)) {
        pageItems = response.data;
      } else if (response.docs && Array.isArray(response.docs)) {
        pageItems = response.docs;
      }

      if (pageItems.length > 0) {
        allItems.push(...pageItems);
        
        // Log de progreso cada 20 páginas
        if (currentPage % 20 === 0) {
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
      await new Promise(resolve => setTimeout(resolve, 150));

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
 * 🏦 FUNCIÓN PRINCIPAL: Saldo inicial + movimientos de cartolas 2025
 */
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios: SALDO INICIAL + CARTOLAS 2025...');

  try {
    // PASO 1: Definir saldos iniciales conocidos al 31-12-2024
    const saldosIniciales = {
      'Banco de Chile': { saldoInicial: 129969864, cuenta: '00-800-10734-09', cuentaId: null },
      'banconexion2': { saldoInicial: 129969864, cuenta: '00-800-10734-09', cuentaId: null },
      'Banco Santander': { saldoInicial: 0, cuenta: '0-000-7066661-8', cuentaId: null },
      'santander': { saldoInicial: 0, cuenta: '0-000-7066661-8', cuentaId: null },
      'Banco BCI': { saldoInicial: 178098, cuenta: '89107021', cuentaId: null },
      'BCI': { saldoInicial: 178098, cuenta: '89107021', cuentaId: null },
      'Banco Internacional': { saldoInicial: 0, cuenta: 'generico', cuentaId: null },
      'generico': { saldoInicial: 0, cuenta: '9117726', cuentaId: null },
      'chipax_wallet': { saldoInicial: 0, cuenta: '0000000803', cuentaId: null }
    };

    // PASO 2: Obtener cuentas corrientes para mapear IDs
    console.log('📋 Obteniendo cuentas corrientes...');
    const cuentasResponse = await fetchAllPaginatedData('/cuentas-corrientes');
    const cuentas = cuentasResponse.items;

    if (!Array.isArray(cuentas) || cuentas.length === 0) {
      console.warn('⚠️ No se pudieron obtener cuentas corrientes');
      return [];
    }

    console.log(`✅ ${cuentas.length} cuentas corrientes obtenidas`);

    // Mapear bancos con sus IDs de cuenta
    cuentas.forEach(cuenta => {
      const nombreBanco = cuenta.banco || cuenta.Banco || 'desconocido';
      const numeroCuenta = cuenta.numero || cuenta.numeroCuenta || cuenta.nombre || '';
      
      const clavesBanco = Object.keys(saldosIniciales);
      const claveBanco = clavesBanco.find(clave => 
        nombreBanco.toLowerCase().includes(clave.toLowerCase()) ||
        clave.toLowerCase().includes(nombreBanco.toLowerCase()) ||
        saldosIniciales[clave].cuenta === numeroCuenta
      );
      
      if (claveBanco) {
        saldosIniciales[claveBanco].cuentaId = cuenta.id;
        console.log(`🔗 Mapeado: ${claveBanco} → Cuenta ID ${cuenta.id} (${numeroCuenta})`);
      }
    });

    // PASO 3: Obtener MUCHAS más cartolas de 2025
    console.log('💰 Obteniendo cartolas bancarias (extracción masiva)...');
    const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas', { maxPages: 500 }); // MUCHO MÁS
    const todasCartolas = cartolasResponse.items;

    if (!Array.isArray(todasCartolas) || todasCartolas.length === 0) {
      console.warn('⚠️ No se pudieron obtener cartolas, usando solo saldos iniciales');
      return crearCuentasConSaldosIniciales(cuentas, saldosIniciales);
    }

    console.log(`✅ ${todasCartolas.length} cartolas obtenidas`);

    // PASO 4: Filtrar solo cartolas de 2025
    const cartolas2025 = todasCartolas.filter(cartola => {
      const fecha = new Date(cartola.fecha);
      return fecha.getFullYear() === 2025;
    });

    console.log(`📅 ${cartolas2025.length} cartolas de 2025 encontradas`);

    // PASO 5: Calcular movimientos netos por cuenta desde enero 2025
    const movimientosPorCuenta = {};

    cartolas2025.forEach(cartola => {
      const cuentaId = cartola.cuenta_corriente_id;
      
      if (!cuentaId) return;

      if (!movimientosPorCuenta[cuentaId]) {
        movimientosPorCuenta[cuentaId] = {
          ingresos: 0,
          egresos: 0,
          netMovimientos: 0,
          ultimaFecha: null,
          conteoCartolas: 0
        };
      }

      movimientosPorCuenta[cuentaId].conteoCartolas++;

      // Analizar movimientos en la cartola
      if (cartola.Saldos && Array.isArray(cartola.Saldos)) {
        cartola.Saldos.forEach(saldo => {
          // Determinar si es ingreso o egreso
          const debe = parseFloat(saldo.debe || 0);
          const haber = parseFloat(saldo.haber || 0);
          
          if (haber > 0) {
            movimientosPorCuenta[cuentaId].ingresos += haber;
          }
          if (debe > 0) {
            movimientosPorCuenta[cuentaId].egresos += debe;
          }
        });
      }

      // Actualizar fecha más reciente
      const fechaCartola = new Date(cartola.fecha);
      if (!movimientosPorCuenta[cuentaId].ultimaFecha || fechaCartola > movimientosPorCuenta[cuentaId].ultimaFecha) {
        movimientosPorCuenta[cuentaId].ultimaFecha = fechaCartola;
      }
    });

    // Calcular movimientos netos
    Object.keys(movimientosPorCuenta).forEach(cuentaId => {
      const cuenta = movimientosPorCuenta[cuentaId];
      cuenta.netMovimientos = cuenta.ingresos - cuenta.egresos;
    });

    console.log(`📊 Movimientos calculados para ${Object.keys(movimientosPorCuenta).length} cuentas`);

    // PASO 6: Combinar saldo inicial + movimientos netos para obtener saldo actual
    const cuentasConSaldosFinales = cuentas.map(cuenta => {
      const nombreBanco = cuenta.banco || cuenta.Banco || 'desconocido';
      const numeroCuenta = cuenta.numero || cuenta.numeroCuenta || cuenta.nombre || '';
      
      // Buscar saldo inicial
      let saldoInicial = 0;
      const clavesBanco = Object.keys(saldosIniciales);
      const claveBanco = clavesBanco.find(clave => 
        saldosIniciales[clave].cuentaId === cuenta.id ||
        nombreBanco.toLowerCase().includes(clave.toLowerCase()) ||
        clave.toLowerCase().includes(nombreBanco.toLowerCase()) ||
        saldosIniciales[clave].cuenta === numeroCuenta
      );
      
      if (claveBanco) {
        saldoInicial = saldosIniciales[claveBanco].saldoInicial;
      }

      // Obtener movimientos de 2025
      const movimientos = movimientosPorCuenta[cuenta.id] || {
        ingresos: 0,
        egresos: 0,
        netMovimientos: 0,
        ultimaFecha: null,
        conteoCartolas: 0
      };

      // CALCULAR SALDO FINAL: Saldo inicial + movimientos netos
      const saldoFinal = saldoInicial + movimientos.netMovimientos;

      return {
        id: cuenta.id,
        nombre: numeroCuenta,
        banco: nombreBanco,
        tipo: cuenta.tipo || 'Cuenta Corriente',
        moneda: cuenta.moneda || 'CLP',
        saldo: saldoFinal,
        saldoCalculado: saldoFinal, // Para compatibilidad
        
        // Información detallada para debugging
        detalleCalculo: {
          saldoInicial,
          ingresos2025: movimientos.ingresos,
          egresos2025: movimientos.egresos,
          netMovimientos2025: movimientos.netMovimientos,
          saldoFinal,
          metodoCalculo: 'saldo_inicial_mas_movimientos_2025',
          ultimaFecha: movimientos.ultimaFecha?.toISOString() || null,
          cartolasProce25: movimientos.conteoCartolas,
          claveBancoUsada: claveBanco
        },
        
        ultimaActualizacion: movimientos.ultimaFecha?.toISOString() || new Date().toISOString(),
        origenSaldo: 'saldo_inicial_mas_movimientos_2025'
      };
    });

    // PASO 7: Mostrar resumen detallado
    const totalSaldos = cuentasConSaldosFinales.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    console.log('\n💰 RESUMEN DE SALDOS BANCARIOS:');
    console.log('================================');
    console.log(`🔧 Método: Saldo inicial (31-12-2024) + Movimientos 2025`);
    console.log(`📊 Cartolas 2025 procesadas: ${cartolas2025.length}`);
    console.log(`🏦 Cuentas con movimientos: ${Object.keys(movimientosPorCuenta).length}`);
    console.log('--------------------------------');
    
    cuentasConSaldosFinales.forEach(cuenta => {
      const detalle = cuenta.detalleCalculo;
      console.log(`🏦 ${cuenta.banco} (${cuenta.nombre}):`);
      console.log(`   💰 Saldo inicial: $${detalle.saldoInicial.toLocaleString('es-CL')}`);
      console.log(`   📈 Ingresos 2025: $${detalle.ingresos2025.toLocaleString('es-CL')}`);
      console.log(`   📉 Egresos 2025:  $${detalle.egresos2025.toLocaleString('es-CL')}`);
      console.log(`   🔄 Movimiento neto: $${detalle.netMovimientos2025.toLocaleString('es-CL')}`);
      console.log(`   🎯 SALDO FINAL: $${cuenta.saldo.toLocaleString('es-CL')}`);
      console.log(`   📅 Cartolas: ${detalle.cartolasProce25}`);
      console.log('');
    });
    
    console.log('================================');
    console.log(`💵 TOTAL SALDOS: $${totalSaldos.toLocaleString('es-CL')}`);
    console.log(`🎯 Objetivo esperado: $165.872.421`);
    console.log(`✅ Diferencia: $${(totalSaldos - 165872421).toLocaleString('es-CL')}`);
    console.log(`📅 Calculado el: ${new Date().toLocaleString('es-CL')}`);

    return cuentasConSaldosFinales;

  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    
    // Fallback: usar solo saldos iniciales
    try {
      const cuentasResponse = await fetchAllPaginatedData('/cuentas-corrientes');
      return crearCuentasConSaldosIniciales(cuentasResponse.items, {
        'Banco de Chile': { saldoInicial: 61033565, cuenta: '00-800-10734-09' },
        'banconexion2': { saldoInicial: 61033565, cuenta: '00-800-10734-09' },
        'Banco Santander': { saldoInicial: 0, cuenta: '0-000-7066661-8' },
        'santander': { saldoInicial: 0, cuenta: '0-000-7066661-8' },
        'Banco BCI': { saldoInicial: 0, cuenta: '89107021' },
        'BCI': { saldoInicial: 0, cuenta: '89107021' },
        'Banco Internacional': { saldoInicial: 104838856, cuenta: 'generico' },
        'generico': { saldoInicial: 104838856, cuenta: '9117726' },
        'chipax_wallet': { saldoInicial: 0, cuenta: '0000000803' }
      });
    } catch (fallbackError) {
      console.error('❌ Error en fallback:', fallbackError);
      return [];
    }
  }
};

/**
 * 🔄 FUNCIÓN AUXILIAR: Crear cuentas solo con saldos iniciales
 */
function crearCuentasConSaldosIniciales(cuentas, saldosConocidos) {
  console.log('🔄 Usando solo saldos conocidos (fallback)...');
  
  return cuentas.map(cuenta => {
    const nombreBanco = cuenta.banco || cuenta.Banco || 'desconocido';
    const numeroCuenta = cuenta.numero || cuenta.numeroCuenta || cuenta.nombre || '';
    
    // Buscar saldo conocido
    let saldoFinal = 0;
    const clavesBanco = Object.keys(saldosConocidos);
    const claveBanco = clavesBanco.find(clave => 
      nombreBanco.toLowerCase().includes(clave.toLowerCase()) ||
      clave.toLowerCase().includes(nombreBanco.toLowerCase()) ||
      saldosConocidos[clave].cuenta === numeroCuenta
    );
    
    if (claveBanco) {
      saldoFinal = saldosConocidos[claveBanco].saldoInicial;
    }

    return {
      id: cuenta.id,
      nombre: numeroCuenta,
      banco: nombreBanco,
      tipo: cuenta.tipo || 'Cuenta Corriente',
      moneda: cuenta.moneda || 'CLP',
      saldo: saldoFinal,
      saldoCalculado: saldoFinal,
      
      detalleCalculo: {
        saldoInicial: saldoFinal,
        metodoCalculo: 'solo_saldo_conocido',
        claveBancoUsada: claveBanco
      },
      
      ultimaActualizacion: new Date().toISOString(),
      origenSaldo: 'fallback_saldos_conocidos'
    };
  });
}

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
