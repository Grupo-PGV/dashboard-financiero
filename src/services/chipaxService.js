// chipaxService.js - Servicio completo para integración con Chipax

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
    
    if (showLogs && data.paginationAttributes) {
      console.log('📄 Info de paginación:', data.paginationAttributes);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error en petición a ${endpoint}:`, error);
    throw error;
  }
};

export const fetchAllPaginatedData = async (baseEndpoint) => {
  console.log(`📊 Obteniendo datos paginados de ${baseEndpoint}...`);
  
  const firstPageData = await fetchFromChipax(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=1`);
  
  if (!firstPageData.paginationAttributes) {
    return firstPageData;
  }
  
  const totalPages = firstPageData.paginationAttributes.totalPages || 1;
  
  if (totalPages === 1) {
    return firstPageData;
  }
  
  // Cargar páginas restantes
  let allItems = [...(firstPageData.items || [])];
  
  for (let page = 2; page <= Math.min(totalPages, 10); page++) {
    try {
      const pageData = await fetchFromChipax(
        `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page}`,
        {},
        false
      );
      if (pageData.items) {
        allItems = [...allItems, ...pageData.items];
      }
    } catch (error) {
      console.error(`Error en página ${page}:`, error);
    }
  }
  
  return { items: allItems };
};

// Servicios específicos
export const IngresosService = {
  getFacturasVenta: async () => {
    console.log('📊 Obteniendo facturas de venta...');
    return await fetchAllPaginatedData('/ventas');
  }
};

export const BancoService = {
  getSaldosBancarios: async () => {
    console.log('🏦 Obteniendo saldos bancarios...');
    return await fetchFromChipax('/cuentas_corrientes');
  }
};

export const ReportesService = {
  getFlujoCaja: async () => {
    console.log('💰 Obteniendo flujo de caja...');
    return await fetchFromChipax('/flujo-caja/init');
  }
};

export const EgresosService = {
  getFacturasCompra: async () => {
    try {
      console.log('🛒 Obteniendo facturas de COMPRA...');
      
      // IMPORTANTE: Usar el endpoint correcto /compras
      const response = await fetchAllPaginatedData('/compras');
      
      console.log(`📊 Total facturas de compra: ${response.items?.length || 0}`);
      
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo facturas de compra:', error);
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
    return await fetchAllPaginatedData('/clientes');
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

// Funciones adicionales de compatibilidad
export const obtenerSaldosBancarios = async () => {
  return await BancoService.getSaldosBancarios();
};

export const obtenerCuentasPorCobrar = async () => {
  return await IngresosService.getFacturasVenta();
};

export const obtenerCuentasPorPagar = async () => {
  return await EgresosService.getFacturasCompra();
};

export const obtenerClientes = async () => {
  return await AjustesService.getClientes();
};

export const obtenerProveedores = async () => {
  console.log('🏭 Obteniendo proveedores...');
  return await fetchAllPaginatedData('/proveedores');
};

// Export default con todas las funciones y servicios
const chipaxService = {
  // Funciones principales
  getChipaxToken,
  fetchFromChipax,
  fetchAllChipaxData,
  fetchAllPaginatedData,
  
  // Servicios organizados
  Ingresos: IngresosService,
  Banco: BancoService,
  Reportes: ReportesService,
  Egresos: EgresosService,
  Ajustes: AjustesService,
  
  // Funciones de compatibilidad
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerProveedores
};

export default chipaxService;
