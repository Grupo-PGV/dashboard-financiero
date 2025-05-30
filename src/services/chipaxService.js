// chipaxService.js - Versión con paginación completa corregida
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

let tokenCache = {
  token: null,
  expiresAt: null
};

// =====================================================
// CONFIGURACIÓN DE PAGINACIÓN OPTIMIZADA
// =====================================================

const PAGINATION_CONFIG = {
  // Número de páginas a cargar en paralelo por lote
  BATCH_SIZE: 8,
  // Delay entre lotes para evitar rate limiting (ms)
  BATCH_DELAY: 150,
  // Timeout por petición individual (ms)
  REQUEST_TIMEOUT: 15000,
  // Número máximo de reintentos por página
  MAX_RETRIES: 2,
  // Delay entre reintentos (ms)
  RETRY_DELAY: 500
};

// =====================================================
// FUNCIONES DE UTILIDAD PARA DEBUGGING
// =====================================================

const log = {
  info: (message, data = null) => {
    console.log(`📊 CHIPAX: ${message}`, data ? data : '');
  },
  success: (message, data = null) => {
    console.log(`✅ CHIPAX: ${message}`, data ? data : '');
  },
  warning: (message, data = null) => {
    console.warn(`⚠️ CHIPAX: ${message}`, data ? data : '');
  },
  error: (message, error = null) => {
    console.error(`❌ CHIPAX: ${message}`, error ? error : '');
  },
  debug: (message, data = null) => {
    console.log(`🔍 CHIPAX DEBUG: ${message}`, data ? data : '');
  }
};

// =====================================================
// AUTENTICACIÓN
// =====================================================

export const getChipaxToken = async () => {
  const now = new Date();
  
  // Verificar token en cache
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    log.debug('Usando token en cache');
    return tokenCache.token;
  }

  try {
    log.info('Solicitando nuevo token...');
    
    const response = await fetch(`${CHIPAX_API_URL}/login`, {
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.token) {
      throw new Error('Token no recibido en la respuesta');
    }

    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    log.success('Token obtenido exitosamente');
    return tokenCache.token;
    
  } catch (error) {
    log.error('Error obteniendo token', error);
    tokenCache = { token: null, expiresAt: null };
    throw error;
  }
};

// =====================================================
// FUNCIÓN BÁSICA DE PETICIÓN
// =====================================================

export const fetchFromChipax = async (endpoint, options = {}, retries = 0) => {
  try {
    const token = await getChipaxToken();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGINATION_CONFIG.REQUEST_TIMEOUT);
    
    const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 404) {
        log.warning(`Endpoint no encontrado: ${endpoint}`);
        return { items: [], paginationAttributes: null };
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      log.error(`Timeout en petición: ${endpoint}`);
    } else {
      log.error(`Error en petición: ${endpoint}`, error);
    }
    
    // Reintentar si es posible
    if (retries < PAGINATION_CONFIG.MAX_RETRIES) {
      log.info(`Reintentando petición ${endpoint} (${retries + 1}/${PAGINATION_CONFIG.MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.RETRY_DELAY));
      return fetchFromChipax(endpoint, options, retries + 1);
    }
    
    throw error;
  }
};

// =====================================================
// FUNCIÓN DE PAGINACIÓN OPTIMIZADA
// =====================================================

export const fetchAllPaginatedData = async (baseEndpoint, maxPages = null) => {
  log.info(`🚀 Iniciando carga paginada completa: ${baseEndpoint}`);
  
  try {
    // Paso 1: Obtener primera página para conocer la estructura
    log.debug('Obteniendo primera página...');
    const firstPageEndpoint = `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=1`;
    const firstPageData = await fetchFromChipax(firstPageEndpoint);
    
    // Verificar si hay paginación
    if (!firstPageData.paginationAttributes) {
      log.info('No hay paginación detectada, devolviendo datos directos');
      return firstPageData;
    }
    
    const { totalPages, totalCount, currentPage } = firstPageData.paginationAttributes;
    const itemsInFirstPage = firstPageData.items ? firstPageData.items.length : 0;
    
    log.info(`📊 Paginación detectada:`, {
      totalPages,
      totalCount,
      currentPage,
      itemsInFirstPage
    });
    
    // Si solo hay una página, devolverla
    if (totalPages <= 1) {
      log.success(`✅ Solo 1 página, ${itemsInFirstPage} items obtenidos`);
      return firstPageData;
    }
    
    // Determinar cuántas páginas cargar
    const pagesToLoad = maxPages ? Math.min(totalPages, maxPages) : totalPages;
    
    if (maxPages && totalPages > maxPages) {
      log.warning(`⚠️ Limitando carga a ${maxPages} páginas de ${totalPages} totales`);
    }
    
    // Paso 2: Cargar páginas restantes de forma optimizada
    return await loadRemainingPages(baseEndpoint, firstPageData, pagesToLoad);
    
  } catch (error) {
    log.error('Error en carga paginada', error);
    return { items: [], paginationAttributes: null };
  }
};

// =====================================================
// FUNCIÓN PARA CARGAR PÁGINAS RESTANTES
// =====================================================

const loadRemainingPages = async (baseEndpoint, firstPageData, totalPagesToLoad) => {
  const allItems = [...(firstPageData.items || [])];
  let loadedPages = 1;
  let failedPages = 0;
  
  log.info(`📥 Cargando ${totalPagesToLoad - 1} páginas restantes...`);
  
  // Crear lotes de páginas para cargar en paralelo
  const batches = createPageBatches(2, totalPagesToLoad, PAGINATION_CONFIG.BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchNumber = batchIndex + 1;
    const totalBatches = batches.length;
    
    log.debug(`📦 Procesando lote ${batchNumber}/${totalBatches} (páginas ${batch[0]}-${batch[batch.length - 1]})`);
    
    try {
      // Cargar páginas del lote en paralelo
      const batchPromises = batch.map(async (pageNumber) => {
        try {
          const pageEndpoint = `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${pageNumber}`;
          const pageData = await fetchFromChipax(pageEndpoint);
          
          if (pageData.items && Array.isArray(pageData.items)) {
            log.debug(`✅ Página ${pageNumber}: ${pageData.items.length} items`);
            return {
              pageNumber,
              items: pageData.items,
              success: true
            };
          } else {
            log.warning(`⚠️ Página ${pageNumber}: Sin items`);
            return {
              pageNumber,
              items: [],
              success: false,
              error: 'Sin items en la respuesta'
            };
          }
        } catch (error) {
          log.error(`❌ Error en página ${pageNumber}`, error);
          return {
            pageNumber,
            items: [],
            success: false,
            error: error.message
          };
        }
      });
      
      // Esperar resultados del lote
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Procesar resultados
      let batchItemCount = 0;
      let batchFailures = 0;
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const pageResult = result.value;
          if (pageResult.success) {
            allItems.push(...pageResult.items);
            batchItemCount += pageResult.items.length;
            loadedPages++;
          } else {
            batchFailures++;
            failedPages++;
          }
        } else {
          batchFailures++;
          failedPages++;
        }
      });
      
      log.info(`📊 Lote ${batchNumber} completado: ${batchItemCount} items, ${batchFailures} fallos`);
      
      // Pausa entre lotes para evitar saturar la API
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.BATCH_DELAY));
      }
      
    } catch (error) {
      log.error(`❌ Error procesando lote ${batchNumber}`, error);
      failedPages += batch.length;
    }
  }
  
  // Resultado final
  const finalResult = {
    items: allItems,
    paginationAttributes: {
      ...firstPageData.paginationAttributes,
      actualItemsLoaded: allItems.length,
      pagesLoaded: loadedPages,
      pagesTotal: totalPagesToLoad,
      pagesFailed: failedPages
    }
  };
  
  log.success(`🎉 Carga completa: ${allItems.length} items de ${loadedPages}/${totalPagesToLoad} páginas`);
  
  if (failedPages > 0) {
    log.warning(`⚠️ ${failedPages} páginas fallaron durante la carga`);
  }
  
  return finalResult;
};

// =====================================================
// FUNCIÓN PARA CREAR LOTES DE PÁGINAS
// =====================================================

const createPageBatches = (startPage, endPage, batchSize) => {
  const batches = [];
  
  for (let page = startPage; page <= endPage; page += batchSize) {
    const batch = [];
    for (let i = page; i < Math.min(page + batchSize, endPage + 1); i++) {
      batch.push(i);
    }
    if (batch.length > 0) {
      batches.push(batch);
    }
  }
  
  return batches;
};

// =====================================================
// SERVICIOS ESPECÍFICOS CON PAGINACIÓN COMPLETA
// =====================================================

export const IngresosService = {
  getFacturasVenta: async (limitPages = null) => {
    log.info('📊 Obteniendo TODAS las facturas de venta...');
    try {
      const result = await fetchAllPaginatedData('/dtes?porCobrar=1', limitPages);
      log.success(`✅ Facturas de venta obtenidas: ${result.items.length} items`);
      return result;
    } catch (error) {
      log.error('Error obteniendo facturas de venta', error);
      return { items: [], paginationAttributes: null };
    }
  },
  
  // Función específica para debug de paginación
  debugPagination: async (endpoint = '/dtes?porCobrar=1', maxPages = 5) => {
    log.info(`🔍 DEBUG: Analizando paginación de ${endpoint}`);
    
    try {
      // Obtener primera página
      const firstPage = await fetchFromChipax(`${endpoint}&page=1`);
      
      const debugInfo = {
        endpoint,
        firstPageItems: firstPage.items ? firstPage.items.length : 0,
        pagination: firstPage.paginationAttributes || null,
        timestamp: new Date().toISOString()
      };
      
      if (firstPage.paginationAttributes) {
        const { totalPages, totalCount } = firstPage.paginationAttributes;
        debugInfo.analysis = {
          totalPagesAvailable: totalPages,
          totalItemsExpected: totalCount,
          avgItemsPerPage: Math.round(totalCount / totalPages),
          willTestPages: Math.min(maxPages, totalPages)
        };
        
        // Probar algunas páginas adicionales
        const testPages = Math.min(maxPages, totalPages);
        const testResults = [];
        
        for (let page = 1; page <= testPages; page++) {
          try {
            const pageData = await fetchFromChipax(`${endpoint}&page=${page}`);
            testResults.push({
              page,
              itemCount: pageData.items ? pageData.items.length : 0,
              hasItems: pageData.items && pageData.items.length > 0
            });
          } catch (error) {
            testResults.push({
              page,
              itemCount: 0,
              hasItems: false,
              error: error.message
            });
          }
        }
        
        debugInfo.testResults = testResults;
        debugInfo.summary = {
          totalItemsTested: testResults.reduce((sum, r) => sum + r.itemCount, 0),
          pagesWithItems: testResults.filter(r => r.hasItems).length,
          pagesWithErrors: testResults.filter(r => r.error).length
        };
      }
      
      log.info('🔍 DEBUG completo:', debugInfo);
      return debugInfo;
      
    } catch (error) {
      log.error('Error en debug de paginación', error);
      return { error: error.message, endpoint };
    }
  }
};

export const BancoService = {
  getSaldosBancarios: async () => {
    log.info('🏦 Obteniendo datos bancarios...');
    try {
      const data = await fetchFromChipax('/flujo-caja/init');
      log.success('✅ Datos bancarios obtenidos');
      return data;
    } catch (error) {
      log.error('Error obteniendo datos bancarios', error);
      return { cuentasCorrientes: [], arrFlujoCaja: [] };
    }
  }
};

export const ReportesService = {
  getFlujoCaja: async () => {
    log.info('💰 Obteniendo flujo de caja...');
    try {
      const data = await fetchFromChipax('/flujo-caja/init');
      log.success('✅ Flujo de caja obtenido');
      return data;
    } catch (error) {
      log.error('Error obteniendo flujo de caja', error);
      return { arrFlujoCaja: [] };
    }
  }
};

export const EgresosService = {
  getFacturasCompra: async (limitPages = null) => {
    log.info('🛒 Obteniendo TODAS las facturas de compra...');
    try {
      const response = await fetchAllPaginatedData('/compras', limitPages);
      
      if (!response || !response.items) {
        log.warning('⚠️ No se recibieron facturas de compra');
        return { items: [] };
      }
      
      log.info(`📊 Total facturas de compra obtenidas: ${response.items.length}`);
      
      // Filtrar facturas pendientes de pago
      const facturasPendientes = response.items.filter(factura => {
        try {
          const estaPagada = factura.pagada === true || 
                            factura.pagado === true || 
                            (factura.estado_pago && factura.estado_pago.toLowerCase() === 'pagado');
          
          const esAceptada = factura.estado === 'aceptado';
          
          return esAceptada && !estaPagada;
        } catch (err) {
          log.warning('⚠️ Error procesando factura:', factura.id);
          return false;
        }
      });
      
      log.success(`✅ Facturas pendientes de pago: ${facturasPendientes.length}`);
      
      return {
        ...response,
        items: facturasPendientes
      };
      
    } catch (error) {
      log.error('Error obteniendo facturas de compra', error);
      return { items: [] };
    }
  },
  
  getFacturasPendientesAprobacion: async () => {
    log.info('⏳ Obteniendo facturas pendientes de aprobación...');
    return [];
  },
  
  getPagosProgramados: async () => {
    log.info('📅 Obteniendo pagos programados...');
    return [];
  }
};

export const AjustesService = {
  getClientes: async (limitPages = null) => {
    log.info('👥 Obteniendo TODOS los clientes...');
    try {
      const data = await fetchAllPaginatedData('/clientes', limitPages);
      log.success(`✅ Clientes obtenidos: ${data.items.length} items`);
      return data;
    } catch (error) {
      log.error('Error obteniendo clientes', error);
      return { items: [] };
    }
  }
};

// =====================================================
// FUNCIÓN PRINCIPAL PARA CARGAR TODOS LOS DATOS
// =====================================================

export const fetchAllChipaxData = async (fechaInicio, fechaFin, limitPages = null) => {
  log.info('🚀 Iniciando carga completa de datos de Chipax...');
  log.info(`📅 Rango: ${fechaInicio} - ${fechaFin}`);
  
  if (limitPages) {
    log.info(`🔒 Limitando a ${limitPages} páginas por endpoint`);
  }
  
  const results = await Promise.allSettled([
    BancoService.getSaldosBancarios(),
    IngresosService.getFacturasVenta(limitPages),
    EgresosService.getFacturasCompra(limitPages),
    ReportesService.getFlujoCaja(),
    AjustesService.getClientes(limitPages)
  ]);

  log.info('📊 Resumen de resultados:');
  const labels = ['Saldos Bancarios', 'Facturas Venta', 'Facturas Compra', 'Flujo Caja', 'Clientes'];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      const count = data.items ? data.items.length : 
                   data.arrFlujoCaja ? data.arrFlujoCaja.length :
                   Array.isArray(data) ? data.length : 'objeto';
      log.success(`✅ ${labels[index]}: ${count} elementos`);
    } else {
      log.error(`❌ ${labels[index]}: ${result.reason?.message}`);
    }
  });
  
  const [saldosResult, ventasResult, comprasResult, flujoResult, clientesResult] = results;
  
  const datosFinales = {
    saldosBancarios: saldosResult.status === 'fulfilled' ? saldosResult.value : { cuentasCorrientes: [], arrFlujoCaja: [] },
    facturasPorCobrar: ventasResult.status === 'fulfilled' ? ventasResult.value : { items: [] },
    facturasPorPagar: comprasResult.status === 'fulfilled' ? comprasResult.value : { items: [] },
    facturasPendientes: [],
    flujoCaja: flujoResult.status === 'fulfilled' ? flujoResult.value : { arrFlujoCaja: [] },
    clientes: clientesResult.status === 'fulfilled' ? clientesResult.value : { items: [] },
    pagosProgramados: []
  };
  
  log.success('✅ Carga completa de datos finalizada');
  return datosFinales;
};

// =====================================================
// EXPORTACIÓN DEFAULT
// =====================================================

export default {
  getChipaxToken,
  fetchFromChipax,
  fetchAllChipaxData,
  fetchAllPaginatedData,
  Ingresos: IngresosService,
  Banco: BancoService,
  Reportes: ReportesService,
  Egresos: EgresosService,
  Ajustes: AjustesService,
  PAGINATION_CONFIG
};
