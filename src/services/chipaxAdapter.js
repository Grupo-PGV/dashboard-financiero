// === ADAPTADORES CORREGIDOS CON NOMBRES REALES DE CAMPOS ===

/**
 * ✅ ADAPTADOR CORREGIDO: DTEs (Cuentas por Cobrar)
 * CORRECCIÓN: Usar nombres en camelCase que son los reales
 */
export const adaptarCuentasPorCobrar = (dtes) => {
  console.log('📊 Adaptando DTEs de venta (cuentas por cobrar)...');
  
  if (!Array.isArray(dtes)) {
    console.warn('⚠️ adaptarCuentasPorCobrar: datos no son array');
    return [];
  }
  
  const resultado = dtes.map((dte, index) => {
    // ✅ CORRECCIÓN: Usar nombres reales en camelCase
    let saldoPendiente = 0;
    
    // 1. Prioridad: Saldo.saldoDeudor (campo real confirmado)
    if (dte.Saldo && dte.Saldo.saldoDeudor !== undefined) {
      saldoPendiente = parseFloat(dte.Saldo.saldoDeudor) || 0;
    }
    // 2. Fallback: montoTotal (no monto_total)
    else if (dte.montoTotal !== undefined) {
      saldoPendiente = parseFloat(dte.montoTotal) || 0;
    }
    
    return {
      id: dte.id || index,
      folio: dte.folio || 'S/N',
      razonSocial: dte.razonSocial || 'Cliente no especificado',        // ✅ camelCase
      rutCliente: dte.rut || 'Sin RUT',
      monto: saldoPendiente,                                            // ✅ Campo correcto
      montoTotal: parseFloat(dte.montoTotal) || 0,                      // ✅ camelCase
      montoNeto: parseFloat(dte.montoNeto) || 0,                        // ✅ camelCase
      iva: parseFloat(dte.iva) || 0,                                    // ✅ correcto
      fecha: dte.fechaEmision || new Date().toISOString().split('T')[0], // ✅ camelCase
      fechaVencimiento: dte.fechaVencimiento || null,                   // ✅ camelCase
      fechaEnvio: dte.fechaEnvio || null,                               // ✅ camelCase
      tipo: dte.tipo || 33,                                             // ✅ correcto
      estado: dte.anulado === 'S' ? 'Anulado' : (saldoPendiente > 0 ? 'Pendiente' : 'Pagado'),
      moneda: dte.tipoMonedaMonto || 'CLP',                            // ✅ camelCase
      
      // Información de saldo detallada
      saldoInfo: dte.Saldo || null,
      
      // Información adicional
      descuento: parseFloat(dte.descuento) || 0,                       // ✅ correcto
      referencias: dte.referencias || null,                            // ✅ correcto
      anulado: dte.anulado === 'S',                                    // ✅ correcto
      
      // Metadatos
      origenDatos: 'dtes_venta',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // 🔍 DEBUG: Ver qué valores genera el adaptador
  const totalMonto = resultado.reduce((sum, item) => sum + item.monto, 0);
  console.log('🔍 DEBUG ADAPTADOR DTEs:');
  console.log(`  - Total items: ${resultado.length}`);
  console.log(`  - Total monto: ${totalMonto.toLocaleString('es-CL')}`);
  console.log(`  - Primeros 3 montos:`, resultado.slice(0, 3).map(r => ({
    folio: r.folio,
    monto: r.monto,
    saldoInfo: r.saldoInfo
  })));
  
  return resultado;
};

/**
 * ✅ ADAPTADOR CORREGIDO: Compras (Cuentas por Pagar)
 * CORRECCIÓN: Usar nombres reales en camelCase
 */
export const adaptarCuentasPorPagar = (compras) => {
  console.log('💸 Adaptando compras (cuentas por pagar)...');
  
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: datos no son array');
    return [];
  }
  
  const resultado = compras.map((compra, index) => {
    // ✅ CORRECCIÓN: Usar nombres reales en camelCase
    const estaPagado = compra.fechaPagoInterna !== null && compra.fechaPagoInterna !== undefined; // ✅ camelCase
    const estaAnulado = compra.anulado === 'S';
    const estaPendiente = !estaPagado && !estaAnulado;
    
    // El monto pendiente es el total si está pendiente, 0 si está pagado/anulado
    const montoPendiente = estaPendiente ? (parseFloat(compra.montoTotal) || 0) : 0; // ✅ camelCase
    
    return {
      id: compra.id || index,
      folio: compra.folio || 'S/N',
      razonSocial: compra.razonSocial || 'Proveedor no especificado',      // ✅ camelCase
      rutProveedor: compra.rutEmisor || 'Sin RUT',                         // ✅ camelCase
      proveedor: compra.razonSocial || 'Proveedor no especificado',        // ✅ camelCase
      monto: montoPendiente,                                               // ✅ Calculado
      montoTotal: parseFloat(compra.montoTotal) || 0,                      // ✅ camelCase
      montoNeto: parseFloat(compra.montoNeto) || 0,                        // ✅ camelCase
      iva: parseFloat(compra.iva) || 0,                                    // ✅ correcto
      fecha: compra.fechaEmision || new Date().toISOString().split('T')[0], // ✅ camelCase
      fechaVencimiento: compra.fechaVencimiento || null,                   // ✅ camelCase
      fechaPago: compra.fechaPagoInterna || null,                          // ✅ camelCase
      estado: estaAnulado ? 'Anulado' : (estaPagado ? 'Pagado' : 'Pendiente'),
      estadoOriginal: compra.estado || 'recibido',                         // ✅ correcto
      moneda: 'CLP',
      
      // Información adicional
      descuento: parseFloat(compra.descuento) || 0,                        // ✅ correcto
      referencias: compra.referencias || null,                             // ✅ correcto
      archivo: compra.archivo || null,                                     // ✅ correcto
      anulado: estaAnulado,                                                // ✅ correcto
      tipoCompra: compra.tipoCompra || null,                               // ✅ camelCase
      tipo: compra.tipo || null,                                           // ✅ correcto
      
      // Información de categorías si existe
      categorias: compra.categorias || [],                                 // ✅ correcto
      
      // Metadatos
      origenDatos: 'compras',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // 🔍 DEBUG: Ver qué valores genera el adaptador
  const totalMonto = resultado.reduce((sum, item) => sum + item.monto, 0);
  const pendientes = resultado.filter(item => item.monto > 0);
  console.log('🔍 DEBUG ADAPTADOR COMPRAS:');
  console.log(`  - Total items: ${resultado.length}`);
  console.log(`  - Items pendientes: ${pendientes.length}`);
  console.log(`  - Total monto pendiente: ${totalMonto.toLocaleString('es-CL')}`);
  console.log(`  - Primeros 3 estados:`, resultado.slice(0, 3).map(r => ({
    folio: r.folio,
    monto: r.monto,
    estado: r.estado,
    fechaPago: r.fechaPago
  })));
  
  return resultado;
};

/**
 * ✅ ADAPTADOR PARA SALDOS BANCARIOS (sin cambios por ahora)
 */
export const adaptarSaldosBancarios = (cuentasConSaldos) => {
  console.log('🏦 Adaptando saldos bancarios...');
  
  if (!Array.isArray(cuentasConSaldos)) {
    console.warn('⚠️ adaptarSaldosBancarios: datos no son array');
    return [];
  }
  
  return cuentasConSaldos.map((cuenta, index) => {
    let saldo = 0;
    
    if (cuenta.saldoCalculado !== undefined) {
      saldo = parseFloat(cuenta.saldoCalculado) || 0;
    }
    else if (cuenta.Saldo) {
      saldo = parseFloat(cuenta.Saldo.saldo_deudor || cuenta.Saldo.saldo_acreedor || 0);
    }
    else if (cuenta.saldo !== undefined) {
      saldo = parseFloat(cuenta.saldo) || 0;
    }
    
    return {
      id: cuenta.id || index,
      nombre: cuenta.numeroCuenta || `Cuenta ${index + 1}`,
      banco: cuenta.banco || 'Banco no especificado',
      saldo: saldo,
      tipo: cuenta.TipoCuentaCorriente?.tipoCuenta || 'Cuenta Corriente',
      nombreCorto: cuenta.TipoCuentaCorriente?.nombreCorto || 'CC',
      moneda: cuenta.Moneda?.moneda || 'CLP',
    simboloMoneda: cuenta.Moneda?.simbolo || '$',
      decimales: cuenta.Moneda?.decimales || 0,
      
      movimientos: cuenta.movimientos || {
        abonos: 0,
        cargos: 0,
        cantidad: 0,
        ultimaActualizacion: null
      },
      
      origenSaldo: cuenta.saldoCalculado !== undefined ? 'calculado_desde_cartolas' : 'directo',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

// ✅ COMPATIBILIDAD HACIA ATRÁS
export const adaptarCompras = adaptarCuentasPorPagar;
export const adaptarDTEs = adaptarCuentasPorCobrar;
export const adaptarCuentasCorrientes = adaptarSaldosBancarios;

export default {
  adaptarCuentasPorCobrar,
  adaptarCuentasPorPagar,
  adaptarSaldosBancarios,
  
  // Alias para compatibilidad
  adaptarDTEs,
  adaptarCompras,
  adaptarCuentasCorrientes
};
