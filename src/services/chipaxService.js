// chipaxService.js - Servicio completo actualizado para integración con API de Chipax v2
// VERSIÓN CON INVESTIGACIÓN AUTOMÁTICA DE SALDOS BANCARIOS

// === CONFIGURACIÓN DE LA API ===
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';
const COMPANY_NAME = 'PGR Seguridad S.p.A';

// Cache del token para evitar múltiples autenticaciones
let tokenCache = {
  token: null,
  expiresAt: null,
  isRefreshing: false,
  lastFailedEndpoint: null,
  failureCount: 0
};

// Configuración de paginación optimizada
const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 3,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000,
  REQUEST_DELAY: 500,
  TIMEOUT: 30000,
  PAGE_SIZE: 50,
  MAX_AUTH_RETRIES: 3
};

// === FUNCIONES DE AUTENTICACIÓN ===

/**
 * Obtiene el token de autenticación de Chipax
 * @returns {Promise<string>} Token JWT
 */
export const getChipaxToken = async () => {
  const now = new Date();
  
  // Verificar si ya se está renovando el token
  if (tokenCache.isRefreshing) {
    console.log('🔄 Token refresh en progreso, esperando...');
    let attempts = 0;
    while (tokenCache.isRefreshing && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }
  
  // Verificar si el token en cache es válido
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token válido en cache');
    return tokenCache.token;
  }

  if (tokenCache.failureCount >= PAGINATION_CONFIG.MAX_AUTH_RETRIES) {
    throw new Error(`🚫 Demasiados fallos de autenticación (${tokenCache.failureCount}). Revisa credenciales.`);
  }

  tokenCache.isRefreshing = true;

  console.log('🔐 Obteniendo nuevo token de Chipax...');
  console.log('🔑 APP_ID:', APP_ID.substring(0, 8) + '...');
  
  try {
    const response = await fetch(`${CHIPAX_API_URL}/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Dashboard-PGR/1.0'
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
      tokenCache.failureCount++;
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa:', {
      message: data.message,
      empresa: data.nombre,
      tokenRecibido: !!data.token
    });

    // Guardar token en cache
    tokenCache.token = data.token;
    tokenCache.expiresAt = new Date(Date.now() + (50 * 60 * 1000)); // 50 minutos
    tokenCache.isRefreshing = false;
    tokenCache.failureCount = 0;

    return data.token;

  } catch (error) {
    tokenCache.isRefreshing = false;
    tokenCache.failureCount++;
    console.error('❌ Error completo en autenticación:', error);
    throw error;
  }
};

// === FUNCIÓN MEJORADA PARA OBTENER SALDOS BANCARIOS ===

/**
 * FUNCIÓN PRINCIPAL: Obtiene saldos bancarios con múltiples estrategias
 * Esta función intenta diferentes endpoints hasta encontrar saldos reales
 */
export const obtenerSaldosBancarios = async () => {
  console.log('🏦 INICIANDO OBTENCIÓN DE SALDOS BANCARIOS');
  console.log('📋 Probando múltiples estrategias...');
  
  // Lista de estrategias para obtener saldos (en orden de prioridad)
  const estrategias = [
    {
      nombre: 'Cuentas corrientes con parámetro incluirSaldos',
      endpoint: '/cuentas-corrientes?incluirSaldos=true',
      procesador: procesarCuentasCorrientes
    },
    {
      nombre: 'Cuentas corrientes con parámetro conSaldo',
      endpoint: '/cuentas-corrientes?conSaldo=1',
      procesador: procesarCuentasCorrientes
    },
    {
      nombre: 'Cuentas corrientes con campos específicos',
      endpoint: '/cuentas-corrientes?fields=*,saldo,saldoActual,saldoContable',
      procesador: procesarCuentasCorrientes
    },
    {
      nombre: 'Endpoint específico de saldos bancarios',
      endpoint: '/saldos-bancarios',
      procesador: procesarSaldosDirectos
    },
    {
      nombre: 'Endpoint general de saldos',
      endpoint: '/saldos',
      procesador: procesarSaldosDirectos
    },
    {
      nombre: 'Endpoint de bancos',
      endpoint: '/bancos',
      procesador: procesarBancos
    },
    {
      nombre: 'Saldos con fecha actual',
      endpoint: `/saldos?fecha=${new Date().toISOString().split('T')[0]}`,
      procesador: procesarSaldosDirectos
    },
    {
      nombre: 'Contabilidad - saldos',
      endpoint: '/contabilidad/saldos',
      procesador: procesarSaldosContabilidad
    },
    {
      nombre: 'Finanzas general',
      endpoint: '/finanzas',
      procesador: procesarFinanzas
    },
    {
      nombre: 'Tesorería',
      endpoint: '/tesoreria',
      procesador: procesarTesoreria
    }
  ];

  const token = await getChipaxToken();
  
  // Probar cada estrategia hasta encontrar saldos reales
  for (const estrategia of estrategias) {
    console.log(`\n🧪 Probando: ${estrategia.nombre}`);
    
    try {
      const response = await fetch(`${CHIPAX_API_URL}${estrategia.endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Datos recibidos de ${estrategia.endpoint}`);
        
        // Procesar datos con el procesador específico
        const saldosProcesados = estrategia.procesador(data);
        
        if (saldosProcesados && saldosProcesados.length > 0) {
          // Verificar si tenemos saldos reales (no todos en 0)
          const totalSaldos = saldosProcesados.reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
          
          if (totalSaldos !== 0) {
            console.log(`🎉 ¡Saldos encontrados! Total: ${totalSaldos.toLocaleString('es-CL')}`);
            console.log(`✅ Estrategia exitosa: ${estrategia.nombre}`);
            
            return {
              success: true,
              data: saldosProcesados,
              estrategiaUsada: estrategia.nombre,
              endpoint: estrategia.endpoint,
              totalSaldos: totalSaldos,
              cantidadCuentas: saldosProcesados.length
            };
          } else {
            console.log(`⚠️ Datos encontrados pero saldos en 0`);
          }
        } else {
          console.log(`⚠️ No se pudieron procesar los datos`);
        }
      } else {
        console.log(`❌ Error ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`❌ Error ejecutando estrategia: ${error.message}`);
    }
    
    // Pausa entre intentos
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Si llegamos aquí, no encontramos saldos reales
  console.log('🚫 No se encontraron saldos bancarios reales en ningún endpoint');
  
  // Como fallback, intentar el endpoint original con advertencia
  console.log('🔄 Usando endpoint original como fallback...');
  return await obtenerSaldosFallback(token);
};

// === PROCESADORES ESPECÍFICOS PARA CADA TIPO DE RESPUESTA ===

/**
 * Procesa respuestas del tipo cuentas-corrientes
 */
function procesarCuentasCorrientes(data) {
  if (!Array.isArray(data)) return [];
  
  return data.map(cuenta => ({
    id: cuenta.id,
    nombre: cuenta.numeroCuenta || cuenta.nombre || 'Cuenta sin número',
    banco: cuenta.banco || cuenta.Banco?.nombre || cuenta.TipoCuentaCorriente?.tipoCuenta || 'Banco no especificado',
    saldo: extraerSaldo(cuenta),
    moneda: cuenta.Moneda?.moneda || 'CLP',
    simboloMoneda: cuenta.Moneda?.simbolo || '$',
    tipo: cuenta.TipoCuentaCorriente?.nombreCorto || 'Cuenta Corriente',
    ultimaActualizacion: cuenta.fechaUltimaActualizacion || new Date().toISOString(),
    origenDatos: 'cuentas-corrientes'
  }));
}

/**
 * Procesa respuestas de endpoints de saldos directos
 */
function procesarSaldosDirectos(data) {
  if (!Array.isArray(data)) {
    // Si es un objeto, podría tener propiedades con arrays de saldos
    if (typeof data === 'object') {
      // Buscar arrays dentro del objeto
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0) {
          return procesarSaldosDirectos(value);
        }
      }
    }
    return [];
  }
  
  return data.map((item, index) => ({
    id: item.id || `saldo_${index}`,
    nombre: item.numeroCuenta || item.nombre || item.descripcion || `Cuenta ${index + 1}`,
    banco: item.banco || item.nombreBanco || item.entidad || 'Banco no especificado',
    saldo: extraerSaldo(item),
    moneda: item.moneda || 'CLP',
    simboloMoneda: item.simboloMoneda || '$',
    tipo: item.tipoCuenta || 'Cuenta',
    ultimaActualizacion: item.fecha || item.fechaActualizacion || new Date().toISOString(),
    origenDatos: 'saldos-directos'
  }));
}

/**
 * Procesa respuestas del endpoint de bancos
 */
function procesarBancos(data) {
  if (!Array.isArray(data)) return [];
  
  return data.flatMap(banco => {
    if (banco.cuentas && Array.isArray(banco.cuentas)) {
      return banco.cuentas.map(cuenta => ({
        id: cuenta.id,
        nombre: cuenta.numeroCuenta || cuenta.nombre,
        banco: banco.nombre || banco.banco,
        saldo: extraerSaldo(cuenta),
        moneda: cuenta.moneda || 'CLP',
        simboloMoneda: '$',
        tipo: cuenta.tipoCuenta || 'Cuenta',
        ultimaActualizacion: new Date().toISOString(),
        origenDatos: 'bancos'
      }));
    } else {
      // El banco mismo podría tener saldo
      return [{
        id: banco.id,
        nombre: banco.nombre || banco.banco,
        banco: banco.nombre || banco.banco,
        saldo: extraerSaldo(banco),
        moneda: 'CLP',
        simboloMoneda: '$',
        tipo: 'Banco',
        ultimaActualizacion: new Date().toISOString(),
        origenDatos: 'bancos'
      }];
    }
  }).filter(cuenta => cuenta.saldo !== 0);
}

/**
 * Procesa respuestas de contabilidad
 */
function procesarSaldosContabilidad(data) {
  if (!Array.isArray(data)) return [];
  
  // Filtrar solo cuentas que parezcan bancarias
  return data
    .filter(cuenta => {
      const nombre = (cuenta.nombre || cuenta.descripcion || '').toLowerCase();
      return nombre.includes('banco') || 
             nombre.includes('cuenta') || 
             nombre.includes('efectivo') ||
             nombre.includes('caja');
    })
    .map(cuenta => ({
      id: cuenta.id,
      nombre: cuenta.nombre || cuenta.descripcion,
      banco: extraerBanco(cuenta.nombre || cuenta.descripcion),
      saldo: extraerSaldo(cuenta),
      moneda: 'CLP',
      simboloMoneda: '$',
      tipo: 'Cuenta Contable',
      ultimaActualizacion: new Date().toISOString(),
      origenDatos: 'contabilidad'
    }));
}

/**
 * Procesa respuestas del endpoint de finanzas
 */
function procesarFinanzas(data) {
  console.log('📊 Procesando datos de finanzas:', data);
  
  if (!Array.isArray(data)) {
    // Si es un objeto, buscar propiedades que contengan saldos
    if (typeof data === 'object' && data !== null) {
      const saldos = [];
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number' && value !== 0) {
          saldos.push({
            id: `finanzas_${key}`,
            nombre: key,
            banco: 'Finanzas',
            saldo: value,
            moneda: 'CLP',
            simboloMoneda: '$',
            tipo: 'Cuenta Financiera',
            ultimaActualizacion: new Date().toISOString(),
            origenDatos: 'finanzas'
          });
        }
      }
      return saldos;
    }
    return [];
  }
  
  return data.map((item, index) => ({
    id: item.id || `finanzas_${index}`,
    nombre: item.nombre || item.descripcion || `Cuenta Financiera ${index + 1}`,
    banco: item.banco || 'Finanzas',
    saldo: extraerSaldo(item),
    moneda: 'CLP',
    simboloMoneda: '$',
    tipo: 'Cuenta Financiera',
    ultimaActualizacion: new Date().toISOString(),
    origenDatos: 'finanzas'
  }));
}

/**
 * Procesa respuestas del endpoint de tesorería
 */
function procesarTesoreria(data) {
  console.log('💰 Procesando datos de tesorería:', data);
  
  if (!Array.isArray(data)) {
    if (typeof data === 'object' && data !== null) {
      const saldos = [];
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number' && value !== 0) {
          saldos.push({
            id: `tesoreria_${key}`,
            nombre: key,
            banco: 'Tesorería',
            saldo: value,
            moneda: 'CLP',
            simboloMoneda: '$',
            tipo: 'Cuenta de Tesorería',
            ultimaActualizacion: new Date().toISOString(),
            origenDatos: 'tesoreria'
          });
        }
      }
      return saldos;
    }
    return [];
  }
  
  return data.map((item, index) => ({
    id: item.id || `tesoreria_${index}`,
    nombre: item.nombre || item.descripcion || `Cuenta Tesorería ${index + 1}`,
    banco: item.banco || 'Tesorería',
    saldo: extraerSaldo(item),
    moneda: 'CLP',
    simboloMoneda: '$',
    tipo: 'Cuenta de Tesorería',
    ultimaActualizacion: new Date().toISOString(),
    origenDatos: 'tesoreria'
  }));
}

// === FUNCIONES AUXILIARES ===

/**
 * Extrae el saldo de un objeto cuenta con múltiples estrategias
 */
function extraerSaldo(cuenta) {
  // Lista de campos posibles que podrían contener el saldo
  const camposSaldo = [
    'saldo', 'saldoActual', 'saldoContable', 'saldoDisponible',
    'balance', 'amount', 'monto', 'valor', 'total',
    'saldo_actual', 'saldo_contable', 'saldo_disponible'
  ];
  
  // Buscar en el nivel superior
  for (const campo of camposSaldo) {
    if (cuenta[campo] !== undefined && cuenta[campo] !== null) {
      const valor = parseFloat(cuenta[campo]);
      if (!isNaN(valor)) {
        return valor;
      }
    }
  }
  
  // Buscar en objetos anidados
  if (cuenta.Saldo) {
    for (const [key, value] of Object.entries(cuenta.Saldo)) {
      const valor = parseFloat(value);
      if (!isNaN(valor)) {
        return valor;
      }
    }
  }
  
  return 0;
}

/**
 * Extrae el nombre del banco de una descripción
 */
function extraerBanco(descripcion) {
  if (!descripcion) return 'Banco no especificado';
  
  const bancos = [
    'Banco de Chile', 'BCI', 'Santander', 'Estado', 'Scotiabank',
    'BBVA', 'Itaú', 'Security', 'Falabella', 'Ripley'
  ];
  
  for (const banco of bancos) {
    if (descripcion.toLowerCase().includes(banco.toLowerCase())) {
      return banco;
    }
  }
  
  return 'Banco no especificado';
}

/**
 * Función fallback que usa el endpoint original
 */
async function obtenerSaldosFallback(token) {
  console.log('🔄 Ejecutando estrategia fallback...');
  
  try {
    const response = await fetch(`${CHIPAX_API_URL}/cuentas-corrientes`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const saldosProcesados = procesarCuentasCorrientes(data);
      
      return {
        success: true,
        data: saldosProcesados,
        estrategiaUsada: 'Fallback - endpoint original',
        endpoint: '/cuentas-corrientes',
        totalSaldos: saldosProcesados.reduce((sum, cuenta) => sum + cuenta.saldo, 0),
        cantidadCuentas: saldosProcesados.length,
        warning: 'Usando endpoint original - saldos podrían estar en 0'
      };
    }
  } catch (error) {
    console.error('❌ Error en fallback:', error);
  }
  
  return {
    success: false,
    data: [],
    error: 'No se pudieron obtener saldos bancarios',
    estrategiaUsada: 'Ninguna exitosa'
  };
}

// === FUNCIONES EXISTENTES (MANTENER IGUALES) ===

/**
 * Obtiene DTEs (Documentos Tributarios Electrónicos) por cobrar
 */
export const obtenerDTEsPorCobrar = async () => {
  console.log('📋 Obteniendo DTEs por cobrar...');
  
  const token = await getChipaxToken();
  
  try {
    const allData = await fetchPaginatedData(
      token,
      '/dtes?porCobrar=1',
      'DTEs por cobrar'
    );

    if (allData.success) {
      console.log(`✅ DTEs por cobrar obtenidos: ${allData.data.length} facturas`);
      
      // Calcular totales para validación
      const totalMonto = allData.data.reduce((sum, dte) => sum + (dte.montoTotal || 0), 0);
      const totalSaldo = allData.data.reduce((sum, dte) => sum + (dte.Saldo?.saldoDeudor || 0), 0);
      
      console.log(`💰 Total monto: ${totalMonto.toLocaleString('es-CL')}`);
      console.log(`💳 Total saldo pendiente: ${totalSaldo.toLocaleString('es-CL')}`);
      
      return allData;
    }
    
    return allData;
    
  } catch (error) {
    console.error('❌ Error obteniendo DTEs por cobrar:', error);
    return { success: false, data: [], error: error.message };
  }
};

/**
 * Obtiene compras (cuentas por pagar)
 */
export const obtenerCompras = async () => {
  console.log('💸 Obteniendo compras...');
  
  const token = await getChipaxToken();
  
  try {
    const allData = await fetchPaginatedData(
      token,
      '/compras',
      'Compras'
    );

    if (allData.success) {
      console.log(`✅ Compras obtenidas: ${allData.data.length} documentos`);
      
      // Calcular totales para validación
      const totalMonto = allData.data.reduce((sum, compra) => sum + (compra.montoTotal || 0), 0);
      const totalSaldoPendiente = allData.data.reduce((sum, compra) => {
        return sum + (compra.Saldo?.saldo_acreedor || compra.Saldo?.saldoAcreedor || 0);
      }, 0);
      
      console.log(`💰 Total monto: ${totalMonto.toLocaleString('es-CL')}`);
      console.log(`💳 Total saldo pendiente: ${totalSaldoPendiente.toLocaleString('es-CL')}`);
      
      return allData;
    }
    
    return allData;
    
  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    return { success: false, data: [], error: error.message };
  }
};

/**
 * Obtiene clientes
 */
export const obtenerClientes = async () => {
  console.log('👥 Obteniendo clientes...');
  
  const token = await getChipaxToken();
  
  try {
    const allData = await fetchPaginatedData(
      token,
      '/clientes',
      'Clientes'
    );

    if (allData.success) {
      console.log(`✅ Clientes obtenidos: ${allData.data.length} clientes`);
      return allData;
    }
    
    return allData;
    
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    return { success: false, data: [], error: error.message };
  }
};

/**
 * Obtiene proveedores
 */
export const obtenerProveedores = async () => {
  console.log('🏭 Obteniendo proveedores...');
  
  const token = await getChipaxToken();
  
  try {
    const allData = await fetchPaginatedData(
      token,
      '/proveedores',
      'Proveedores'
    );

    if (allData.success) {
      console.log(`✅ Proveedores obtenidos: ${allData.data.length} proveedores`);
      return allData;
    }
    
    return allData;
    
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    return { success: false, data: [], error: error.message };
  }
};

// === FUNCIÓN DE PAGINACIÓN ===

/**
 * Función genérica para obtener datos paginados
 */
async function fetchPaginatedData(token, endpoint, entityName) {
  const allData = [];
  let currentPage = 1;
  const limit = PAGINATION_CONFIG.PAGE_SIZE;
  let hasMoreData = true;
  let totalPagesRequested = 0;
  let totalPagesLoaded = 0;
  let failedPages = [];

  console.log(`📊 Iniciando carga paginada de ${entityName}`);

  while (hasMoreData) {
    try {
      totalPagesRequested++;
      
      const url = `${CHIPAX_API_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&page=${currentPage}`;
      console.log(`📄 Cargando página ${currentPage} de ${entityName}...`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const pageData = await response.json();
      
      if (Array.isArray(pageData) && pageData.length > 0) {
        allData.push(...pageData);
        totalPagesLoaded++;
        console.log(`✅ Página ${currentPage}: ${pageData.length} items cargados`);
        
        // Si recibimos menos items que el límite, probablemente es la última página
        if (pageData.length < limit) {
          hasMoreData = false;
        } else {
          currentPage++;
        }
      } else {
        hasMoreData = false;
      }

      // Pausa entre requests
      await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));

    } catch (error) {
      console.error(`❌ Error en página ${currentPage}:`, error.message);
      failedPages.push(currentPage);
      
      if (failedPages.length >= 3) {
        console.log('🚫 Demasiados errores, deteniendo carga paginada');
        break;
      }
      
      currentPage++;
    }
  }

  const success = allData.length > 0;
  const completenessPercent = totalPagesRequested > 0 ? (totalPagesLoaded / totalPagesRequested) * 100 : 0;

  console.log(`📊 Resumen ${entityName}: ${allData.length} items, ${completenessPercent.toFixed(1)}% completitud`);

  return {
    success,
    data: allData,
    pagination: {
      totalPagesRequested,
      totalPagesLoaded,
      failedPages,
      completenessPercent,
      totalItemsLoaded: allData.length
    }
  };
}

// === FUNCIONES DE TESTING Y DEBUGGING ===

/**
 * Función para testing en desarrollo
 */
export const testearSaldosBancarios = async () => {
  console.log('🧪 INICIANDO PRUEBAS DE SALDOS BANCARIOS');
  const resultado = await obtenerSaldosBancarios();
  console.log('📊 Resultado de la prueba:', resultado);
  return resultado;
};

/**
 * Función para investigar todos los endpoints disponibles
 */
export const investigarEndpointsDisponibles = async () => {
  console.log('🔍 INVESTIGANDO ENDPOINTS DISPONIBLES');
  
  const endpointsAProbar = [
    '/cuentas-corrientes', '/saldos', '/bancos', '/finanzas', '/tesoreria',
    '/contabilidad', '/balance', '/estado-financiero', '/cartolas',
    '/movimientos-bancarios', '/dashboard', '/resumen-financiero'
  ];
  
  const token = await getChipaxToken();
  const resultados = [];
  
  for (const endpoint of endpointsAProbar) {
    try {
      const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      resultados.push({
        endpoint,
        status: response.status,
        existe: response.ok,
        tieneContenido: response.ok ? 'Por revisar' : 'No disponible'
      });
      
      console.log(`${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      
    } catch (error) {
      resultados.push({
        endpoint,
        status: 'Error',
        existe: false,
        error: error.message
      });
      console.log(`${endpoint}: Error - ${error.message}`);
    }
    
    // Pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return resultados;
};

// === EXPORTACIONES ===

export {
  obtenerCompras,
  obtenerDTEsPorCobrar,
  obtenerClientes,
  obtenerProveedores,
  fetchPaginatedData,
  investigarEndpointsDisponibles
};

export default chipaxService;
