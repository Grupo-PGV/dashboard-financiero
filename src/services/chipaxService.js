// chipaxService.js
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
    
    // LOG DETALLADO solo si showLogs es true
    if (showLogs) {
      console.log(`📦 DATOS RECIBIDOS DE ${endpoint}:`);
      console.log('Tipo de dato:', typeof data);
      
      if (data.paginationAttributes) {
        console.log('📄 Info de paginación:', data.paginationAttributes);
      }
      
      if (data.items && Array.isArray(data.items)) {
        console.log(`📋 Items: ${data.items.length}`);
      }
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error en petición a ${endpoint}:`, error);
    throw error;
  }
};

// Función helper para obtener todos los items con paginación OPTIMIZADA
export const fetchAllPaginatedData = async (baseEndpoint) => {
  console.log(`📊 Obteniendo datos paginados de ${baseEndpoint}...`);
  
  // Primero obtenemos la primera página para conocer el total
  const firstPageData = await fetchFromChipax(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=1`);
  
  if (!firstPageData.items || !firstPageData.paginationAttributes) {
    console.log('No hay paginación, devolviendo datos directos');
    return firstPageData;
  }
  
  const { totalPages, totalCount } = firstPageData.paginationAttributes;
  console.log(`📊 Total de páginas: ${totalPages}, Total items: ${totalCount}`);
  
  // Si hay pocas páginas, usar el método secuencial
  if (totalPages <= 5) {
    return fetchSequentialPages(baseEndpoint, totalPages);
  }
  
  // Para muchas páginas, usar carga paralela
  return fetchParallelPages(baseEndpoint, totalPages, firstPageData);
};

// Carga secuencial para pocas páginas
const fetchSequentialPages = async (baseEndpoint, totalPages) => {
  let allItems = [];
  
  for (let page = 1; page <= totalPages; page++) {
    const endpoint = `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page}`;
    const data = await fetchFromChipax(endpoint, {}, false); // sin logs detallados
    
    if (data.items) {
      allItems = [...allItems, ...data.items];
      console.log(`📄 Página ${page}/${totalPages}: ${data.items.length} items (Total: ${allItems.length})`);
    }
  }
  
  return { items: allItems };
};

// Carga paralela para muchas páginas
const fetchParallelPages = async (baseEndpoint, totalPages, firstPageData = null) => {
  const BATCH_SIZE = 10; // Número de páginas a cargar en paralelo
  let allItems = firstPageData ? [...firstPageData.items] : [];
  
  // Dividir las páginas en lotes
  const startPage = firstPageData ? 2 : 1; // Si ya tenemos la primera página, empezar desde la 2
  const batches = [];
  
  for (let i = startPage; i <= totalPages; i += BATCH_SIZE) {
    const batch = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, totalPages + 1); j++) {
      batch.push(j);
    }
    batches.push(batch);
  }
  
  console.log(`📦 Cargando ${totalPages} páginas en ${batches.length} lotes de ${BATCH_SIZE} páginas cada uno`);
  
  // Procesar cada lote
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`🔄 Procesando lote ${batchIndex + 1}/${batches.length} (páginas ${batch[0]}-${batch[batch.length - 1]})`);
    
    try {
      // Cargar todas las páginas del lote en paralelo
      const batchPromises = batch.map(page => {
        const endpoint = `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page}`;
        return fetchFromChipax(endpoint, {}, false); // sin logs detallados
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Combinar los resultados
      let batchItems = [];
      batchResults.forEach((data, index) => {
        if (data.items) {
          batchItems = [...batchItems, ...data.items];
        }
      });
      
      allItems = [...allItems, ...batchItems];
      console.log(`✅ Lote ${batchIndex + 1} completado: ${batchItems.length} items (Total acumulado: ${allItems.length})`);
      
    } catch (error) {
      console.error(`Error en lote ${batchIndex + 1}:`, error);
      // Continuar con el siguiente lote
    }
  }
  
  console.log(`✅ Carga completa: ${allItems.length} items obtenidos`);
  return { items: allItems };
};

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
  getFacturasCompra: async () => {
    try {
      console.log('🛒 Obteniendo facturas de compra pendientes de pago...');
      
      // Obtener todas las facturas
      const response = await fetchFromChipax('/compras');
      
      if (!response || !response.items) {
        console.warn('No se recibieron facturas de compra');
        return { items: [] };
      }
      
      console.log(`📊 Total de facturas recibidas: ${response.items.length}`);
      
      // Debugging: ver estructura de una factura
      if (response.items.length > 0) {
        console.log('📄 Estructura de una factura de ejemplo:', JSON.stringify(response.items[0], null, 2));
        
        // Analizar campos relevantes
        const primerFactura = response.items[0];
        console.log('🔍 Campos relevantes de la primera factura:');
        console.log('- estado:', primerFactura.estado);
        console.log('- estado_pago:', primerFactura.estado_pago);
        console.log('- pagado:', primerFactura.pagado);
        console.log('- pagada:', primerFactura.pagada);
        console.log('- fechaPagoInterna:', primerFactura.fechaPagoInterna);
        console.log('- saldo:', primerFactura.saldo);
        console.log('- monto_por_pagar:', primerFactura.monto_por_pagar);
        console.log('- total:', primerFactura.total);
        console.log('- monto_pagado:', primerFactura.monto_pagado);
      }
      
      // Filtrar facturas - criterio más flexible
      // NOTA: Como no tenemos un campo claro que indique si está pagada,
      // vamos a asumir que TODAS las facturas con estado "aceptado" son pendientes
      // a menos que tengan un campo específico que indique lo contrario
      const facturasPendientesPago = response.items.filter(factura => {
        // Determinar si la factura está pagada
        const estaPagada = factura.pagada === true || 
                          factura.pagado === true || 
                          factura.estado_pago === 'pagado' ||
                          factura.estado_pago === 'Pagado';
        
        // Verificar si tiene saldo explícito
        const tieneSaldoExplicito = factura.saldo > 0 || factura.monto_por_pagar > 0;
        
        // Si no hay campos de saldo, usar el estado
        const estadoPendiente = factura.estado === 'aceptado' || 
                              factura.estado === 'pendiente' ||
                              factura.estado_pago === 'pendiente';
        
        // La factura está pendiente si NO está pagada Y (tiene saldo O está en estado pendiente)
        return !estaPagada && (tieneSaldoExplicito || estadoPendiente);
      });
      
      console.log(`✅ Facturas de compra totales: ${response.items.length}`);
      console.log(`📊 Facturas pendientes de pago: ${facturasPendientesPago.length}`);
      
      // Mostrar resumen de estados
      const estadosCount = {};
      response.items.forEach(f => {
        const estado = f.estado || 'sin_estado';
        estadosCount[estado] = (estadosCount[estado] || 0) + 1;
      });
      console.log('📈 Distribución de estados:', estadosCount);
      
      // Si no hay facturas filtradas, usar todas las facturas aceptadas como temporal
      if (facturasPendientesPago.length === 0) {
        console.log('⚠️ No se encontraron facturas con los criterios. Usando facturas aceptadas...');
        const facturasAceptadas = response.items.filter(f => f.estado === 'aceptado');
        console.log(`📊 Facturas aceptadas: ${facturasAceptadas.length}`);
        return {
          ...response,
          items: facturasAceptadas
        };
      }
      
      return {
        ...response,
        items: facturasPendientesPago
      };
    } catch (error) {
      console.error('Error obteniendo facturas por pagar:', error);
      return { items: [] };
    }
  },
  
  getFacturasPendientesAprobacion: async () => {
    console.log('⏳ No hay endpoint para facturas pendientes de aprobación');
    return [];
  },
  
  getPagosProgramados: async () => {
    console.log('📅 No hay endpoint para pagos programados');
    return [];
  }
};

export const AjustesService = {
  getClientes: async () => {
    console.log('👥 Obteniendo clientes...');
    const data = await fetchFromChipax('/clientes');
    return data;
  }
};

export const fetchAllChipaxData = async (fechaInicio, fechaFin) => {
  console.log('🚀 Iniciando carga de todos los datos de Chipax...');
  console.log(`📅 Rango de fechas: ${fechaInicio} - ${fechaFin}`);
  
  const results = await Promise.allSettled([
    BancoService.getSaldosBancarios(),
    IngresosService.getFacturasVenta(),
    EgresosService.getFacturasCompra(),
    ReportesService.getFlujoCaja(),
    AjustesService.getClientes()
  ]);

  console.log('📊 Resultados de todas las peticiones:');
  results.forEach((result, index) => {
    const names = ['Saldos', 'Facturas Venta', 'Facturas Compra', 'Flujo Caja', 'Clientes'];
    console.log(`${names[index]}: ${result.status}`, 
      result.value ? `✅ (${result.value.items ? result.value.items.length + ' items' : typeof result.value})` : '❌'
    );
  });
  
  const [saldos, cobradas, pagar, flujo, clientes] = results;
  
  return {
    saldosBancarios: saldos.value || { cuentasCorrientes: [] },
    facturasPorCobrar: cobradas.value || { items: [] },
    facturasPorPagar: pagar.value || { items: [] },
    facturasPendientes: [],
    flujoCaja: flujo.value || {},
    clientes: clientes.value || [],
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






// CommonJS exports para compatibilidad
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getChipaxToken,
    fetchFromChipax,
    fetchAllChipaxData,
    Ingresos: IngresosService,
    Banco: BancoService,
    Reportes: ReportesService,
    Egresos: EgresosService,
    Ajustes: AjustesService
  };
}

