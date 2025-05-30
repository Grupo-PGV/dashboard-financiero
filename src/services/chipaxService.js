// chipaxService.js - Versión con paginación completa para GitHub Web
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

let tokenCache = {
  token: null,
  expiresAt: null
};

// =====================================================
// CONFIGURACIÓN DE PAGINACIÓN
// =====================================================

const PAGINATION_CONFIG = {
  BATCH_SIZE: 5,
  BATCH_DELAY: 200,
  REQUEST_TIMEOUT: 15000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 500
};

// =====================================================
// LOGGING OPTIMIZADO
// =====================================================

const log = {
  info: (message, data = null) => {
    console.log(`📊 CHIPAX: ${message}`, data || '');
  },
  success: (message, data = null) => {
    console.log(`✅ CHIPAX: ${message}`, data || '');
  },
  warning: (message, data = null) => {
    console.warn(`⚠️ CHIPAX: ${message}`, data || '');
  },
  error: (message, error = null) => {
    console.error(`❌ CHIPAX: ${message}`, error || '');
  }
};

// =====================================================
// AUTENTICACIÓN
// =====================================================

export const getChipaxToken = async () => {
  const now = new Date();
  
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
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
      throw new Error('Token no recibido');
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
// PETICIÓN BÁSICA
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
    }
    
    if (retries < PAGINATION_CONFIG.MAX_RETRIES) {
      log.info(`Reintentando ${endpoint} (${retries + 1}/${PAGINATION_CONFIG.MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.RETRY_DELAY));
      return fetchFromChipax(endpoint, options, retries + 1);
    }
    
    throw error;
  }
};

// =====================================================
// PAGINACIÓN COMPLETA
// =====================================================

export const fetchAllPaginatedData = async (baseEndpoint, maxPages = null) => {
  log.info(`🚀 Iniciando paginación completa: ${baseEndpoint}`);
  
  try {
    // Obtener primera página
    const firstPageEndpoint = `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=1`;
    const firstPageData = await fetchFromChipax(firstPageEndpoint);
    
    if (!firstPageData.paginationAttributes) {
      log.info('No hay paginación, devolviendo datos directos');
      return firstPageData;
    }
    
    const { totalPages, totalCount } = firstPageData.paginationAttributes;
    const itemsInFirstPage = firstPageData.items ? firstPageData.items.length : 0;
    
    log.info(`📊 Paginación detectada: ${totalPages} páginas, ${totalCount} items total`);
    
    if (totalPages <= 1) {
      log.success(`✅ Solo 1 página, ${itemsInFirstPage} items obtenidos`);
      return firstPageData;
    }
    
    const pagesToLoad = maxPages ? Math.min(totalPages, maxPages) : totalPages;
    
    if (maxPages && totalPages > maxPages) {
      log.warning(`⚠️ Limitando a ${maxPages} páginas de ${totalPages} totales`);
    }
    
    return await loadRemainingPages(baseEndpoint, firstPageData, pagesToLoad);
    
  } catch (error) {
    log.error('Error en paginación completa', error);
    return { items: [], paginationAttributes: null };
  }
};

// =====================================================
// CARGA DE PÁGINAS RESTANTES
// =====================================================

const loadRemainingPages = async (baseEndpoint, firstPageData, totalPagesToLoad) => {
  const allItems = [...(firstPageData.items || [])];
  let loadedPages = 1;
  let failedPages = 0;
  
  log.info(`📥 Cargando ${totalPagesToLoad - 1} páginas restantes...`);
  
  // Crear lotes de páginas
  const batches = [];
  for (let page = 2; page <= totalPagesToLoad; page += PAGINATION_CONFIG.BATCH_SIZE) {
    const batch = [];
    for (let i = page; i < Math.min(page + PAGINATION_CONFIG.BATCH_SIZE, totalPagesToLoad + 1); i++) {
      batch.push(i);
    }
    if (batch.length > 0) {
      batches.push(batch);
    }
  }
  
  // Procesar cada lote
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchNumber = batchIndex + 1;
    
    log.info(`📦 Lote ${batchNumber}/${batches.length} (páginas ${batch[0]}-${batch[batch.length - 1]})`);
    
    try {
      // Cargar páginas del lote en paralelo
      const batchPromises = batch.map(async (pageNumber) => {
        try {
          const pageEndpoint = `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${pageNumber}`;
          const pageData = await fetchFromChipax(pageEndpoint);
          
          if (pageData.items && Array.isArray(pageData.items)) {
            return {
              pageNumber,
              items: pageData.items,
              success: true
            };
          } else {
            return {
              pageNumber,
              items: [],
              success: false,
              error: 'Sin items'
            };
          }
        } catch (error) {
          return {
            pageNumber,
            items: [],
            success: false,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
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
      
      // Pausa entre lotes
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.BATCH_DELAY));
      }
      
    } catch (error) {
      log.error(`❌ Error en lote ${batchNumber}`, error);
      failedPages += batch.length;
    }
  }
  
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
  
  log.success(`🎉 Paginación completa: ${allItems.length} items de ${loadedPages}/${totalPagesToLoad} páginas`);
  
  if (failedPages > 0) {
    log.warning(`⚠️ ${failedPages} páginas fallaron`);
  }
  
  return finalResult;
};

// =====================================================
// SERVICIOS CON PAGINACIÓN
// =====================================================

export const IngresosService = {
  getFacturasVenta: async (limitPages = null) => {
    log.info('📊 Obteniendo TODAS las facturas de venta...');
    try {
      const result = await fetchAllPaginatedData('/dtes?porCobrar=1', limitPages);
      log.success(`✅ Facturas de venta: ${result.items.length} items`);
      return result;
    } catch (error) {
      log.error('Error facturas de venta', error);
      return { items: [], paginationAttributes: null };
    }
  },
  
  debugPagination: async (endpoint = '/dtes?porCobrar=1', maxPages = 5) => {
    log.info(`🔍 DEBUG: Analizando paginación de ${endpoint}`);
    
    try {
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
      log.error('Error en debug', error);
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
      log.error('Error datos bancarios', error);
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
      log.error('Error flujo de caja', error);
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
        log.warning('⚠️ No hay facturas de compra');
        return { items: [] };
      }
      
      log.info(`📊 Total facturas de compra: ${response.items.length}`);
      
      const facturasPendientes = response.items.filter(factura => {
        try {
          const estaPagada = factura.pagada === true || 
                            factura.pagado === true || 
                            (factura.estado_pago && factura.estado_pago.toLowerCase() === 'pagado');
          
          const esAceptada = factura.estado === 'aceptado';
          
          return esAceptada && !estaPagada;
        } catch (err) {
          return false;
        }
      });
      
      log.success(`✅ Facturas pendientes de pago: ${facturasPendientes.length}`);
      
      return {
        ...response,
        items: facturasPendientes
      };
      
    } catch (error) {
      log.error('Error facturas de compra', error);
      return { items: [] };
    }
  },
  
  getFacturasPendientesAprobacion: async () => {
    log.info('⏳ Facturas pendientes de aprobación...');
    return [];
  },
  
  getPagosProgramados: async () => {
    log.info('📅 Pagos programados...');
    return [];
  }
};

export const AjustesService = {
  getClientes: async (limitPages = null) => {
    log.info('👥 Obteniendo TODOS los clientes...');
    try {
      const data = await fetchAllPaginatedData('/clientes', limitPages);
      log.success(`✅ Clientes: ${data.items.length} items`);
      return data;
    } catch (error) {
      log.error('Error clientes', error);
      return { items: [] };
    }
  }
};

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

export const fetchAllChipaxData = async (fechaInicio, fechaFin, limitPages = null) => {
  log.info('🚀 Carga completa de Chipax...');
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

  log.info('📊 Resumen:');
  const labels = ['Saldos', 'Ventas', 'Compras', 'Flujo', 'Clientes'];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      const count = data.items ? data.items.length : 
                   data.arrFlujoCaja ? data.arrFlujoCaja.length :
                   Array.isArray(data) ? data.length : 'objeto';
      log.success(`✅ ${labels[index]}: ${count}`);
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
  
  log.success('✅ Carga completa finalizada');
  return datosFinales;
};

// =====================================================
// EXPORTACIÓN
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
