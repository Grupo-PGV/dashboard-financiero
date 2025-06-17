// chipaxAdapter.js - Adaptador para estructura real de la API Chipax

/**
 * ADAPTADOR: Saldos Bancarios (Cuentas Corrientes + Cartolas)
 * Estructura real de cuentas corrientes:
 * {id, numeroCuenta, banco, TipoCuentaCorriente: {tipoCuenta}, Moneda: {moneda, simbolo}}
 */
export const adaptarSaldosBancarios = (cuentasConSaldos) => {
  console.log('🏦 Adaptando saldos bancarios...');
  
  if (!Array.isArray(cuentasConSaldos)) {
    console.warn('⚠️ adaptarSaldosBancarios: datos no son array');
    return [];
  }
  
  return cuentasConSaldos.map((cuenta, index) => {
    const saldo = cuenta.saldoCalculado || 0;
    
    return {
      id: cuenta.id || index,
      nombre: cuenta.numeroCuenta || `Cuenta ${index + 1}`,
      banco: cuenta.banco || 'Banco no especificado',
      saldo: saldo,
      tipo: cuenta.TipoCuentaCorriente?.tipoCuenta || 'Cuenta Corriente',
      moneda: cuenta.Moneda?.moneda || 'CLP',
      simboloMoneda: cuenta.Moneda?.simbolo || '$',
      
      // Información adicional de movimientos
      movimientos: {
        abonos: cuenta.movimientos?.totalAbonos || 0,
        cargos: cuenta.movimientos?.totalCargos || 0,
        cantidad: cuenta.movimientos?.movimientos || 0,
        ultimaActualizacion: cuenta.movimientos?.ultimaFecha || null
      },
      
      // Metadatos
      origenSaldo: 'calculado_desde_cartolas',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

/**
 * ADAPTADOR: DTEs de Venta (Cuentas por Cobrar)
 * Estructura real: {id, folio, razon_social, rut, monto_total, monto_por_cobrar, Saldo: {saldo_deudor, saldo_acreedor}}
 */
export const adaptarCuentasPorCobrar = (dtes) => {
  console.log('📊 Adaptando DTEs de venta (cuentas por cobrar)...');
  
  if (!Array.isArray(dtes)) {
    console.warn('⚠️ adaptarCuentasPorCobrar: datos no son array');
    return [];
  }
  
  return dtes.map((dte, index) => {
    // Extraer saldo pendiente con prioridad
    let saldoPendiente = 0;
    
    // 1. Prioridad: monto_por_cobrar
    if (dte.monto_por_cobrar !== undefined && dte.monto_por_cobrar !== null) {
      saldoPendiente = parseFloat(dte.monto_por_cobrar) || 0;
    }
    // 2. Alternativa: Saldo.saldo_deudor
    else if (dte.Saldo && dte.Saldo.saldo_deudor !== undefined) {
      saldoPendiente = parseFloat(dte.Saldo.saldo_deudor) || 0;
    }
    // 3. Fallback: monto_total
    else if (dte.monto_total !== undefined) {
      saldoPendiente = parseFloat(dte.monto_total) || 0;
    }
    
    return {
      id: dte.id || index,
      folio: dte.folio || 'S/N',
      razonSocial: dte.razon_social || 'Cliente no especificado',
      rutCliente: dte.rut || 'Sin RUT',
      monto: saldoPendiente,
      montoTotal: parseFloat(dte.monto_total) || 0,
      montoNeto: parseFloat(dte.monto_neto) || 0,
      iva: parseFloat(dte.iva) || 0,
      fecha: dte.fecha_emision || new Date().toISOString().split('T')[0],
      fechaVencimiento: dte.fecha_vencimiento || null,
      fechaEnvio: dte.fecha_envio || null,
      tipo: dte.tipo || 33,
      tipoDescripcion: obtenerTipoDocumento(dte.tipo),
      estado: determinarEstadoDTE(dte),
      moneda: dte.tipo_moneda_monto || 'CLP',
      
      // Información de saldo detallada
      saldoInfo: dte.Saldo || null,
      
      // Información adicional
      descuento: parseFloat(dte.descuento) || 0,
      referencias: dte.referencias || null,
      anulado: dte.anulado === 'S',
      
      // Metadatos
      origenDatos: 'dtes_venta',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

/**
 * ADAPTADOR: Compras (Cuentas por Pagar)
 * Estructura real: {id, folio, razon_social, rut_emisor, monto_total, fecha_pago_interna, estado}
 */
export const adaptarCuentasPorPagar = (compras) => {
  console.log('💸 Adaptando compras (cuentas por pagar)...');
  
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: datos no son array');
    return [];
  }
  
  return compras.map((compra, index) => {
    // Extraer información del proveedor
    const proveedor = compra.razon_social || 'Proveedor no especificado';
    const rutProveedor = compra.rut_emisor || 'Sin RUT';
    
    // Monto pendiente (usar monto_total si no hay fecha de pago)
    const montoPendiente = parseFloat(compra.monto_total) || 0;
    
    return {
      id: compra.id || index,
      numero: compra.folio || `C-${index + 1}`,
      fecha: compra.fecha_emision || new Date().toISOString().split('T')[0],
      
      // ✅ CORRECCIÓN PRINCIPAL: proveedor como string
      proveedor: proveedor,
      
      // ✅ Información detallada del proveedor en objeto separado
      proveedorInfo: {
        nombre: proveedor,
        rut: rutProveedor,
        razonSocial: compra.razon_social
      },
      
      monto: montoPendiente,
      montoTotal: parseFloat(compra.monto_total) || 0,
      montoNeto: parseFloat(compra.monto_neto) || 0,
      iva: parseFloat(compra.iva) || 0,
      descuento: parseFloat(compra.descuento) || 0,
      tipo: compra.tipo || 'Compra',
      tipoDescripcion: obtenerTipoDocumento(compra.tipo),
      estado: compra.estado || 'recibido',
      
      // Fechas importantes
      fechaVencimiento: compra.fecha_vencimiento || null,
      fechaPago: compra.fecha_pago_interna || null,
      fechaRecepcion: compra.fecha_recepcion || null,
      periodo: compra.periodo || null,
      
      // Información adicional
      referencias: compra.referencias || null,
      archivo: compra.archivo || null,
      anulado: compra.anulado === 'S',
      tipoCompra: compra.tipo_compra || null,
      
      // Información de categorías si existe
      categorias: compra.categorias || [],
      
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
    razonSocial: cliente.razon_social || cliente.nombre || 'Sin nombre',
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
 * Estructura real: {abono, cargo, descripcion, fecha, cuenta_corriente_id, Dtes, Compras, etc.}
 */
export const adaptarFlujoCaja = (cartolas) => {
  console.log('💵 Adaptando flujo de caja...');
  
  if (!Array.isArray(cartolas)) {
    console.warn('⚠️ adaptarFlujoCaja: datos no son array');
    return [];
  }
  
  return cartolas.map((cartola, index) => {
    const abono = parseFloat(cartola.abono) || 0;
    const cargo = parseFloat(cartola.cargo) || 0;
    const monto = abono - cargo; // Neto del movimiento
    
    return {
      id: cartola.id || index,
      fecha: cartola.fecha || new Date().toISOString().split('T')[0],
      tipo: monto > 0 ? 'ingreso' : 'egreso',
      monto: Math.abs(monto),
      abono: abono,
      cargo: cargo,
      descripcion: cartola.descripcion || 'Sin descripción',
      cuentaCorriente: cartola.cuenta_corriente_id || null,
      
      // Documentos relacionados
      documentosRelacionados: {
        dtes: cartola.Dtes?.length || 0,
        compras: cartola.Compras?.length || 0,
        ots: cartola.Ots?.length || 0,
        gastos: cartola.Gasto?.length || 0,
        honorarios: cartola.Honorario?.length || 0
      },
      
      // Metadatos
      origenDatos: 'flujo_caja_cartolas',
      fechaProcesamiento: new Date().toISOString()
    };
  });
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
 * Determina el estado de un DTE basado en sus campos
 */
function determinarEstadoDTE(dte) {
  if (dte.anulado === 'S') {
    return 'Anulado';
  }
  
  if (dte.monto_por_cobrar && parseFloat(dte.monto_por_cobrar) > 0) {
    return 'Pendiente';
  }
  
  if (dte.Saldo && dte.Saldo.saldo_deudor && parseFloat(dte.Saldo.saldo_deudor) > 0) {
    return 'Pendiente';
  }
  
  return 'Pagado';
}

/**
 * Función de prueba para verificar adaptadores
 */
export const probarAdaptadores = () => {
  console.log('🧪 Probando adaptadores con estructura real...');
  
  // Datos de prueba con estructura real
  const cuentaPrueba = [{
    id: 1,
    numeroCuenta: '12345-6',
    banco: 'Banco de Chile',
    TipoCuentaCorriente: { tipoCuenta: 'Cuenta Corriente' },
    Moneda: { moneda: 'CLP', simbolo: '$' },
    saldoCalculado: 1500000
  }];
  
  const dtePrueba = [{
    id: 1,
    folio: 1001,
    razon_social: 'EPYSA BUSES LIMITADA',
    rut: '12345678-9',
    monto_total: 1000000,
    monto_por_cobrar: 500000,
    Saldo: { saldo_deudor: 500000, saldo_acreedor: 0 }
  }];
  
  const compraPrueba = [{
    id: 1,
    folio: 2001,
    razon_social: 'PROVEEDORES S.A.',
    rut_emisor: '87654321-0',
    monto_total: 300000,
    estado: 'recibido'
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
  probarAdaptadores
};
