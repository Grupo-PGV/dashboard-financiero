// chipaxService.js - Servicio completo con paginación automática y endpoints correctos
const CHIPAX_API_URL = '/v2'; // Usa proxy configurado
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token para evitar múltiples autenticaciones
let tokenCache = {
  token: null,
  expiresAt: null
};

// Configuración de paginación
const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 3, // Máximo de peticiones simultáneas
  RETRY_ATTEMPTS: 3, // Intentos de reintento por página
  RETRY_DELAY: 1000, // Delay entre reintentos (ms)
  REQUEST_DELAY: 200, // Delay entre lotes de peticiones (ms)
  TIMEOUT: 30000 // Timeout por petición (ms)
};

/**
 * Obtiene el token de autenticación de Chipax
 * @returns {Promise<string>} Token JWT
 */
export const getChipaxToken = async () => {
  const now = new Date();
  
  // Verificar si el token en cache es válido
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token en cache');
    return tokenCache.token;
  }

  console.log('🔐 Obteniendo nuevo token de Chipax...');
  
  try {
    const response = await fetch(`${CHIPAX_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, secret_key: SECRET_KEY })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Guardar token en cache
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    console.log('✅ Token obtenido exitosamente. Expira:', tokenCache.expiresAt.toLocaleString());
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    throw error;
  }
};

/**
 * Realiza una petición a la API de Chipax
 * @param {string} endpoint - Endpoint a consultar
 * @param {object} options - Opciones de fetch
 * @param {boolean} showLogs - Mostrar logs detallados
 * @returns {Promise<object>} Respuesta de la API
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    
    const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`, // Usar Bearer en lugar de JWT
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
    
    if (showLogs && data.paginationAttributes) {
      console.log('📄 Info de paginación:', data.paginationAttributes);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error en petición a ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Obtiene todas las páginas de un endpoint con paginación
 * @param {string} baseEndpoint - Endpoint base sin parámetros de página
 * @returns {Promise<object>} Todos los items combinados con estadísticas
 */
export const fetchAllPaginatedData = async (baseEndpoint) => {
  console.log(`\n📊 === INICIANDO CARGA PAGINADA DE ${baseEndpoint} ===`);
  
  const paginationStats = {
    totalPages: 0,
    loadedPages: 0,
    failedPages: [],
    totalItems: 0,
    loadedItems: 0,
    startTime: new Date(),
    endTime: null,
    completenessPercent: 0
  };
  
  try {
    // Obtener primera página para conocer el total
    const separator = baseEndpoint.includes('?') ? '&' : '?';
    const firstPageEndpoint = `${baseEndpoint}${separator}page=1&limit=50`;
    
    console.log(`📄 Obteniendo primera página...`);
    const firstPageData = await fetchFromChipax(firstPageEndpoint, {}, false);
    
    // Verificar si hay paginación
    if (!firstPageData.paginationAttributes) {
      console.log('📋 No hay paginación, devolviendo respuesta directa');
      
      const items = Array.isArray(firstPageData) ? firstPageData : (firstPageData.items || []);
      paginationStats.totalItems = items.length;
      paginationStats.loadedItems = items.length;
      paginationStats.completenessPercent = 100;
      
      return { 
        items, 
        paginationInfo: paginationStats 
      };
    }
    
    // Actualizar estadísticas con información de paginación
    const { totalPages, totalCount, itemsPerPage } = firstPageData.paginationAttributes;
    paginationStats.totalPages = totalPages;
    paginationStats.totalItems = totalCount;
    paginationStats.loadedPages = 1;
    paginationStats.loadedItems = firstPageData.items.length;
    
    console.log(`📊 Información de paginación:`);
    console.log(`   - Total de páginas: ${totalPages}`);
    console.log(`   - Total de items: ${totalCount}`);
    console.log(`   - Items por página: ${itemsPerPage}`);
    
    // Si solo hay una página, devolver los datos
    if (totalPages === 1) {
      paginationStats.completenessPercent = 100;
      return {
        items: firstPageData.items,
        paginationInfo: paginationStats
      };
    }
    
    // Preparar array para todos los items
    let allItems = [...firstPageData.items];
    
    // Cargar páginas restantes en lotes
    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const batches = [];
    
    for (let i = 0; i < pageNumbers.length; i += PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS) {
      batches.push(pageNumbers.slice(i, i + PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS));
    }
    
    console.log(`📦 Cargando ${totalPages - 1} páginas restantes en ${batches.length} lotes...`);
    
    // Procesar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const progress = ((paginationStats.loadedPages / totalPages) * 100).toFixed(1);
      
      console.log(`🔄 Procesando lote ${batchIndex + 1}/${batches.length} (Progreso: ${progress}%)`);
      
      try {
        // Crear promesas para todas las páginas del lote
        const batchPromises = batch.map(page => {
          const endpoint = `${baseEndpoint}${separator}page=${page}&limit=50`;
          return fetchFromChipax(endpoint, {}, false)
            .then(data => ({ page, data, success: true }))
            .catch(error => ({ page, error, success: false }));
        });
        
        // Esperar a que todas las promesas del lote se resuelvan
        const results = await Promise.all(batchPromises);
        
        // Procesar resultados del lote
        let batchItemCount = 0;
        results.forEach(result => {
          if (result.success && result.data.items) {
            allItems = [...allItems, ...result.data.items];
            batchItemCount += result.data.items.length;
            paginationStats.loadedPages++;
            paginationStats.loadedItems += result.data.items.length;
          } else {
            paginationStats.failedPages.push(result.page);
            console.error(`   ✗ Página ${result.page} falló`);
          }
        });
        
        console.log(`   ✓ Lote completado: ${batchItemCount} items nuevos`);
        
        // Delay entre lotes
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));
        }
        
      } catch (error) {
        console.error(`❌ Error procesando lote ${batchIndex + 1}:`, error);
      }
    }
    
    // Calcular completitud
    paginationStats.completenessPercent = paginationStats.totalItems > 0 
      ? (paginationStats.loadedItems / paginationStats.totalItems) * 100 
      : 100;
    
    paginationStats.endTime = new Date();
    const duration = (paginationStats.endTime - paginationStats.startTime) / 1000;
    
    // Resumen final
    console.log(`\n✅ === CARGA COMPLETADA ===`);
    console.log(`   - Items cargados: ${paginationStats.loadedItems}/${paginationStats.totalItems} (${paginationStats.completenessPercent.toFixed(1)}%)`);
    console.log(`   - Páginas cargadas: ${paginationStats.loadedPages}/${paginationStats.totalPages}`);
    console.log(`   - Tiempo total: ${duration.toFixed(2)} segundos`);
    
    if (paginationStats.failedPages.length > 0) {
      console.warn(`⚠️ Páginas que fallaron: ${paginationStats.failedPages.join(', ')}`);
    }
    
    return {
      items: allItems,
      paginationInfo: {
        ...paginationStats,
        totalPagesRequested: totalPages,
        totalPagesLoaded: paginationStats.loadedPages,
        totalItemsExpected: totalCount,
        totalItemsLoaded: allItems.length,
        completenessPercent: paginationStats.completenessPercent,
        failedPages: paginationStats.failedPages
      }
    };
    
  } catch (error) {
    console.error('❌ Error en carga paginada:', error);
    return {
      items: [],
      paginationInfo: paginationStats,
      error: error.message
    };
  }
};

// ===== SERVICIOS ESPECÍFICOS =====

export const IngresosService = {
  getFacturasVenta: async () => {
    console.log('📊 Obteniendo facturas de venta...');
    return await fetchAllPaginatedData('/ventas');
  },
};

export const BancoService = {
  getSaldosBancarios: async () => {
    console.log('🏦 Obteniendo saldos bancarios...');
    const data = await fetchAllPaginatedData('/cuentas_corrientes');
    return data;
  }
};

export const ReportesService = {
  getFlujoCaja: async () => {
    console.log('💰 Obteniendo flujo de caja...');
    // El flujo de caja se generará a partir de las transacciones
    return { message: 'Flujo de caja se generará desde transacciones' };
  }
};

export const EgresosService = {
  getFacturasCompra: async () => {
    console.log('🛒 Obteniendo TODAS las facturas de compra...');
    return await fetchAllPaginatedData('/compras');
  },
  
  getFacturasPorPagar: async () => {
    console.log('💸 Obteniendo facturas de compra PENDIENTES DE PAGO...');
    return await fetchAllPaginatedData('/compras?pagado=false');
  },
  
  getFacturasPendientesAprobacion: async () => {
    console.log('⏳ Obteniendo facturas pendientes de aprobación...');
    const compras = await fetchAllPaginatedData('/compras');
    // Filtrar las que requieren aprobación
    if (compras.items) {
      const pendientes = compras.items.filter(f => 
        f.estado === 'pendiente_aprobacion' || 
        f.requiere_aprobacion === true
      );
      return { items: pendientes };
    }
    return { items: [] };
  },
  
  getPagosProgramados: async () => {
    console.log('📅 Obteniendo pagos programados...');
    try {
      const pagos = await fetchAllPaginatedData('/pagos');
      return pagos;
    } catch (error) {
      return { items: [] };
    }
  }
};

export const AjustesService = {
  getClientes: async () => {
    console.log('👥 Obteniendo clientes...');
    const data = await fetchAllPaginatedData('/clientes');
    return data;
  },
  
  getProveedores: async () => {
    console.log('🏢 Obteniendo proveedores...');
    const data = await fetchAllPaginatedData('/proveedores');
    return data;
  }
};

/**
 * Función principal para obtener todos los datos
 */
export const fetchAllChipaxData = async (fechaInicio, fechaFin) => {
  console.log('🚀 Iniciando carga de todos los datos de Chipax...');
  console.log(`📅 Rango de fechas: ${fechaInicio} - ${fechaFin}`);
  
  const results = await Promise.allSettled([
    BancoService.getSaldosBancarios(),
    IngresosService.getFacturasVenta(),
    EgresosService.getFacturasPorPagar(),
    EgresosService.getFacturasPendientesAprobacion(),
    AjustesService.getClientes(),
    AjustesService.getProveedores(),
    EgresosService.getPagosProgramados()
  ]);

  console.log('📊 Resultados de todas las peticiones:');
  const names = ['Saldos', 'Ventas', 'Compras Por Pagar', 'Pendientes', 'Clientes', 'Proveedores', 'Pagos'];
  results.forEach((result, index) => {
    console.log(`${names[index]}: ${result.status}`, 
      result.value ? `✅ (${result.value.items ? result.value.items.length + ' items' : 'OK'})` : '❌'
    );
  });
  
  const [saldos, ventas, compras, pendientes, clientes, proveedores, pagos] = results;
  
  // Construir respuesta con manejo de errores
  const response = {
    saldosBancarios: saldos.value || { items: [] },
    facturasPorCobrar: ventas.value || { items: [] },
    facturasPorPagar: compras.value || { items: [] },
    facturasPendientes: pendientes.value || { items: [] },
    flujoCaja: {}, // Se generará en el adapter
    clientes: clientes.value || { items: [] },
    proveedores: proveedores.value || { items: [] },
    pagosProgramados: pagos.value || { items: [] }
  };
  
  // Agregar métricas de completitud
  const completitudMetrics = {};
  Object.entries(response).forEach(([key, value]) => {
    if (value.paginationInfo) {
      completitudMetrics[key] = {
        completitud: value.paginationInfo.completenessPercent || 100,
        itemsCargados: value.paginationInfo.totalItemsLoaded || 0,
        itemsEsperados: value.paginationInfo.totalItemsExpected || 0,
        paginasFallidas: value.paginationInfo.failedPages || []
      };
    }
  });
  
  console.log('📈 Métricas de completitud:', completitudMetrics);
  
  return response;
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
