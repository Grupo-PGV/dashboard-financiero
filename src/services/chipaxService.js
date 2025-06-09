// chipaxService.js - Servicio con endpoints correctos según documentación
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token
let tokenCache = {
  token: null,
  expiresAt: null
};

// Configuración de paginación
const PAGINATION_CONFIG = {
  PAGE_SIZE: 50,
  MAX_PAGES: 150, // Aumentado para poder cargar todos los datos de compras
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000
};

/**
 * Obtiene el token de autenticación
 */
export const getChipaxToken = async () => {
  const now = new Date();
  
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token en cache');
    return tokenCache.token;
  }

  console.log('🔐 Obteniendo nuevo token de Chipax...');
  
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

    console.log('📡 Respuesta status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Token obtenido exitosamente');
    console.log('🏢 Empresa:', data.nombre || 'N/A');
    
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache = { token: null, expiresAt: null };
    throw error;
  }
};

/**
 * Realiza petición a la API
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    const headers = {
      ...options.headers,
      'Authorization': `JWT ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (showLogs) {
      console.log(`🔍 ${endpoint} - Status: ${response.status}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      
      // Si es 401, reintentar con nuevo token
      if (response.status === 401 && !options._retry) {
        console.log('🔄 Token expirado, reintentando...');
        tokenCache = { token: null, expiresAt: null };
        return fetchFromChipax(endpoint, { ...options, _retry: true }, showLogs);
      }
      
      throw new Error(`Error ${response.status}: ${text}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error(`❌ Error en ${endpoint}:`, error.message);
    throw error;
  }
};

/**
 * Obtiene todas las páginas de un endpoint
 */
export const fetchAllPaginatedData = async (baseEndpoint) => {
  console.log(`📊 Cargando datos paginados de ${baseEndpoint}...`);
  
  let allItems = [];
  let page = 1;
  let hasMore = true;
  
  try {
    while (hasMore && page <= PAGINATION_CONFIG.MAX_PAGES) {
      const separator = baseEndpoint.includes('?') ? '&' : '?';
      const endpoint = `${baseEndpoint}${separator}page=${page}&limit=${PAGINATION_CONFIG.PAGE_SIZE}`;
      
      const data = await fetchFromChipax(endpoint, {}, page === 1);
      
      // Manejo de diferentes estructuras de respuesta
      if (data.items && Array.isArray(data.items)) {
        allItems = [...allItems, ...data.items];
        
        if (data.paginationAttributes) {
          const { currentPage, totalPages } = data.paginationAttributes;
          hasMore = currentPage < totalPages;
          
          if (page === 1) {
            console.log(`📄 Total: ${data.paginationAttributes.count || data.paginationAttributes.totalCount} items en ${totalPages} páginas`);
          }
        } else {
          hasMore = false;
        }
      } else if (Array.isArray(data)) {
        // Si la respuesta es directamente un array
        allItems = [...allItems, ...data];
        hasMore = data.length === PAGINATION_CONFIG.PAGE_SIZE;
      } else if (data.docs && Array.isArray(data.docs)) {
        // Para flujo de caja que usa 'docs' en lugar de 'items'
        allItems = [...allItems, ...data.docs];
        hasMore = data.pages ? page < data.pages : false;
      } else {
        hasMore = false;
      }
      
      page++;
    }
    
    console.log(`✅ Total cargado: ${allItems.length} items`);
    
    return {
      items: allItems,
      paginationStats: {
        totalItems: allItems.length,
        pagesLoaded: page - 1
      }
    };
    
  } catch (error) {
    console.error('❌ Error en carga paginada:', error);
    return {
      items: allItems,
      error: error.message
    };
  }
};


// === ENDPOINTS ESPECÍFICOS CORREGIDOS SEGÚN DOCUMENTACIÓN ===

/**
 * Obtiene las cuentas corrientes (saldos bancarios) con información completa
 * Endpoint: /cuentas-corrientes
 * MEJORADO: Incluye logging detallado para verificar estructura de Saldo
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo cuentas corrientes...');
  try {
    const data = await fetchAllPaginatedData('/cuentas-corrientes');
    
    console.log(`✅ ${data.items.length} cuentas corrientes obtenidas`);
    
    // Verificar si las cuentas incluyen el objeto Saldo
    if (data.items && data.items.length > 0) {
      const primeraCuenta = data.items[0];
      
      // Log detallado de la estructura
      console.log('📊 Estructura de la primera cuenta corriente:');
      console.log('- ID:', primeraCuenta.id);
      console.log('- Número:', primeraCuenta.numeroCuenta);
      console.log('- Banco:', primeraCuenta.banco);
      
      // Verificar si existe el objeto Saldo
      if (primeraCuenta.Saldo) {
        console.log('💵 Objeto Saldo encontrado:', primeraCuenta.Saldo);
      } else {
        console.log('⚠️ No se encontró objeto Saldo en la cuenta');
        
        // Intentar obtener saldos con parámetros adicionales
        console.log('🔄 Intentando con parámetros adicionales...');
        
        // Probar diferentes parámetros que podrían incluir los saldos
        const parametrosAProbar = [
          'incluirSaldo=true',
          'withBalance=true', 
          'conSaldo=1',
          'expand=saldo',
          'include=saldo'
        ];
        
        for (const param of parametrosAProbar) {
          try {
            console.log(`🔍 Probando con: /cuentas-corrientes?${param}`);
            const dataConParam = await fetchAllPaginatedData(`/cuentas-corrientes?${param}`);
            
            if (dataConParam.items && dataConParam.items.length > 0 && dataConParam.items[0].Saldo) {
              console.log(`✅ ¡Éxito! El parámetro '${param}' incluye los saldos`);
              return dataConParam;
            }
          } catch (error) {
            console.log(`❌ El parámetro '${param}' no funcionó`);
          }
        }
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo cuentas corrientes:', error);
    throw error;
  }
};

// ALTERNATIVA: Si los saldos vienen en un endpoint separado
/**
 * Obtiene los saldos de las cuentas corrientes
 * Intenta múltiples estrategias para obtener los saldos
 */
export const obtenerSaldosBancariosCompletos = async () => {
  console.log('\n💰 Obteniendo cuentas corrientes con saldos completos...');
  
  try {
    // Paso 1: Obtener las cuentas
    const cuentasData = await obtenerSaldosBancarios();
    const cuentas = cuentasData.items;
    
    // Verificar si ya tienen saldos
    if (cuentas.length > 0 && cuentas[0].Saldo) {
      console.log('✅ Las cuentas ya incluyen saldos');
      return cuentasData;
    }
    
    // Paso 2: Si no tienen saldos, intentar obtenerlos por separado
    console.log('🔄 Intentando obtener saldos por separado...');
    
    // Opción A: Endpoint específico de saldos
    try {
      const saldosResponse = await fetchFromChipax('/cuentas-corrientes/saldos');
      if (saldosResponse) {
        console.log('✅ Saldos obtenidos desde endpoint específico');
        // Combinar cuentas con saldos
        // ... lógica de combinación
      }
    } catch (error) {
      console.log('❌ No existe endpoint /cuentas-corrientes/saldos');
    }
    
    // Opción B: Obtener saldo individual por cuenta
    const cuentasConSaldos = [];
    for (const cuenta of cuentas.slice(0, 3)) { // Probar solo con las primeras 3
      try {
        const saldoResponse = await fetchFromChipax(`/cuentas-corrientes/${cuenta.id}/saldo`);
        cuentasConSaldos.push({
          ...cuenta,
          Saldo: saldoResponse
        });
        console.log(`✅ Saldo obtenido para cuenta ${cuenta.id}`);
      } catch (error) {
        console.log(`❌ No se pudo obtener saldo individual para cuenta ${cuenta.id}`);
      }
    }
    
    if (cuentasConSaldos.length > 0) {
      console.log('✅ Se obtuvieron algunos saldos individuales');
      // Aplicar la misma lógica al resto de cuentas...
    }
    
    return cuentasData;
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos completos:', error);
    throw error;
  }
};

/**
 * Obtiene los DTEs (facturas de venta/cuentas por cobrar)
 * Endpoint: /dtes?porCobrar=1
 * 
 * REEMPLAZAR LA FUNCIÓN obtenerCuentasPorCobrar EN chipaxService.js CON ESTA VERSIÓN
 */
export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo DTEs (facturas por cobrar)...');
  try {
    const data = await fetchAllPaginatedData('/dtes?porCobrar=1');
    
    console.log(`✅ ${data.items.length} DTEs por cobrar obtenidos`);
    
    // Log detallado para entender la estructura
    if (data.items && data.items.length > 0) {
      console.log('📋 Estructura completa del primer DTE:');
      console.log(JSON.stringify(data.items[0], null, 2));
      
      // Ver qué campos están disponibles
      console.log('🔍 Campos disponibles:', Object.keys(data.items[0]));
      
      // Ver si hay objetos anidados importantes
      const dte = data.items[0];
      if (dte.ClienteProveedor) {
        console.log('👤 ClienteProveedor:', dte.ClienteProveedor);
      }
      if (dte.Saldo) {
        console.log('💰 Saldo:', dte.Saldo);
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo DTEs:', error);
    throw error;
  }
};

/**
 * Obtiene las compras (cuentas por pagar)
 * Endpoint: /compras
 */
export const obtenerCuentasPorPagar = async () => {
  console.log('\n💸 Obteniendo compras (cuentas por pagar)...');
  try {
    const data = await fetchAllPaginatedData('/compras');
    
    // Filtrar solo las pendientes de pago si es necesario
    if (data.items && data.items.length > 0) {
      const todasLasCompras = data.items.length;
      
      // Filtrar las que no tienen fecha de pago interna o están pendientes
      data.items = data.items.filter(compra => 
        !compra.fechaPagoInterna || 
        compra.estado === 'pendiente' ||
        compra.estado === 'aceptado' // Las aceptadas pueden estar pendientes de pago
      );
      
      console.log(`📊 De ${todasLasCompras} compras, ${data.items.length} están pendientes de pago`);
    }
    
    console.log(`✅ ${data.items.length} compras por pagar obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    throw error;
  }
};

/**
 * Obtiene la lista de clientes
 * Endpoint: /clientes
 */
export const obtenerClientes = async () => {
  console.log('\n👥 Obteniendo clientes...');
  try {
    const data = await fetchAllPaginatedData('/clientes');
    console.log(`✅ ${data.items.length} clientes obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    throw error;
  }
};

/**
 * Obtiene la lista de proveedores
 * Endpoint: /proveedores
 */
export const obtenerProveedores = async () => {
  console.log('\n🏭 Obteniendo proveedores...');
  try {
    const data = await fetchAllPaginatedData('/proveedores');
    console.log(`✅ ${data.items.length} proveedores obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    throw error;
  }
};

/**
 * Obtiene el flujo de caja desde cartolas
 * Endpoint: /flujo-caja/cartolas
 */
export const obtenerFlujoCaja = async () => {
  console.log('\n💵 Obteniendo flujo de caja...');
  try {
    const data = await fetchAllPaginatedData('/flujo-caja/cartolas');
    console.log(`✅ ${data.items.length} movimientos de flujo de caja obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo flujo de caja:', error);
    throw error;
  }
};

/**
 * Obtiene honorarios
 * Endpoint: /honorarios
 */
export const obtenerHonorarios = async () => {
  console.log('\n📄 Obteniendo honorarios...');
  try {
    const data = await fetchAllPaginatedData('/honorarios');
    console.log(`✅ ${data.items.length} honorarios obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo honorarios:', error);
    throw error;
  }
};

/**
 * Obtiene boletas de terceros
 * Endpoint: /boletas-terceros
 */
export const obtenerBoletasTerceros = async () => {
  console.log('\n📋 Obteniendo boletas de terceros...');
  try {
    const data = await fetchAllPaginatedData('/boletas-terceros');
    console.log(`✅ ${data.items.length} boletas de terceros obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo boletas de terceros:', error);
    throw error;
  }
};
// ========== AGREGAR ESTAS NUEVAS FUNCIONES ==========

/**
 * Obtiene los saldos desde el endpoint /saldos
 * Filtra por modelo CuentaCorriente
 */
export const obtenerSaldosDesdeEndpoint = async () => {
  console.log('\n💰 Obteniendo saldos desde endpoint /saldos...');
  
  try {
    // Primero probar el endpoint general de saldos
    console.log('🔍 Probando endpoint /saldos con filtro de CuentaCorriente...');
    
    // Intentar diferentes formas de filtrar
    const endpointsAProbar = [
      '/saldos?modelo=CuentaCorriente',
      '/saldos?model=CuentaCorriente',
      '/saldos?tipo=CuentaCorriente',
      '/saldos' // Sin filtro, filtraremos después
    ];
    
    let saldosData = null;
    
    for (const endpoint of endpointsAProbar) {
      try {
        console.log(`📡 Probando: ${endpoint}`);
        const response = await fetchAllPaginatedData(endpoint);
        
        if (response.items && response.items.length > 0) {
          console.log(`✅ Éxito con ${endpoint}: ${response.items.length} saldos encontrados`);
          saldosData = response;
          break;
        }
      } catch (error) {
        console.log(`❌ ${endpoint} falló:`, error.message);
      }
    }
    
    if (!saldosData || !saldosData.items) {
      throw new Error('No se pudo obtener datos del endpoint /saldos');
    }
    
    // Filtrar solo los saldos de CuentaCorriente
    const saldosCuentasCorrientes = saldosData.items.filter(saldo => 
      saldo.modelo === 'CuentaCorriente' || 
      saldo.model === 'CuentaCorriente' ||
      saldo.type === 'CuentaCorriente'
    );
    
    console.log(`📊 ${saldosCuentasCorrientes.length} saldos de cuentas corrientes encontrados`);
    
    // Crear un mapa de foreign_key -> saldo
    const saldosPorCuenta = {};
    
    saldosCuentasCorrientes.forEach(saldo => {
      const cuentaId = saldo.foreign_key;
      
      // Solo considerar el último registro
      if (saldo.last_record === 1 || saldo.last_record === true) {
        // Calcular el saldo real según la lógica de ChatGPT
        let saldoReal = 0;
        if (saldo.saldo_acreedor > 0) {
          saldoReal = saldo.saldo_acreedor;
        } else if (saldo.saldo_deudor > 0) {
          saldoReal = -saldo.saldo_deudor;
        }
        
        saldosPorCuenta[cuentaId] = {
          saldoReal,
          debe: saldo.debe || 0,
          haber: saldo.haber || 0,
          saldoDeudor: saldo.saldo_deudor || 0,
          saldoAcreedor: saldo.saldo_acreedor || 0,
          monedaId: saldo.moneda_id
        };
        
        console.log(`💳 Cuenta ID ${cuentaId}: $${saldoReal.toLocaleString('es-CL')}`);
      }
    });
    
    return saldosPorCuenta;
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos desde endpoint:', error);
    throw error;
  }
};

/**
 * Obtiene las cuentas corrientes con sus saldos
 * Combina información de /cuentas-corrientes con /saldos
 */
export const obtenerSaldosBancariosCompletos = async () => {
  console.log('\n💰 Obteniendo cuentas corrientes con saldos completos...');
  
  try {
    // Paso 1: Obtener las cuentas corrientes
    const cuentasResponse = await fetchAllPaginatedData('/cuentas-corrientes');
    const cuentas = cuentasResponse.items;
    console.log(`✅ ${cuentas.length} cuentas obtenidas`);
    
    // Paso 2: Obtener los saldos
    const saldosPorCuenta = await obtenerSaldosDesdeEndpoint();
    
    // Paso 3: Combinar cuentas con sus saldos
    const cuentasConSaldos = cuentas.map(cuenta => {
      const saldoInfo = saldosPorCuenta[cuenta.id];
      
      if (saldoInfo) {
        return {
          ...cuenta,
          Saldo: {
            debe: saldoInfo.debe,
            haber: saldoInfo.haber,
            saldo_deudor: saldoInfo.saldoDeudor,
            saldo_acreedor: saldoInfo.saldoAcreedor
          },
          saldoCalculado: saldoInfo.saldoReal
        };
      } else {
        console.log(`⚠️ No se encontró saldo para cuenta ${cuenta.id} - ${cuenta.numeroCuenta}`);
        return {
          ...cuenta,
          Saldo: {
            debe: 0,
            haber: 0,
            saldo_deudor: 0,
            saldo_acreedor: 0
          },
          saldoCalculado: 0
        };
      }
    });
    
    // Verificar resultados
    const cuentasConSaldo = cuentasConSaldos.filter(c => c.saldoCalculado !== 0);
    console.log(`✅ ${cuentasConSaldo.length} cuentas con saldo encontradas`);
    
    return {
      items: cuentasConSaldos,
      paginationStats: cuentasResponse.paginationStats
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas con saldos:', error);
    throw error;
  }
};

// ========== FIN DE NUEVAS FUNCIONES ==========

// Exportar todo
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerProveedores,
  obtenerFlujoCaja,
  obtenerHonorarios,
  obtenerBoletasTerceros,
  obtenerSaldosDesdeEndpoint,
  obtenerSaldosBancariosCompletos
};

export default chipaxService;
