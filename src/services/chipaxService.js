// chipaxService.js - SOLO DATOS REALES DE CHIPAX
// Sigue EXACTAMENTE la documentación proporcionada

// === CONFIGURACIÓN DE LA API ===
const CHIPAX_API_URL = 'https://api.chipax.com/v2';
const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

// Cache del token
let tokenCache = {
  token: null,
  expiresAt: null,
  isRefreshing: false
};

/**
 * Función de autenticación - SIGUIENDO DOCUMENTACIÓN EXACTA
 */
export const getChipaxToken = async () => {
  const now = new Date();
  
  // Verificar token en cache
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token válido en cache');
    return tokenCache.token;
  }

  // Evitar múltiples refreshes simultáneos
  if (tokenCache.isRefreshing) {
    console.log('🔄 Token refresh en progreso, esperando...');
    let attempts = 0;
    while (tokenCache.isRefreshing && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    return tokenCache.token;
  }

  tokenCache.isRefreshing = true;
  console.log('🔐 Obteniendo token de Chipax...');
  
  try {
    // ✅ SIGUIENDO DOCUMENTACIÓN: endpoint /login exacto
    const response = await fetch(`${CHIPAX_API_URL}/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        app_id: APP_ID, 
        secret_key: SECRET_KEY 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de autenticación ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // ✅ SIGUIENDO DOCUMENTACIÓN: token viene en data.token
    if (!data.token) {
      throw new Error('Token no encontrado en respuesta de Chipax');
    }

    // Calcular expiración (1 hora por defecto)
    const expiresIn = data.tokenExpiration ? 
      Math.floor((data.tokenExpiration * 1000 - Date.now()) / 1000) : 3600;

    tokenCache.token = data.token;
    tokenCache.expiresAt = new Date(Date.now() + (expiresIn * 1000));
    
    console.log('✅ Token obtenido exitosamente de Chipax');
    console.log('⏰ Expira:', tokenCache.expiresAt.toLocaleString());

    return data.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    throw error;
  } finally {
    tokenCache.isRefreshing = false;
  }
};

/**
 * Función para obtener cuentas por cobrar - SIGUIENDO DOCUMENTACIÓN EXACTA
 */
export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo cuentas por cobrar desde Chipax...');
  
  try {
    const token = await getChipaxToken();
    
    // ✅ SIGUIENDO DOCUMENTACIÓN: endpoint y headers exactos
    const response = await fetch(`${CHIPAX_API_URL}/dtes?porCobrar=1&page=1&limit=50`, {
      headers: {
        'Authorization': `JWT ${token}`, // ✅ SIGUIENDO DOCUMENTACIÓN: JWT prefix (no Bearer)
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response de Chipax:', errorText);
      
      if (response.status === 401) {
        throw new Error('🔐 Sin permisos para acceder a DTEs. Contacta a Chipax para habilitar permisos de lectura.');
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Datos recibidos de Chipax API');
    console.log('📊 Estructura de respuesta:', Object.keys(data));
    
    // ✅ SIGUIENDO DOCUMENTACIÓN: datos vienen en data.items
    const dtes = data.items || [];
    console.log(`📋 ${dtes.length} DTEs encontrados en Chipax`);
    
    if (dtes.length > 0) {
      console.log('🔍 Estructura del primer DTE:', JSON.stringify(dtes[0], null, 2));
    }

    // ✅ SIGUIENDO DOCUMENTACIÓN: adaptar DTEs exactamente como especifica
    const cuentasAdaptadas = adaptarDTEs(dtes);
    
    console.log(`✅ ${cuentasAdaptadas.length} cuentas por cobrar procesadas`);
    console.log(`💰 Total por cobrar: $${cuentasAdaptadas.reduce((sum, c) => sum + c.saldo, 0).toLocaleString('es-CL')}`);

    return {
      items: cuentasAdaptadas,
      paginationStats: {
        totalItems: data.total || cuentasAdaptadas.length,
        loadedItems: cuentasAdaptadas.length,
        completenessPercent: 100,
        loadedPages: 1,
        totalPages: Math.ceil((data.total || cuentasAdaptadas.length) / 50),
        failedPages: [],
        duration: 0,
        source: 'chipax_real_api',
        endpoint: '/dtes?porCobrar=1'
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por cobrar:', error);
    throw error;
  }
};

/**
 * Adaptador de DTEs - SIGUIENDO DOCUMENTACIÓN EXACTA
 */
const adaptarDTEs = (dtes) => {
  console.log(`📊 Adaptando ${dtes.length} DTEs desde Chipax`);
  
  return dtes.map(dte => {
    // ✅ SIGUIENDO DOCUMENTACIÓN: estructura exacta de adaptación
    const cuentaAdaptada = {
      id: dte.id,
      folio: dte.folio,
      tipo: dte.tipo === 33 ? 'Factura Electrónica' : `Tipo ${dte.tipo}`,
      cliente: dte.razonSocial, // ✅ SIGUIENDO DOCUMENTACIÓN: string directo
      fechaEmision: dte.fechaEmision,
      fechaVencimiento: dte.fechaVencimiento,
      monto: dte.montoTotal,
      saldo: dte.Saldo?.saldoDeudor || 0, // ✅ SIGUIENDO DOCUMENTACIÓN: saldoDeudor es el real
      estado: dte.Saldo?.saldoDeudor > 0 ? 'pendiente' : 'pagado',
      
      // Campos adicionales para el dashboard
      moneda: 'CLP',
      rut: dte.rut || '',
      observaciones: `DTE ${dte.tipo} - ${dte.fechaEmision}`,
      sucursal: 'Principal'
    };
    
    // Calcular días vencidos
    if (cuentaAdaptada.fechaVencimiento) {
      const hoy = new Date();
      const vencimiento = new Date(cuentaAdaptada.fechaVencimiento);
      const diffTime = hoy - vencimiento;
      cuentaAdaptada.diasVencidos = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
    } else {
      cuentaAdaptada.diasVencidos = 0;
    }
    
    return cuentaAdaptada;
  }).filter(cuenta => cuenta.saldo > 0); // ✅ SIGUIENDO DOCUMENTACIÓN: solo pendientes
};

/**
 * Obtiene saldos bancarios desde Chipax
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n🏦 Obteniendo saldos bancarios desde Chipax...');
  
  try {
    const token = await getChipaxToken();
    
    // Probar diferentes endpoints para saldos bancarios
    const endpointsToTry = [
      '/cuentas-corrientes',
      '/cuentas-bancarias', 
      '/cuentas',
      '/bancos'
    ];
    
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`🔍 Probando endpoint: ${endpoint}`);
        
        const response = await fetch(`${CHIPAX_API_URL}${endpoint}?page=1&limit=50`, {
          headers: {
            'Authorization': `JWT ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const items = data.items || data.data || [];
          
          if (items.length > 0) {
            console.log(`✅ ${items.length} cuentas bancarias obtenidas desde ${endpoint}`);
            console.log('🔍 Estructura primera cuenta:', JSON.stringify(items[0], null, 2));
            
            // Adaptar saldos bancarios
            const saldosAdaptados = items.map(cuenta => ({
              id: cuenta.id,
              nombre: cuenta.numeroCuenta || cuenta.numero || cuenta.cuenta || `Cuenta-${cuenta.id}`,
              banco: cuenta.banco || cuenta.nombreBanco || cuenta.entidadBancaria || 'Banco no especificado',
              saldo: cuenta.saldo || cuenta.Saldo?.saldoDeudor || cuenta.Saldo?.saldo || 0,
              tipo: cuenta.tipo || cuenta.tipoCuenta || 'Cuenta Corriente',
              moneda: cuenta.moneda || 'CLP',
              ultimoMovimiento: cuenta.ultimoMovimiento || cuenta.fechaUltimoMovimiento || new Date().toISOString(),
              sucursal: cuenta.sucursal || 'Principal'
            }));
            
            const totalSaldos = saldosAdaptados.reduce((sum, c) => sum + c.saldo, 0);
            console.log(`💰 Total saldos bancarios: $${totalSaldos.toLocaleString('es-CL')}`);
            
            return {
              items: saldosAdaptados,
              paginationStats: {
                totalItems: saldosAdaptados.length,
                loadedItems: saldosAdaptados.length,
                completenessPercent: 100,
                loadedPages: 1,
                totalPages: 1,
                failedPages: [],
                duration: 0,
                source: 'chipax_real_api',
                endpoint: endpoint
              }
            };
          }
        } else if (response.status === 401) {
          console.log(`❌ Sin permisos para ${endpoint} (401)`);
        } else {
          console.log(`❌ Error en ${endpoint}: ${response.status}`);
        }
      } catch (endpointError) {
        console.log(`❌ Error probando ${endpoint}:`, endpointError.message);
        continue;
      }
    }
    
    throw new Error('🔐 Sin permisos para acceder a ningún endpoint de saldos bancarios. Contacta a Chipax.');
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    throw error;
  }
};

/**
 * Obtiene cuentas por pagar desde Chipax
 */
export const obtenerCuentasPorPagar = async () => {
  console.log('\n💸 Obteniendo cuentas por pagar desde Chipax...');
  
  try {
    const token = await getChipaxToken();
    
    const response = await fetch(`${CHIPAX_API_URL}/compras?page=1&limit=50`, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('🔐 Sin permisos para acceder a compras. Contacta a Chipax para habilitar permisos.');
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const compras = data.items || [];
    
    console.log(`✅ ${compras.length} compras obtenidas desde Chipax`);
    
    if (compras.length > 0) {
      console.log('🔍 Estructura primera compra:', JSON.stringify(compras[0], null, 2));
    }
    
    // Adaptar compras
    const comprasAdaptadas = compras.map(compra => ({
      id: compra.id,
      folio: compra.folio || compra.numero || `COMP-${compra.id}`,
      proveedor: compra.proveedor || compra.razonSocial || 'Proveedor no especificado',
      rut: compra.rut || '',
      monto: compra.montoTotal || compra.monto || 0,
      saldo: compra.saldo || compra.saldoPendiente || compra.montoTotal || 0,
      fecha: compra.fecha || compra.fechaEmision || new Date().toISOString(),
      fechaVencimiento: compra.fechaVencimiento,
      tipo: 'Factura Compra',
      estado: compra.estado || 'pendiente',
      moneda: 'CLP',
      observaciones: `Compra ${compra.folio || compra.id}`,
      categoria: compra.categoria || 'General'
    })).filter(compra => compra.saldo > 0); // Solo las pendientes
    
    const totalPorPagar = comprasAdaptadas.reduce((sum, c) => sum + c.saldo, 0);
    console.log(`💰 Total por pagar: $${totalPorPagar.toLocaleString('es-CL')}`);
    
    return {
      items: comprasAdaptadas,
      paginationStats: {
        totalItems: comprasAdaptadas.length,
        loadedItems: comprasAdaptadas.length,
        completenessPercent: 100,
        source: 'chipax_real_api'
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo cuentas por pagar:', error);
    throw error;
  }
};

/**
 * Obtiene clientes desde Chipax
 */
export const obtenerClientes = async () => {
  console.log('\n👥 Obteniendo clientes desde Chipax...');
  
  try {
    const token = await getChipaxToken();
    
    const response = await fetch(`${CHIPAX_API_URL}/clientes?page=1&limit=100`, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('🔐 Sin permisos para acceder a clientes');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const clientes = data.items || [];
    
    console.log(`✅ ${clientes.length} clientes obtenidos desde Chipax`);
    
    return {
      items: clientes,
      paginationStats: {
        totalItems: clientes.length,
        loadedItems: clientes.length,
        completenessPercent: 100,
        source: 'chipax_real_api'
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    throw error;
  }
};

/**
 * Obtiene proveedores desde Chipax
 */
export const obtenerProveedores = async () => {
  console.log('\n🏭 Obteniendo proveedores desde Chipax...');
  
  try {
    const token = await getChipaxToken();
    
    const response = await fetch(`${CHIPAX_API_URL}/proveedores?page=1&limit=100`, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('🔐 Sin permisos para acceder a proveedores');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const proveedores = data.items || [];
    
    console.log(`✅ ${proveedores.length} proveedores obtenidos desde Chipax`);
    
    return {
      items: proveedores,
      paginationStats: {
        totalItems: proveedores.length,
        loadedItems: proveedores.length,
        completenessPercent: 100,
        source: 'chipax_real_api'
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    throw error;
  }
};

/**
 * Obtiene flujo de caja desde Chipax
 */
export const obtenerFlujoCaja = async () => {
  console.log('\n💵 Obteniendo flujo de caja desde Chipax...');
  
  try {
    const token = await getChipaxToken();
    
    // Probar diferentes endpoints de flujo de caja
    const endpointsToTry = [
      '/flujo-caja/cartolas',
      '/flujo-caja',
      '/movimientos',
      '/cartolas'
    ];
    
    for (const endpoint of endpointsToTry) {
      try {
        const response = await fetch(`${CHIPAX_API_URL}${endpoint}?page=1&limit=50`, {
          headers: {
            'Authorization': `JWT ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const movimientos = data.items || [];
          
          console.log(`✅ ${movimientos.length} movimientos obtenidos desde ${endpoint}`);
          
          return {
            items: movimientos,
            paginationStats: {
              totalItems: movimientos.length,
              loadedItems: movimientos.length,
              completenessPercent: 100,
              source: 'chipax_real_api',
              endpoint: endpoint
            }
          };
        }
      } catch (endpointError) {
        continue;
      }
    }
    
    throw new Error('🔐 Sin permisos para acceder a flujo de caja');
    
  } catch (error) {
    console.error('❌ Error obteniendo flujo de caja:', error);
    throw error;
  }
};

/**
 * Obtiene honorarios desde Chipax
 */
export const obtenerHonorarios = async () => {
  console.log('\n📄 Obteniendo honorarios desde Chipax...');
  
  try {
    const token = await getChipaxToken();
    
    const response = await fetch(`${CHIPAX_API_URL}/honorarios?page=1&limit=50`, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('🔐 Sin permisos para acceder a honorarios');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const honorarios = data.items || [];
    
    console.log(`✅ ${honorarios.length} honorarios obtenidos desde Chipax`);
    
    return {
      items: honorarios,
      paginationStats: {
        totalItems: honorarios.length,
        loadedItems: honorarios.length,
        completenessPercent: 100,
        source: 'chipax_real_api'
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo honorarios:', error);
    throw error;
  }
};

/**
 * Obtiene boletas de terceros desde Chipax
 */
export const obtenerBoletasTerceros = async () => {
  console.log('\n📋 Obteniendo boletas de terceros desde Chipax...');
  
  try {
    const token = await getChipaxToken();
    
    const response = await fetch(`${CHIPAX_API_URL}/boletas-terceros?page=1&limit=50`, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('🔐 Sin permisos para acceder a boletas de terceros');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const boletas = data.items || [];
    
    console.log(`✅ ${boletas.length} boletas de terceros obtenidas desde Chipax`);
    
    return {
      items: boletas,
      paginationStats: {
        totalItems: boletas.length,
        loadedItems: boletas.length,
        completenessPercent: 100,
        source: 'chipax_real_api'
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo boletas de terceros:', error);
    throw error;
  }
};

/**
 * Verifica conectividad con Chipax
 */
export const verificarConectividadChipax = async () => {
  console.log('🔍 Verificando conectividad con Chipax...');
  
  try {
    const token = await getChipaxToken();
    console.log('✅ Token obtenido correctamente');
    
    // Probar un endpoint básico
    const response = await fetch(`${CHIPAX_API_URL}/dtes?porCobrar=1&page=1&limit=1`, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Acceso completo a datos de Chipax');
      return { 
        ok: true, 
        message: 'Conexión exitosa con acceso completo a datos',
        hasDataAccess: true
      };
    } else if (response.status === 401) {
      return { 
        ok: false, 
        message: '🔐 Sin permisos para acceder a datos. Contacta a Chipax para habilitar permisos de lectura.',
        hasDataAccess: false,
        suggestion: 'Solicita permisos de lectura para DTEs, cuentas bancarias y otros módulos'
      };
    } else {
      return { 
        ok: false, 
        message: `Error inesperado: ${response.status}`,
        hasDataAccess: false
      };
    }
    
  } catch (error) {
    console.error('❌ Error de conectividad:', error);
    return { 
      ok: false, 
      message: error.message,
      hasDataAccess: false
    };
  }
};

/**
 * Obtiene estado de autenticación
 */
export const obtenerEstadoAutenticacion = () => {
  const now = new Date();
  return {
    tieneToken: !!tokenCache.token,
    expira: tokenCache.expiresAt,
    isRefreshing: tokenCache.isRefreshing,
    minutosParaExpirar: tokenCache.expiresAt 
      ? Math.round((tokenCache.expiresAt - now) / 60000)
      : null,
    credenciales: {
      appId: APP_ID.substring(0, 8) + '...',
      secretKey: SECRET_KEY.substring(0, 8) + '...'
    },
    empresa: 'PGR Seguridad S.p.A'
  };
};

// Funciones legacy para compatibilidad (no se usan en esta versión)
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  console.warn('⚠️ fetchFromChipax es legacy - usar funciones específicas');
  throw new Error('Usar funciones específicas como obtenerCuentasPorCobrar()');
};

export const fetchAllPaginatedData = async (endpoint, options = {}) => {
  console.warn('⚠️ fetchAllPaginatedData es legacy - usar funciones específicas');
  throw new Error('Usar funciones específicas como obtenerCuentasPorCobrar()');
};

// Export por defecto
const chipaxService = {
  getChipaxToken,
  obtenerCuentasPorCobrar,
  obtenerSaldosBancarios,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerProveedores,
  obtenerFlujoCaja,
  obtenerHonorarios,
  obtenerBoletasTerceros,
  verificarConectividadChipax,
  obtenerEstadoAutenticacion,
  // Legacy functions
  fetchFromChipax,
  fetchAllPaginatedData
};

export default chipaxService;
