// chipaxService.js - Configurado para Netlify
console.log('🚀 Inicializando chipaxService para Netlify...');

// Configuración con variables de entorno de Netlify
const CHIPAX_API_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID || '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY || 'f01974df-86e1-45a0-924f-75961ea926fc';

console.log('🔧 Configuración de Chipax:', {
  apiUrl: CHIPAX_API_URL,
  appId: APP_ID ? APP_ID.substring(0, 8) + '...' : 'No configurado',
  secretKey: SECRET_KEY ? SECRET_KEY.substring(0, 8) + '...' : 'No configurado'
});

// Cache del token para evitar múltiples llamadas
let tokenCache = {
  token: null,
  expiresAt: null
};

/**
 * Obtiene el token de acceso de Chipax
 * @returns {Promise<string>} Token de acceso
 */
export const getChipaxToken = async () => {
  const now = new Date();
  
  // Verificar si tenemos un token válido en cache
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🎯 Usando token en cache (válido hasta:', tokenCache.expiresAt.toLocaleString(), ')');
    return tokenCache.token;
  }

  console.log('🔑 Obteniendo nuevo token de Chipax...');
  
  try {
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
      console.error('❌ Error en login:', response.status, errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Token obtenido exitosamente');
    
    // Guardar en cache
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    console.log('💾 Token guardado en cache hasta:', tokenCache.expiresAt.toLocaleString());
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error completo obteniendo token:', error);
    // Limpiar cache en caso de error
    tokenCache = { token: null, expiresAt: null };
    throw error;
  }
};

/**
 * Realiza una petición autenticada a la API de Chipax
 * @param {string} endpoint - Endpoint de la API (sin el dominio base)
 * @param {object} options - Opciones de fetch
 * @param {boolean} showLogs - Si mostrar logs detallados
 * @returns {Promise<object>} Respuesta de la API
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    const fullUrl = `${CHIPAX_API_URL}${endpoint}`;
    
    if (showLogs) {
      console.log(`🌐 Petición a: ${endpoint}`);
    }
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (showLogs) {
      console.log(`📡 ${endpoint} - Status: ${response.status}`);
    }
    
    // Manejar diferentes tipos de errores
    if (!response.ok) {
      const errorText = await response.text();
      if (showLogs) {
        console.error(`❌ Error en ${endpoint}: ${response.status} - ${errorText}`);
      }
      
      // Si es 404, devolver estructura vacía en lugar de error
      if (response.status === 404) {
        console.warn(`⚠️ Endpoint ${endpoint} no encontrado, devolviendo datos vacíos`);
        return { items: [] };
      }
      
      // Si es 401, limpiar cache del token
      if (response.status === 401) {
        console.warn('🔐 Token expirado, limpiando cache');
        tokenCache = { token: null, expiresAt: null };
      }
      
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Log detallado solo si showLogs es true
    if (showLogs) {
      console.log(`📦 Datos recibidos de ${endpoint}:`, {
        tipo: typeof data,
        tieneItems: !!data.items,
        cantidadItems: data.items ? data.items.length : 'N/A',
        tienePaginacion: !!data.paginationAttributes
      });
    }
    
    return data;
    
  } catch (error) {
    if (showLogs) {
      console.error(`❌ Error en petición a ${endpoint}:`, error.message);
    }
    throw error;
  }
};

/**
 * Obtiene todos los datos paginados de un endpoint
 * @param {string} baseEndpoint - Endpoint base
 * @returns {Promise<object>} Todos los datos
 */
export const fetchAllPaginatedData = async (baseEndpoint) => {
  console.log(`📊 Obteniendo datos paginados de ${baseEndpoint}...`);
  
  try {
    // Obtener primera página para conocer la paginación
    const firstPageData = await fetchFromChipax(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=1`);
    
    // Si no hay paginación, devolver los datos directamente
    if (!firstPageData.items || !firstPageData.paginationAttributes) {
      console.log('📄 No hay paginación, devolviendo datos directos');
      return firstPageData;
    }
    
    const { totalPages, totalCount } = firstPageData.paginationAttributes;
    console.log(`📊 Encontradas ${totalPages} páginas con ${totalCount} items en total`);
    
    // Si solo hay una página, devolver directamente
    if (totalPages <= 1) {
      return firstPageData;
    }
    
    // Para múltiples páginas, obtener todas
    let allItems = [...firstPageData.items];
    
    const BATCH_SIZE = 5; // Páginas simultáneas para evitar sobrecarga
    
    for (let page = 2; page <= totalPages; page += BATCH_SIZE) {
      const batchPromises = [];
      const endPage = Math.min(page + BATCH_SIZE - 1, totalPages);
      
      console.log(`🔄 Obteniendo páginas ${page}-${endPage}...`);
      
      for (let p = page; p <= endPage; p++) {
        const endpoint = `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${p}`;
        batchPromises.push(fetchFromChipax(endpoint, {}, false));
      }
      
      try {
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.items) {
            allItems = [...allItems, ...result.items];
          }
        });
        
        console.log(`✅ Páginas ${page}-${endPage} completadas. Total items: ${allItems.length}`);
        
      } catch (batchError) {
        console.error(`❌ Error en lote de páginas ${page}-${endPage}:`, batchError);
        // Continuar con el siguiente lote
      }
    }
    
    console.log(`✅ Carga completa: ${allItems.length} items obtenidos`);
    return { 
      items: allItems,
      paginationAttributes: firstPageData.paginationAttributes
    };
    
  } catch (error) {
    console.error(`❌ Error obteniendo datos paginados de ${baseEndpoint}:`, error);
    return { items: [] };
  }
};

// Servicios específicos de cada módulo
export const IngresosService = {
  getFacturasVenta: async () => {
    console.log('📊 Obteniendo TODAS las facturas de venta...');
    try {
      return await fetchAllPaginatedData('/dtes?porCobrar=1');
    } catch (error) {
      console.error('❌ Error obteniendo facturas de venta:', error);
      return { items: [] };
    }
  },
};

export const BancoService = {
  getSaldosBancarios: async () => {
    console.log('🏦 Obteniendo saldos bancarios...');
    try {
      return await fetchFromChipax('/flujo-caja/init');
    } catch (error) {
      console.error('❌ Error obteniendo saldos bancarios:', error);
      return { cuentasCorrientes: [] };
    }
  }
};

export const ReportesService = {
  getFlujoCaja: async () => {
    console.log('💰 Obteniendo flujo de caja...');
    try {
      return await fetchFromChipax('/flujo-caja/init');
    } catch (error) {
      console.error('❌ Error obteniendo flujo de caja:', error);
      return {};
    }
  }
};

export const EgresosService = {
  getFacturasCompra: async () => {
    console.log('🛒 Obteniendo facturas de compra...');
    try {
      const response = await fetchFromChipax('/compras');
      
      if (!response || !response.items) {
        console.warn('⚠️ No se recibieron facturas de compra');
        return { items: [] };
      }
      
      console.log(`📊 Total de facturas de compra: ${response.items.length}`);
      
      // Filtrar facturas pendientes de pago
      const facturasPendientes = response.items.filter(factura => {
        const estaPagada = factura.pagada === true || 
                          factura.pagado === true || 
                          factura.estado_pago === 'pagado';
        
        return !estaPagada && (factura.estado === 'aceptado' || factura.estado === 'pendiente');
      });
      
      console.log(`✅ Facturas pendientes de pago: ${facturasPendientes.length}`);
      
      return {
        ...response,
        items: facturasPendientes
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo facturas de compra:', error);
      return { items: [] };
    }
  },
  
  getFacturasPendientesAprobacion: async () => {
    console.log('⏳ Facturas pendientes de aprobación no disponibles en API');
    return [];
  },
  
  getPagosProgramados: async () => {
    console.log('📅 Pagos programados no disponibles en API');
    return [];
  }
};

export const AjustesService = {
  getClientes: async () => {
    console.log('👥 Obteniendo clientes...');
    try {
      return await fetchFromChipax('/clientes');
    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error);
      return { items: [] };
    }
  }
};

/**
 * Carga todos los datos de Chipax en paralelo
 * @param {string} fechaInicio - Fecha de inicio (opcional)
 * @param {string} fechaFin - Fecha de fin (opcional)
 * @returns {Promise<object>} Todos los datos
 */
export const fetchAllChipaxData = async (fechaInicio, fechaFin) => {
  console.log('🚀 Iniciando carga completa de datos de Chipax...');
  console.log(`📅 Rango de fechas: ${fechaInicio} - ${fechaFin}`);
  
  try {
    // Ejecutar todas las peticiones en paralelo
    const [
      saldosResult,
      facturasVentaResult,
      facturasCompraResult,
      flujoResult,
      clientesResult
    ] = await Promise.allSettled([
      BancoService.getSaldosBancarios(),
      IngresosService.getFacturasVenta(),
      EgresosService.getFacturasCompra(),
      ReportesService.getFlujoCaja(),
      AjustesService.getClientes()
    ]);

    // Procesar resultados
    const results = {
      saldosBancarios: saldosResult.status === 'fulfilled' ? saldosResult.value : { cuentasCorrientes: [] },
      facturasPorCobrar: facturasVentaResult.status === 'fulfilled' ? facturasVentaResult.value : { items: [] },
      facturasPorPagar: facturasCompraResult.status === 'fulfilled' ? facturasCompraResult.value : { items: [] },
      facturasPendientes: [], // No disponible en API
      flujoCaja: flujoResult.status === 'fulfilled' ? flujoResult.value : {},
      clientes: clientesResult.status === 'fulfilled' ? clientesResult.value : { items: [] },
      pagosProgramados: [] // No disponible en API
    };

    // Log de resultados
    console.log('📊 Resumen de carga de datos:');
    Object.entries(results).forEach(([key, value]) => {
      const count = value.items ? value.items.length : 
                   value.cuentasCorrientes ? value.cuentasCorrientes.length :
                   typeof value === 'object' ? Object.keys(value).length : 1;
      console.log(`  ${key}: ${count} items`);
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Error en carga completa de datos:', error);
    throw error;
  }
};

// Función de prueba de conexión
export const testConnection = async () => {
  console.log('🧪 Probando conexión con Chipax...');
  try {
    const token = await getChipaxToken();
    console.log('✅ Conexión exitosa con Chipax');
    return { success: true, token: token.substring(0, 10) + '...' };
  } catch (error) {
    console.error('❌ Error en conexión:', error);
    return { success: false, error: error.message };
  }
};

// Exportación por defecto
export default {
  getChipaxToken,
  fetchFromChipax,
  fetchAllChipaxData,
  fetchAllPaginatedData,
  testConnection,
  Ingresos: IngresosService,
  Banco: BancoService,
  Reportes: ReportesService,
  Egresos: EgresosService,
  Ajustes: AjustesService
};

// Verificación inicial
console.log('✅ chipaxService inicializado correctamente');
