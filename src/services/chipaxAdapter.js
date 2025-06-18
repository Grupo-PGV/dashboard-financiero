// chipaxAdapter.js - ADAPTADORES MEJORADOS CON DEBUGGING

/**
 * ✅ ADAPTADOR MEJORADO: DTEs (Cuentas por Cobrar)
 * MEJORAS: Mejor manejo de saldos, debugging detallado
 */
export const adaptarCuentasPorCobrar = (dtes) => {
  console.log('📊 Adaptando DTEs de venta (cuentas por cobrar)...');
  console.log('🔍 INPUT DEBUG:', {
    tipo: typeof dtes,
    esArray: Array.isArray(dtes),
    longitud: dtes?.length || 0,
    primerElemento: dtes?.[0] ? Object.keys(dtes[0]) : null
  });
  
  if (!Array.isArray(dtes)) {
    console.warn('⚠️ adaptarCuentasPorCobrar: datos no son array:', typeof dtes);
    return [];
  }

  if (dtes.length === 0) {
    console.warn('⚠️ adaptarCuentasPorCobrar: array vacío');
    return [];
  }
  
  const resultado = dtes.map((dte, index) => {
    // ✅ MÚLTIPLES ESTRATEGIAS para calcular saldo pendiente
    let saldoPendiente = 0;
    let montoOriginal = 0;
    let montoPagado = 0;
    
    // 1. Obtener monto original de la factura
    montoOriginal = parseFloat(dte.montoTotal || dte.monto_total || dte.total || 0);
    
    // 2. Verificar saldo en objeto Saldo (más confiable)
    if (dte.Saldo && typeof dte.Saldo === 'object') {
      const saldoDeudor = parseFloat(dte.Saldo.saldoDeudor || dte.Saldo.saldo_deudor || 0);
      const saldoAcreedor = parseFloat(dte.Saldo.saldoAcreedor || dte.Saldo.saldo_acreedor || 0);
      
      if (saldoDeudor > 0) {
        saldoPendiente = saldoDeudor;
      } else if (saldoAcreedor > 0) {
        saldoPendiente = 0; // Pagado de más
      } else {
        saldoPendiente = montoOriginal; // Usar monto original si no hay saldo definido
      }
    } else {
      // 3. Fallback: calcular basado en cartolas (pagos)
      if (dte.Cartolas && Array.isArray(dte.Cartolas)) {
        montoPagado = dte.Cartolas.reduce((total, cartola) => {
          return total + (parseFloat(cartola.abono || cartola.monto || 0));
        }, 0);
        saldoPendiente = Math.max(0, montoOriginal - montoPagado);
      } else {
        // 4. Usar monto original como pendiente
        saldoPendiente = montoOriginal;
      }
    }

    // Validar que no sea una factura anulada
    const estaAnulado = dte.anulado === 'S' || dte.anulado === true || dte.estado === 'anulado';
    
    if (estaAnulado) {
      saldoPendiente = 0;
    }

    return {
      id: dte.id || index,
      folio: dte.folio || dte.numero || 'S/N',
      razonSocial: dte.razonSocial || dte.razon_social || dte.cliente || 'Cliente no especificado',
      rutCliente: dte.rut || dte.rut_cliente || 'Sin RUT',
      
      // ✅ CAMPOS PRINCIPALES MEJORADOS
      monto: saldoPendiente,                                            // Saldo realmente pendiente
      montoTotal: montoOriginal,                                        // Monto original de la factura
      montoPagado: montoPagado,                                         // Lo que ya se ha pagado
      montoNeto: parseFloat(dte.montoNeto || dte.monto_neto || 0),
      iva: parseFloat(dte.iva || 0),
      
      // Fechas normalizadas
      fecha: dte.fechaEmision || dte.fecha_emision || dte.fecha || new Date().toISOString().split('T')[0],
      fechaVencimiento: dte.fechaVencimiento || dte.fecha_vencimiento || null,
      fechaEnvio: dte.fechaEnvio || dte.fecha_envio || null,
      
      // Estado calculado de manera más robusta
      estado: estaAnulado ? 'Anulado' : 
              (saldoPendiente <= 0 ? 'Pagado' : 'Pendiente'),
      
      tipo: dte.tipo || dte.tipo_documento || 33,
      moneda: dte.tipoMonedaMonto || dte.moneda || 'CLP',
      
      // Información adicional para debugging
      saldoInfo: dte.Saldo || null,
      cartolasInfo: dte.Cartolas || null,
      descuento: parseFloat(dte.descuento || 0),
      referencias: dte.referencias || null,
      anulado: estaAnulado,
      
      // Metadatos
      origenDatos: 'dtes_venta',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // 🔍 DEBUG DETALLADO: Verificar resultados
  const itemsConSaldo = resultado.filter(item => item.monto > 0);
  const itemsPendientes = resultado.filter(item => item.estado === 'Pendiente');
  const totalPendiente = itemsConSaldo.reduce((sum, item) => sum + item.monto, 0);
  
  console.log('🔍 DEBUG ADAPTADOR DTEs - RESULTADOS:');
  console.log(`  📋 Total items procesados: ${resultado.length}`);
  console.log(`  💰 Items con saldo > 0: ${itemsConSaldo.length}`);
  console.log(`  ⏳ Items con estado 'Pendiente': ${itemsPendientes.length}`);
  console.log(`  💵 Total monto pendiente: ${totalPendiente.toLocaleString('es-CL')}`);
  
  if (itemsConSaldo.length > 0) {
    console.log('  🔍 Primeros 3 con saldo:');
    itemsConSaldo.slice(0, 3).forEach((item, i) => {
      console.log(`    ${i + 1}. Folio ${item.folio}: ${item.monto.toLocaleString('es-CL')} (${item.estado})`);
    });
  }

  if (itemsConSaldo.length === 0) {
    console.warn('⚠️ ADVERTENCIA: No se encontraron DTEs con saldo pendiente');
    console.log('🔍 Analizar campos de saldo en datos originales:');
    if (dtes.length > 0) {
      const ejemploDTE = dtes[0];
      console.log('  - Estructura del primer DTE:', {
        tieneMontoTotal: !!ejemploDTE.montoTotal,
        tieneSaldo: !!ejemploDTE.Saldo,
        tieneCartolas: !!ejemploDTE.Cartolas,
        anulado: ejemploDTE.anulado,
        camposDisponibles: Object.keys(ejemploDTE)
      });
    }
  }
  
  return resultado;
};

/**
 * ✅ ADAPTADOR MEJORADO: Compras (Cuentas por Pagar)
 * MEJORAS: Mejor manejo de fechas, filtrado inteligente
 */
export const adaptarCuentasPorPagar = (compras) => {
  console.log('💸 Adaptando compras (cuentas por pagar)...');
  console.log('🔍 INPUT DEBUG:', {
    tipo: typeof compras,
    esArray: Array.isArray(compras),
    longitud: compras?.length || 0
  });
  
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: datos no son array');
    return [];
  }

  if (compras.length === 0) {
    console.warn('⚠️ adaptarCuentasPorPagar: array vacío');
    return [];
  }
  
  const resultado = compras.map((compra, index) => {
    // ✅ LÓGICA MEJORADA para determinar estado
    const montoTotal = parseFloat(compra.montoTotal || compra.monto_total || compra.total || 0);
    const estaAnulado = compra.anulado === 'S' || compra.anulado === true;
    
    // Verificar múltiples campos para fecha de pago
    const fechaPago = compra.fechaPagoInterna || 
                     compra.fecha_pago_interna || 
                     compra.fechaPago || 
                     compra.fecha_pago || 
                     null;
    
    const tieneFechaPago = fechaPago !== null && fechaPago !== undefined && fechaPago !== '';
    
    // Estado más preciso
    let estado = 'Pendiente';
    let montoPendiente = montoTotal;
    
    if (estaAnulado) {
      estado = 'Anulado';
      montoPendiente = 0;
    } else if (tieneFechaPago) {
      estado = 'Pagado';
      montoPendiente = 0; // Para cálculos, las pagadas no cuentan como pendientes
    }
    
    return {
      id: compra.id || index,
      folio: compra.folio || compra.numero || 'S/N',
      razonSocial: compra.razonSocial || compra.razon_social || compra.proveedor || 'Proveedor no especificado',
      rutProveedor: compra.rutEmisor || compra.rut_emisor || compra.rut || 'Sin RUT',
      proveedor: compra.razonSocial || compra.razon_social || compra.proveedor || 'Proveedor no especificado',
      
      // ✅ CAMPOS PRINCIPALES
      monto: montoPendiente,                                            // Solo pendientes para cálculos
      montoTotal: montoTotal,                                           // Monto original (para referencia)
      montoNeto: parseFloat(compra.montoNeto || compra.monto_neto || 0),
      iva: parseFloat(compra.iva || 0),
      
      // ✅ FECHAS NORMALIZADAS
      fecha: compra.fechaEmision || compra.fecha_emision || compra.fecha || new Date().toISOString().split('T')[0],
      fechaVencimiento: compra.fechaVencimiento || compra.fecha_vencimiento || null,
      fechaPago: fechaPago,
      fechaRecepcion: compra.fechaRecepcion || compra.fecha_recepcion || null,
      
      // ✅ ESTADO Y BANDERAS
      estado: estado,
      estaPagado: tieneFechaPago,
      estaAnulado: estaAnulado,
      
      // Información adicional
      tipo: compra.tipo || compra.tipo_documento || 33,
      tipoCompra: compra.tipoCompra || compra.tipo_compra || 'Del Giro',
      moneda: compra.idMoneda === 1000 || compra.moneda === 'CLP' ? 'CLP' : 'USD',
      descuento: parseFloat(compra.descuento || 0),
      
      // Metadatos útiles
      periodo: compra.periodo || null,
      estadoSII: compra.estado || 'Sin estado',
      eventoReceptor: compra.eventoReceptor || compra.evento_receptor || null,
      
      // Para debugging
      origenDatos: 'compras',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // 🔍 DEBUG: Estadísticas detalladas
  const estadisticas = {
    total: resultado.length,
    pendientes: resultado.filter(c => c.estado === 'Pendiente').length,
    pagadas: resultado.filter(c => c.estado === 'Pagado').length,
    anuladas: resultado.filter(c => c.estado === 'Anulado').length,
    montoTotalPendiente: resultado
      .filter(c => c.estado === 'Pendiente')
      .reduce((sum, c) => sum + c.monto, 0),
    montoTotalGeneral: resultado.reduce((sum, c) => sum + c.montoTotal, 0)
  };
  
  console.log('🔍 DEBUG ADAPTADOR COMPRAS - RESULTADOS:');
  console.log(`  📋 Total compras: ${estadisticas.total}`);
  console.log(`  ⏳ Pendientes: ${estadisticas.pendientes}`);
  console.log(`  ✅ Pagadas: ${estadisticas.pagadas}`);
  console.log(`  ❌ Anuladas: ${estadisticas.anuladas}`);
  console.log(`  💵 Monto pendiente: ${estadisticas.montoTotalPendiente.toLocaleString('es-CL')}`);
  console.log(`  💰 Monto total: ${estadisticas.montoTotalGeneral.toLocaleString('es-CL')}`);
  
  if (resultado.length > 0) {
    const fechaMinima = resultado.reduce((min, c) => c.fecha < min ? c.fecha : min, resultado[0].fecha);
    const fechaMaxima = resultado.reduce((max, c) => c.fecha > max ? c.fecha : max, resultado[0].fecha);
    console.log(`  📅 Rango de fechas: ${fechaMinima} → ${fechaMaxima}`);
  }
  
  return resultado;
};

/**
 * ✅ FUNCIÓN AUXILIAR: Filtrar compras pendientes
 */
export const filtrarComprasPendientes = (compras) => {
  if (!Array.isArray(compras)) return [];
  
  return compras.filter(compra => 
    compra.estado === 'Pendiente' && 
    !compra.estaAnulado &&
    compra.monto > 0
  );
};

/**
 * ✅ FUNCIÓN AUXILIAR: Filtrar por rango de fechas
 */
export const filtrarComprasPorFecha = (compras, fechaInicio, fechaFin) => {
  if (!Array.isArray(compras)) return [];
  
  return compras.filter(compra => {
    const fechaCompra = new Date(compra.fecha);
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    return fechaCompra >= inicio && fechaCompra <= fin;
  });
};

/**
 * ✅ ADAPTADOR: Saldos bancarios (mantener compatible)
 */
export const adaptarSaldosBancarios = (cuentas) => {
  if (!Array.isArray(cuentas)) {
    console.warn('⚠️ adaptarSaldosBancarios: datos no son array');
    return [];
  }

  return cuentas.map((cuenta, index) => ({
    id: cuenta.id || index,
    nombre: cuenta.nombre || cuenta.nombreCuenta || cuenta.alias || `Cuenta ${index + 1}`,
    banco: cuenta.banco || cuenta.nombreBanco || 'Banco no especificado',
    saldo: cuenta.saldoCalculado || cuenta.saldo || cuenta.balance || 0,
    moneda: cuenta.moneda || 'CLP',
    tipo: cuenta.tipo || cuenta.tipoCuenta || 'Corriente',
    ultimaActualizacion: cuenta.ultimaActualizacion || null
  }));
};

// === EXPORTACIONES PARA COMPATIBILIDAD ===
export const adaptarDTEs = adaptarCuentasPorCobrar;
export const adaptarCompras = adaptarCuentasPorPagar;
export const adaptarCuentasCorrientes = adaptarSaldosBancarios;
