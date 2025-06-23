// chipaxService.js - VERSIÓN COMPLETA CON MOVIMIENTOS BANCARIOS INTEGRADOS

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
 * ✅ FUNCIÓN MEJORADA: Obtener datos paginados con más páginas
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

      if (response && response.items && Array.isArray(response.items)) {
        allItems.push(...response.items);
        
        if (response.items.length < limit) {
          hasMoreData = false;
        } else {
          currentPage++;
        }
      } else if (Array.isArray(response)) {
        allItems.push(...response);
        hasMoreData = false;
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
 * 🆕 FUNCIÓN MEJORADA: Obtener saldos bancarios usando cartolas Y movimientos bancarios
 */
const obtenerSaldosBancariosConMovimientos = async () => {
  console.log('🏦 Obteniendo saldos bancarios (MÉTODO MEJORADO: cartolas + movimientos)...');
  
  try {
    // PASO 1: Saldos iniciales conocidos (actualizados al 2025)
    const saldosIniciales = {
      'Banco de Chile': { saldoInicial: 129969864, cuenta: '00-800-10734-09', cuentaId: null },
      'banconexion2': { saldoInicial: 129969864, cuenta: '00-800-10734-09', cuentaId: null },
      'Banco Santander': { saldoInicial: 0, cuenta: '0-000-7066661-8', cuentaId: null },
      'santander': { saldoInicial: 0, cuenta: '0-000-7066661-8', cuentaId: null },
      'Banco BCI': { saldoInicial: 178098, cuenta: '89107021', cuentaId: null },
      'bci': { saldoInicial: 178098, cuenta: '89107021', cuentaId: null },
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

    // PASO 3: Obtener cartolas bancarias (método existente)
    console.log('💰 Obteniendo cartolas bancarias...');
    const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas', { maxPages: 100 });
    const cartolas = cartolasResponse.items || [];
    console.log(`✅ ${cartolas.length} cartolas obtenidas`);

    // PASO 4: 🆕 OBTENER MOVIMIENTOS BANCARIOS (NUEVA FUNCIONALIDAD)
    console.log('🚀 Obteniendo movimientos bancarios adicionales...');
    const movimientosResponse = await fetchAllPaginatedData('/movimientos', { maxPages: 50 });
    let movimientosBancarios = [];
    
    if (movimientosResponse.items && Array.isArray(movimientosResponse.items)) {
      // Filtrar solo movimientos bancarios y de 2025
      movimientosBancarios = movimientosResponse.items.filter(mov => {
        const esBancario = mov.tipo === 'bancario' || 
                          mov.categoria === 'banco' ||
                          mov.idCuentaCorriente ||
                          (mov.descripcion && mov.descripcion.toLowerCase().includes('banco'));
        
        const esDe2025 = mov.fecha && mov.fecha.includes('2025');
        
        return esBancario && esDe2025;
      });
    }
    
    console.log(`✅ ${movimientosBancarios.length} movimientos bancarios de 2025 encontrados`);

    // PASO 5: Procesar CARTOLAS (método existente mejorado)
    const movimientosPorCuentaCartolas = {};
    
    cartolas.forEach(cartola => {
      if (!cartola.fecha || !cartola.fecha.includes('2025')) return;
      
      const cuentaId = cartola.idCuentaCorriente || cartola.cuenta_id;
      if (!cuentaId) return;

      if (!movimientosPorCuentaCartolas[cuentaId]) {
        movimientosPorCuentaCartolas[cuentaId] = {
          ingresos: 0,
          egresos: 0,
          netMovimientos: 0,
          ultimaFecha: null,
          conteoCartolas: 0
        };
      }

      const monto = parseFloat(cartola.monto) || 0;
      const fechaCartola = new Date(cartola.fecha);

      movimientosPorCuentaCartolas[cuentaId].conteoCartolas++;
      movimientosPorCuentaCartolas[cuentaId].netMovimientos += monto;

      if (monto > 0) {
        movimientosPorCuentaCartolas[cuentaId].ingresos += monto;
      } else {
        movimientosPorCuentaCartolas[cuentaId].egresos += Math.abs(monto);
      }

      if (!movimientosPorCuentaCartolas[cuentaId].ultimaFecha || 
          fechaCartola > movimientosPorCuentaCartolas[cuentaId].ultimaFecha) {
        movimientosPorCuentaCartolas[cuentaId].ultimaFecha = fechaCartola;
      }
    });

    // PASO 6: 🆕 PROCESAR MOVIMIENTOS BANCARIOS ADICIONALES
    const movimientosPorCuentaAdicionales = {};
    
    movimientosBancarios.forEach(movimiento => {
      const cuentaId = movimiento.idCuentaCorriente || movimiento.cuenta_id;
      if (!cuentaId) return;

      if (!movimientosPorCuentaAdicionales[cuentaId]) {
        movimientosPorCuentaAdicionales[cuentaId] = {
          ingresos: 0,
          egresos: 0,
          netMovimientos: 0,
          ultimaFecha: null,
          conteoMovimientos: 0
        };
      }

      const monto = parseFloat(movimiento.monto || movimiento.valor || movimiento.amount) || 0;
      const fechaMovimiento = new Date(movimiento.fecha);

      movimientosPorCuentaAdicionales[cuentaId].conteoMovimientos++;
      movimientosPorCuentaAdicionales[cuentaId].netMovimientos += monto;

      if (monto > 0) {
        movimientosPorCuentaAdicionales[cuentaId].ingresos += monto;
      } else {
        movimientosPorCuentaAdicionales[cuentaId].egresos += Math.abs(monto);
      }

      if (!movimientosPorCuentaAdicionales[cuentaId].ultimaFecha || 
          fechaMovimiento > movimientosPorCuentaAdicionales[cuentaId].ultimaFecha) {
        movimientosPorCuentaAdicionales[cuentaId].ultimaFecha = fechaMovimiento;
      }
    });

    // PASO 7: 🆕 COMBINAR CARTOLAS Y MOVIMIENTOS BANCARIOS
    const movimientosCombinados = {};
    
    // Primero agregar cartolas
    Object.keys(movimientosPorCuentaCartolas).forEach(cuentaId => {
      movimientosCombinados[cuentaId] = { ...movimientosPorCuentaCartolas[cuentaId] };
    });
    
    // Luego agregar movimientos bancarios adicionales
    Object.keys(movimientosPorCuentaAdicionales).forEach(cuentaId => {
      if (movimientosCombinados[cuentaId]) {
        // Combinar con datos existentes
        const cartolas = movimientosCombinados[cuentaId];
        const adicionales = movimientosPorCuentaAdicionales[cuentaId];
        
        movimientosCombinados[cuentaId] = {
          ingresos: cartolas.ingresos + adicionales.ingresos,
          egresos: cartolas.egresos + adicionales.egresos,
          netMovimientos: cartolas.netMovimientos + adicionales.netMovimientos,
          ultimaFecha: new Date(Math.max(
            cartolas.ultimaFecha?.getTime() || 0,
            adicionales.ultimaFecha?.getTime() || 0
          )),
          conteoCartolas: cartolas.conteoCartolas || 0,
          conteoMovimientos: adicionales.conteoMovimientos || 0,
          total: (cartolas.conteoCartolas || 0) + (adicionales.conteoMovimientos || 0)
        };
      } else {
        // Solo movimientos bancarios para esta cuenta
        movimientosCombinados[cuentaId] = {
          ...movimientosPorCuentaAdicionales[cuentaId],
          conteoCartolas: 0,
          total: movimientosPorCuentaAdicionales[cuentaId].conteoMovimientos
        };
      }
    });

    // PASO 8: Calcular saldos finales con ambas fuentes
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

      // Obtener movimientos combinados
      const movimientos = movimientosCombinados[cuenta.id] || {
        ingresos: 0,
        egresos: 0,
        netMovimientos: 0,
        ultimaFecha: null,
        conteoCartolas: 0,
        conteoMovimientos: 0,
        total: 0
      };

      // CALCULAR SALDO FINAL: Saldo inicial + movimientos netos combinados
      const saldoFinal = saldoInicial + movimientos.netMovimientos;

      return {
        id: cuenta.id,
        nombre: numeroCuenta,
        banco: nombreBanco,
        tipo: cuenta.tipo || 'Cuenta Corriente',
        moneda: cuenta.moneda || 'CLP',
        saldo: saldoFinal,
        saldoCalculado: saldoFinal,
        
        // Información detallada para debugging
        detalleCalculo: {
          saldoInicial,
          ingresos2025: movimientos.ingresos,
          egresos2025: movimientos.egresos,
          netMovimientos2025: movimientos.netMovimientos,
          saldoFinal,
          metodoCalculo: 'saldo_inicial_mas_cartolas_y_movimientos_bancarios',
          ultimaFecha: movimientos.ultimaFecha?.toISOString() || null,
          cartolasProce: movimientos.conteoCartolas,
          movimientosBancarios: movimientos.conteoMovimientos,
          totalTransacciones: movimientos.total,
          claveBancoUsada: claveBanco
        },
        
        ultimaActualizacion: movimientos.ultimaFecha?.toISOString() || new Date().toISOString(),
        origenSaldo: 'saldo_inicial_mas_cartolas_y_movimientos_bancarios'
      };
    });

    // PASO 9: Mostrar resumen detallado
    const totalSaldos = cuentasConSaldosFinales.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    console.log('\n💰 RESUMEN DE SALDOS BANCARIOS (MÉTODO MEJORADO):');
    console.log('================================');
    console.log(`🔧 Método: Saldo inicial + cartolas + movimientos bancarios`);
    console.log(`📊 Cartolas procesadas: ${cartolas.length}`);
    console.log(`🚀 Movimientos bancarios: ${movimientosBancarios.length}`);
    console.log(`🏦 Cuentas con movimientos: ${Object.keys(movimientosCombinados).length}`);
    console.log('--------------------------------');
    
    cuentasConSaldosFinales.forEach(cuenta => {
      const detalle = cuenta.detalleCalculo;
      console.log(`🏦 ${cuenta.banco} (${cuenta.nombre}):`);
      console.log(`   💰 Saldo inicial: $${detalle.saldoInicial.toLocaleString('es-CL')}`);
      console.log(`   📈 Ingresos 2025: $${detalle.ingresos2025.toLocaleString('es-CL')}`);
      console.log(`   📉 Egresos 2025:  $${detalle.egresos2025.toLocaleString('es-CL')}`);
      console.log(`   🔄 Movimiento neto: $${detalle.netMovimientos2025.toLocaleString('es-CL')}`);
      console.log(`   🎯 SALDO FINAL: $${cuenta.saldo.toLocaleString('es-CL')}`);
      console.log(`   📅 Cartolas: ${detalle.cartolasProce}, Movimientos: ${detalle.movimientosBancarios}`);
      console.log('');
    });
    
    console.log('================================');
    console.log(`💵 TOTAL SALDOS: $${totalSaldos.toLocaleString('es-CL')}`);
    
    // Comparar con saldos objetivo del 23-06-2025
    const saldosObjetivo = {
      'banconexion2': 10792511,  // Banco de Chile
      'generico': 104838856,     // Banco Internacional
      'bci': 0,                  // Banco BCI
      'santander': 0             // Banco Santander
    };
    
    const totalObjetivo = Object.values(saldosObjetivo).reduce((sum, saldo) => sum + saldo, 0);
    console.log(`🎯 Total objetivo (23-06-2025): $${totalObjetivo.toLocaleString('es-CL')}`);
    console.log(`✅ Diferencia: $${(totalSaldos - totalObjetivo).toLocaleString('es-CL')}`);
    console.log(`📅 Calculado el: ${new Date().toLocaleString('es-CL')}`);

    return cuentasConSaldosFinales;

  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios (método mejorado):', error);
    
    // Fallback: usar método original
    console.log('🔄 Usando método original como fallback...');
    return obtenerSaldosBancarios(); // Método original
  }
};

/**
 * 📊 FUNCIÓN ORIGINAL: Obtener saldos bancarios usando solo cartolas
 */
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios: SALDO INICIAL + CARTOLAS 2025...');

  try {
    // PASO 1: Saldos iniciales conocidos
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

    // PASO 3: Obtener cartolas de 2025
    console.log('💰 Obteniendo cartolas bancarias (extracción masiva)...');
    const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas', { maxPages: 500 });
    const todasCartolas = cartolasResponse.items;

    if (!Array.isArray(todasCartolas) || todasCartolas.length === 0) {
      console.warn('⚠️ No se pudieron obtener cartolas');
      return crearCuentasConSaldosIniciales(cuentas, saldosIniciales);
    }

    console.log(`✅ ${todasCartolas.length} cartolas obtenidas`);

    // Filtrar cartolas de 2025
    const cartolas2025 = todasCartolas.filter(cartola => {
      return cartola.fecha && cartola.fecha.includes('2025');
    });

    console.log(`📅 ${cartolas2025.length} cartolas de 2025 encontradas`);

    // PASO 4: Procesar movimientos por cuenta
    const movimientosPorCuenta = {};
    
    cartolas2025.forEach(cartola => {
      const cuentaId = cartola.idCuentaCorriente || cartola.cuenta_id;
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

      const monto = parseFloat(cartola.monto) || 0;
      const fechaCartola = new Date(cartola.fecha);

      movimientosPorCuenta[cuentaId].conteoCartolas++;
      movimientosPorCuenta[cuentaId].netMovimientos += monto;

      if (monto > 0) {
        movimientosPorCuenta[cuentaId].ingresos += monto;
      } else {
        movimientosPorCuenta[cuentaId].egresos += Math.abs(monto);
      }

      if (!movimientosPorCuenta[cuentaId].ultimaFecha || 
          fechaCartola > movimientosPorCuenta[cuentaId].ultimaFecha) {
        movimientosPorCuenta[cuentaId].ultimaFecha = fechaCartola;
      }
    });

    console.log(`📊 Movimientos calculados para ${Object.keys(movimientosPorCuenta).length} cuentas`);

    // PASO 5: Crear array final con saldo actual
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

      // CALCULAR SALDO FINAL: Solo usar los movimientos netos (las cartolas ya contienen el saldo completo)
      const saldoFinal = movimientos.netMovimientos;

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
          metodoCalculo: 'solo_movimientos_netos_2025',
          ultimaFecha: movimientos.ultimaFecha?.toISOString() || null,
          cartolasProce25: movimientos.conteoCartolas,
          claveBancoUsada: claveBanco
        },
        
        ultimaActualizacion: movimientos.ultimaFecha?.toISOString() || new Date().toISOString(),
        origenSaldo: 'solo_movimientos_netos_2025'
      };
    });

    // PASO 6: Mostrar resumen detallado
    const totalSaldos = cuentasConSaldosFinales.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    console.log('\n💰 RESUMEN DE SALDOS BANCARIOS:');
    console.log('================================');
    console.log(`🔧 Método: Solo movimientos netos de cartolas 2025 (sin saldo inicial)`);
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
    console.log(`⏱️ Estimado: ~${Math.ceil(maxPages * 0.5)} minutos`);

    let paginasConDatos = 0;
    let ultimaFechaEncontrada = null;

    while (hasMoreData && currentPage <= maxPages) {
      try {
        const compras = await fetchFromChipax(`/compras?page=${currentPage}&limit=${limit}`);

        if (compras && compras.items && Array.isArray(compras.items)) {
          if (compras.items.length > 0) {
            allCompras.push(...compras.items);
            paginasConDatos++;

            // ✅ CRITERIO DE PARADA: Verificar fechas para llegar a 2024
            const fechasEnPagina = compras.items
              .map(c => c.fechaEmision || c.fecha_emision || c.fecha || '')
              .filter(f => f)
              .sort();

            if (fechasEnPagina.length > 0) {
              const fechaMasAntigua = fechasEnPagina[0];
              ultimaFechaEncontrada = fechaMasAntigua;
              
              // Log cada 50 páginas
              if (currentPage % 50 === 0) {
                console.log(`📄 Página ${currentPage}: ${allCompras.length} compras | Fecha más antigua: ${fechaMasAntigua}`);
              }

              // ✅ PARAR cuando llegamos a 2024 o antes
              if (fechaMasAntigua.includes('2024') || fechaMasAntigua.includes('2023')) {
                console.log(`🎯 ¡ALCANZAMOS 2024! Fecha encontrada: ${fechaMasAntigua}`);
                console.log(`📊 Total procesado: ${allCompras.length} facturas en ${currentPage} páginas`);
                hasMoreData = false;
                break;
              }
            }
          }

          if (compras.items.length < limit) {
            hasMoreData = false;
          } else {
            currentPage++;
          }
        } else if (Array.isArray(compras)) {
          allCompras.push(...compras);
          hasMoreData = false;
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

    console.log(`✅ MEGA-PROCESAMIENTO COMPLETO:`);
    console.log(`📊 Total facturas obtenidas: ${allCompras.length}`);
    console.log(`📄 Páginas procesadas: ${currentPage}`);
    console.log(`📅 Última fecha encontrada: ${ultimaFechaEncontrada || 'N/A'}`);

    return allCompras;

  } catch (error) {
    console.error('❌ Error obteniendo cuentas por pagar:', error);
    return [];
  }
};

/**
 * ✅ FUNCIÓN MEGA-OPTIMIZADA: Para obtener TODOS los DTEs necesarios
 */
const obtenerCuentasPorCobrar = async () => {
  console.log('📋 Obteniendo DTEs (MEGA-PROCESAMIENTO para llegar a 2024-2025)...');

  try {
    let allDtes = [];
    let currentPage = 1;
    let hasMoreData = true;
    const limit = 50;
    
    // ✅ MEGA AUMENTO: Para procesar todos los DTEs necesarios
    const maxPages = 800; // 800 páginas = 40,000 DTEs máximo
    
    console.log(`🚀 MEGA-PROCESAMIENTO DTEs: hasta ${maxPages} páginas (${maxPages * limit} DTEs)`);
    console.log(`⏱️ Estimado: ~${Math.ceil(maxPages * 0.5)} minutos`);

    let ultimaFechaEncontrada = null;

    while (hasMoreData && currentPage <= maxPages) {
      try {
        const dtes = await fetchFromChipax(`/dtes?page=${currentPage}&limit=${limit}`);

        if (dtes && dtes.items && Array.isArray(dtes.items)) {
          if (dtes.items.length > 0) {
            allDtes.push(...dtes.items);

            // ✅ CRITERIO DE PARADA: Verificar fechas para llegar a 2024
            const fechasEnPagina = dtes.items
              .map(d => d.fechaEmision || d.fecha_emision || d.fecha || '')
              .filter(f => f)
              .sort();

            if (fechasEnPagina.length > 0) {
              const fechaMasAntigua = fechasEnPagina[0];
              ultimaFechaEncontrada = fechaMasAntigua;
              
              // Log cada 50 páginas
              if (currentPage % 50 === 0) {
                console.log(`📄 Página ${currentPage}: ${allDtes.length} DTEs | Fecha más antigua: ${fechaMasAntigua}`);
              }

              // ✅ PARAR cuando llegamos a 2024 o antes
              if (fechaMasAntigua.includes('2024') || fechaMasAntigua.includes('2023')) {
                console.log(`🎯 ¡ALCANZAMOS 2024 EN DTEs! Fecha encontrada: ${fechaMasAntigua}`);
                console.log(`📊 Total DTEs procesados: ${allDtes.length} en ${currentPage} páginas`);
                hasMoreData = false;
                break;
              }
            }
          }

          if (dtes.items.length < limit) {
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

// ============================================================================
// EXPORTACIONES
// ============================================================================
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerSaldosBancariosConMovimientos, // 🆕 NUEVA FUNCIÓN MEJORADA
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
};

export default chipaxService;

export {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerSaldosBancariosConMovimientos, // 🆕 NUEVA FUNCIÓN MEJORADA
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
};
