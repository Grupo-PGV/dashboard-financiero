// chipaxService.js - Versión corregida con manejo robusto de errores
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

let tokenCache = {
  token: null,
  expiresAt: null
};

// =====================================================
// FUNCIONES DE UTILIDAD PARA DEBUGGING
// =====================================================

const logError = (context, error, data = null) => {
  console.error(`❌ Error en ${context}:`, error);
  if (data) {
    console.error('📊 Datos relacionados:', data);
  }
};

const logSuccess = (context, data = null) => {
  console.log(`✅ ${context} exitoso`);
  if (data && typeof data === 'object') {
    if (data.items && Array.isArray(data.items)) {
      console.log(`📊 Items obtenidos: ${data.items.length}`);
    } else if (Array.isArray(data)) {
      console.log(`📊 Array obtenido: ${data.length} elementos`);
    } else {
      console.log('📊 Datos obtenidos:', typeof data);
    }
  }
};

// =====================================================
// FUNCIONES DE AUTENTICACIÓN
// =====================================================

export const getChipaxToken = async () => {
  const now = new Date();
  
  // Verificar si el token en cache sigue válido
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token en cache');
    return tokenCache.token;
  }

  try {
    console.log('🔑 Solicitando nuevo token a Chipax...');
    
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
      throw new Error('Respuesta inválida: no se recibió token');
    }

    // Actualizar cache
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    logSuccess('Autenticación');
    return tokenCache.token;
    
  } catch (error) {
    logError('getChipaxToken', error);
    // Limpiar cache en caso de error
    tokenCache = { token: null, expiresAt: null };
    throw new Error(`Error de autenticación: ${error.message}`);
  }
};

// =====================================================
// FUNCIÓN GENERAL PARA PETICIONES A CHIPAX
// =====================================================

export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    
    if (showLogs) {
      console.log(`🔍 Llamando a: ${endpoint}`);
    }
    
    const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (showLogs) {
      console.log(`📡 Respuesta de ${endpoint}: ${response.status}`);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Si es 404, devolver estructura vacía en lugar de error
      if (response.status === 404) {
        console.warn(`⚠️ Endpoint ${endpoint} no encontrado - devolviendo datos vacíos`);
        return { items: [] };
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (showLogs) {
      logSuccess(`Petición a ${endpoint}`, data);
    }
    
    return data;
    
  } catch (error) {
    logError(`fetchFromChipax(${endpoint})`, error);
    
    // En lugar de propagar el error, devolver estructura vacía
    // para evitar que la aplicación se rompa
    console.warn(`⚠️ Devolviendo datos vacíos para ${endpoint} debido a error`);
    return { items: [] };
  }
};

// =====================================================
// FUNCIONES PARA PAGINACIÓN ROBUSTA
// =====================================================

export const fetchAllPaginatedData = async (baseEndpoint) => {
  try {
    console.log(`📊 Iniciando carga paginada de ${baseEndpoint}...`);
    
    // Obtener primera página
    const firstPageData = await fetchFromChipax(
      `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=1`,
      {},
      false
    );
    
    // Verificar si hay paginación
    if (!firstPageData.items || !firstPageData.paginationAttributes) {
      console.log('📄 No hay paginación, devolviendo datos directos');
      return firstPageData;
    }
    
    const { totalPages, totalCount } = firstPageData.paginationAttributes;
    console.log(`📊 Total páginas: ${totalPages}, Total items: ${totalCount}`);
    
    // Si solo hay una página, devolverla directamente
    if (totalPages <= 1) {
      return firstPageData;
    }
    
    // Para múltiples páginas, usar carga secuencial para evitar problemas
    return await fetchSequentialPages(baseEndpoint, totalPages, firstPageData);
    
  } catch (error) {
    logError('fetchAllPaginatedData', error);
    return { items: [] };
  }
};

const fetchSequentialPages = async (baseEndpoint, totalPages, firstPageData = null) => {
  try {
    let allItems = firstPageData ? [...firstPageData.items] : [];
    const startPage = firstPageData ? 2 : 1;
    
    for (let page = startPage; page <= totalPages; page++) {
      console.log(`📄 Cargando página ${page}/${totalPages}...`);
      
      const endpoint = `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page}`;
      const pageData = await fetchFromChipax(endpoint, {}, false);
      
      if (pageData.items && Array.isArray(pageData.items)) {
        allItems = [...allItems, ...pageData.items];
        console.log(`✅ Página ${page}: ${pageData.items.length} items (Total: ${allItems.length})`);
      }
      
      // Pequeña pausa para evitar saturar la API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Carga paginada completa: ${allItems.length} items`);
    return { items: allItems };
    
  } catch (error) {
    logError('fetchSequentialPages', error);
    return { items: [] };
  }
};

// =====================================================
// SERVICIOS ESPECÍFICOS
// =====================================================

export const IngresosService = {
  getFacturasVenta: async () => {
    try {
      console.log('📊 Obteniendo facturas de venta...');
      const result = await fetchAllPaginatedData('/dtes?porCobrar=1');
      return result;
    } catch (error) {
      logError('IngresosService.getFacturasVenta', error);
      return { items: [] };
    }
  }
};

export const BancoService = {
  getSaldosBancarios: async () => {
    try {
      console.log('🏦 Obteniendo saldos bancarios...');
      const data = await fetchFromChipax('/flujo-caja/init');
      return data;
    } catch (error) {
      logError('BancoService.getSaldosBancarios', error);
      return { cuentasCorrientes: [], arrFlujoCaja: [] };
    }
  }
};

export const ReportesService = {
  getFlujoCaja: async () => {
    try {
      console.log('💰 Obteniendo flujo de caja...');
      const data = await fetchFromChipax('/flujo-caja/init');
      return data;
    } catch (error) {
      logError('ReportesService.getFlujoCaja', error);
      return { arrFlujoCaja: [] };
    }
  }
};

export const EgresosService = {
  getFacturasCompra: async () => {
    try {
      console.log('🛒 Obteniendo facturas de compra...');
      const response = await fetchFromChipax('/compras');
      
      if (!response || !response.items) {
        console.warn('⚠️ No se recibieron facturas de compra');
        return { items: [] };
      }
      
      console.log(`📊 Total facturas de compra: ${response.items.length}`);
      
      // Filtrar facturas pendientes de pago de manera segura
      const facturasPendientes = response.items.filter(factura => {
        try {
          // Verificaciones seguras para determinar si está pendiente
          const estaPagada = factura.pagada === true || 
                            factura.pagado === true || 
                            (factura.estado_pago && factura.estado_pago.toLowerCase() === 'pagado');
          
          const esAceptada = factura.estado === 'aceptado';
          
          return esAceptada && !estaPagada;
        } catch (err) {
          console.warn('⚠️ Error procesando factura:', factura.id, err);
          return false;
        }
      });
      
      console.log(`📊 Facturas pendientes de pago: ${facturasPendientes.length}`);
      
      return {
        ...response,
        items: facturasPendientes
      };
      
    } catch (error) {
      logError('EgresosService.getFacturasCompra', error);
      return { items: [] };
    }
  },
  
  getFacturasPendientesAprobacion: async () => {
    try {
      console.log('⏳ Obteniendo facturas pendientes de aprobación...');
      // Este endpoint podría no existir, devolver array vacío
      return [];
    } catch (error) {
      logError('EgresosService.getFacturasPendientesAprobacion', error);
      return [];
    }
  },
  
  getPagosProgramados: async () => {
    try {
      console.log('📅 Obteniendo pagos programados...');
      // Este endpoint podría no existir, devolver array vacío
      return [];
    } catch (error) {
      logError('EgresosService.getPagosProgramados', error);
      return [];
    }
  }
};

export const AjustesService = {
  getClientes: async () => {
    try {
      console.log('👥 Obteniendo clientes...');
      const data = await fetchFromChipax('/clientes');
      return data;
    } catch (error) {
      logError('AjustesService.getClientes', error);
      return { items: [] };
    }
  }
};

// =====================================================
// FUNCIÓN PRINCIPAL PARA CARGAR TODOS LOS DATOS
// =====================================================

export const fetchAllChipaxData = async (fechaInicio, fechaFin) => {
  console.log('🚀 Iniciando carga completa de datos de Chipax...');
  console.log(`📅 Rango: ${fechaInicio} - ${fechaFin}`);
  
  // Usar Promise.allSettled para que un error no afecte a los demás
  const results = await Promise.allSettled([
    BancoService.getSaldosBancarios(),
    IngresosService.getFacturasVenta(),
    EgresosService.getFacturasCompra(),
    ReportesService.getFlujoCaja(),
    AjustesService.getClientes()
  ]);

  console.log('📊 Resumen de resultados:');
  const labels = ['Saldos Bancarios', 'Facturas Venta', 'Facturas Compra', 'Flujo Caja', 'Clientes'];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      const count = data.items ? data.items.length : 
                   data.arrFlujoCaja ? data.arrFlujoCaja.length :
                   Array.isArray(data) ? data.length : 'objeto';
      console.log(`✅ ${labels[index]}: ${count} elementos`);
    } else {
      console.log(`❌ ${labels[index]}: Error - ${result.reason?.message}`);
    }
  });
  
  // Extraer valores con fallbacks seguros
  const [saldosResult, ventasResult, comprasResult, flujoResult, clientesResult] = results;
  
  const datosFinales = {
    saldosBancarios: saldosResult.status === 'fulfilled' ? saldosResult.value : { cuentasCorrientes: [], arrFlujoCaja: [] },
    facturasPorCobrar: ventasResult.status === 'fulfilled' ? ventasResult.value : { items: [] },
    facturasPorPagar: comprasResult.status === 'fulfilled' ? comprasResult.value : { items: [] },
    facturasPendientes: [], // No disponible por ahora
    flujoCaja: flujoResult.status === 'fulfilled' ? flujoResult.value : { arrFlujoCaja: [] },
    clientes: clientesResult.status === 'fulfilled' ? clientesResult.value : { items: [] },
    pagosProgramados: [] // No disponible por ahora
  };
  
  console.log('✅ Carga completa de datos finalizada');
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
  Ajustes: AjustesService
};
