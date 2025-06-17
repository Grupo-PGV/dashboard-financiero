// chipaxService.js - CON HEADERS AUTHORIZATION CORREGIDOS

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
 * Obtiene el token de autenticación
 */
export const getChipaxToken = async () => {
  const now = new Date();
  
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now) {
    console.log('🔑 Usando token en cache');
    return tokenCache.token;
  }

  if (tokenCache.isRefreshing) {
    console.log('🔄 Token refresh en progreso, esperando...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return tokenCache.token;
  }

  tokenCache.isRefreshing = true;
  console.log('🔐 Obteniendo nuevo token de Chipax...');
  
  try {
    const response = await fetch(`${CHIPAX_API_URL}/auth`, {
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
    
    tokenCache = {
      token: data.token,
      expiresAt: new Date(Date.now() + (50 * 60 * 1000)), // 50 minutos
      isRefreshing: false
    };
    
    console.log('🔐 Token guardado. Longitud:', data.token.length);
    return tokenCache.token;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    tokenCache = { token: null, expiresAt: null, isRefreshing: false };
    throw error;
  }
};

/**
 * ✅ CORREGIDO: Realiza petición con Authorization header SIEMPRE
 */
export const fetchFromChipax = async (endpoint, options = {}, showLogs = true) => {
  try {
    // ✅ PASO 1: Obtener token ANTES de hacer la petición
    const token = await getChipaxToken();
    
    if (!token) {
      throw new Error('No se pudo obtener token de autenticación');
    }
    
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    // ✅ PASO 2: SIEMPRE incluir Authorization header
    const headers = {
      'Authorization': `JWT ${token}`,  // ✅ CRÍTICO: Authorization header
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };
    
    if (showLogs) {
      console.log(`🌐 Llamando ${endpoint} con token: ${token.substring(0, 20)}...`);
      console.log(`🔐 Authorization header: JWT ${token.substring(0, 10)}...`);
    }
    
    const response = await fetch(url, {
      method: 'GET', // ✅ Método explícito
      ...options,
      headers
    });

    if (showLogs) {
      console.log(`🔍 ${endpoint} - Status: ${response.status}`);
    }
    
    if (!response.ok) {
      const text = await response.text();
      
      // Si es 401, reintentar con nuevo token UNA VEZ
      if (response.status === 401 && !options._retry) {
        console.log('🔄 Token expirado, limpiando cache y reintentando...');
        tokenCache = { token: null, expiresAt: null, isRefreshing: false };
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
 * ✅ CORREGIDO: Obtiene cuentas corrientes con Authorization header
 */
export const obtenerSaldosBancarios = async () => {
  console.log('\n💰 Obteniendo saldos bancarios...');
  
  try {
    // 1. Obtener cuentas corrientes con Authorization header
    console.log('📋 Obteniendo cuentas corrientes...');
    const cuentas = await fetchFromChipax('/cuentas-corrientes');
    
    if (!Array.isArray(cuentas) || cuentas.length === 0) {
      console.warn('⚠️ No se encontraron cuentas corrientes');
      return [];
    }
    
    console.log(`✅ ${cuentas.length} cuentas corrientes obtenidas`);
    console.log('🔍 Estructura de la primera cuenta:', cuentas[0]);
    
    // 2. Obtener cartolas para calcular saldos con Authorization header
    console.log('📊 Obteniendo cartolas para calcular saldos...');
    const cartolasResponse = await fetchFromChipax('/flujo-caja/cartolas');
    const cartolas = cartolasResponse.docs || cartolasResponse || [];
    
    console.log(`✅ ${cartolas.length} movimientos de cartola obtenidos`);
    
    // 3. Calcular saldos por cuenta corriente usando cuenta_corriente_id
    const saldosPorCuenta = {};
    
    cartolas.forEach(cartola => {
      const cuentaId = cartola.cuenta_corriente_id;
      if (!cuentaId) return;
      
      if (!saldosPorCuenta[cuentaId]) {
        saldosPorCuenta[cuentaId] = {
          totalAbonos: 0,
          totalCargos: 0,
          saldoFinal: 0,
          ultimaFecha: null,
          movimientos: 0
        };
      }
      
      const abono = parseFloat(cartola.abono) || 0;
      const cargo = parseFloat(cartola.cargo) || 0;
      const fecha = new Date(cartola.fecha);
      
      saldosPorCuenta[cuentaId].totalAbonos += abono;
      saldosPorCuenta[cuentaId].totalCargos += cargo;
      saldosPorCuenta[cuentaId].movimientos++;
      
      // Actualizar fecha más reciente
      if (!saldosPorCuenta[cuentaId].ultimaFecha || fecha > saldosPorCuenta[cuentaId].ultimaFecha) {
        saldosPorCuenta[cuentaId].ultimaFecha = fecha;
      }
    });
    
    // Calcular saldo final por cuenta (abonos - cargos)
    Object.keys(saldosPorCuenta).forEach(cuentaId => {
      const cuenta = saldosPorCuenta[cuentaId];
      cuenta.saldoFinal = cuenta.totalAbonos - cuenta.totalCargos;
    });
    
    // 4. Combinar cuentas con sus saldos calculados
    const cuentasConSaldos = cuentas.map(cuenta => ({
      ...cuenta,
      saldoCalculado: saldosPorCuenta[cuenta.id]?.saldoFinal || 0,
      movimientos: saldosPorCuenta[cuenta.id] || {
        totalAbonos: 0,
        totalCargos: 0,
        ultimaFecha: null,
        movimientos: 0
      }
    }));
    
    // Log de resumen
    const totalSaldos = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.saldoCalculado, 0);
    console.log(`💰 Saldos calculados para ${cuentasConSaldos.length} cuentas`);
    console.log(`💵 Saldo total calculado: $${totalSaldos.toLocaleString('es-CL')}`);
    
    return cuentasConSaldos;
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    throw error;
  }
};

/**
 * ✅ CORREGIDO: Obtiene DTEs con Authorization header
 */
export const obtenerCuentasPorCobrar = async () => {
  console.log('\n📊 Obteniendo DTEs de venta (cuentas por cobrar)...');
  
  try {
    const dtes = await fetchFromChipax('/dtes');
    
    if (!Array.isArray(dtes)) {
      console.warn('⚠️ Respuesta de DTEs no es array:', typeof dtes);
      return [];
    }
    
    console.log(`✅ ${dtes.length} DTEs obtenidos`);
    
    if (dtes.length > 0) {
      console.log('🔍 Estructura del primer DTE:', {
        id: dtes[0].id,
        folio: dtes[0].folio,
        razon_social: dtes[0].razon_social,
        monto_total: dtes[0].monto_total,
        monto_por_cobrar: dtes[0].monto_por_cobrar,
        Saldo: dtes[0].Saldo
      });
    }
    
    // Filtrar solo los que tienen saldo pendiente
    const dtesConSaldo = dtes.filter(dte => {
      // Primero verificar monto_por_cobrar
      if (dte.monto_por_cobrar && parseFloat(dte.monto_por_cobrar) > 0) {
        return true;
      }
      
      // Luego verificar objeto Saldo
      if (dte.Saldo && dte.Saldo.saldo_deudor && parseFloat(dte.Saldo.saldo_deudor) > 0) {
        return true;
      }
      
      // Si no hay información de saldo, incluir si no está anulado
      return dte.anulado !== 'S';
    });
    
    console.log(`📊 De ${dtes.length} DTEs, ${dtesConSaldo.length} tienen saldo pendiente`);
    return dtesConSaldo;
    
  } catch (error) {
    console.error('❌ Error obteniendo DTEs de venta:', error);
    throw error;
  }
};

/**
 * ✅ CORREGIDO: Obtiene compras con Authorization header
 */
export const obtenerCuentasPorPagar = async () => {
  console.log('\n💸 Obteniendo compras (cuentas por pagar)...');
  
  try {
    const compras = await fetchFromChipax('/compras');
    
    if (!Array.isArray(compras)) {
      console.warn('⚠️ Respuesta de compras no es array:', typeof compras);
      return [];
    }
    
    console.log(`✅ ${compras.length} compras obtenidas`);
    
    if (compras.length > 0) {
      console.log('🔍 Estructura de la primera compra:', {
        id: compras[0].id,
        folio: compras[0].folio,
        razon_social: compras[0].razon_social,
        monto_total: compras[0].monto_total,
        fecha_pago_interna: compras[0].fecha_pago_interna,
        estado: compras[0].estado
      });
    }
    
    // Filtrar solo las pendientes de pago
    const comprasPendientes = compras.filter(compra => {
      // Si no tiene fecha de pago interno, está pendiente
      if (!compra.fecha_pago_interna) {
        return true;
      }
      
      // Si el estado indica que está pendiente
      if (compra.estado && ['recibido', 'pendiente', 'aceptado'].includes(compra.estado.toLowerCase())) {
        return true;
      }
      
      // Si no está anulado
      return compra.anulado !== 'S';
    });
    
    console.log(`📊 De ${compras.length} compras, ${comprasPendientes.length} están pendientes de pago`);
    return comprasPendientes;
    
  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    throw error;
  }
};

/**
 * ✅ CORREGIDO: Obtiene clientes con Authorization header
 */
export const obtenerClientes = async () => {
  console.log('\n👥 Obteniendo clientes...');
  try {
    const clientes = await fetchFromChipax('/clientes');
    
    if (!Array.isArray(clientes)) {
      console.warn('⚠️ Respuesta de clientes no es array:', typeof clientes);
      return [];
    }
    
    console.log(`✅ ${clientes.length} clientes obtenidos`);
    return clientes;
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    throw error;
  }
};

/**
 * ✅ CORREGIDO: Obtiene flujo de caja con Authorization header
 */
export const obtenerFlujoCaja = async () => {
  console.log('\n💵 Obteniendo flujo de caja...');
  try {
    const response = await fetchFromChipax('/flujo-caja/cartolas');
    const cartolas = response.docs || response || [];
    
    console.log(`✅ ${cartolas.length} movimientos de flujo de caja obtenidos`);
    console.log(`📄 Total páginas: ${response.pages || 'N/A'}, Total registros: ${response.total || 'N/A'}`);
    
    return cartolas;
  } catch (error) {
    console.error('❌ Error obteniendo flujo de caja:', error);
    throw error;
  }
};

/**
 * ✅ CORREGIDO: Obtiene movimientos con Authorization header
 */
export const obtenerMovimientos = async () => {
  console.log('\n🔄 Obteniendo movimientos...');
  try {
    const movimientos = await fetchFromChipax('/movimientos');
    
    if (!Array.isArray(movimientos)) {
      console.warn('⚠️ Respuesta de movimientos no es array:', typeof movimientos);
      return [];
    }
    
    console.log(`✅ ${movimientos.length} movimientos obtenidos`);
    return movimientos;
  } catch (error) {
    console.error('❌ Error obteniendo movimientos:', error);
    throw error;
  }
};

// Exportar todo
const chipaxService = {
  getChipaxToken,
  fetchFromChipax,
  obtenerSaldosBancarios,
  obtenerCuentasPorCobrar,
  obtenerCuentasPorPagar,
  obtenerClientes,
  obtenerFlujoCaja,
  obtenerMovimientos
};

export default chipaxService;
