// === ADAPTADORES CORREGIDOS SEGÚN DOCUMENTACIÓN REAL DE CHIPAX ===

/**
 * ✅ ADAPTADOR CORREGIDO: DTEs (Cuentas por Cobrar)
 * Estructura real según documentación:
 * - monto_por_cobrar: valor pendiente
 * - Saldo.saldo_deudor: saldo pendiente
 * - monto_total: total del documento
 */
export const adaptarCuentasPorCobrar = (dtes) => {
  console.log('📊 Adaptando DTEs de venta (cuentas por cobrar)...');
  
  if (!Array.isArray(dtes)) {
    console.warn('⚠️ adaptarCuentasPorCobrar: datos no son array');
    return [];
  }
  
  return dtes.map((dte, index) => {
    // ✅ CORRECCIÓN: Usar campos reales de la API
    let saldoPendiente = 0;
    
    // 1. Prioridad: monto_por_cobrar (campo real en la API)
    if (dte.monto_por_cobrar !== undefined && dte.monto_por_cobrar !== null) {
      saldoPendiente = parseFloat(dte.monto_por_cobrar) || 0;
    }
    // 2. Alternativa: Saldo.saldo_deudor (campo real en la API)
    else if (dte.Saldo && dte.Saldo.saldo_deudor !== undefined) {
      saldoPendiente = parseFloat(dte.Saldo.saldo_deudor) || 0;
    }
    // 3. Fallback: monto_total si no hay información de saldo
    else if (dte.monto_total !== undefined) {
      saldoPendiente = parseFloat(dte.monto_total) || 0;
    }
    
    return {
      id: dte.id || index,
      folio: dte.folio || 'S/N',
      razonSocial: dte.razon_social || 'Cliente no especificado',
      rutCliente: dte.rut || 'Sin RUT',
      monto: saldoPendiente,                               // ✅ Campo correcto
      montoTotal: parseFloat(dte.monto_total) || 0,        // ✅ Campo real
      montoNeto: parseFloat(dte.monto_neto) || 0,          // ✅ Campo real
      iva: parseFloat(dte.iva) || 0,                       // ✅ Campo real
      fecha: dte.fecha_emision || new Date().toISOString().split('T')[0], // ✅ Campo real
      fechaVencimiento: dte.fecha_vencimiento || null,     // ✅ Campo real
      fechaEnvio: dte.fecha_envio || null,                 // ✅ Campo real
      tipo: dte.tipo || 33,                                // ✅ Campo real
      estado: dte.anulado === 'S' ? 'Anulado' : (saldoPendiente > 0 ? 'Pendiente' : 'Pagado'),
      moneda: dte.tipo_moneda_monto || 'CLP',              // ✅ Campo real
      
      // Información de saldo detallada
      saldoInfo: dte.Saldo || null,
      
      // Información adicional
      descuento: parseFloat(dte.descuento) || 0,           // ✅ Campo real
      referencias: dte.referencias || null,                // ✅ Campo real
      anulado: dte.anulado === 'S',                        // ✅ Campo real
      
      // Metadatos
      origenDatos: 'dtes_venta',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

/**
 * ✅ ADAPTADOR CORREGIDO: Compras (Cuentas por Pagar)
 * Estructura real según documentación:
 * - monto_total: total del documento
 * - fecha_pago_interna: si tiene fecha, está pagado
 * - estado: "recibido" | otros estados
 * - anulado: "S" si está anulado
 */
export const adaptarCuentasPorPagar = (compras) => {
  console.log('💸 Adaptando compras (cuentas por pagar)...');
  
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: datos no son array');
    return [];
  }
  
  return compras.map((compra, index) => {
    // ✅ CORRECCIÓN: Las compras NO tienen monto_por_pagar en la API
    // Lógica: si no tiene fecha_pago_interna y no está anulado, está pendiente
    const estaPagado = compra.fecha_pago_interna !== null && compra.fecha_pago_interna !== undefined;
    const estaAnulado = compra.anulado === 'S';
    const estaPendiente = !estaPagado && !estaAnulado;
    
    // El monto pendiente es el total si está pendiente, 0 si está pagado/anulado
    const montoPendiente = estaPendiente ? (parseFloat(compra.monto_total) || 0) : 0;
    
    return {
      id: compra.id || index,
      folio: compra.folio || 'S/N',
      razonSocial: compra.razon_social || 'Proveedor no especificado',   // ✅ Campo real
      rutProveedor: compra.rut_emisor || 'Sin RUT',                      // ✅ Campo real (rut_emisor)
      proveedor: compra.razon_social || 'Proveedor no especificado',     // ✅ Alias
      monto: montoPendiente,                                             // ✅ Calculado
      montoTotal: parseFloat(compra.monto_total) || 0,                   // ✅ Campo real
      montoNeto: parseFloat(compra.monto_neto) || 0,                     // ✅ Campo real
      iva: parseFloat(compra.iva) || 0,                                  // ✅ Campo real
      fecha: compra.fecha_emision || new Date().toISOString().split('T')[0], // ✅ Campo real
      fechaVencimiento: compra.fecha_vencimiento || null,                // ✅ Campo real
      fechaPago: compra.fecha_pago_interna || null,                      // ✅ Campo real
      estado: estaAnulado ? 'Anulado' : (estaPagado ? 'Pagado' : 'Pendiente'), // ✅ Calculado
      estadoOriginal: compra.estado || 'recibido',                       // ✅ Campo real
      moneda: 'CLP', // Las compras usan moneda_id pero no está en respuesta
      
      // Información adicional
      descuento: parseFloat(compra.descuento) || 0,                      // ✅ Campo real
      referencias: compra.referencias || null,                           // ✅ Campo real
      archivo: compra.archivo || null,                                   // ✅ Campo real
      anulado: estaAnulado,                                              // ✅ Campo real
      tipoCompra: compra.tipo_compra || null,                            // ✅ Campo real
      tipo: compra.tipo || null,                                         // ✅ Campo real
      
      // Información de categorías si existe
      categorias: compra.categorias || [],                               // ✅ Campo real
      
      // Metadatos
      origenDatos: 'compras',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

/**
 * ✅ ADAPTADOR CORREGIDO: Saldos Bancarios
 * Problema: Las cuentas corrientes NO tienen saldos directamente
 * Solución: Necesitamos usar /flujo-caja/cartolas para obtener saldos reales
 */
export const adaptarSaldosBancarios = (cuentasConSaldos) => {
  console.log('🏦 Adaptando saldos bancarios...');
  
  if (!Array.isArray(cuentasConSaldos)) {
    console.warn('⚠️ adaptarSaldosBancarios: datos no son array');
    return [];
  }
  
  return cuentasConSaldos.map((cuenta, index) => {
    // ✅ CORRECCIÓN: Buscar saldo en múltiples lugares
    let saldo = 0;
    
    // 1. Si viene calculado desde cartolas
    if (cuenta.saldoCalculado !== undefined) {
      saldo = parseFloat(cuenta.saldoCalculado) || 0;
    }
    // 2. Si tiene objeto Saldo (desde cartolas)
    else if (cuenta.Saldo) {
      // En cartolas, el saldo viene en estructura específica
      saldo = parseFloat(cuenta.Saldo.saldo_deudor || cuenta.Saldo.saldo_acreedor || 0);
    }
    // 3. Si tiene campo saldo directo
    else if (cuenta.saldo !== undefined) {
      saldo = parseFloat(cuenta.saldo) || 0;
    }
    
    return {
      id: cuenta.id || index,
      nombre: cuenta.numeroCuenta || `Cuenta ${index + 1}`,              // ✅ Campo real
      banco: cuenta.banco || 'Banco no especificado',                    // ✅ Campo real
      saldo: saldo,                                                       // ✅ Calculado correctamente
      tipo: cuenta.TipoCuentaCorriente?.tipoCuenta || 'Cuenta Corriente', // ✅ Campo real
      nombreCorto: cuenta.TipoCuentaCorriente?.nombreCorto || 'CC',       // ✅ Campo real
      moneda: cuenta.Moneda?.moneda || 'CLP',                            // ✅ Campo real
      simboloMoneda: cuenta.Moneda?.simbolo || '$',                      // ✅ Campo real
      decimales: cuenta.Moneda?.decimales || 0,                         // ✅ Campo real
      
      // Información adicional de movimientos si existe
      movimientos: cuenta.movimientos || {
        abonos: 0,
        cargos: 0,
        cantidad: 0,
        ultimaActualizacion: null
      },
      
      // Metadatos
      origenSaldo: cuenta.saldoCalculado !== undefined ? 'calculado_desde_cartolas' : 'directo',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

/**
 * ✅ NUEVA FUNCIÓN: Procesar saldos desde cartolas
 * Esta función debe ser llamada desde el chipaxService
 */
export const procesarSaldosDesdeCartolas = (cartolas, cuentasCorrientes) => {
  console.log('💰 Procesando saldos desde cartolas...');
  
  if (!Array.isArray(cartolas) || !Array.isArray(cuentasCorrientes)) {
    console.warn('⚠️ Datos inválidos para procesar saldos');
    return cuentasCorrientes.map(cuenta => ({ ...cuenta, saldoCalculado: 0 }));
  }
  
  // Crear mapa de saldos por cuenta corriente
  const saldosPorCuenta = {};
  
  cartolas.forEach(cartola => {
    if (cartola.cuenta_corriente_id && cartola.Saldo) {
      const cuentaId = cartola.cuenta_corriente_id;
      
      if (!saldosPorCuenta[cuentaId]) {
        saldosPorCuenta[cuentaId] = {
          saldoDeudor: 0,
          saldoAcreedor: 0,
          ultimaFecha: null
        };
      }
      
      // Tomar el último saldo (por fecha)
      if (cartola.Saldo.last_record === 1) {
        saldosPorCuenta[cuentaId].saldoDeudor = parseFloat(cartola.Saldo.saldo_deudor) || 0;
        saldosPorCuenta[cuentaId].saldoAcreedor = parseFloat(cartola.Saldo.saldo_acreedor) || 0;
        saldosPorCuenta[cuentaId].ultimaFecha = cartola.fecha;
      }
    }
  });
  
  // Combinar cuentas con saldos
  return cuentasCorrientes.map(cuenta => ({
    ...cuenta,
    saldoCalculado: saldosPorCuenta[cuenta.id]?.saldoDeudor || 
                   saldosPorCuenta[cuenta.id]?.saldoAcreedor || 0,
    ultimaActualizacion: saldosPorCuenta[cuenta.id]?.ultimaFecha || null
  }));
};

// ✅ COMPATIBILIDAD HACIA ATRÁS
export const adaptarCompras = adaptarCuentasPorPagar;
export const adaptarDTEs = adaptarCuentasPorCobrar;
export const adaptarCuentasCorrientes = adaptarSaldosBancarios;

export default {
  adaptarCuentasPorCobrar,
  adaptarCuentasPorPagar,
  adaptarSaldosBancarios,
  procesarSaldosDesdeCartolas,
  
  // Alias para compatibilidad
  adaptarDTEs,
  adaptarCompras,
  adaptarCuentasCorrientes
};
