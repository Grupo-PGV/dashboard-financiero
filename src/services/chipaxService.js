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
 * ✅ FUNCIÓN COMPLETA Y FINAL: Obtener saldos bancarios usando /flujo-caja/cartolas
 * NUEVA LÓGICA: Saldo = Saldo Inicial + SUMA(abonos) - SUMA(cargos) por cuenta
 * INCLUYE: Movimientos manuales del Banco Internacional
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

    // 2. Obtener TODAS las cartolas desde 2025-01-01 usando paginación manual
    console.log('💰 Obteniendo cartolas desde 2025-01-01 para calcular saldos...');
    const todasLasCartolas = [];
    let page = 1;
    let hasMoreData = true;
    const limit = 500;
    const fechaDesde = '2025-01-01';

    while (hasMoreData) {
      console.log(`📄 Cargando página ${page} de cartolas desde ${fechaDesde}...`);
      
      try {
        const response = await fetchFromChipax(`/flujo-caja/cartolas?fecha_desde=${fechaDesde}&page=${page}&limit=${limit}`, { maxRetries: 1 });
        
        console.log(`🔍 DEBUG respuesta página ${page}:`, typeof response, Array.isArray(response));
        
        let movimientos = [];
        
        if (Array.isArray(response)) {
          movimientos = response;
          console.log(`✅ Respuesta directa como array: ${movimientos.length} items`);
        } else if (response?.data && Array.isArray(response.data)) {
          movimientos = response.data;
          console.log(`✅ Respuesta en .data: ${movimientos.length} items`);
        } else if (response?.items && Array.isArray(response.items)) {
          movimientos = response.items;
          console.log(`✅ Respuesta en .items: ${movimientos.length} items`);
        } else if (response && typeof response === 'object') {
          for (const [key, value] of Object.entries(response)) {
            if (Array.isArray(value) && value.length > 0) {
              if (value[0].id && (value[0].abono !== undefined || value[0].cargo !== undefined)) {
                movimientos = value;
                console.log(`✅ Movimientos encontrados en .${key}: ${movimientos.length} items`);
                break;
              }
            }
          }
        }

        if (movimientos.length > 0) {
          todasLasCartolas.push(...movimientos);
          console.log(`✅ Página ${page}: ${movimientos.length} movimientos (total: ${todasLasCartolas.length})`);
          
          if (movimientos.length < limit) {
            console.log(`📄 Última página alcanzada (${movimientos.length} < ${limit})`);
            hasMoreData = false;
          } else {
            page++;
          }
        } else {
          console.log(`📄 Página ${page} sin datos válidos`);
          console.log(`🔍 Estructura completa de respuesta:`, response);
          hasMoreData = false;
        }
      } catch (error) {
        console.error(`❌ Error en página ${page}:`, error);
        hasMoreData = false;
      }
    }

    console.log(`✅ ${todasLasCartolas.length} movimientos de cartola obtenidos en total`);

    // 3. Inicializar saldos por cuenta
    console.log('🧮 Calculando saldos por cuenta corriente (NUEVA LÓGICA)...');
    
    const saldosPorCuenta = {};

    cuentas.forEach(cuenta => {
      saldosPorCuenta[cuenta.id] = {
        totalAbonos: 0,
        totalCargos: 0,
        saldoCalculado: 0,
        ultimaFecha: null,
        movimientosCount: 0,
        ultimoMovimiento: null,
        ultimoSaldoAcreedor: null,
        ultimoSaldoDeudor: null,
        detalleDebug: {
          ejemploAbono: null,
          ejemploCargo: null,
          saldosEncontrados: []
        }
      };
    });

    // 4. Saldos iniciales 2025 (MAPEO CORREGIDO)
    // NOTA: Las líneas de crédito NO se suman aquí porque ya están incluidas
    // en los movimientos de cartolas como abonos (uso) y cargos (pago)
    console.log('🎯 Aplicando saldos iniciales del año 2025...');
    
    console.log('\n🔍 ANÁLISIS DE BANCOS ENCONTRADOS:');
    cuentas.forEach((cuenta, index) => {
      console.log(`   ${index + 1}. ID: ${cuenta.id} | Banco: "${cuenta.banco}" | Número: ${cuenta.numeroCuenta}`);
    });
    
    const saldosIniciales2025 = {
      'bci': 178098,             // BANCO BCI: $178.098 (BCI 89107021) ✅ CORREGIDO
      'santander': 0,            // BANCO SANTANDER: $0 (Santander 0-000-7066661-8) 
      'banconexion2': 129969864, // BANCO DE CHILE: $129.969.864 (BancoNexion2 00-800-10734-09) ✅ CORREGIDO
      'generico': 0,             // BANCO INTERNACIONAL: $0 (Genérico 9117726 - MANUAL)
      'chipax_wallet': 0         // CHIPAX WALLET: $0 (wallet interno)
    };
    
    // 📋 LÍNEAS DE CRÉDITO DISPONIBLES (solo para referencia/debug)
    // Estas NO se suman al saldo porque los movimientos de línea de crédito
    // ya están incluidos en las cartolas como abonos y cargos
    const lineasCreditoDisponibles = {
      'bci': 5000000,            // BANCO BCI: $5.000.000 línea de crédito
      'santander': 10000000,     // BANCO SANTANDER: $10.000.000 línea de crédito 
      'banconexion2': 20000000,  // BANCO DE CHILE: $20.000.000 línea de crédito
      'generico': 0,             // BANCO INTERNACIONAL: No tiene línea de crédito
      'chipax_wallet': 0         // CHIPAX WALLET: No tiene línea de crédito
    };
    
    console.log('\n💰 Saldos iniciales configurados:');
    Object.entries(saldosIniciales2025).forEach(([banco, saldo]) => {
      console.log(`   ${banco.toUpperCase()}: ${saldo.toLocaleString('es-CL')}`);
    });
    
    console.log('\n💳 Líneas de crédito disponibles (solo referencia):');
    Object.entries(lineasCreditoDisponibles).forEach(([banco, credito]) => {
      console.log(`   ${banco.toUpperCase()}: ${credito.toLocaleString('es-CL')} (no se suma al saldo)`);
    });
    
    console.log('\n💡 NOTA: Los movimientos de línea de crédito ya están incluidos en las cartolas:');
    console.log('   - Uso de línea de crédito = ABONO en cartolas');
    console.log('   - Pago de línea de crédito = CARGO en cartolas'); | Banco: "${cuenta.banco}" | Número: ${cuenta.numeroCuenta}`);
    });
    
    const saldosIniciales2025 = {
      'bci': 178098,             // BANCO BCI: $178.098 (BCI 89107021) ✅ CORREGIDO
      'santander': 0,            // BANCO SANTANDER: $0 (Santander 0-000-7066661-8) 
      'banconexion2': 129969864, // BANCO DE CHILE: $129.969.864 (BancoNexion2 00-800-10734-09) ✅ CORREGIDO
      'generico': 0,             // BANCO INTERNACIONAL: $0 (Genérico 9117726 - MANUAL)
      'chipax_wallet': 0         // CHIPAX WALLET: $0 (wallet interno)
    };
    
    // 5. Movimientos manuales del Banco Internacional 2025
    const movimientosManualesBancoInternacional = [
      // ENERO 2025
      { fecha: '2025-01-02', descripcion: 'INTERES POR USO LINEA DE CREDITO 9479150', abono: 0, cargo: 118611 },
      { fecha: '2025-01-02', descripcion: 'ITE SOBGR/PACTADO 9479150', abono: 0, cargo: 3900 },
      { fecha: '2025-01-02', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 122511, cargo: 0 },
      { fecha: '2025-01-08', descripcion: 'COMISION X MANTENCION CTA.CTE.', abono: 0, cargo: 115243 },
      { fecha: '2025-01-08', descripcion: 'IVA DE LA COMISION', abono: 0, cargo: 21896 },
      { fecha: '2025-01-08', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 137139, cargo: 0 },
      { fecha: '2025-01-13', descripcion: 'Transferencia de otro banco 76278661-3', abono: 3778998, cargo: 0 },
      { fecha: '2025-01-13', descripcion: 'AMORTIZACION AUTOMATICA LCR 9479150', abono: 0, cargo: 3778998 },
      
      // FEBRERO 2025
      { fecha: '2025-02-03', descripcion: 'INTERES POR USO LINEA DE CREDITO 9479150', abono: 0, cargo: 29029 },
      { fecha: '2025-02-03', descripcion: 'ITE SOBGR/PACTADO 9479150', abono: 0, cargo: 2435 },
      { fecha: '2025-02-03', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 31464, cargo: 0 },
      { fecha: '2025-02-07', descripcion: 'COMISION X MANTENCION CTA.CTE.', abono: 0, cargo: 115153 },
      { fecha: '2025-02-07', descripcion: 'IVA DE LA COMISION', abono: 0, cargo: 21879 },
      { fecha: '2025-02-07', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 137032, cargo: 0 },
      { fecha: '2025-02-10', descripcion: 'PAGO TGR', abono: 0, cargo: 328507 },
      { fecha: '2025-02-10', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 328507, cargo: 0 },
      { fecha: '2025-02-11', descripcion: 'TRANSF. PARA PGV Mantenimiento Internacional', abono: 0, cargo: 7000000 },
      { fecha: '2025-02-11', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 7000000, cargo: 0 },
      { fecha: '2025-02-12', descripcion: 'TRANSF. PARA PGR Seguridad Chile', abono: 0, cargo: 7000000 },
      { fecha: '2025-02-12', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 7000000, cargo: 0 },
      { fecha: '2025-02-17', descripcion: 'PAGO SERVIPAG', abono: 0, cargo: 228316 },
      { fecha: '2025-02-17', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 228316, cargo: 0 },
      { fecha: '2025-02-21', descripcion: 'TRANSF. PARA PGR SEGURIDAD S.P.A', abono: 0, cargo: 5000000 },
      { fecha: '2025-02-21', descripcion: 'TRANSF. PARA SERVICIOS PGV SPA', abono: 0, cargo: 5000000 },
      { fecha: '2025-02-21', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 10000000, cargo: 0 },
      { fecha: '2025-02-28', descripcion: 'Transferencia de otro banco 76278661-3', abono: 5000000, cargo: 0 },
      { fecha: '2025-02-28', descripcion: 'AMORTIZACION AUTOMATICA LCR 9479150', abono: 0, cargo: 5000000 },
      
      // MARZO 2025
      { fecha: '2025-03-03', descripcion: 'INTERES POR USO LINEA DE CREDITO 9479150', abono: 0, cargo: 223729 },
      { fecha: '2025-03-03', descripcion: 'ITE SOBGR/PACTADO 9479150', abono: 0, cargo: 8448 },
      { fecha: '2025-03-03', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 232177, cargo: 0 },
      { fecha: '2025-03-07', descripcion: 'COMISION X MANTENCION CTA.CTE.', abono: 0, cargo: 115944 },
      { fecha: '2025-03-07', descripcion: 'IVA DE LA COMISION', abono: 0, cargo: 22029 },
      { fecha: '2025-03-07', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 137973, cargo: 0 },
      { fecha: '2025-03-18', descripcion: 'PAGO SERVIPAG', abono: 0, cargo: 230645 },
      { fecha: '2025-03-18', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 230645, cargo: 0 },
      { fecha: '2025-03-20', descripcion: 'TRANSF. PARA SERVICIOS PGV SPA', abono: 0, cargo: 250000 },
      { fecha: '2025-03-20', descripcion: 'TRANSF. PARA SEGURIDAD SMART SpA', abono: 0, cargo: 550000 },
      { fecha: '2025-03-20', descripcion: 'TRANSF. PARA SEGURIDAD SMART SpA', abono: 0, cargo: 120709 },
      { fecha: '2025-03-20', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 920709, cargo: 0 },
      { fecha: '2025-03-21', descripcion: 'TRANSF. PARA PGV Mantenimiento BCI', abono: 0, cargo: 1000000 },
      { fecha: '2025-03-21', descripcion: 'TRANSF. DE FONDOS DE 9479150', abono: 1000000, cargo: 0 },
      { fecha: '2025-03-25', descripcion: 'TRANSFERENCIA CANCELACION 9479150', abono: 0, cargo: 22592666 },
      { fecha: '2025-03-31', descripcion: 'Transferencia de otro banco 76278661-3', abono: 5000000, cargo: 0 },
      { fecha: '2025-03-31', descripcion: 'Transferencia de otro banco 76278661-3', abono: 2592666, cargo: 0 },
      { fecha: '2025-03-31', descripcion: 'Transferencia de otro banco 76278661-3', abono: 5000000, cargo: 0 },
      { fecha: '2025-03-31', descripcion: 'Transferencia de otro banco 76278661-3', abono: 5000000, cargo: 0 },
      { fecha: '2025-03-31', descripcion: 'Transferencia de otro banco 76278661-3', abono: 5000000, cargo: 0 },
      { fecha: '2025-03-31', descripcion: 'ABONO POR CIERRE DE LCRE N° 9479150', abono: 22592666, cargo: 0 },
      { fecha: '2025-03-31', descripcion: 'INTERESES POR SOBREGIRO', abono: 0, cargo: 155304 },
      { fecha: '2025-03-31', descripcion: 'ITE SOBREGIRO NO PACTADO', abono: 0, cargo: 14911 },
      
      // ABRIL 2025
      { fecha: '2025-04-07', descripcion: 'COMISION X MANTENCION CTA.CTE.', abono: 0, cargo: 116682 },
      { fecha: '2025-04-07', descripcion: 'IVA DE LA COMISION', abono: 0, cargo: 22170 },
      { fecha: '2025-04-15', descripcion: 'Transferencia de otro banco 76278661-3', abono: 1000000, cargo: 0 },
      { fecha: '2025-04-15', descripcion: 'PAGO TOTAL DEL PRESTAMO 9754503', abono: 0, cargo: 22982593 },
      
      // MAYO 2025
      { fecha: '2025-05-30', descripcion: 'ABONO LBTR OP 451894', abono: 104537850, cargo: 0 }
    ];
    
    console.log(`📊 ${movimientosManualesBancoInternacional.length} movimientos manuales del Banco Internacional agregados`);
    
    // Calcular totales del Banco Internacional
    let totalAbonosBI = 0;
    let totalCargosBI = 0;
    movimientosManualesBancoInternacional.forEach(mov => {
      totalAbonosBI += mov.abono;
      totalCargosBI += mov.cargo;
    });
    
    console.log(`💰 Banco Internacional - Total Abonos: ${totalAbonosBI.toLocaleString('es-CL')}`);
    console.log(`💰 Banco Internacional - Total Cargos: ${totalCargosBI.toLocaleString('es-CL')}`);
    console.log(`💰 Banco Internacional - Saldo Calculado: ${(totalAbonosBI - totalCargosBI).toLocaleString('es-CL')}`);
    
    console.log('\n💰 Saldos iniciales configurados:');
    Object.entries(saldosIniciales2025).forEach(([banco, saldo]) => {
      console.log(`   ${banco.toUpperCase()}: ${saldo.toLocaleString('es-CL')}`);
    });

    // 6. Procesar movimientos de API + movimientos manuales
    console.log('🔄 Procesando movimientos de API + movimientos manuales...');
    
    const todosLosMovimientosCompletos = [...todasLasCartolas];
    
    // Agregar movimientos manuales del Banco Internacional
    movimientosManualesBancoInternacional.forEach(movManual => {
      todosLosMovimientosCompletos.push({
        fecha: movManual.fecha,
        descripcion: movManual.descripcion,
        abono: movManual.abono,
        cargo: movManual.cargo,
        cuenta_corriente_id: 11419, // ID del banco genérico
        id: `manual_${movManual.fecha}_${movManual.abono || movManual.cargo}`,
        tipo_cartola_id: 1,
        Saldos: []
      });
    });
    
    console.log(`📊 Total movimientos procesados: ${todosLosMovimientosCompletos.length} (${todasLasCartolas.length} de API + ${movimientosManualesBancoInternacional.length} manuales)`);
    
    // Procesar TODOS los movimientos (API + manuales)
    todosLosMovimientosCompletos.forEach((movimiento) => {
      const cuentaId = movimiento.cuenta_corriente_id;
      
      if (cuentaId && saldosPorCuenta[cuentaId]) {
        const fechaMovimiento = new Date(movimiento.fecha);
        const abono = Number(movimiento.abono) || 0;
        const cargo = Number(movimiento.cargo) || 0;
        
        // ACUMULAR abonos y cargos
        saldosPorCuenta[cuentaId].totalAbonos += abono;
        saldosPorCuenta[cuentaId].totalCargos += cargo;
        saldosPorCuenta[cuentaId].movimientosCount++;
        
        // Guardar el movimiento más reciente
        if (!saldosPorCuenta[cuentaId].ultimaFecha || fechaMovimiento > new Date(saldosPorCuenta[cuentaId].ultimaFecha)) {
          saldosPorCuenta[cuentaId].ultimaFecha = movimiento.fecha;
          saldosPorCuenta[cuentaId].ultimoMovimiento = {
            descripcion: movimiento.descripcion,
            fecha: movimiento.fecha,
            abono: abono,
            cargo: cargo
          };
        }
        
        // Guardar ejemplos para debug
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
        
        // Recolectar información de saldos para verificación (solo de API)
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

    // 8. CALCULAR SALDOS FINALES + LÍNEAS DE CRÉDITO DISPONIBLES
    console.log('💰 Calculando saldos finales con análisis de líneas de crédito...');
    
    // Líneas de crédito totales disponibles
    const lineasCreditoTotales = {
      'bci': 5000000,            // BANCO BCI: $5.000.000 línea de crédito total
      'santander': 10000000,     // BANCO SANTANDER: $10.000.000 línea de crédito total
      'banconexion2': 20000000,  // BANCO DE CHILE: $20.000.000 línea de crédito total
      'generico': 0,             // BANCO INTERNACIONAL: No tiene línea de crédito
      'chipax_wallet': 0         // CHIPAX WALLET: No tiene línea de crédito
    };
    
    Object.keys(saldosPorCuenta).forEach(cuentaId => {
      const cuenta = saldosPorCuenta[cuentaId];
      const cuentaInfo = cuentas.find(c => c.id == cuentaId);
      const bancoCodigo = cuentaInfo?.banco?.toLowerCase() || 'generico';
      
      // Obtener saldo inicial y línea de crédito para este banco
      const saldoInicial = saldosIniciales2025[bancoCodigo] || 0;
      const lineaCreditoTotal = lineasCreditoTotales[bancoCodigo] || 0;
      
      // CALCULAR SALDO SIN LÍNEA DE CRÉDITO
      cuenta.saldoInicial = saldoInicial;
      cuenta.saldoSinCredito = saldoInicial + cuenta.totalAbonos - cuenta.totalCargos;
      
      // CALCULAR USO DE LÍNEA DE CRÉDITO
      let usoLineaCredito = 0;
      let lineaCreditoDisponible = lineaCreditoTotal;
      let saldoFinalConCredito = cuenta.saldoSinCredito;
      
      if (lineaCreditoTotal > 0) {
        if (cuenta.saldoSinCredito < 0) {
          // Si el saldo es negativo, está usando línea de crédito
          usoLineaCredito = Math.abs(cuenta.saldoSinCredito);
          lineaCreditoDisponible = lineaCreditoTotal - usoLineaCredito;
          saldoFinalConCredito = lineaCreditoDisponible; // Línea de crédito disponible
        } else {
          // Si el saldo es positivo, línea de crédito está disponible completa
          lineaCreditoDisponible = lineaCreditoTotal;
          saldoFinalConCredito = cuenta.saldoSinCredito + lineaCreditoTotal;
        }
      }
      
      // Guardar información completa
      cuenta.saldoCalculado = saldoFinalConCredito;
      cuenta.lineaCreditoTotal = lineaCreditoTotal;
      cuenta.usoLineaCredito = usoLineaCredito;
      cuenta.lineaCreditoDisponible = lineaCreditoDisponible;
      
      if (cuenta.movimientosCount > 0 || saldoInicial > 0) {
        console.log(`\n💰 ${bancoCodigo.toUpperCase()} (${cuentaId}):`);
        console.log(`   📊 Inicial: ${saldoInicial.toLocaleString('es-CL')} + Abonos: ${cuenta.totalAbonos.toLocaleString('es-CL')} - Cargos: ${cuenta.totalCargos.toLocaleString('es-CL')}`);
        console.log(`   💵 Saldo sin crédito: ${cuenta.saldoSinCredito.toLocaleString('es-CL')}`);
        
        if (lineaCreditoTotal > 0) {
          console.log(`   💳 Línea de crédito total: ${lineaCreditoTotal.toLocaleString('es-CL')}`);
          console.log(`   📈 Uso de línea de crédito: ${usoLineaCredito.toLocaleString('es-CL')}`);
          console.log(`   💳 Línea disponible: ${lineaCreditoDisponible.toLocaleString('es-CL')}`);
          console.log(`   🎯 SALDO FINAL (con línea disponible): ${saldoFinalConCredito.toLocaleString('es-CL')}`);
        } else {
          console.log(`   🎯 SALDO FINAL: ${cuenta.saldoSinCredito.toLocaleString('es-CL')} (sin línea de crédito)`);
        }
        
        console.log(`   📋 Movimientos: ${cuenta.movimientosCount}`);
      }
    });
    
    // Verificación especial del Banco Internacional
    const cuentaGenerico = saldosPorCuenta[11419]; // ID del banco genérico
    if (cuentaGenerico) {
      console.log('\n🎯 VERIFICACIÓN BANCO INTERNACIONAL (GENÉRICO):');
      console.log(`   💰 Saldo inicial: ${cuentaGenerico.saldoInicial.toLocaleString('es-CL')}`);
      console.log(`   📈 Total abonos: ${cuentaGenerico.totalAbonos.toLocaleString('es-CL')}`);
      console.log(`   📉 Total cargos: ${cuentaGenerico.totalCargos.toLocaleString('es-CL')}`);
      console.log(`   💰 Saldo final: ${cuentaGenerico.saldoCalculado.toLocaleString('es-CL')}`);
      console.log(`   📊 Movimientos: ${cuentaGenerico.movimientosCount} (todos manuales)`);
      console.log(`   📅 Período: enero 2025 - mayo 2025`);
    }

    // 9. Combinar cuentas con saldos calculados (incluyendo análisis de líneas de crédito)
    const cuentasConSaldos = cuentas.map(cuenta => {
      const saldoInfo = saldosPorCuenta[cuenta.id];
      const bancoCodigo = cuenta.banco?.toLowerCase() || 'generico';
      const saldoInicial = saldosIniciales2025[bancoCodigo] || 0;
      
      return {
        ...cuenta,
        saldoCalculado: saldoInfo.saldoCalculado,
        saldoInicial: saldoInicial,
        saldoSinCredito: saldoInfo.saldoSinCredito,
        lineaCreditoTotal: saldoInfo.lineaCreditoTotal || 0,
        usoLineaCredito: saldoInfo.usoLineaCredito || 0,
        lineaCreditoDisponible: saldoInfo.lineaCreditoDisponible || 0,
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

    // 10. Mostrar resumen final con análisis completo de líneas de crédito
    const totalSaldosSinCredito = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.saldoSinCredito, 0);
    const totalSaldosConCredito = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.saldoCalculado, 0);
    const totalSaldosIniciales = Object.values(saldosIniciales2025).reduce((sum, saldo) => sum + saldo, 0);
    const totalLineasCredito = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.lineaCreditoTotal, 0);
    const totalUsoCredito = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.usoLineaCredito, 0);
    const totalCreditoDisponible = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.lineaCreditoDisponible, 0);
    const cuentasConMovimientos = cuentasConSaldos.filter(cuenta => cuenta.movimientosCount > 0);
    
    console.log(`\n💰 RESUMEN FINANCIERO COMPLETO:`);
    console.log(`📊 Cuentas con movimientos: ${cuentasConMovimientos.length}`);
    console.log(`🎯 Total saldos iniciales: ${totalSaldosIniciales.toLocaleString('es-CL')}`);
    console.log(`💵 Total saldos SIN líneas de crédito: ${totalSaldosSinCredito.toLocaleString('es-CL')}`);
    console.log(`💳 Total líneas de crédito disponibles: ${totalLineasCredito.toLocaleString('es-CL')}`);
    console.log(`📈 Total uso de líneas de crédito: ${totalUsoCredito.toLocaleString('es-CL')}`);
    console.log(`💰 Total crédito disponible: ${totalCreditoDisponible.toLocaleString('es-CL')}`);
    console.log(`🎯 TOTAL FONDOS DISPONIBLES: ${totalSaldosConCredito.toLocaleString('es-CL')} (incluye líneas disponibles)`);
    
    // Debug detallado por cuenta CON ANÁLISIS DE LÍNEAS DE CRÉDITO
    console.log('\n🏦 ============================================');
    console.log('📊 ANÁLISIS COMPLETO POR CUENTA CORRIENTE');
    console.log('============================================\n');
    
    cuentasConSaldos.forEach((cuenta, index) => {
      const nombreCuenta = `${cuenta.banco?.toUpperCase() || 'BANCO'} ${cuenta.numeroCuenta}`;
      
      console.log(`\n🏦 ${index + 1}. ${nombreCuenta}`);
      console.log('─'.repeat(60));
      
      console.log(`🎯 SALDO INICIAL (01-ENE-2025): ${cuenta.saldoInicial.toLocaleString('es-CL')}`);
      
      if (cuenta.movimientosCount > 0) {
        console.log(`📈 Total Abonos: ${cuenta.totalAbonos.toLocaleString('es-CL')}`);
        console.log(`📉 Total Cargos: ${cuenta.totalCargos.toLocaleString('es-CL')}`);
        console.log(`📊 Total Movimientos: ${cuenta.movimientosCount}`);
        console.log(`📅 Período: 2025-01-01 hasta ${cuenta.ultimaActualizacion}`);
        
        console.log(`\n💰 ANÁLISIS FINANCIERO:`);
        console.log(`   💵 Saldo sin línea de crédito: ${cuenta.saldoSinCredito.toLocaleString('es-CL')}`);
        
        if (cuenta.lineaCreditoTotal > 0) {
          console.log(`   💳 Línea de crédito total: ${cuenta.lineaCreditoTotal.toLocaleString('es-CL')}`);
          console.log(`   📈 Uso actual de línea: ${cuenta.usoLineaCredito.toLocaleString('es-CL')}`);
          console.log(`   💰 Línea disponible: ${cuenta.lineaCreditoDisponible.toLocaleString('es-CL')}`);
          console.log(`   🎯 FONDOS TOTALES DISPONIBLES: ${cuenta.saldoCalculado.toLocaleString('es-CL')}`);
          
          if (cuenta.usoLineaCredito > 0) {
            const porcentajeUso = (cuenta.usoLineaCredito / cuenta.lineaCreditoTotal * 100).toFixed(1);
            console.log(`   📊 Uso de línea: ${porcentajeUso}% (${cuenta.usoLineaCredito.toLocaleString('es-CL')} de ${cuenta.lineaCreditoTotal.toLocaleString('es-CL')})`);
          }
        } else {
          console.log(`   💰 Sin línea de crédito`);
          console.log(`   🎯 SALDO FINAL: ${cuenta.saldoSinCredito.toLocaleString('es-CL')}`);
        }
        
        // Fórmula de cálculo
        console.log(`\n🧮 CÁLCULO BASE: ${cuenta.saldoInicial.toLocaleString('es-CL')} + ${cuenta.totalAbonos.toLocaleString('es-CL')} - ${cuenta.totalCargos.toLocaleString('es-CL')} = ${cuenta.saldoSinCredito.toLocaleString('es-CL')}`);
        
      } else {
        console.log(`❌ SIN MOVIMIENTOS desde 2025-01-01`);
        if (cuenta.lineaCreditoTotal > 0) {
          console.log(`💳 Línea de crédito disponible: ${cuenta.lineaCreditoTotal.toLocaleString('es-CL')}`);
          console.log(`🎯 FONDOS DISPONIBLES: ${cuenta.saldoCalculado.toLocaleString('es-CL')}`);
        } else {
          console.log(`💰 SALDO: ${cuenta.saldoCalculado.toLocaleString('es-CL')}`);
        }
      }
      
      console.log(''); // Línea en blanco para separación
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 RESUMEN FINANCIERO FINAL:`);
    console.log(`   🎯 Saldos iniciales: ${totalSaldosIniciales.toLocaleString('es-CL')}`);
    console.log(`   💵 Saldos efectivos: ${totalSaldosSinCredito.toLocaleString('es-CL')}`);
    console.log(`   💳 Líneas de crédito: ${totalLineasCredito.toLocaleString('es-CL')}`);
    console.log(`   📈 Uso de crédito: ${totalUsoCredito.toLocaleString('es-CL')}`);
    console.log(`   💰 Crédito disponible: ${totalCreditoDisponible.toLocaleString('es-CL')}`);
    console.log(`   🎯 TOTAL DISPONIBLE: ${totalSaldosConCredito.toLocaleString('es-CL')}`);
    console.log(`   🏦 Cuentas activas: ${cuentasConMovimientos.length}/${cuentasConSaldos.length}`);
    console.log('='.repeat(60));

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
