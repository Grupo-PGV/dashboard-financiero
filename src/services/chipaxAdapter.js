// chipaxAdapter.js - Adaptador corregido para los endpoints oficiales

/**
 * ADAPTADOR PRINCIPAL: Saldos Bancarios (Cuentas Corrientes + Cartolas)
 * Procesa cuentas corrientes con saldos calculados desde cartolas
 */
export const adaptarSaldosBancarios = (cuentasConSaldos) => {
  console.log('🏦 Adaptando saldos bancarios...');
  
  if (!Array.isArray(cuentasConSaldos)) {
    console.warn('⚠️ adaptarSaldosBancarios: datos no son array');
    return [];
  }
  
  return cuentasConSaldos.map((cuenta, index) => {
    // Usar el saldo calculado desde cartolas
    const saldo = cuenta.saldoCalculado || 0;
    
    return {
      id: cuenta.id || index,
      nombre: cuenta.numeroCuenta || cuenta.nombre || `Cuenta ${index + 1}`,
      banco: cuenta.banco || cuenta.Banco?.nombre || 'Banco no especificado',
      saldo: saldo,
      tipo: cuenta.TipoCuentaCorriente?.tipoCuenta || 'Cuenta Corriente',
      moneda: cuenta.Moneda?.moneda || 'CLP',
      simboloMoneda: cuenta.Moneda?.simbolo || '$',
      
      // Información adicional de movimientos
      movimientos: cuenta.movimientos || {
        ingresos: 0,
        egresos: 0,
        ultimaActualizacion: null
      },
      
      // Metadatos
      origenSaldo: 'calculado_desde_cartolas',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

/**
 * ADAPTADOR: DTEs de Venta (Cuentas por Cobrar)
 * Endpoint: /dtes
 */
export const adaptarCuentasPorCobrar = (dtes) => {
  console.log('📊 Adaptando DTEs de venta (cuentas por cobrar)...');
  
  if (!Array.isArray(dtes)) {
    console.warn('⚠️ adaptarCuentasPorCobrar: datos no son array');
    return [];
  }
  
  return dtes.map((dte, index) => {
    // Extraer saldo pendiente
    let saldoPendiente = 0;
    
    if (dte.Saldo && dte.Saldo.saldoDeudor !== undefined) {
      saldoPendiente = parseFloat(dte.Saldo.saldoDeudor) || 0;
    } else if (dte.montoTotal !== undefined) {
      saldoPendiente = parseFloat(dte.montoTotal) || 0;
    }
    
    // Extraer información del cliente
    let cliente = 'Cliente no especificado';
    let rutCliente = 'Sin RUT';
    
    if (dte.ClienteProveedor) {
      cliente = dte.ClienteProveedor.razonSocial || dte.ClienteProveedor.nombre || cliente;
      rutCliente = dte.ClienteProveedor.rut || rutCliente;
    } else if (dte.ClienteNormalizado) {
      cliente = dte.ClienteNormalizado.razonSocial || dte.ClienteNormalizado.nombre || cliente;
      rutCliente = dte.ClienteNormalizado.rut || rutCliente;
    } else if (dte.razonSocial) {
      cliente = dte.razonSocial;
      rutCliente = dte.rutEmisor || rutCliente;
    }
    
    return {
      id: dte.id || index,
      folio: dte.folio || 'S/N',
      razonSocial: cliente,
      rutCliente: rutCliente,
      monto: saldoPendiente,
      montoTotal: parseFloat(dte.montoTotal) || 0,
      fecha: dte.fecha || dte.fechaEmision || new Date().toISOString().split('T')[0],
      fechaVencimiento: dte.fechaVencimiento || null,
      tipo: dte.tipo || 33, // 33 = Factura electrónica
      tipoDescripcion: obtenerTipoDocumento(dte.tipo),
      estado: dte.estado || 'Pendiente',
      moneda: dte.Moneda?.moneda || 'CLP',
      
      // Información de saldo detallada
      saldoInfo: dte.Saldo || null,
      
      // Metadatos
      origenDatos: 'dtes_venta',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

/**
 * ADAPTADOR: Compras (Cuentas por Pagar)
 * Endpoint: /compras
 */
export const adaptarCuentasPorPagar = (compras) => {
  console.log('💸 Adaptando compras (cuentas por pagar)...');
  
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: datos no son array');
    return [];
  }
  
  return compras.map((compra, index) => {
    // Extraer monto pendiente
    let montoPendiente = 0;
    
    if (compra.Saldo && compra.Saldo.saldoAcreedor !== undefined) {
      montoPendiente = parseFloat(compra.Saldo.saldoAcreedor) || 0;
    } else if (compra.montoTotal !== undefined) {
      montoPendiente = parseFloat(compra.montoTotal) || 0;
    }
    
    // Extraer información del proveedor
    let proveedor = 'Proveedor no especificado';
    let rutProveedor = 'Sin RUT';
    
    if (compra.ClienteProveedor) {
      proveedor = compra.ClienteProveedor.razonSocial || compra.ClienteProveedor.nombre || proveedor;
      rutProveedor = compra.ClienteProveedor.rut || rutProveedor;
    } else if (compra.ProveedorNormalizado) {
      proveedor = compra.ProveedorNormalizado.razonSocial || compra.ProveedorNormalizado.nombre || proveedor;
      rutProveedor = compra.ProveedorNormalizado.rut || rutProveedor;
    } else if (compra.razonSocial) {
      proveedor = compra.razonSocial;
      rutProveedor = compra.rutEmisor || rutProveedor;
    }
    
    return {
      id: compra.id || index,
      numero: compra.folio || compra.numero || `C-${index + 1}`,
      fecha: compra.fecha || compra.fechaEmision || new Date().toISOString().split('T')[0],
      
      // ✅ CORRECCIÓN PRINCIPAL: proveedor como string
      proveedor: proveedor,
      
      // ✅ Información detallada del proveedor en objeto separado
      proveedorInfo: {
        nombre: proveedor,
        rut: rutProveedor,
        razonSocial: compra.razonSocial
      },
      
      monto: montoPendiente,
      montoTotal: parseFloat(compra.montoTotal) || 0,
      moneda: compra.Moneda?.moneda || 'CLP',
      tipo: compra.tipo || compra.tipoDocumento || 'Compra',
      tipoDescripcion: obtenerTipoDocumento(compra.tipo),
      estado: compra.estado || 'Pendiente',
      
      // Fechas importantes
      fechaVencimiento: compra.fechaVencimiento || null,
      fechaPago: compra.fechaPago || compra.fechaPagoInterna || null,
      
      // Información de saldo detallada
      saldoInfo: compra.Saldo || null,
      
      // Metadatos
      origenDatos: 'compras',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

/**
 * ADAPTADOR: Clientes
 * Endpoint: /clientes
 */
export const adaptarClientes = (clientes) => {
  console.log('👥 Adaptando clientes...');
  
  if (!Array.isArray(clientes)) {
    console.warn('⚠️ adaptarClientes: datos no son array');
    return [];
  }
  
  return clientes.map((cliente, index) => ({
    id: cliente.id || index,
    razonSocial: cliente.razonSocial || cliente.nombre || 'Sin nombre',
    rut: cliente.rut || 'Sin RUT',
    giro: cliente.giro || 'Sin especificar',
    direccion: cliente.direccion || 'Sin dirección',
    ciudad: cliente.ciudad || 'Sin ciudad',
    telefono: cliente.telefono || null,
    email: cliente.email || null,
    
    // Metadatos
    origenDatos: 'clientes',
    fechaProcesamiento: new Date().toISOString()
  }));
};

/**
 * ADAPTADOR: Flujo de Caja (Cartolas)
 * Endpoint: /flujo-caja/cartolas
 */
export const adaptarFlujoCaja = (cartolas) => {
  console.log('💵 Adaptando flujo de caja...');
  
  if (!Array.isArray(cartolas)) {
    console.warn('⚠️ adaptarFlujoCaja: datos no son array');
    return [];
  }
  
  return cartolas.map((cartola, index) => ({
    id: cartola.id || index,
    fecha: cartola.fecha || new Date().toISOString().split('T')[0],
    tipo: cartola.tipo || 'movimiento',
    monto: parseFloat(cartola.monto) || 0,
    descripcion: cartola.descripcion || cartola.detalle || 'Sin descripción',
    cuentaCorriente: cartola.cuentaCorriente || null,
    categoria: cartola.categoria || 'Sin categoría',
    referencia: cartola.referencia || null,
    
    // Metadatos
    origenDatos: 'flujo_caja_cartolas',
    fechaProcesamiento: new Date().toISOString()
  }));
};

/**
 * ADAPTADOR: Movimientos
 * Endpoint: /movimientos
 */
export const adaptarMovimientos = (movimientos) => {
  console.log('🔄 Adaptando movimientos...');
  
  if (!Array.isArray(movimientos)) {
    console.warn('⚠️ adaptarMovimientos: datos no son array');
    return [];
  }
  
  return movimientos.map((movimiento, index) => ({
    id: movimiento.id || index,
    fecha: movimiento.fecha || new Date().toISOString().split('T')[0],
    tipo: movimiento.tipo || 'movimiento',
    monto: parseFloat(movimiento.monto) || 0,
    descripcion: movimiento.descripcion || 'Sin descripción',
    cuenta: movimiento.cuenta || 'Sin cuenta',
    documento: movimiento.documento || null,
    
    // Metadatos
    origenDatos: 'movimientos',
    fechaProcesamiento: new Date().toISOString()
  }));
};

// === FUNCIONES AUXILIARES ===

/**
 * Obtiene descripción del tipo de documento tributario
 */
function obtenerTipoDocumento(tipo) {
  const tipos = {
    33: 'Factura Electrónica',
    34: 'Factura No Afecta Electrónica',
    39: 'Boleta Electrónica',
    41: 'Boleta No Afecta Electrónica',
    46: 'Factura de Compra Electrónica',
    52: 'Guía de Despacho Electrónica',
    56: 'Nota de Débito Electrónica',
    61: 'Nota de Crédito Electrónica'
  };
  
  return tipos[tipo] || `Documento Tipo ${tipo}`;
}

/**
 * Función de prueba para verificar adaptadores
 */
export const probarAdaptadores = () => {
  console.log('🧪 Probando adaptadores...');
  
  // Datos de prueba
  const cuentaPrueba = [{
    id: 1,
    numeroCuenta: '12345',
    banco: 'Banco de Chile',
    saldoCalculado: 1000000,
    movimientos: { ingresos: 2000000, egresos: 1000000 }
  }];
  
  const dtePrueba = [{
    id: 1,
    folio: 'F001',
    razonSocial: 'Cliente Test',
    Saldo: { saldoDeudor: 500000 }
  }];
  
  const compraPrueba = [{
    id: 1,
    folio: 'C001',
    razonSocial: 'Proveedor Test',
    Saldo: { saldoAcreedor: 300000 }
  }];
  
  const resultados = {
    saldos: adaptarSaldosBancarios(cuentaPrueba),
    porCobrar: adaptarCuentasPorCobrar(dtePrueba),
    porPagar: adaptarCuentasPorPagar(compraPrueba)
  };
  
  console.log('✅ Resultados de prueba:', resultados);
  
  // Verificar que proveedor sea string
  const proveedorEsString = resultados.porPagar.every(c => typeof c.proveedor === 'string');
  console.log('✅ Proveedores son strings:', proveedorEsString);
  
  return resultados;
};

// Exportaciones
export default {
  adaptarSaldosBancarios,
  adaptarCuentasPorCobrar,
  adaptarCuentasPorPagar,
  adaptarClientes,
  adaptarFlujoCaja,
  adaptarMovimientos,
  probarAdaptadores
};
