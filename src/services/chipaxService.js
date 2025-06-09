// chipaxService.js - Servicio completo para integración con API de Chipax
// VERSIÓN ACTUALIZADA CON SOPORTE PARA SALDOS INICIALES 2025

import { calcularSaldosActualesCorrectos, verificarTotalConChipax } from './chipaxSaldosService';

// === CONFIGURACIÓN DE LA API ===
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';
const COMPANY_NAME = 'PGR Seguridad S.p.A';

// Cache del token para evitar múltiples autenticaciones
let tokenCache = {
  token: null,
  expiresAt: null
};

// Configuración de paginación optimizada
const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 5,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 500,
  REQUEST_DELAY: 100,
  TIMEOUT: 15000,
  PAGE_SIZE: 100
};

// === FUNCIONES DE AUTENTICACIÓN ===

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
  console.log('🔑 APP_ID:', APP_ID.substring(0, 8) + '...');
  
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
    console.log('📍 URL utilizada:', `${CHIPAX_API_URL}/login`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa:', {
      message: data.message,
      empresa: data.nombre,
      tokenRecibido: !!data.token
    });
    
    // Guardar token en cache
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000)
    };
    
    console.log('✅ Token obtenido exitosamente');
    console.log('⏰ Expira:', tokenCache.expiresAt.toLocaleString());
    
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache = { token: null, expiresAt: null };
    throw error;
  }
};

/**
 * Realiza petición a la API de Chipax
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} options - Opciones adicionales
 * @param {boolean} showLogs - Mostrar logs detallados
 * @returns {Promise<Object>} Respuesta de la API
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    const token = await getChipaxToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    if (showLogs) {
      console.log(`🌐 Petición a: ${url}`);
    }

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      ...options
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGINATION_CONFIG.TIMEOUT);

    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (showLogs) {
      console.log(`📊 Status: ${response.status}`);
    }

    if (response.status === 401) {
      console.log('🔄 Token expirado, renovando...');
      tokenCache = { token: null, expiresAt: null };
      return await fetchFromChipax(endpoint, options, showLogs);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (showLogs) {
      console.log(`✅ Datos recibidos exitosamente`);
    }

    return data;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout: La petición a ${endpoint} tardó más de ${PAGINATION_CONFIG.TIMEOUT}ms`);
    }
    console.error(`❌ Error en petición a ${endpoint}:`, error);
    throw error;
  }
};

// === FUNCIONES DE PAGINACIÓN ===

/**
 * Carga todos los datos paginados de un endpoint
 * @param {string} endpoint - Endpoint a consultar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Datos completos con estadísticas de paginación
 */
export const fetchAllPaginatedData = async (endpoint, options = {}) => {
  console.log(`\n📄 Iniciando carga paginada de: ${endpoint}`);
  
  const startTime = new Date();
  let allItems = [];
  let currentPage = 1;
  let totalItems = 0;
  let totalPages = 0;
  let hasMore = true;
  
  // Estadísticas de paginación
  const paginationStats = {
    endpoint,
    startTime,
    endTime: null,
    totalItems: 0,
    loadedItems: 0,
    totalPages: 0,
    loadedPages: 0,
    failedPages: [],
    completenessPercent: 0,
    avgItemsPerPage: 0,
    duration: 0
  };

  try {
    while (hasMore && currentPage <= 150) { // Límite de seguridad
      try {
        const pageEndpoint = endpoint.includes('?') 
          ? `${endpoint}&page=${currentPage}&per_page=${PAGINATION_CONFIG.PAGE_SIZE}`
          : `${endpoint}?page=${currentPage}&per_page=${PAGINATION_CONFIG.PAGE_SIZE}`;

        console.log(`📄 Cargando página ${currentPage}...`);
        
        const data = await fetchFromChipax(pageEndpoint, options, false);
        
        if (data && data.data && Array.isArray(data.data)) {
          // Estructura estándar de Chipax
          allItems.push(...data.data);
          
          if (currentPage === 1) {
            totalItems = data.total || data.data.length;
            totalPages = data.last_page || Math.ceil(totalItems / PAGINATION_CONFIG.PAGE_SIZE);
            paginationStats.totalItems = totalItems;
            paginationStats.totalPages = totalPages;
          }
          
          hasMore = data.current_page < data.last_page;
          
          console.log(`✅ Página ${currentPage}: ${data.data.length} items (${allItems.length}/${totalItems})`);
          
        } else if (data && Array.isArray(data)) {
          // Estructura alternativa
          allItems.push(...data);
          hasMore = data.length === PAGINATION_CONFIG.PAGE_SIZE;
          
          console.log(`✅ Página ${currentPage}: ${data.length} items`);
          
        } else {
          console.log(`⚠️ Estructura inesperada en página ${currentPage}:`, data);
          hasMore = false;
        }
        
        paginationStats.loadedPages = currentPage;
        paginationStats.loadedItems = allItems.length;
        
      } catch (pageError) {
        console.error(`❌ Error en página ${currentPage}:`, pageError.message);
        paginationStats.failedPages.push(currentPage);
        
        if (paginationStats.failedPages.length >= 3) {
          console.log('🛑 Demasiados errores, deteniendo carga');
          break;
        }
      }
      
      currentPage++;
      
      // Pequeña pausa entre peticiones
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));
      }
    }
    
  } catch (error) {
    console.error('❌ Error general en carga paginada:', error);
    paginationStats.error = error.message;
  }
  
  // Calcular estadísticas finales
  paginationStats.endTime = new Date();
  paginationStats.duration = (paginationStats.endTime - paginationStats.startTime) / 1000;
  paginationStats.completenessPercent = paginationStats.totalItems > 0 
    ? (paginationStats.loadedItems / paginationStats.totalItems) * 100 
    : 100;
  paginationStats.avgItemsPerPage = paginationStats.loadedPages > 0 
    ? paginationStats.loadedItems / paginationStats.loadedPages 
    : 0;

  console.log(`\n📊 RESUMEN DE CARGA PAGINADA:`);
  console.log(`📄 Endpoint: ${endpoint}`);
  console.log(`📦 Items cargados: ${paginationStats.loadedItems}/${paginationStats.totalItems || 'N/A'}`);
  console.log(`📄 Páginas cargadas: ${paginationStats.loadedPages}/${paginationStats.totalPages || 'N/A'}`);
  console.log(`⏱️ Duración: ${paginationStats.duration.toFixed(2)} segundos`);
  console.log(`✅ Completitud: ${paginationStats.completenessPercent.toFixed(1)}%`);
  
  if (paginationStats.failedPages.length > 0) {
    console.log(`⚠️ Páginas fallidas: ${paginationStats.failedPages.join(', ')}`);
  }

  return {
    items: allItems,
    paginationStats
  };
};

// === FUNCIONES ESPECÍFICAS DE ENDPOINTS ===

/**
 * VERSIÓN NUEVA: Obtiene saldos bancarios usando saldos iniciales + movimientos 2025
 * Reemplaza la función anterior que tenía problemas de precisión
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo saldos bancarios con saldos iniciales...');
  
  try {
    // PASO 1: Leer el archivo de saldos iniciales
    let contenidoSaldosIniciales;
    
    try {
      // Intentar leer el archivo TXT de saldos iniciales
      contenidoSaldosIniciales = await window.fs.readFile('saldos_iniciales_2025.txt', { encoding: 'utf8' });
      console.log('📁 Archivo de saldos iniciales leído correctamente');
    } catch (error) {
      console.warn('⚠️ No se pudo leer el archivo de saldos iniciales, usando contenido por defecto');
      
      // Contenido por defecto basado en tu TXT
      contenidoSaldosIniciales = `BCI
cte cte:89107021
$178.098
Saldo al 31 de diciembre 2024

chipax_wallet
cte cte: 0000000803
$0
Saldo al 31 de diciembre 2024

generico
cte cte: 9117726
$0
Saldo al 31 de diciembre 2024

banconexion2
cte cte: 00-800-10734-09
$129.969.864
Saldo al 31 de diciembre 2024

santander
cte cte: 0-000-7066661-8
$0
Saldo al 31 de diciembre 2024`;
    }
    
    // PASO 2: Calcular saldos actuales correctos
    const resultado = await calcularSaldosActualesCorrectos(contenidoSaldosIniciales);
    
    console.log(`✅ ${resultado.saldosBancarios.length} cuentas procesadas con nuevo método`);
    console.log(`💰 Total calculado: $${resultado.totalSaldos.toLocaleString('es-CL')}`);
    
    // PASO 3: Verificar que el total sea correcto
    const verificacion = verificarTotalConChipax(resultado.totalSaldos);
    
    if (verificacion.esCorrectoTotal) {
      console.log('🎉 ¡ÉXITO! El total calculado coincide con Chipax');
    } else {
      console.warn('⚠️ El total calculado no coincide exactamente con Chipax');
      console.warn('📋 Revisar saldos iniciales o lógica de movimientos');
    }
    
    // Retornar en formato compatible con el dashboard
    return {
      items: resultado.saldosBancarios,
      detalleCalculo: resultado.detalleCalculo,
      verificacion,
      paginationStats: {
        totalItems: resultado.saldosBancarios.length,
        loadedItems: resultado.saldosBancarios.length,
        completenessPercent: 100,
        loadedPages: 1,
        totalPages: 1,
        failedPages: [],
        duration: 0
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    
    // FALLBACK: Si falla el nuevo método, usar el método anterior
    console.log('🔄 Intentando con método fallback...');
    return await obtenerSaldosBancariosLegacy();
  }
};

/**
 * FUNCIÓN LEGACY: Método anterior como respaldo
 * Mantener por si el nuevo método falla
 */
export const obtenerSaldosBancariosLegacy = async () => {
  console.log('\n💰 Obteniendo cuentas corrientes (método legacy)...');
  try {
    const data = await fetchAllPaginatedData('/cuentas-corrientes');
    
    console.log(`✅ ${data.items.length} cuentas corrientes obtenidas`);
    
    // Loggear estructura de la primera cuenta para debugging
    if (data.items.length > 0) {
      console.log('🔍 Estructura de la primera cuenta corriente:', JSON.stringify(data.items[0], null, 2));
    }
    
    // Calcular saldos desde flujo de caja
    console.log('🔄 Calculando saldos desde flujo de caja...');
    
    try {
      const saldosPorCuenta = await obtenerSaldosDesdeFlujoCaja();
      
      // Combinar cuentas con saldos calculados
      data.items = data.items.map(cuenta => {
        const saldoInfo = saldosPorCuenta[cuenta.id];
        
        if (saldoInfo) {
          console.log(`✅ Saldo encontrado para cuenta ${cuenta.numeroCuenta || cuenta.id}: $${saldoInfo.saldo.toLocaleString('es-CL')}`);
          
          return {
            ...cuenta,
            // Crear objeto Saldo compatible con el formato esperado
            Saldo: {
              debe: saldoInfo.egresos,
              haber: saldoInfo.ingresos,
              saldo_deudor: saldoInfo.saldo > 0 ? saldoInfo.saldo : 0,
              saldo_acreedor: saldoInfo.saldo < 0 ? Math.abs(saldoInfo.saldo) : 0
            },
            saldoCalculado: saldoInfo.saldo,
            totalMovimientos: saldoInfo.movimientos
          };
        } else {
          console.warn(`⚠️ No se encontró saldo para cuenta ${cuenta.numeroCuenta || cuenta.id}`);
          return cuenta;
        }
      });
      
    } catch (saldoError) {
      console.warn('⚠️ Error calculando saldos desde flujo de caja:', saldoError);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas corrientes:', error);
    throw error;
  }
};

/**
 * Obtiene los saldos bancarios desde el flujo de caja
 * Como el endpoint /saldos no existe, calculamos los saldos desde los movimientos
 */
export const obtenerSaldosDesdeFlujoCaja = async () => {
  console.log('\n💰 Calculando saldos desde flujo de caja...');
  
  try {
    // Obtener todos los movimientos del flujo de caja
    const flujoResponse = await fetchAllPaginatedData('/flujo-caja/cartolas');
    const movimientos = flujoResponse.items;
    console.log(`📊 ${movimientos.length} movimientos encontrados`);
    
    // Loggear estructura del primer movimiento para debugging
    if (movimientos.length > 0) {
      console.log('🔍 Estructura del primer movimiento:', JSON.stringify(movimientos[0], null, 2));
    }
    
    // Agrupar movimientos por cuenta corriente
    const saldosPorCuenta = {};
    
    movimientos.forEach(mov => {
      // Verificar diferentes nombres de campo para cuenta
      const cuentaId = mov.cuenta_corriente_id || mov.cuentaCorrienteId || mov.cuenta_id;
      
      if (cuentaId) {
        if (!saldosPorCuenta[cuentaId]) {
          saldosPorCuenta[cuentaId] = {
            saldo: 0,
            ingresos: 0,
            egresos: 0,
            movimientos: 0
          };
        }
        
        // Procesar saldos del movimiento
        if (mov.Saldos && Array.isArray(mov.Saldos)) {
          mov.Saldos.forEach(saldo => {
            if (saldo.last_record === 1) { // Solo el último registro
              const debe = saldo.debe || 0;
              const haber = saldo.haber || 0;
              const saldoDeudor = saldo.saldo_deudor || 0;
              const saldoAcreedor = saldo.saldo_acreedor || 0;
              
              saldosPorCuenta[cuentaId].ingresos += haber;
              saldosPorCuenta[cuentaId].egresos += debe;
              saldosPorCuenta[cuentaId].saldo = saldoDeudor - saldoAcreedor;
              saldosPorCuenta[cuentaId].movimientos++;
            }
          });
        }
      }
    });
    
    // Log de resumen
    console.log(`🏦 Cuentas procesadas: ${Object.keys(saldosPorCuenta).length}`);
    Object.entries(saldosPorCuenta).forEach(([cuentaId, stats]) => {
      console.log(`💰 Cuenta ${cuentaId}: $${stats.saldo.toLocaleString('es-CL')} (${stats.movimientos} movimientos)`);
    });
    
    return saldosPorCuenta;
    
  } catch (error) {
    console.error('❌ Error calculando saldos desde flujo de caja:', error);
    throw error;
  }
};

/**
 * Obtiene las cuentas por cobrar (DTEs)
 * Endpoint: /dtes?porCobrar=1
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

/**
 * FUNCIÓN DE DEBUG: Para probar ambos métodos y comparar
 */
export const compararMetodosSaldos = async () => {
  console.log('\n🔍 COMPARANDO MÉTODOS DE CÁLCULO DE SALDOS');
  console.log('==========================================');
  
  try {
    // Método nuevo
    console.log('\n1️⃣ MÉTODO NUEVO (con saldos iniciales):');
    const resultadoNuevo = await obtenerSaldosBancarios();
    const totalNuevo = resultadoNuevo.items.reduce((sum, c) => sum + c.saldo, 0);
    
    // Método legacy
    console.log('\n2️⃣ MÉTODO LEGACY (solo flujo de caja):');
    const resultadoLegacy = await obtenerSaldosBancariosLegacy();
    const totalLegacy = resultadoLegacy.items.reduce((sum, c) => sum + (c.saldoCalculado || 0), 0);
    
    // Comparación
    console.log('\n📊 COMPARACIÓN DE RESULTADOS:');
    console.log(`Método nuevo: $${totalNuevo.toLocaleString('es-CL')}`);
    console.log(`Método legacy: $${totalLegacy.toLocaleString('es-CL')}`);
    console.log(`Diferencia: $${(totalNuevo - totalLegacy).toLocaleString('es-CL')}`);
    
    // Target de Chipax
    const targetChipax = 186648977;
    console.log(`Target Chipax: $${targetChipax.toLocaleString('es-CL')}`);
    
    const errorNuevo = Math.abs(totalNuevo - targetChipax);
    const errorLegacy = Math.abs(totalLegacy - targetChipax);
    
    console.log(`Error método nuevo: $${errorNuevo.toLocaleString('es-CL')}`);
    console.log(`Error método legacy: $${errorLegacy.toLocaleString('es-CL')}`);
    
    const mejorMetodo = errorNuevo < errorLegacy ? 'nuevo' : 'legacy';
    console.log(`🏆 Mejor método: ${mejorMetodo}`);
    
    return {
      nuevo: { total: totalNuevo, error: errorNuevo, data: resultadoNuevo },
      legacy: { total: totalLegacy, error: errorLegacy, data: resultadoLegacy },
      mejorMetodo,
      targetChipax
    };
    
  } catch (error) {
    console.error('❌ Error en comparación de métodos:', error);
    throw error;
  }
};

// === EXPORTACIÓN ===

// Exportar como objeto default para compatibilidad
const chipaxService = {
  // Funciones de autenticación
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  
  // Funciones principales (NUEVAS)
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerProveedores,
  obtenerFlujoCaja,
  obtenerHonorarios,
  obtenerBoletasTerceros,
  
  // Funciones auxiliares
  obtenerSaldosDesdeFlujoCaja,
  obtenerSaldosBancariosLegacy,
  compararMetodosSaldos
};

export default chipaxService;
