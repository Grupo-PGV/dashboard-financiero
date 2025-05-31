// chipaxService.js - CORREGIDO con endpoints REALES de Chipax
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
        'Authorization': `Bearer ${token}`, // Cambiado de JWT a Bearer
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
      if (Array.isArray(data)) {
        console.log(`📋 Items directos: ${data.length}`);
      } else if (data.items && Array.isArray(data.items)) {
        console.log(`📋 Items en esta página: ${data.items.length}`);
      } else {
        console.log('📊 Tipo de respuesta:', typeof data);
      }
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error en petición a ${endpoint}:`, error);
    throw error;
  }
};

// 🔧 FUNCIÓN DE PAGINACIÓN CORREGIDA para endpoints reales
export const fetchAllPaginatedData = async (baseEndpoint, maxRetries = 3) => {
  console.log(`📊 🔄 INICIANDO CARGA PAGINADA DE: ${baseEndpoint}`);
  
  try {
    // 1. PRIMERA PÁGINA: Obtener información de paginación
    console.log('📄 Obteniendo primera página para análisis...');
    const firstPageData = await fetchFromChipax(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=1`);
    
    // 2. VERIFICAR FORMATO DE RESPUESTA
    let items = [];
    let paginationInfo = null;
    
    if (Array.isArray(firstPageData)) {
      // Respuesta directa como array (sin paginación)
      console.log('ℹ️ Respuesta directa como array, sin paginación detectada');
      return {
        items: firstPageData,
        paginationInfo: null
      };
    } else if (firstPageData.items && Array.isArray(firstPageData.items)) {
      // Formato con items y posible paginación
      items = firstPageData.items;
      paginationInfo = firstPageData.paginationAttributes || firstPageData.pagination;
    } else {
      // Formato desconocido
      console.warn('⚠️ Formato de respuesta desconocido:', firstPageData);
      return {
        items: [],
        paginationInfo: null
      };
    }
    
    // 3. VERIFICAR SI HAY PAGINACIÓN
    if (!paginationInfo || !paginationInfo.totalPages || paginationInfo.totalPages <= 1) {
      console.log('ℹ️ No hay paginación o solo una página');
      return {
        items: items,
        paginationInfo: null
      };
    }
    
    const { totalPages, totalCount, currentPage } = paginationInfo;
    console.log(`📊 ANÁLISIS DE PAGINACIÓN:`);
    console.log(`   - Total de páginas: ${totalPages}`);
    console.log(`   - Total de items: ${totalCount}`);
    console.log(`   - Página actual: ${currentPage}`);
    console.log(`   - Items en primera página: ${items.length}`);
    
    // 4. CARGAR TODAS LAS PÁGINAS RESTANTES
    console.log(`🔄 Cargando ${totalPages - 1} páginas adicionales...`);
    
    let allItems = [...items];
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
    const BATCH_SIZE = 3; // Reducido para ser más conservador
    const results = [];
    
    for (let i = 0; i < pagePromises.length; i += BATCH_SIZE) {
      const batch = pagePromises.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);
      
      // Log de progreso
      const processedPages = Math.min(i + BATCH_SIZE, pagePromises.length);
      console.log(`📊 Progreso: ${processedPages + 1}/${totalPages} páginas procesadas`);
      
      // Pequeña pausa entre lotes para no sobrecargar la API
      if (i + BATCH_SIZE < pagePromises.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 6. PROCESAR RESULTADOS
    results.forEach((result, index) => {
      const pageNumber = index + 2; // +2 porque empezamos desde la página 2
      
      if (result.status === 'fulfilled' && result.value) {
        const pageData = result.value;
        let pageItems = [];
        
        if (Array.isArray(pageData)) {
          pageItems = pageData;
        } else if (pageData.items && Array.isArray(pageData.items)) {
          pageItems = pageData.items;
        }
        
        if (pageItems.length > 0) {
          allItems.push(...pageItems);
          console.log(`✅ Página ${pageNumber}: ${pageItems.length} items obtenidos`);
        } else {
          console.warn(`⚠️ Página ${pageNumber}: Sin items`);
        }
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
    
    return {
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

// 🔧 SERVICIOS CON ENDPOINTS REALES

export const IngresosService = {
  getFacturasVenta: async () => {
    console.log('📊 Obteniendo facturas de venta...');
    // Usar endpoint real /ventas
    return await fetchAllPaginatedData('/ventas');
  },
  
  getFacturasPorCobrar: async () => {
    console.log('📊 Obteniendo facturas por cobrar...');
    // Usar endpoint real /dtes (Documentos Tributarios Electrónicos)
    const dtes = await fetchAllPaginatedData('/dtes');
    
    // Filtrar solo facturas por cobrar (sin fecha de pago)
    if (dtes.items) {
      const facturasPorCobrar = dtes.items.filter(dte => {
        // Filtrar solo facturas sin pago
        return !dte.fecha_pago_interna && !dte.pagado && dte.tipo === 'factura';
      });
      
      console.log(`💰 Facturas por cobrar filtradas: ${facturasPorCobrar.length}/${dtes.items.length}`);
      
      return {
        ...dtes,
        items: facturasPorCobrar
      };
    }
    
    return dtes;
  }
};

export const BancoService = {
  getSaldosBancarios: async () => {
    console.log('🏦 Obteniendo cuentas corrientes...');
    // Usar endpoint real /cuentas_corrientes
    return await fetchFromChipax('/cuentas_corrientes');
  },
  
  getMovimientosBancarios: async () => {
    console.log('🏦 Obteniendo cartolas bancarias...');
    // Usar endpoint real /cartolas
    return await fetchAllPaginatedData('/cartolas');
  }
};

export const ReportesService = {
  getKPIs: async () => {
    console.log('📊 Obteniendo KPIs...');
    // Usar endpoint real /kpis
    return await fetchFromChipax('/kpis');
  },
  
  getProyecciones: async () => {
    console.log('📈 Obteniendo proyecciones...');
    // Usar endpoint real /proyecciones
    return await fetchFromChipax('/proyecciones');
  }
};

export const EgresosService = {
  getFacturasCompra: async () => {
    try {
      console.log('🛒 📊 OBTENIENDO FACTURAS DE COMPRA (USANDO ENDPOINT REAL)...');
      
      // ✅ USAR ENDPOINT REAL /compras
      const response = await fetchAllPaginatedData('/compras');
      
      if (!response || !response.items) {
        console.warn('⚠️ No se recibieron facturas de compra');
        return { items: [] };
      }
      
      console.log(`📊 🎯 FACTURAS DE COMPRA OBTENIDAS:`);
      console.log(`   📋 Total de facturas: ${response.items.length}`);
      
      // Análisis de ejemplo de la primera factura
      if (response.items.length > 0) {
        const primerFactura = response.items[0];
        console.log('🔍 ESTRUCTURA DE FACTURA DE EJEMPLO:');
        console.log('   - ID:', primerFactura.id);
        console.log('   - Folio:', primerFactura.folio);
        console.log('   - Estado:', primerFactura.estado);
        console.log('   - Total:', primerFactura.monto_total || primerFactura.total);
        console.log('   - Pagado:', primerFactura.pagado);
        console.log('   - Fecha pago:', primerFactura.fecha_pago_interna);
        console.log('   - Proveedor:', primerFactura.razon_social);
      }
      
      // Filtrar facturas pendientes de pago (sin filtro en endpoint, filtrar localmente)
      const facturasPendientesPago = response.items.filter(factura => {
        // Una factura está pendiente si NO está pagada
        const estaPagada = factura.pagado === true || 
                          factura.fecha_pago_interna !== null;
        
        return !estaPagada;
      });
      
      console.log(`✅ 🎯 RESUMEN DE FACTURAS POR PAGAR:`);
      console.log(`   📊 Total de facturas obtenidas: ${response.items.length}`);
      console.log(`   💰 Facturas pendientes de pago: ${facturasPendientesPago.length}`);
      
      // Mostrar distribución de estados de pago
      const estadosPago = {};
      response.items.forEach(f => {
        const pagado = f.pagado ? 'Pagado' : 'Pendiente';
        estadosPago[pagado] = (estadosPago[pagado] || 0) + 1;
      });
      console.log('📈 Distribución de estados de pago:', estadosPago);
      
      return {
        ...response,
        items: facturasPendientesPago
      };
    } catch (error) {
      console.error('💥 ERROR OBTENIENDO FACTURAS POR PAGAR:', error);
      return { items: [] };
    }
  },
  
  getFacturasPendientesAprobacion: async () => {
    console.log('⏳ Intentando obtener facturas pendientes...');
    // Nota: No hay endpoint específico documentado para esto
    // Podríamos usar /compras y filtrar por estado
    try {
      const compras = await fetchFromChipax('/compras');
      // Filtrar por estado pendiente de aprobación si existe ese campo
      return [];
    } catch (error) {
      console.log('⏳ No hay endpoint para facturas pendientes de aprobación');
      return [];
    }
  },
  
  getPagosProgramados: async () => {
    console.log('📅 Intentando obtener pagos...');
    // Usar endpoint real /pagos
    try {
      return await fetchAllPaginatedData('/pagos');
    } catch (error) {
      console.log('📅 Error obteniendo pagos');
      return [];
    }
  }
};

export const AjustesService = {
  getClientes: async () => {
    console.log('👥 Obteniendo clientes...');
    // ✅ USAR ENDPOINT REAL /clientes
    return await fetchAllPaginatedData('/clientes');
  },
  
  getProveedores: async () => {
    console.log('🏢 Obteniendo proveedores...');
    // ✅ USAR ENDPOINT REAL /proveedores
    return await fetchAllPaginatedData('/proveedores');
  }
};

// 🔧 FUNCIÓN PRINCIPAL MEJORADA CON ENDPOINTS REALES
export const fetchAllChipaxData = async (fechaInicio, fechaFin) => {
  console.log('🚀 🔄 INICIANDO CARGA COMPLETA DE DATOS DE CHIPAX (ENDPOINTS REALES)...');
  console.log(`📅 Rango de fechas: ${fechaInicio} - ${fechaFin}`);
  
  const startTime = Date.now();
  
  const results = await Promise.allSettled([
    BancoService.getSaldosBancarios(),
    IngresosService.getFacturasPorCobrar(), // Cambiado para usar facturas por cobrar filtradas
    EgresosService.getFacturasCompra(),
    ReportesService.getKPIs(),
    AjustesService.getClientes(),
    AjustesService.getProveedores()
  ]);

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log(`\n📊 🎯 RESUMEN COMPLETO DE CARGA DE DATOS (${duration}s):`);
  
  const dataNames = ['Cuentas Corrientes', 'Facturas por Cobrar', 'Facturas de Compra', 'KPIs', 'Clientes', 'Proveedores'];
  
  results.forEach((result, index) => {
    const name = dataNames[index];
    if (result.status === 'fulfilled') {
      const data = result.value;
      let itemCount = 'N/A';
      
      if (Array.isArray(data)) {
        itemCount = data.length;
      } else if (data?.items && Array.isArray(data.items)) {
        itemCount = data.items.length;
      }
      
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
  
  const [saldos, cobradas, pagar, kpis, clientes, proveedores] = results;
  
  return {
    saldosBancarios: saldos.value || [],
    facturasPorCobrar: cobradas.value || { items: [] },
    facturasPorPagar: pagar.value || { items: [] },
    facturasPendientes: [],
    flujoCaja: kpis.value || {},
    clientes: clientes.value || { items: [] },
    proveedores: proveedores.value || { items: [] },
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
