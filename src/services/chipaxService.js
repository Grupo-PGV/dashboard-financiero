// chipaxService.js - Versión corregida con paginación mejorada
const CHIPAX_API_URL = '/v2'; // Usa proxy
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

let tokenCache = {
  token: null,
  expiresAt: null
};

export const getChipaxToken = async () => {
  const now = new Date();
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  try {
    const response = await fetch(`${CHIPAX_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, secret_key: SECRET_KEY })
    });

    if (!response.ok) throw new Error(`Error ${response.status}: ${await response.text()}`);

    const data = await response.json();
    console.log('✅ Token obtenido exitosamente');
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    return tokenCache.token;
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    throw error;
  }
};

export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (showLogs) {
      console.log(`🔍 Llamando a: ${endpoint} - Status: ${response.status}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      if (showLogs) console.error(`❌ Error en ${endpoint}:`, text);
      if (response.status === 404) return { items: [] };
      throw new Error(`Error ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    if (showLogs) {
      console.log(`📦 DATOS RECIBIDOS DE ${endpoint}:`);
      if (data.paginationAttributes) {
        console.log('📄 Info de paginación:', data.paginationAttributes);
      }
      if (data.items && Array.isArray(data.items)) {
        console.log(`📋 Items en esta página: ${data.items.length}`);
      }
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error en petición a ${endpoint}:`, error);
    throw error;
  }
};

// 🔧 FUNCIÓN DE PAGINACIÓN CORREGIDA
export const fetchAllPaginatedData = async (baseEndpoint, maxRetries = 3) => {
  console.log(`📊 🔄 INICIANDO CARGA PAGINADA DE: ${baseEndpoint}`);
  
  try {
    // 1. PRIMERA PÁGINA: Obtener información de paginación
    console.log('📄 Obteniendo primera página para análisis...');
    const firstPageData = await fetchFromChipax(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=1`);
    
    // 2. VERIFICAR SI HAY PAGINACIÓN
    if (!firstPageData.paginationAttributes) {
      console.log('ℹ️ No hay paginación detectada, devolviendo datos directos');
      return firstPageData;
    }
    
    const { totalPages, totalCount, currentPage } = firstPageData.paginationAttributes;
    console.log(`📊 ANÁLISIS DE PAGINACIÓN:`);
    console.log(`   - Total de páginas: ${totalPages}`);
    console.log(`   - Total de items: ${totalCount}`);
    console.log(`   - Página actual: ${currentPage}`);
    console.log(`   - Items en primera página: ${firstPageData.items?.length || 0}`);
    
    // 3. SI SOLO HAY UNA PÁGINA, RETORNAR
    if (totalPages <= 1) {
      console.log('✅ Solo hay una página, proceso completado');
      return firstPageData;
    }
    
    // 4. CARGAR TODAS LAS PÁGINAS RESTANTES
    console.log(`🔄 Cargando ${totalPages - 1} páginas adicionales...`);
    
    let allItems = [...(firstPageData.items || [])];
    const failedPages = [];
    
    // Crear promesas para todas las páginas restantes
    const pagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      const pageEndpoint = `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page}`;
      pagePromises.push(
        fetchPageWithRetry(pageEndpoint, page, maxRetries)
      );
    }
    
    // 5. EJECUTAR TODAS LAS PETICIONES EN PARALELO (pero con límite)
    const BATCH_SIZE = 5; // Máximo 5 peticiones simultáneas
    const results = [];
    
    for (let i = 0; i < pagePromises.length; i += BATCH_SIZE) {
      const batch = pagePromises.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);
      
      // Log de progreso
      const processedPages = Math.min(i + BATCH_SIZE, pagePromises.length);
      console.log(`📊 Progreso: ${processedPages + 1}/${totalPages} páginas procesadas`);
    }
    
    // 6. PROCESAR RESULTADOS
    results.forEach((result, index) => {
      const pageNumber = index + 2; // +2 porque empezamos desde la página 2
      
      if (result.status === 'fulfilled' && result.value?.items) {
        allItems.push(...result.value.items);
        console.log(`✅ Página ${pageNumber}: ${result.value.items.length} items obtenidos`);
      } else {
        console.error(`❌ Página ${pageNumber}: Error - ${result.reason?.message || 'Error desconocido'}`);
        failedPages.push(pageNumber);
      }
    });
    
    // 7. MOSTRAR RESUMEN FINAL
    console.log(`\n📊 RESUMEN FINAL DE PAGINACIÓN:`);
    console.log(`   ✅ Total de items obtenidos: ${allItems.length}`);
    console.log(`   📄 Páginas procesadas exitosamente: ${totalPages - failedPages.length}/${totalPages}`);
    console.log(`   ⚠️ Páginas fallidas: ${failedPages.length} ${failedPages.length > 0 ? `(${failedPages.join(', ')})` : ''}`);
    console.log(`   📈 Eficiencia: ${((allItems.length / totalCount) * 100).toFixed(1)}%\n`);
    
    // 8. ADVERTIR SI HAY PÁGINAS FALLIDAS
    if (failedPages.length > 0) {
      console.warn(`⚠️ ADVERTENCIA: ${failedPages.length} páginas no se pudieron cargar. Datos incompletos.`);
    }
    
    return {
      ...firstPageData,
      items: allItems,
      paginationInfo: {
        totalPagesRequested: totalPages,
        totalPagesLoaded: totalPages - failedPages.length,
        failedPages: failedPages,
        totalItemsExpected: totalCount,
        totalItemsLoaded: allItems.length,
        completenessPercent: (allItems.length / totalCount) * 100
      }
    };
    
  } catch (error) {
    console.error('💥 ERROR CRÍTICO en fetchAllPaginatedData:', error);
    throw error;
  }
};

// 🔧 FUNCIÓN AUXILIAR: Reintentar carga de página con backoff
const fetchPageWithRetry = async (endpoint, pageNumber, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchFromChipax(endpoint, {}, false); // Sin logs detallados
      return result;
    } catch (error) {
      console.warn(`⚠️ Página ${pageNumber}, intento ${attempt}/${maxRetries} falló:`, error.message);
      
      if (attempt === maxRetries) {
        throw error; // Último intento, propagar error
      }
      
      // Esperar antes del siguiente intento (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// 🔧 SERVICIOS MEJORADOS

export const IngresosService = {
  getFacturasVenta: async () => {
    console.log('📊 Obteniendo TODAS las facturas de venta...');
    return await fetchAllPaginatedData('/dtes?porCobrar=1');
  },
};

export const BancoService = {
  getSaldosBancarios: async () => {
    console.log('🏦 Obteniendo saldos bancarios...');
    const data = await fetchFromChipax('/flujo-caja/init');
    return data;
  }
};

export const ReportesService = {
  getFlujoCaja: async () => {
    console.log('💰 Obteniendo flujo de caja...');
    const data = await fetchFromChipax('/flujo-caja/init');
    return data;
  }
};

export const EgresosService = {
  // 🔧 FUNCIÓN PRINCIPAL CORREGIDA
  getFacturasCompra: async () => {
    try {
      console.log('🛒 📊 OBTENIENDO TODAS LAS FACTURAS DE COMPRA (CON PAGINACIÓN MEJORADA)...');
      
      // ✅ USAR LA FUNCIÓN DE PAGINACIÓN CORREGIDA
      const response = await fetchAllPaginatedData('/compras?pagado=false');
      
      if (!response || !response.items) {
        console.warn('⚠️ No se recibieron facturas de compra');
        return { items: [] };
      }
      
      console.log(`📊 🎯 FACTURAS DE COMPRA OBTENIDAS:`);
      console.log(`   📋 Total de facturas: ${response.items.length}`);
      if (response.paginationInfo) {
        console.log(`   📄 Páginas cargadas: ${response.paginationInfo.totalPagesLoaded}/${response.paginationInfo.totalPagesRequested}`);
        console.log(`   📈 Completitud: ${response.paginationInfo.completenessPercent.toFixed(1)}%`);
      }
      
      // Análisis de ejemplo de la primera factura
      if (response.items.length > 0) {
        const primerFactura = response.items[0];
        console.log('🔍 ESTRUCTURA DE FACTURA DE EJEMPLO:');
        console.log('   - ID:', primerFactura.id);
        console.log('   - Folio:', primerFactura.folio);
        console.log('   - Estado:', primerFactura.estado);
        console.log('   - Total:', primerFactura.total);
        console.log('   - Estado pago:', primerFactura.estado_pago);
        console.log('   - Proveedor:', primerFactura.proveedor?.nombre || 'N/A');
      }
      
      // Filtrar facturas pendientes de pago
      const facturasPendientesPago = response.items.filter(factura => {
        const estaPagada = factura.pagada === true || 
                          factura.pagado === true || 
                          factura.estado_pago === 'pagado' ||
                          factura.estado_pago === 'Pagado';
        
        const tieneSaldoExplicito = factura.saldo > 0 || factura.monto_por_pagar > 0;
        const estadoPendiente = factura.estado === 'aceptado' || 
                              factura.estado === 'pendiente' ||
                              factura.estado_pago === 'pendiente';
        
        return !estaPagada && (tieneSaldoExplicito || estadoPendiente);
      });
      
      console.log(`✅ 🎯 RESUMEN DE FACTURAS POR PAGAR:`);
      console.log(`   📊 Total de facturas obtenidas: ${response.items.length}`);
      console.log(`   💰 Facturas pendientes de pago: ${facturasPendientesPago.length}`);
      
      // Mostrar distribución de estados
      const estadosCount = {};
      response.items.forEach(f => {
        const estado = f.estado || 'sin_estado';
        estadosCount[estado] = (estadosCount[estado] || 0) + 1;
      });
      console.log('📈 Distribución de estados:', estadosCount);
      
      return {
        ...response,
        items: facturasPendientesPago.length > 0 ? facturasPendientesPago : response.items.filter(f => f.estado === 'aceptado')
      };
    } catch (error) {
      console.error('💥 ERROR OBTENIENDO FACTURAS POR PAGAR:', error);
      return { items: [] };
    }
  },
  
  getFacturasPendientesAprobacion: async () => {
    console.log('⏳ No hay endpoint disponible para facturas pendientes de aprobación');
    return [];
  },
  
  getPagosProgramados: async () => {
    console.log('📅 No hay endpoint disponible para pagos programados');
    return [];
  }
};

export const AjustesService = {
  getClientes: async () => {
    console.log('👥 Obteniendo todos los clientes...');
    return await fetchAllPaginatedData('/clientes');
  }
};

// 🔧 FUNCIÓN PRINCIPAL MEJORADA
export const fetchAllChipaxData = async (fechaInicio, fechaFin) => {
  console.log('🚀 🔄 INICIANDO CARGA COMPLETA DE DATOS DE CHIPAX...');
  console.log(`📅 Rango de fechas: ${fechaInicio} - ${fechaFin}`);
  
  const startTime = Date.now();
  
  const results = await Promise.allSettled([
    BancoService.getSaldosBancarios(),
    IngresosService.getFacturasVenta(),
    EgresosService.getFacturasCompra(), // 🎯 Ahora usa paginación mejorada
    ReportesService.getFlujoCaja(),
    AjustesService.getClientes()
  ]);

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log(`\n📊 🎯 RESUMEN COMPLETO DE CARGA DE DATOS (${duration}s):`);
  
  const dataNames = ['Saldos Bancarios', 'Facturas de Venta', 'Facturas de Compra', 'Flujo de Caja', 'Clientes'];
  
  results.forEach((result, index) => {
    const name = dataNames[index];
    if (result.status === 'fulfilled') {
      const data = result.value;
      const itemCount = data?.items?.length || (typeof data === 'object' ? 'datos' : '0');
      console.log(`   ✅ ${name}: ${itemCount} ${typeof itemCount === 'number' ? 'items' : ''}`);
      
      // Mostrar info de paginación si está disponible
      if (data?.paginationInfo) {
        console.log(`      📄 Páginas: ${data.paginationInfo.totalPagesLoaded}/${data.paginationInfo.totalPagesRequested}`);
        console.log(`      📈 Completitud: ${data.paginationInfo.completenessPercent.toFixed(1)}%`);
      }
    } else {
      console.log(`   ❌ ${name}: Error - ${result.reason?.message || 'Error desconocido'}`);
    }
  });
  
  const [saldos, cobradas, pagar, flujo, clientes] = results;
  
  return {
    saldosBancarios: saldos.value || { cuentasCorrientes: [] },
    facturasPorCobrar: cobradas.value || { items: [] },
    facturasPorPagar: pagar.value || { items: [] },
    facturasPendientes: [],
    flujoCaja: flujo.value || {},
    clientes: clientes.value || { items: [] },
    pagosProgramados: []
  };
};

export default {
  getChipaxToken,
  fetchFromChipax,
  fetchAllChipaxData,
  fetchAllPaginatedData,
  Ingresos: IngresosService,
  Banco: BancoService,
  Reportes: ReportesService,
  Egresos: EgresosService,
  Ajustes: AjustesService
};
