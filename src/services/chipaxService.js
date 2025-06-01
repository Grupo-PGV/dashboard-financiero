// chipaxService.js - Servicio completo con paginación automática y endpoints correctos
const CHIPAX_API_URL = '/v2'; // Usa proxy configurado en package.json
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

// Estado global de paginación para tracking
let paginationStats = {
  totalPages: 0,
  loadedPages: 0,
  failedPages: [],
  totalItems: 0,
  loadedItems: 0,
  startTime: null,
  endTime: null
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
 * Realiza una petición a la API de Chipax con reintentos
 * @param {string} endpoint - Endpoint a consultar
 * @param {object} options - Opciones de fetch
 * @param {number} retryCount - Número de reintentos restantes
 * @returns {Promise<object>} Respuesta de la API
 */
export const fetchFromChipaxWithRetry = async (endpoint, options = {}, retryCount = PAGINATION_CONFIG.RETRY_ATTEMPTS) => {
  try {
    const token = await getChipaxToken();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGINATION_CONFIG.TIMEOUT);
    
    const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`, // Usar Bearer en lugar de JWT
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Si es 404, devolver estructura vacía
      if (response.status === 404) {
        console.warn(`⚠️ Endpoint ${endpoint} no encontrado (404)`);
        return { items: [], paginationAttributes: null };
      }
      
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    if (retryCount > 0 && !error.message.includes('404')) {
      console.warn(`⚠️ Error en ${endpoint}, reintentando... (${retryCount} intentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.RETRY_DELAY));
      return fetchFromChipaxWithRetry(endpoint, options, retryCount - 1);
    }
    
    console.error(`❌ Error definitivo en ${endpoint}:`, error.message);
    throw error;
  }
};

/**
 * Obtiene todas las páginas de un endpoint con paginación
 * @param {string} baseEndpoint - Endpoint base sin parámetros de página
 * @param {object} options - Opciones adicionales
 * @returns {Promise<object>} Todos los items combinados
 */
export const fetchAllPaginatedData = async (baseEndpoint, options = {}) => {
  console.log(`\n📊 === INICIANDO CARGA PAGINADA DE ${baseEndpoint} ===`);
  
  // Resetear estadísticas
  paginationStats = {
    totalPages: 0,
    loadedPages: 0,
    failedPages: [],
    totalItems: 0,
    loadedItems: 0,
    startTime: new Date(),
    endTime: null
  };
  
  try {
    // Obtener primera página para conocer el total
    const separator = baseEndpoint.includes('?') ? '&' : '?';
    const firstPageEndpoint = `${baseEndpoint}${separator}page=1&limit=50`;
    
    console.log(`📄 Obteniendo primera página: ${firstPageEndpoint}`);
    const firstPageData = await fetchFromChipaxWithRetry(firstPageEndpoint);
    
    // Verificar si hay paginación
    if (!firstPageData.paginationAttributes) {
      console.log('📋 No hay paginación, devolviendo respuesta directa');
      
      // Si es un array directo
      if (Array.isArray(firstPageData)) {
        return {
          items: firstPageData,
          paginationStats: {
            ...paginationStats,
            totalItems: firstPageData.length,
            loadedItems: firstPageData.length,
            endTime: new Date()
          }
        };
      }
      
      // Si tiene items pero sin paginación
      if (firstPageData.items) {
        return {
          items: firstPageData.items,
          paginationStats: {
            ...paginationStats,
            totalItems: firstPageData.items.length,
            loadedItems: firstPageData.items.length,
            endTime: new Date()
          }
        };
      }
      
      return { items: [], paginationStats };
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
    console.log(`   - Items en primera página: ${firstPageData.items.length}`);
    
    // Si solo hay una página, devolver los datos
    if (totalPages === 1) {
      paginationStats.endTime = new Date();
      return {
        items: firstPageData.items,
        paginationStats
      };
    }
    
    // Preparar array para todos los items
    let allItems = [...firstPageData.items];
    
    // Estrategia de carga según el número de páginas
    if (totalPages <= 5) {
      console.log(`📄 Usando carga secuencial para ${totalPages} páginas`);
      allItems = await loadPagesSequentially(baseEndpoint, totalPages, allItems);
    } else {
      console.log(`📦 Usando carga en lotes para ${totalPages} páginas`);
      allItems = await loadPagesInBatches(baseEndpoint, totalPages, allItems);
    }
    
    paginationStats.endTime = new Date();
    const duration = (paginationStats.endTime - paginationStats.startTime) / 1000;
    
    // Resumen final
    console.log(`\n✅ === CARGA COMPLETADA ===`);
    console.log(`   - Items cargados: ${paginationStats.loadedItems}/${paginationStats.totalItems}`);
    console.log(`   - Páginas cargadas: ${paginationStats.loadedPages}/${paginationStats.totalPages}`);
    console.log(`   - Páginas fallidas: ${paginationStats.failedPages.length}`);
    console.log(`   - Tiempo total: ${duration.toFixed(2)} segundos`);
    console.log(`   - Velocidad: ${(paginationStats.loadedItems / duration).toFixed(0)} items/segundo`);
    
    if (paginationStats.failedPages.length > 0) {
      console.warn(`⚠️ Páginas que fallaron: ${paginationStats.failedPages.join(', ')}`);
    }
    
    return {
      items: allItems,
      paginationStats
    };
    
  } catch (error) {
    console.error('❌ Error en carga paginada:', error);
    paginationStats.endTime = new Date();
    return {
      items: [],
      paginationStats,
      error: error.message
    };
  }
};

/**
 * Carga páginas de forma secuencial
 */
async function loadPagesSequentially(baseEndpoint, totalPages, existingItems = []) {
  let allItems = [...existingItems];
  const separator = baseEndpoint.includes('?') ? '&' : '?';
  
  for (let page = 2; page <= totalPages; page++) {
    try {
      const endpoint = `${baseEndpoint}${separator}page=${page}&limit=50`;
      console.log(`📄 Cargando página ${page}/${totalPages}...`);
      
      const data = await fetchFromChipaxWithRetry(endpoint);
      
      if (data.items && data.items.length > 0) {
        allItems = [...allItems, ...data.items];
        paginationStats.loadedPages++;
        paginationStats.loadedItems += data.items.length;
        
        // Mostrar progreso
        const progress = ((paginationStats.loadedPages / totalPages) * 100).toFixed(1);
        console.log(`   ✓ Página ${page} cargada: ${data.items.length} items (Progreso: ${progress}%)`);
      }
      
    } catch (error) {
      console.error(`   ✗ Error en página ${page}:`, error.message);
      paginationStats.failedPages.push(page);
    }
  }
  
  return allItems;
}

/**
 * Carga páginas en lotes paralelos
 */
async function loadPagesInBatches(baseEndpoint, totalPages, existingItems = []) {
  let allItems = [...existingItems];
  const separator = baseEndpoint.includes('?') ? '&' : '?';
  
  // Crear array de números de página (empezando desde 2)
  const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  
  // Dividir en lotes
  const batches = [];
  for (let i = 0; i < pageNumbers.length; i += PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS) {
    batches.push(pageNumbers.slice(i, i + PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS));
  }
  
  console.log(`📦 Dividido en ${batches.length} lotes de máximo ${PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS} páginas cada uno`);
  
  // Procesar cada lote
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchStart = batch[0];
    const batchEnd = batch[batch.length - 1];
    
    console.log(`\n🔄 Procesando lote ${batchIndex + 1}/${batches.length} (páginas ${batchStart}-${batchEnd})`);
    
    try {
      // Crear promesas para todas las páginas del lote
      const batchPromises = batch.map(page => {
        const endpoint = `${baseEndpoint}${separator}page=${page}&limit=50`;
        return fetchFromChipaxWithRetry(endpoint)
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
          console.error(`   ✗ Página ${result.page} falló:`, result.error?.message);
        }
      });
      
      const progress = ((paginationStats.loadedPages / totalPages) * 100).toFixed(1);
      console.log(`   ✓ Lote completado: ${batchItemCount} items nuevos (Progreso total: ${progress}%)`);
      
      // Delay entre lotes para no sobrecargar la API
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));
      }
      
    } catch (error) {
      console.error(`❌ Error procesando lote ${batchIndex + 1}:`, error);
    }
  }
  
  return allItems;
}

// ===== SERVICIOS ESPECÍFICOS CON ENDPOINTS REALES =====

/**
 * Servicio para Compras
 */
export const ComprasService = {
  /**
   * Obtiene todas las facturas de compra
   */
  getFacturasCompra: async () => {
    console.log('\n🛒 === OBTENIENDO FACTURAS DE COMPRA ===');
    const result = await fetchAllPaginatedData('/compras');
    
    // Filtrar localmente las facturas no pagadas
    if (result.items && result.items.length > 0) {
      const totalFacturas = result.items.length;
      const facturasPorPagar = result.items.filter(factura => 
        factura.pagado === false || 
        factura.fecha_pago_interna === null ||
        factura.estado === 'pendiente'
      );
      
      console.log(`📊 Resumen de facturas de compra:`);
      console.log(`   - Total de facturas: ${totalFacturas}`);
      console.log(`   - Facturas por pagar: ${facturasPorPagar.length}`);
      console.log(`   - Facturas pagadas: ${totalFacturas - facturasPorPagar.length}`);
      
      // Calcular montos
      const montoPorPagar = facturasPorPagar.reduce((sum, f) => sum + (f.monto_total || 0), 0);
      console.log(`   - Monto total por pagar: $${montoPorPagar.toLocaleString('es-CL')}`);
      
      return {
        items: facturasPorPagar,
        stats: {
          total: totalFacturas,
          porPagar: facturasPorPagar.length,
          pagadas: totalFacturas - facturasPorPagar.length,
          montoPorPagar
        },
        paginationStats: result.paginationStats
      };
    }
    
    return result;
  },
  
  /**
   * Obtiene facturas de compra por estado
   */
  getFacturasPorEstado: async (estado) => {
    const result = await fetchAllPaginatedData('/compras');
    if (result.items) {
      return {
        ...result,
        items: result.items.filter(f => f.estado === estado)
      };
    }
    return result;
  }
};

/**
 * Servicio para Ventas
 */
export const VentasService = {
  /**
   * Obtiene todas las facturas de venta
   */
  getFacturasVenta: async () => {
    console.log('\n💰 === OBTENIENDO FACTURAS DE VENTA ===');
    const result = await fetchAllPaginatedData('/ventas');
    
    if (result.items && result.items.length > 0) {
      const totalFacturas = result.items.length;
      const facturasPorCobrar = result.items.filter(factura => 
        !factura.pagado || 
        factura.saldo_pendiente > 0 ||
        factura.estado === 'pendiente'
      );
      
      console.log(`📊 Resumen de facturas de venta:`);
      console.log(`   - Total de facturas: ${totalFacturas}`);
      console.log(`   - Facturas por cobrar: ${facturasPorCobrar.length}`);
      
      return {
        items: facturasPorCobrar,
        stats: {
          total: totalFacturas,
          porCobrar: facturasPorCobrar.length,
          cobradas: totalFacturas - facturasPorCobrar.length
        },
        paginationStats: result.paginationStats
      };
    }
    
    return result;
  }
};

/**
 * Servicio para DTEs
 */
export const DTEService = {
  /**
   * Obtiene todos los documentos tributarios
   */
  getDTEs: async () => {
    console.log('\n📄 === OBTENIENDO DTEs ===');
    return await fetchAllPaginatedData('/dtes');
  },
  
  /**
   * Obtiene DTEs por cobrar
   */
  getDTEsPorCobrar: async () => {
    const result = await fetchAllPaginatedData('/dtes');
    if (result.items) {
      const porCobrar = result.items.filter(dte => 
        dte.tipo === 'factura_venta' && 
        (!dte.pagado || dte.saldo_pendiente > 0)
      );
      
      return {
        ...result,
        items: porCobrar
      };
    }
    return result;
  }
};

/**
 * Servicio para Clientes
 */
export const ClientesService = {
  /**
   * Obtiene todos los clientes
   */
  getClientes: async () => {
    console.log('\n👥 === OBTENIENDO CLIENTES ===');
    return await fetchAllPaginatedData('/clientes');
  }
};

/**
 * Servicio para Proveedores
 */
export const ProveedoresService = {
  /**
   * Obtiene todos los proveedores
   */
  getProveedores: async () => {
    console.log('\n🏢 === OBTENIENDO PROVEEDORES ===');
    return await fetchAllPaginatedData('/proveedores');
  }
};

/**
 * Servicio para Cuentas Corrientes
 */
export const CuentasCorrientesService = {
  /**
   * Obtiene todas las cuentas corrientes
   */
  getCuentasCorrientes: async () => {
    console.log('\n🏦 === OBTENIENDO CUENTAS CORRIENTES ===');
    const result = await fetchAllPaginatedData('/cuentas_corrientes');
    
    if (result.items && result.items.length > 0) {
      const saldoTotal = result.items.reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
      console.log(`💰 Saldo total en bancos: $${saldoTotal.toLocaleString('es-CL')}`);
      
      return {
        ...result,
        stats: {
          totalCuentas: result.items.length,
          saldoTotal
        }
      };
    }
    
    return result;
  }
};

/**
 * Servicio para KPIs
 */
export const KPIService = {
  /**
   * Obtiene los KPIs financieros
   */
  getKPIs: async () => {
    console.log('\n📊 === OBTENIENDO KPIs ===');
    try {
      const data = await fetchFromChipaxWithRetry('/kpis');
      return data;
    } catch (error) {
      console.warn('⚠️ KPIs no disponibles:', error.message);
      return null;
    }
  }
};

/**
 * Servicio para Proyecciones
 */
export const ProyeccionesService = {
  /**
   * Obtiene las proyecciones financieras
   */
  getProyecciones: async () => {
    console.log('\n📈 === OBTENIENDO PROYECCIONES ===');
    try {
      const data = await fetchFromChipaxWithRetry('/proyecciones');
      return data;
    } catch (error) {
      console.warn('⚠️ Proyecciones no disponibles:', error.message);
      return null;
    }
  }
};

/**
 * Función principal para obtener todos los datos del dashboard
 */
export const fetchAllChipaxData = async () => {
  console.log('\n🚀 === INICIANDO CARGA COMPLETA DE DATOS CHIPAX ===');
  console.log(`⏰ Hora de inicio: ${new Date().toLocaleString()}`);
  
  const startTime = new Date();
  const results = {};
  const errors = [];
  
  // Lista de servicios a cargar
  const services = [
    { name: 'compras', fn: () => ComprasService.getFacturasCompra() },
    { name: 'ventas', fn: () => VentasService.getFacturasVenta() },
    { name: 'clientes', fn: () => ClientesService.getClientes() },
    { name: 'proveedores', fn: () => ProveedoresService.getProveedores() },
    { name: 'cuentasCorrientes', fn: () => CuentasCorrientesService.getCuentasCorrientes() },
    { name: 'kpis', fn: () => KPIService.getKPIs() },
    { name: 'proyecciones', fn: () => ProyeccionesService.getProyecciones() }
  ];
  
  // Cargar todos los servicios
  for (const service of services) {
    try {
      console.log(`\n⏳ Cargando ${service.name}...`);
      results[service.name] = await service.fn();
      console.log(`✅ ${service.name} cargado exitosamente`);
    } catch (error) {
      console.error(`❌ Error cargando ${service.name}:`, error.message);
      errors.push({ service: service.name, error: error.message });
      results[service.name] = { items: [], error: error.message };
    }
  }
  
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  
  // Resumen final
  console.log('\n📊 === RESUMEN DE CARGA ===');
  console.log(`⏱️ Tiempo total: ${duration.toFixed(2)} segundos`);
  console.log(`✅ Servicios cargados: ${Object.keys(results).length - errors.length}`);
  console.log(`❌ Servicios con error: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errores encontrados:');
    errors.forEach(e => console.log(`   - ${e.service}: ${e.error}`));
  }
  
  // Estadísticas de datos
  console.log('\n📈 Estadísticas de datos:');
  Object.entries(results).forEach(([key, value]) => {
    if (value.items) {
      console.log(`   - ${key}: ${value.items.length} items`);
    }
  });
  
  return {
    ...results,
    metadata: {
      loadTime: duration,
      timestamp: new Date(),
      errors
    }
  };
};

// Exportar función para obtener estadísticas de paginación
export const getPaginationStats = () => paginationStats;

// Exportar todos los servicios
export default {
  // Core functions
  getChipaxToken,
  fetchFromChipaxWithRetry,
  fetchAllPaginatedData,
  fetchAllChipaxData,
  getPaginationStats,
  
  // Services
  Compras: ComprasService,
  Ventas: VentasService,
  DTEs: DTEService,
  Clientes: ClientesService,
  Proveedores: ProveedoresService,
  CuentasCorrientes: CuentasCorrientesService,
  KPIs: KPIService,
  Proyecciones: ProyeccionesService
};
