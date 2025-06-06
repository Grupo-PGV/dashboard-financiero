// chipaxService.js - Servicio corregido con configuración confirmada
const CHIPAX_API_URL = 'https://api.chipax.com/v2'; // URL base confirmada funcionando
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';
const COMPANY_NAME = 'PGR Seguridad S.p.A'; // Nombre de la empresa desde la respuesta

// Cache del token para evitar múltiples autenticaciones
let tokenCache = {
  token: null,
  expiresAt: null
};

// Configuración de paginación optimizada
const PAGINATION_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 5, // Aumentado para mayor velocidad
  RETRY_ATTEMPTS: 2, // Reducido para fallar más rápido
  RETRY_DELAY: 500, // Reducido para reintentos más rápidos
  REQUEST_DELAY: 100, // Reducido para menos espera entre lotes
  TIMEOUT: 15000, // Reducido para detectar problemas más rápido
  PAGE_SIZE: 100, // Aumentado para menos peticiones totales
  MAX_PAGES_DEFAULT: 20, // Límite por defecto de páginas
  MAX_PAGES_COMPRAS: 10 // Límite específico para compras (muchos datos)
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
  console.log('🔑 APP_ID:', APP_ID.substring(0, 8) + '...');
  
  try {
    // Intentar con la URL directa primero
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
    
    // Guardar token en cache con la estructura correcta
    tokenCache = {
      token: data.token,
      expiresAt: new Date(data.tokenExpiration * 1000) // tokenExpiration viene en Unix timestamp
    };
    
    console.log('✅ Token obtenido exitosamente. Expira:', tokenCache.expiresAt.toLocaleString());
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    console.error('💡 Verifica que la URL y credenciales sean correctas');
    // Limpiar cache en caso de error
    tokenCache = { token: null, expiresAt: null };
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
    
    // Construir URL completa
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    // Usar JWT como formato de autorización (confirmado por la respuesta)
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
      console.log(`🔍 Llamando a: ${endpoint} - Status: ${response.status}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      if (showLogs) console.error(`❌ Error en ${endpoint}:`, text);
      
      // Si es 401, limpiar cache y reintentar una vez
      if (response.status === 401 && !options._retry) {
        console.log('🔄 Token expirado, reintentando...');
        tokenCache = { token: null, expiresAt: null };
        return fetchFromChipax(endpoint, { ...options, _retry: true }, showLogs);
      }
      
      if (response.status === 404) {
        console.log(`⚠️ Endpoint no encontrado: ${url}`);
        return { items: [] };
      }
      
      throw new Error(`Error ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    if (showLogs) {
      console.log(`📦 Datos recibidos de ${endpoint}`);
      if (data.paginationAttributes) {
        console.log('📄 Info de paginación:', data.paginationAttributes);
      }
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
    const firstPageEndpoint = `${baseEndpoint}${separator}page=1&limit=${PAGINATION_CONFIG.PAGE_SIZE}`;
    
    console.log(`📄 Obteniendo primera página con límite de ${PAGINATION_CONFIG.PAGE_SIZE} items...`);
    const startTime = Date.now();
    const firstPageData = await fetchFromChipax(firstPageEndpoint, { _startTime: startTime }, false);
    
    // Verificar si hay paginación
    if (!firstPageData.paginationAttributes) {
      console.log('📋 No hay paginación, devolviendo respuesta directa');
      
      const items = Array.isArray(firstPageData) ? 
        firstPageData : 
        (firstPageData.items || [firstPageData]);
      
      paginationStats.totalItems = items.length;
      paginationStats.loadedItems = items.length;
      paginationStats.completenessPercent = 100;
      paginationStats.endTime = new Date();
      
      return {
        items,
        paginationStats,
        rawResponse: firstPageData
      };
    }
    
    const totalPages = firstPageData.paginationAttributes.totalPages || 1;
    const totalCount = firstPageData.paginationAttributes.totalCount || 0;
    
    paginationStats.totalPages = totalPages;
    paginationStats.totalItems = totalCount;
    
    console.log(`📊 Total: ${totalCount} items en ${totalPages} páginas`);
    
    // Si solo hay una página
    if (totalPages === 1) {
      paginationStats.loadedPages = 1;
      paginationStats.loadedItems = firstPageData.items.length;
      paginationStats.completenessPercent = 100;
      paginationStats.endTime = new Date();
      
      return {
        items: firstPageData.items,
        paginationStats
      };
    }
    
    // Preparar para cargar múltiples páginas
    const allItems = [...firstPageData.items];
    paginationStats.loadedPages = 1;
    paginationStats.loadedItems = firstPageData.items.length;
    
    // LIMITAR PÁGINAS PARA EVITAR SOBRECARGA
    let maxPagesToLoad = PAGINATION_CONFIG.MAX_PAGES_DEFAULT;
    
    // Límite especial para compras
    if (baseEndpoint.includes('/compras')) {
      maxPagesToLoad = PAGINATION_CONFIG.MAX_PAGES_COMPRAS;
      console.log('💸 Aplicando límite especial para compras');
    }
    
    const pagesToLoad = Math.min(totalPages, maxPagesToLoad);
    
    if (totalPages > maxPagesToLoad) {
      console.log(`⚠️ Limitando carga a ${maxPagesToLoad} páginas de ${totalPages} para evitar sobrecarga`);
    }
    
    // Función helper para cargar una página
    const loadPage = async (pageNum) => {
      try {
        const pageEndpoint = `${baseEndpoint}${separator}page=${pageNum}&limit=${PAGINATION_CONFIG.PAGE_SIZE}`;
        const pageData = await fetchFromChipax(pageEndpoint, {}, false);
        
        if (pageData.items && pageData.items.length > 0) {
          return { success: true, items: pageData.items, page: pageNum };
        }
        
        return { success: false, items: [], page: pageNum, error: 'No items' };
      } catch (error) {
        console.error(`❌ Error cargando página ${pageNum}:`, error.message);
        return { success: false, items: [], page: pageNum, error: error.message };
      }
    };
    
    // Cargar páginas en lotes para evitar sobrecarga
    console.log(`🚀 Cargando ${totalPages - 1} páginas adicionales...`);
    
    for (let i = 2; i <= pagesToLoad; i += PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS) {
      const batch = [];
      const batchEnd = Math.min(i + PAGINATION_CONFIG.MAX_CONCURRENT_REQUESTS - 1, pagesToLoad);
      
      // Crear batch de promesas
      for (let j = i; j <= batchEnd; j++) {
        batch.push(loadPage(j));
      }
      
      // Ejecutar batch
      console.log(`📦 Cargando páginas ${i} a ${batchEnd}...`);
      const batchResults = await Promise.all(batch);
      
      // Procesar resultados
      for (const result of batchResults) {
        if (result.success) {
          allItems.push(...result.items);
          paginationStats.loadedPages++;
          paginationStats.loadedItems += result.items.length;
        } else {
          paginationStats.failedPages.push(result.page);
        }
      }
      
      // Actualizar progreso
      paginationStats.completenessPercent = Math.round(
        (paginationStats.loadedItems / paginationStats.totalItems) * 100
      );
      
      console.log(`📊 Progreso: ${paginationStats.completenessPercent}% (${paginationStats.loadedItems}/${paginationStats.totalItems})`);
      
      // Delay entre lotes
      if (batchEnd < pagesToLoad) {
        await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.REQUEST_DELAY));
      }
    }
    
    paginationStats.endTime = new Date();
    const duration = (paginationStats.endTime - paginationStats.startTime) / 1000;
    
    console.log(`\n✅ === CARGA COMPLETADA ===`);
    console.log(`📊 Items cargados: ${paginationStats.loadedItems}/${paginationStats.totalItems}`);
    console.log(`📄 Páginas cargadas: ${paginationStats.loadedPages}/${paginationStats.totalPages}`);
    console.log(`⏱️ Duración: ${duration.toFixed(2)} segundos`);
    
    if (paginationStats.failedPages.length > 0) {
      console.log(`⚠️ Páginas fallidas: ${paginationStats.failedPages.join(', ')}`);
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

// === FUNCIONES HELPER ===

/**
 * Genera filtros de fecha para los endpoints
 * @param {number} meses - Número de meses hacia atrás
 * @returns {string} String de fecha en formato YYYY-MM-DD
 */
const getFechaFiltro = (meses = 3) => {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() - meses);
  return fecha.toISOString().split('T')[0];
};

/**
 * Filtra facturas por estado de pago
 * @param {Array} facturas - Array de facturas
 * @returns {Array} Facturas filtradas
 */
const filtrarFacturasPendientes = (facturas) => {
  return facturas.filter(factura => {
    // Múltiples verificaciones para asegurar que está pendiente
    const tieneSaldoPendiente = (factura.saldo_pendiente || 0) > 0;
    const noEstaPagada = factura.pagado !== true && factura.pagado !== 'true' && factura.pagado !== 1;
    const estadoNoPagado = factura.estado !== 'pagado' && factura.estado_pago !== 'pagado';
    const montoMayorQueCero = (factura.monto_total || factura.total || 0) > 0;
    
    // Si tiene saldo pendiente, está pendiente
    if (tieneSaldoPendiente) return true;
    
    // Si no está marcada como pagada y tiene monto
    if (noEstaPagada && estadoNoPagado && montoMayorQueCero) return true;
    
    return false;
  });
};

// === FUNCIONES ESPECÍFICAS DE ENDPOINTS ===

/**
 * Obtiene los saldos bancarios
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo saldos bancarios...');
  try {
    // Intentar con el endpoint de flujo de caja que parece tener info bancaria
    let data = await fetchFromChipax('/flujo-caja/init');
    
    // Si no hay datos, intentar con cuentas corrientes
    if (!data || !data.arrFlujoCaja) {
      console.log('🔄 Intentando con /cuentas_corrientes...');
      data = await fetchAllPaginatedData('/cuentas_corrientes');
    }
    
    console.log(`✅ Datos bancarios obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo saldos:', error);
    throw error;
  }
};

/**
 * Obtiene las cuentas por cobrar (ventas)
 * @param {Object} opciones - Opciones de filtrado
 * @param {number} opciones.mesesAtras - Meses hacia atrás para filtrar (default: 3)
 * @param {boolean} opciones.soloPendientes - Solo facturas pendientes (default: true)
 */
export const obtenerCuentasPorCobrar = async (opciones = {}) => {
  const { mesesAtras = 3, soloPendientes = true } = opciones;
  
  console.log('\n📊 Obteniendo cuentas por cobrar...');
  console.log(`📅 Período: últimos ${mesesAtras} meses`);
  console.log(`💰 Estado: ${soloPendientes ? 'Solo pendientes' : 'Todas'}`);
  
  try {
    // Construir endpoint con filtros
    const fechaDesde = getFechaFiltro(mesesAtras);
    let endpoint = `/ventas?fecha_desde=${fechaDesde}`;
    
    if (soloPendientes) {
      endpoint += '&pendiente=true';
    }
    
    const data = await fetchAllPaginatedData(endpoint);
    
    // Aplicar filtro adicional si es necesario
    if (soloPendientes && data.items && data.items.length > 0) {
      const facturasPendientes = filtrarFacturasPendientes(data.items);
      
      console.log(`✅ ${facturasPendientes.length} facturas pendientes de cobro (de ${data.items.length} totales)`);
      
      return {
        ...data,
        items: facturasPendientes
      };
    }
    
    console.log(`✅ ${data.items.length} cuentas por cobrar obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por cobrar:', error);
    throw error;
  }
};

/**
 * Obtiene las cuentas por pagar (compras)
 * @param {Object} opciones - Opciones de filtrado
 * @param {number} opciones.mesesAtras - Meses hacia atrás para filtrar (default: 3)
 * @param {boolean} opciones.soloPendientes - Solo facturas pendientes (default: true)
 */
export const obtenerCuentasPorPagar = async (opciones = {}) => {
  const { mesesAtras = 3, soloPendientes = true } = opciones;
  
  console.log('\n💸 Obteniendo cuentas por pagar...');
  console.log(`📅 Período: últimos ${mesesAtras} meses`);
  console.log(`💰 Estado: ${soloPendientes ? 'Solo pendientes' : 'Todas'}`);
  
  try {
    // Construir endpoint con filtros
    const fechaDesde = getFechaFiltro(mesesAtras);
    let endpoint = `/compras?fecha_desde=${fechaDesde}`;
    
    if (soloPendientes) {
      endpoint += '&pagado=false';
    }
    
    const data = await fetchAllPaginatedData(endpoint);
    
    // Aplicar filtro adicional para mayor seguridad
    if (soloPendientes && data.items && data.items.length > 0) {
      const facturasPendientes = filtrarFacturasPendientes(data.items);
      
      console.log(`✅ ${facturasPendientes.length} facturas pendientes de pago (de ${data.items.length} totales)`);
      
      return {
        ...data,
        items: facturasPendientes
      };
    }
    
    console.log(`✅ ${data.items.length} cuentas por pagar obtenidas`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por pagar:', error);
    throw error;
  }
};

/**
 * Obtiene la lista de clientes
 */
export const obtenerClientes = async () => {
  console.log('\n👥 Obteniendo clientes...');
  try {
    // El endpoint /clientes devuelve N/A, intentar con /ventas para extraer clientes únicos
    const ventasData = await fetchAllPaginatedData('/ventas');
    
    // Extraer clientes únicos de las ventas
    const clientesMap = new Map();
    
    if (ventasData.items && ventasData.items.length > 0) {
      ventasData.items.forEach(venta => {
        if (venta.rut_receptor && !clientesMap.has(venta.rut_receptor)) {
          clientesMap.set(venta.rut_receptor, {
            id: venta.rut_receptor,
            rut: venta.rut_receptor,
            nombre: venta.razon_social_receptor || 'Sin nombre',
            email: venta.email_receptor || '',
            telefono: venta.telefono_receptor || ''
          });
        }
      });
    }
    
    const clientes = Array.from(clientesMap.values());
    console.log(`✅ ${clientes.length} clientes extraídos de ventas`);
    
    return {
      items: clientes,
      paginationStats: {
        totalItems: clientes.length,
        completenessPercent: 100
      }
    };
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    throw error;
  }
};

/**
 * Obtiene la lista de proveedores
 */
export const obtenerProveedores = async () => {
  console.log('\n🏭 Obteniendo proveedores...');
  try {
    // Intentar primero con el endpoint directo
    let data = await fetchAllPaginatedData('/proveedores');
    
    // Si no hay datos, extraer de las compras
    if (!data.items || data.items.length === 0) {
      console.log('🔄 Extrayendo proveedores de las compras...');
      const comprasData = await fetchAllPaginatedData('/compras');
      
      const proveedoresMap = new Map();
      
      if (comprasData.items && comprasData.items.length > 0) {
        comprasData.items.forEach(compra => {
          if (compra.rut_emisor && !proveedoresMap.has(compra.rut_emisor)) {
            proveedoresMap.set(compra.rut_emisor, {
              id: compra.rut_emisor,
              rut: compra.rut_emisor,
              nombre: compra.razon_social || compra.razon_social_emisor || 'Sin nombre',
              email: compra.email_emisor || '',
              telefono: compra.telefono_emisor || ''
            });
          }
        });
      }
      
      const proveedores = Array.from(proveedoresMap.values());
      
      return {
        items: proveedores,
        paginationStats: {
          totalItems: proveedores.length,
          completenessPercent: 100
        }
      };
    }
    
    console.log(`✅ ${data.items.length} proveedores obtenidos`);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    throw error;
  }
};

// Exportar como objeto default para compatibilidad
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  fetchAllPaginatedData,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerProveedores
};

export default chipaxService;
