// chipaxService.js
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
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
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    return tokenCache.token;
  } catch (error) {
    console.error('Error obteniendo token:', error);
    throw error;
  }
};

export const fetchFromChipax = async (endpoint, options = {}) => {
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

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 404) return { items: [] };
      throw new Error(`Error ${response.status}: ${text}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error en petición a ${endpoint}:`, error);
    throw error;
  }
};

export const IngresosService = {
  getFacturasVenta: async () => fetchFromChipax('/dtes?porcobrar=true'),
};

export const BancoService = {
  getSaldosBancarios: async () => fetchFromChipax('/cuentas-corrientes')
};

export const ReportesService = {
  getFlujoCaja: async () => fetchFromChipax('/flujo-caja/init')
};

export const EgresosService = {
  getFacturasCompra: async () => fetchFromChipax('/compras'),
  getFacturasPendientesAprobacion: async () => {
    try {
      return await fetchFromChipax('/compras/facturas-por-aprobar');
    } catch {
      try {
        return await fetchFromChipax('/compras/pendientes-aprobacion');
      } catch {
        return { items: [] };
      }
    }
  },
  getPagosProgramados: async (fechaInicio = '', fechaFin = '') => {
    try {
      return await fetchFromChipax(`/flujo-caja/cartolas?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
    } catch {
      return { items: [] };
    }
  }
};

export const AjustesService = {
  getClientes: async () => fetchFromChipax('/clientes')
};

export const fetchAllChipaxData = async (fechaInicio, fechaFin) => {
  const results = await Promise.allSettled([
    BancoService.getSaldosBancarios(),
    IngresosService.getFacturasVenta(),
    EgresosService.getFacturasCompra(),
    EgresosService.getFacturasPendientesAprobacion(),
    ReportesService.getFlujoCaja(),
    AjustesService.getClientes(),
    EgresosService.getPagosProgramados(fechaInicio, fechaFin)
  ]);

  const [saldos, cobradas, pagar, pendientes, flujo, clientes, pagos] = results;
  return {
    saldosBancarios: saldos.value || { items: [] },
    facturasPorCobrar: cobradas.value || { items: [] },
    facturasPorPagar: pagar.value || { items: [] },
    facturasPendientes: pendientes.value || { items: [] },
    flujoCaja: flujo.value || { items: [] },
    clientes: clientes.value || { items: [] },
    pagosProgramados: pagos.value || { items: [] }
  };
};

export default {
  getChipaxToken,
  fetchFromChipax,
  fetchAllChipaxData,
  Ingresos: IngresosService,
  Banco: BancoService,
  Reportes: ReportesService,
  Egresos: EgresosService,
  Ajustes: AjustesService
};
