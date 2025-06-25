// chipaxService.js - CORRECCIÓN: Sin límite de facturas + parar solo en día actual

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
 * ✅ FUNCIÓN CORREGIDA: Obtener TODAS las compras hasta llegar al día actual
 */
const obtenerCuentasPorPagar = async () => {
  console.log('💸 Obteniendo compras (BÚSQUEDA COMPLETA hasta día actual)...');

  try {
    let allCompras = [];
    let currentPage = 117; // Comenzar desde página 117 donde están las facturas de diciembre 2024
    let hasMoreData = true;
    const limit = 50;
    
    // ✅ NUEVO CRITERIO: Solo parar cuando encontremos facturas del DÍA ACTUAL
    const hoy = new Date();
    const fechaActualStr = hoy.toISOString().split('T')[0]; // "2025-06-24"
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1; // 1-12
    const diaActual = hoy.getDate();
    
    let facturaDelDiaActualEncontrada = false;
    let mejorFechaEncontrada = new Date('2024-12-27');
    let paginasSinMejora = 0;
    const maxPaginasSinMejora = 10; // Más páginas sin mejora antes de parar
    
    console.log(`🚀 BÚSQUEDA COMPLETA: Comenzando desde página 117`);
    console.log(`🎯 OBJETIVO: Encontrar facturas del día actual: ${fechaActualStr}`);
    console.log(`📅 Fecha actual: ${diaActual}/${mesActual}/${añoActual}`);

    while (hasMoreData && !facturaDelDiaActualEncontrada) {
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
          
          // ✅ VERIFICAR FECHAS DE ESTA PÁGINA con criterio estricto
          const fechasEstasPagina = pageItems
            .map(item => {
              // Priorizar fecha de emisión para encontrar las más recientes
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
            const fechaMasAntiguaEstaPagina = new Date(Math.min(...fechasEstasPagina));
            
            // ✅ VERIFICAR SI HAY FACTURAS DEL DÍA ACTUAL
            const facturasDelDiaActual = pageItems.filter(item => {
              const fechaFactura = item.fechaEmision || item.fecha_emision || item.fechaRecepcion || item.fecha_recepcion || item.created;
              if (!fechaFactura) return false;
              
              const fechaFacturaDate = new Date(fechaFactura);
              return fechaFacturaDate.getFullYear() === añoActual &&
                     fechaFacturaDate.getMonth() + 1 === mesActual &&
                     fechaFacturaDate.getDate() === diaActual;
            });
            
            const diasDesdeMasReciente = Math.floor((hoy - fechaMasRecienteEstaPagina) / (1000 * 60 * 60 * 24));
            
            console.log(`📊 Página ${currentPage}: ${pageItems.length} facturas`);
            console.log(`    📅 Rango: ${fechaMasAntiguaEstaPagina.toISOString().split('T')[0]} → ${fechaMasRecienteEstaPagina.toISOString().split('T')[0]}`);
            console.log(`    ⏰ Más reciente hace: ${diasDesdeMasReciente} días`);
            
            // ✅ CRITERIO PRINCIPAL: Facturas del día actual encontradas
            if (facturasDelDiaActual.length > 0) {
              console.log(`🎯 ¡ÉXITO! Encontradas ${facturasDelDiaActual.length} facturas del día actual (${fechaActualStr})`);
              console.log(`📋 Facturas del día actual:`);
              facturasDelDiaActual.forEach((factura, i) => {
                console.log(`  ${i + 1}. Folio ${factura.folio} - ${factura.razonSocial}`);
              });
              facturaDelDiaActualEncontrada = true;
              break;
            }
            
            // ✅ SEGUIMIENTO DE PROGRESO
            if (fechaMasRecienteEstaPagina > mejorFechaEncontrada) {
              mejorFechaEncontrada = fechaMasRecienteEstaPagina;
              paginasSinMejora = 0;
              console.log(`    ⬆️ Nueva mejor fecha: ${mejorFechaEncontrada.toISOString().split('T')[0]}`);
            } else {
              paginasSinMejora++;
              console.log(`    ⚠️ Sin mejora en fechas (${paginasSinMejora}/${maxPaginasSinMejora})`);
            }
            
            // ✅ CRITERIO SECUNDARIO: Si las facturas son muy antiguas y no hay progreso
            if (diasDesdeMasReciente > 180 && paginasSinMejora >= maxPaginasSinMejora) {
              console.log(`🛑 Parada: Facturas muy antiguas (${diasDesdeMasReciente} días) y sin progreso`);
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

        // ✅ PAUSA MUY CORTA para procesar rápidamente
        await new Promise(resolve => setTimeout(resolve, 25));

        // ✅ LÍMITE DE SEGURIDAD AMPLIADO para buscar facturas del día actual
        if (currentPage > 200) { // Permitir más páginas para encontrar el día actual
          console.log(`🛑 Límite de seguridad alcanzado: página ${currentPage}`);
          console.log(`📊 Facturas recolectadas hasta ahora: ${allCompras.length}`);
          break;
        }

      } catch (error) {
        console.error(`❌ Error en página ${currentPage}:`, error);
        hasMoreData = false;
      }
    }

    console.log(`📊 RESUMEN DE BÚSQUEDA COMPLETA:`);
    console.log(`    🚀 Página inicial: 117`);
    console.log(`    📄 Páginas procesadas: ${currentPage - 117} (hasta página ${currentPage - 1})`);
    console.log(`    📋 Total facturas obtenidas: ${allCompras.length}`);
    console.log(`    📅 Mejor fecha encontrada: ${mejorFechaEncontrada.toISOString().split('T')[0]}`);
    console.log(`    🎯 Factura del día actual encontrada: ${facturaDelDiaActualEncontrada ? 'SÍ' : 'NO'}`);
    
    if (!facturaDelDiaActualEncontrada) {
      const diasDesdeMejor = Math.floor((hoy - mejorFechaEncontrada) / (1000 * 60 * 60 * 24));
      console.log(`    ⚠️ No se encontraron facturas del día ${fechaActualStr}`);
      console.log(`    📊 Factura más reciente encontrada: hace ${diasDesdeMejor} días`);
      
      if (diasDesdeMejor <= 7) {
        console.log(`    ✅ Pero tenemos facturas muy recientes (última semana)`);
      } else if (diasDesdeMejor <= 30) {
        console.log(`    🔶 Tenemos facturas relativamente recientes (último mes)`);
      } else {
        console.log(`    ⚠️ Las facturas más recientes son de hace más de un mes`);
      }
    }

    if (allCompras.length === 0) {
      console.warn('⚠️ No se obtuvieron compras de la API');
      return [];
    }

    // ✅ ORDENAMIENTO por fecha de EMISIÓN (más recientes primero)
    console.log('🔄 Ordenando compras por fecha de EMISIÓN (más recientes primero)...');
    
    allCompras.sort((a, b) => {
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

    // ✅ CAMBIO CLAVE: RETORNAR TODAS LAS FACTURAS ENCONTRADAS (sin límite de 500)
    console.log(`📦 Retornando TODAS las ${allCompras.length} facturas encontradas (sin límite)`);

    // ✅ DEBUG: Mostrar estadísticas finales
    if (allCompras.length > 0) {
      const primeraCompra = allCompras[0];
      const ultimaCompra = allCompras[allCompras.length - 1];
      
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
      
      console.log('🔍 DEBUG: Primera compra (más reciente):');
      console.log({
        id: primeraCompra.id,
        folio: primeraCompra.folio,
        razonSocial: primeraCompra.razonSocial,
        fechaEmision: primeraCompra.fechaEmision,
        fechaRecepcion: primeraCompra.fechaRecepcion || primeraCompra.fecha_recepcion,
        montoTotal: primeraCompra.montoTotal
      });

      console.log(`📅 Rango completo de fechas: ${fechaMasAntigua} → ${fechaMasReciente}`);

      // ✅ ESTADÍSTICAS POR AÑO Y MES
      const estadisticas = {};
      allCompras.forEach(compra => {
        const fecha = compra.fechaEmision || compra.fecha_emision || compra.fechaRecepcion || compra.fecha_recepcion;
        if (fecha) {
          const fechaDate = new Date(fecha);
          const año = fechaDate.getFullYear();
          const mes = fechaDate.getMonth() + 1;
          const clave = `${año}-${mes.toString().padStart(2, '0')}`;
          
          if (!estadisticas[clave]) {
            estadisticas[clave] = 0;
          }
          estadisticas[clave]++;
        }
      });
      
      console.log('📊 DISTRIBUCIÓN POR MES (últimos 12 meses):');
      Object.entries(estadisticas)
        .sort((a, b) => b[0].localeCompare(a[0])) // Más reciente primero
        .slice(0, 12) // Solo últimos 12 meses
        .forEach(([mes, cantidad]) => {
          console.log(`    ${mes}: ${cantidad} facturas`);
        });

      // ✅ ANÁLISIS DEL DÍA ACTUAL
      const facturasHoy = allCompras.filter(compra => {
        const fecha = compra.fechaEmision || compra.fecha_emision || compra.fechaRecepcion || compra.fecha_recepcion;
        if (!fecha) return false;
        const fechaDate = new Date(fecha);
        return fechaDate.toISOString().split('T')[0] === fechaActualStr;
      });
      
      if (facturasHoy.length > 0) {
        console.log(`🎯 FACTURAS DEL DÍA ACTUAL (${fechaActualStr}): ${facturasHoy.length}`);
        facturasHoy.slice(0, 5).forEach((factura, i) => {
          console.log(`  ${i + 1}. Folio ${factura.folio} - ${factura.razonSocial} - $${factura.montoTotal?.toLocaleString() || 'N/A'}`);
        });
      } else {
        console.log(`📅 No hay facturas del día actual (${fechaActualStr})`);
        
        // Mostrar las 5 más recientes
        console.log('📋 LAS 5 FACTURAS MÁS RECIENTES ENCONTRADAS:');
        allCompras.slice(0, 5).forEach((factura, i) => {
          const fechaPrincipal = factura.fechaEmision || factura.fecha_emision || factura.fechaRecepcion || factura.fecha_recepcion;
          const diasHace = Math.floor((hoy - new Date(fechaPrincipal)) / (1000 * 60 * 60 * 24));
          console.log(`  ${i + 1}. Folio ${factura.folio}: ${fechaPrincipal} (hace ${diasHace} días) - ${factura.razonSocial}`);
        });
      }
    }

    // ✅ RETORNAR TODAS LAS FACTURAS (sin límite de 500)
    return allCompras;

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
 * ✅ FUNCIÓN COMPLETA CORREGIDA: Obtener saldos bancarios usando /flujo-caja/cartolas
 * NUEVA LÓGICA: Saldo = SUMA(abonos) - SUMA(cargos) por cuenta
 */
const obtenerSaldosBancarios = async () => {
  console.log('🏦 Obteniendo saldos bancarios CORREGIDO DEFINITIVAMENTE...');

  try {
    // 1. Obtener cuentas corrientes
    console.log('📋 Obteniendo cuentas corrientes...');
    const cuentasResponse = await fetchFromChipax('/cuentas-corrientes', { maxRetries: 1 });
    const cuentas = cuentasResponse.data || cuentasResponse;

    if (!Array.isArray(cuentas)) {
      console.warn('⚠️ Cuentas corrientes no es array:', typeof cuentas);
      return [];
    }

    console.log(`✅ ${cuentas.length} cuentas corrientes obtenidas`);
    console.log('🔍 DEBUG cuentas:', cuentas);

    // 2. Obtener TODAS las cartolas usando paginación manual
    console.log('💰 Obteniendo cartolas para calcular saldos...');
    const todasLasCartolas = [];
    let page = 1;
    let hasMoreData = true;
    const limit = 500;

    while (hasMoreData) {
      console.log(`📄 Cargando página ${page} de cartolas...`);
      
      try {
        const response = await fetchFromChipax(`/flujo-caja/cartolas?page=${page}&limit=${limit}`, { maxRetries: 1 });
        const data = response.data || response;
        const movimientos = data.data || data;

        if (Array.isArray(movimientos) && movimientos.length > 0) {
          todasLasCartolas.push(...movimientos);
          console.log(`✅ Página ${page}: ${movimientos.length} movimientos (total: ${todasLasCartolas.length})`);
          
          // Si obtuvimos menos movimientos que el límite, es la última página
          if (movimientos.length < limit) {
            console.log(`📄 Última página alcanzada (${movimientos.length} < ${limit})`);
            hasMoreData = false;
          } else {
            page++;
          }
        } else {
          console.log(`📄 Página ${page} sin datos, terminando paginación`);
          hasMoreData = false;
        }
      } catch (error) {
        console.error(`❌ Error en página ${page}:`, error);
        hasMoreData = false;
      }
    }

    console.log(`✅ ${todasLasCartolas.length} movimientos de cartola obtenidos en total`);

    // 3. 🚨 NUEVA LÓGICA CORRECTA: Sumar abonos y restar cargos por cuenta
    console.log('🧮 Calculando saldos por cuenta corriente (NUEVA LÓGICA)...');
    
    const saldosPorCuenta = {};

    // Inicializar todas las cuentas
    cuentas.forEach(cuenta => {
      saldosPorCuenta[cuenta.id] = {
        totalAbonos: 0,
        totalCargos: 0,
        saldoCalculado: 0,
        ultimaFecha: null,
        movimientosCount: 0,
        ultimoMovimiento: null,
        ultimoSaldoAcreedor: null,  // Para verificación
        ultimoSaldoDeudor: null,    // Para verificación
        detalleDebug: {
          ejemploAbono: null,
          ejemploCargo: null,
          saldosEncontrados: []
        }
      };
    });

    // 🔄 PROCESAR TODOS LOS MOVIMIENTOS: Acumular abonos y cargos
    console.log(`🔄 Procesando ${todasLasCartolas.length} movimientos para acumular...`);
    
    todasLasCartolas.forEach((movimiento) => {
      const cuentaId = movimiento.cuenta_corriente_id;
      
      if (cuentaId && saldosPorCuenta[cuentaId]) {
        const fechaMovimiento = new Date(movimiento.fecha);
        const abono = Number(movimiento.abono) || 0;
        const cargo = Number(movimiento.cargo) || 0;
        
        // ✅ ACUMULAR abonos y cargos
        saldosPorCuenta[cuentaId].totalAbonos += abono;
        saldosPorCuenta[cuentaId].totalCargos += cargo;
        saldosPorCuenta[cuentaId].movimientosCount++;
        
        // Guardar el movimiento más reciente para referencia
        if (!saldosPorCuenta[cuentaId].ultimaFecha || fechaMovimiento > new Date(saldosPorCuenta[cuentaId].ultimaFecha)) {
          saldosPorCuenta[cuentaId].ultimaFecha = movimiento.fecha;
          saldosPorCuenta[cuentaId].ultimoMovimiento = {
            descripcion: movimiento.descripcion,
            fecha: movimiento.fecha,
            abono: abono,
            cargo: cargo
          };
        }
        
        // 📊 Guardar ejemplos para debug
        if (abono > 0 && !saldosPorCuenta[cuentaId].detalleDebug.ejemploAbono) {
          saldosPorCuenta[cuentaId].detalleDebug.ejemploAbono = {
            abono, cargo, descripcion: movimiento.descripcion, fecha: movimiento.fecha
          };
        }
        if (cargo > 0 && !saldosPorCuenta[cuentaId].detalleDebug.ejemploCargo) {
          saldosPorCuenta[cuentaId].detalleDebug.ejemploCargo = {
            abono, cargo, descripcion: movimiento.descripcion, fecha: movimiento.fecha
          };
        }
        
        // 📊 Recolectar información de saldos para verificación
        if (movimiento.Saldos && Array.isArray(movimiento.Saldos) && movimiento.Saldos.length > 0) {
          const saldoData = movimiento.Saldos[0];
          if (saldoData.last_record === 1) {
            saldosPorCuenta[cuentaId].ultimoSaldoAcreedor = saldoData.saldo_acreedor;
            saldosPorCuenta[cuentaId].ultimoSaldoDeudor = saldoData.saldo_deudor;
            
            saldosPorCuenta[cuentaId].detalleDebug.saldosEncontrados.push({
              fecha: movimiento.fecha,
              saldo_acreedor: saldoData.saldo_acreedor,
              saldo_deudor: saldoData.saldo_deudor,
              debe: saldoData.debe,
              haber: saldoData.haber
            });
          }
        }
      }
    });

    // 4. ✅ CALCULAR SALDO FINAL: Total abonos - Total cargos
    console.log('💰 Calculando saldos finales...');
    
    Object.keys(saldosPorCuenta).forEach(cuentaId => {
      const cuenta = saldosPorCuenta[cuentaId];
      
      // 🚨 FÓRMULA CORRECTA: Saldo = Abonos - Cargos
      cuenta.saldoCalculado = cuenta.totalAbonos - cuenta.totalCargos;
      
      if (cuenta.movimientosCount > 0) {
        console.log(`💰 Cuenta ${cuentaId}: ${cuenta.saldoCalculado.toLocaleString()} (${cuenta.totalAbonos.toLocaleString()} abonos - ${cuenta.totalCargos.toLocaleString()} cargos)`);
      }
    });

    // 5. Combinar cuentas con saldos calculados
    const cuentasConSaldos = cuentas.map(cuenta => {
      const saldoInfo = saldosPorCuenta[cuenta.id];
      
      return {
        ...cuenta,
        saldoCalculado: saldoInfo.saldoCalculado,
        ultimaActualizacion: saldoInfo.ultimaFecha,
        movimientosCount: saldoInfo.movimientosCount,
        ultimoMovimiento: saldoInfo.ultimoMovimiento,
        totalAbonos: saldoInfo.totalAbonos,
        totalCargos: saldoInfo.totalCargos,
        saldoInfo: {
          ...saldoInfo,
          verificacion: {
            ultimoSaldoAcreedor: saldoInfo.ultimoSaldoAcreedor,
            ultimoSaldoDeudor: saldoInfo.ultimoSaldoDeudor,
            diferenciaSaldos: saldoInfo.ultimoSaldoAcreedor !== null ? 
              (saldoInfo.saldoCalculado - saldoInfo.ultimoSaldoAcreedor) : null
          }
        }
      };
    });

    // 6. Mostrar resumen
    const totalSaldos = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.saldoCalculado, 0);
    const cuentasConMovimientos = cuentasConSaldos.filter(cuenta => cuenta.movimientosCount > 0);
    
    console.log(`💰 Saldos calculados para ${cuentasConSaldos.length} cuentas`);
    console.log(`📊 Cuentas con movimientos: ${cuentasConMovimientos.length}`);
    console.log(`💵 Saldo total: ${totalSaldos.toLocaleString('es-CL')}`);
    
    // 📊 Debug detallado por cuenta con nueva información
    console.log('🔍 DETALLE COMPLETO POR CUENTA:');
    cuentasConSaldos.forEach(cuenta => {
      if (cuenta.movimientosCount > 0) {
        console.log(`\n🏦 ${cuenta.banco || 'BANCO'} ${cuenta.numeroCuenta}:`);
        console.log(`   💰 Saldo calculado: ${cuenta.saldoCalculado.toLocaleString('es-CL')}`);
        console.log(`   📈 Total abonos: ${cuenta.totalAbonos.toLocaleString('es-CL')}`);
        console.log(`   📉 Total cargos: ${cuenta.totalCargos.toLocaleString('es-CL')}`);
        console.log(`   📊 Movimientos: ${cuenta.movimientosCount}`);
        console.log(`   📅 Último: ${cuenta.ultimaActualizacion} - ${cuenta.ultimoMovimiento?.descripcion || 'N/A'}`);
        
        // Verificación con saldo_acreedor si existe
        if (cuenta.saldoInfo.verificacion.ultimoSaldoAcreedor !== null) {
          console.log(`   🔍 Último saldo_acreedor: ${cuenta.saldoInfo.verificacion.ultimoSaldoAcreedor.toLocaleString('es-CL')}`);
          console.log(`   🔍 Diferencia: ${(cuenta.saldoInfo.verificacion.diferenciaSaldos || 0).toLocaleString('es-CL')}`);
        }
        
        // Mostrar ejemplos de movimientos
        if (cuenta.saldoInfo.detalleDebug.ejemploAbono) {
          const ej = cuenta.saldoInfo.detalleDebug.ejemploAbono;
          console.log(`   ✅ Ejemplo abono: +${ej.abono.toLocaleString('es-CL')} - ${ej.descripcion} (${ej.fecha})`);
        }
        if (cuenta.saldoInfo.detalleDebug.ejemploCargo) {
          const ej = cuenta.saldoInfo.detalleDebug.ejemploCargo;
          console.log(`   ❌ Ejemplo cargo: -${ej.cargo.toLocaleString('es-CL')} - ${ej.descripcion} (${ej.fecha})`);
        }
      } else {
        console.log(`   ${cuenta.banco || 'BANCO'} ${cuenta.numeroCuenta}: ${cuenta.saldoCalculado.toLocaleString('es-CL')} (sin movimientos)`);
      }
    });

    console.log(`\n✅ ${cuentasConSaldos.length} saldos cargados con nueva lógica`);
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
