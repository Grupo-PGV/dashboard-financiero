// === ADAPTADORES CORREGIDOS PARA EL DASHBOARD ===

/**
 * ✅ ADAPTADOR CORREGIDO: DTEs (Cuentas por Cobrar)
 * SOLUCIÓN: Usar siempre montoTotal como base y validar saldo real
 */
export const adaptarCuentasPorCobrar = (dtes) => {
  console.log('📊 Adaptando DTEs de venta (cuentas por cobrar)...');
  
  if (!Array.isArray(dtes)) {
    console.warn('⚠️ adaptarCuentasPorCobrar: datos no son array');
    return [];
  }
  
  const resultado = dtes.map((dte, index) => {
    // ✅ SOLUCIÓN PRINCIPAL: Usar montoTotal como base
    let montoFactura = parseFloat(dte.montoTotal) || 0;
    let saldoPendiente = montoFactura; // Por defecto, toda la factura está pendiente
    
    // Verificar si hay información de saldo para determinar pagos
    if (dte.Saldo) {
      const saldoDeudor = parseFloat(dte.Saldo.saldoDeudor) || 0;
      const saldoAcreedor = parseFloat(dte.Saldo.saldoAcreedor) || 0;
      
      // Si hay saldo deudor, usar ese valor (más preciso)
      if (saldoDeudor > 0) {
        saldoPendiente = saldoDeudor;
      }
      // Si hay saldo acreedor, significa que se pagó de más
      else if (saldoAcreedor > 0) {
        saldoPendiente = 0; // Está pagada
      }
    }
    
    // Verificar si hay cartolas (pagos registrados)
    let montoPagado = 0;
    if (dte.Cartolas && Array.isArray(dte.Cartolas)) {
      montoPagado = dte.Cartolas.reduce((total, cartola) => {
        return total + (parseFloat(cartola.abono) || 0);
      }, 0);
      
      // Si hay pagos, restar del monto total
      if (montoPagado > 0) {
        saldoPendiente = Math.max(0, montoFactura - montoPagado);
      }
    }
    
    return {
      id: dte.id || index,
      folio: dte.folio || 'S/N',
      razonSocial: dte.razonSocial || 'Cliente no especificado',
      rutCliente: dte.rut || 'Sin RUT',
      
      // ✅ CAMPOS PRINCIPALES CORREGIDOS
      monto: saldoPendiente,                                            // Lo que realmente está pendiente
      montoTotal: montoFactura,                                         // Monto original de la factura
      montoPagado: montoPagado,                                         // Lo que ya se ha pagado
      montoNeto: parseFloat(dte.montoNeto) || 0,
      iva: parseFloat(dte.iva) || 0,
      
      // Fechas
      fecha: dte.fechaEmision || new Date().toISOString().split('T')[0],
      fechaVencimiento: dte.fechaVencimiento || null,
      fechaEnvio: dte.fechaEnvio || null,
      
      // Estado calculado
      estado: dte.anulado === 'S' ? 'Anulado' : 
              (saldoPendiente <= 0 ? 'Pagado' : 'Pendiente'),
      
      tipo: dte.tipo || 33,
      moneda: dte.tipoMonedaMonto || 'CLP',
      
      // Información adicional para debugging
      saldoInfo: dte.Saldo || null,
      cartolasInfo: dte.Cartolas || null,
      descuento: parseFloat(dte.descuento) || 0,
      referencias: dte.referencias || null,
      anulado: dte.anulado === 'S',
      
      // Metadatos
      origenDatos: 'dtes_venta',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // 🔍 DEBUG: Verificar resultados
  const totalPendiente = resultado.reduce((sum, item) => sum + item.monto, 0);
  const itemsConMonto = resultado.filter(item => item.monto > 0);
  
  console.log('🔍 DEBUG ADAPTADOR DTEs (CORREGIDO):');
  console.log(`  - Total items: ${resultado.length}`);
  console.log(`  - Items con saldo pendiente: ${itemsConMonto.length}`);
  console.log(`  - Total monto pendiente: ${totalPendiente.toLocaleString('es-CL')}`);
  console.log(`  - Primeros 3 con saldo:`, itemsConMonto.slice(0, 3).map(r => ({
    folio: r.folio,
    montoTotal: r.montoTotal,
    montoPagado: r.montoPagado,
    saldoPendiente: r.monto,
    estado: r.estado
  })));
  
  return resultado;
};

/**
 * ✅ ADAPTADOR MEJORADO: Compras (Cuentas por Pagar)
 * SOLUCIÓN: Mostrar TODAS las compras y permitir filtrado manual
 */
export const adaptarCuentasPorPagar = (compras) => {
  console.log('💸 Adaptando compras (cuentas por pagar)...');
  
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: datos no son array');
    return [];
  }
  
  const resultado = compras.map((compra, index) => {
    // ✅ CAMBIO PRINCIPAL: Mostrar todas las compras con información completa
    const montoTotal = parseFloat(compra.montoTotal) || 0;
    const estaAnulado = compra.anulado === 'S';
    const tieneFechaPago = compra.fechaPagoInterna !== null && compra.fechaPagoInterna !== undefined;
    
    // Estado más descriptivo
    let estado = 'Pendiente';
    let montoPendiente = montoTotal;
    
    if (estaAnulado) {
      estado = 'Anulado';
      montoPendiente = 0;
    } else if (tieneFechaPago) {
      estado = 'Pagado';
      // ✅ IMPORTANTE: Para el filtrado manual, mostrar el monto aunque esté pagado
      // El usuario puede filtrar por fecha para ver solo las pendientes
      montoPendiente = montoTotal; // Mostrar monto original para referencia
    }
    
    return {
      id: compra.id || index,
      folio: compra.folio || 'S/N',
      razonSocial: compra.razonSocial || 'Proveedor no especificado',
      rutProveedor: compra.rutEmisor || 'Sin RUT',
      proveedor: compra.razonSocial || 'Proveedor no especificado',
      
      // ✅ CAMPOS PRINCIPALES
      monto: montoPendiente,                                            // Monto de referencia
      montoTotal: montoTotal,                                           // Monto original
      montoNeto: parseFloat(compra.montoNeto) || 0,
      iva: parseFloat(compra.iva) || 0,
      
      // ✅ FECHAS IMPORTANTES PARA FILTRADO
      fecha: compra.fechaEmision || new Date().toISOString().split('T')[0],
      fechaVencimiento: compra.fechaVencimiento || null,
      fechaPago: compra.fechaPagoInterna || null,                       // ✅ Clave para filtrado
      fechaRecepcion: compra.fechaRecepcion || null,
      
      // ✅ ESTADO DETALLADO
      estado: estado,
      estaPagado: tieneFechaPago,                                       // Booleano para filtros
      estaAnulado: estaAnulado,
      
      // Información adicional
      tipo: compra.tipo || 33,
      tipoCompra: compra.tipoCompra || 'Del Giro',
      moneda: compra.idMoneda === 1000 ? 'CLP' : 'USD',
      descuento: parseFloat(compra.descuento) || 0,
      
      // Metadatos útiles
      periodo: compra.periodo || null,
      estadoSII: compra.estado || 'Sin estado',
      eventoReceptor: compra.eventoReceptor || null,
      
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
  
  console.log('🔍 DEBUG ADAPTADOR COMPRAS (MEJORADO):');
  console.log(`  - Total compras: ${estadisticas.total}`);
  console.log(`  - Pendientes: ${estadisticas.pendientes}`);
  console.log(`  - Pagadas: ${estadisticas.pagadas}`);
  console.log(`  - Anuladas: ${estadisticas.anuladas}`);
  console.log(`  - Monto total pendiente: ${estadisticas.montoTotalPendiente.toLocaleString('es-CL')}`);
  console.log(`  - Últimas 3 compras:`, resultado.slice(-3).map(c => ({
    folio: c.folio,
    fecha: c.fecha,
    fechaPago: c.fechaPago,
    estado: c.estado,
    monto: c.monto
  })));
  
  return resultado;
};

/**
 * ✅ FUNCIÓN AUXILIAR: Filtrar compras pendientes para el dashboard
 */
export const filtrarComprasPendientes = (compras) => {
  if (!Array.isArray(compras)) return [];
  
  // Filtrar solo las que están realmente pendientes de pago
  return compras.filter(compra => 
    compra.estado === 'Pendiente' && 
    !compra.estaAnulado
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

// === EXPORTACIONES PARA COMPATIBILIDAD ===
export const adaptarDTEs = adaptarCuentasPorCobrar;
export const adaptarCuentasCorrientes = (cuentas) => {
  // Adaptador para saldos bancarios (mantener como está)
  return cuentas.map(cuenta => ({
    id: cuenta.id,
    nombre: cuenta.nombre || cuenta.nombreCuenta,
    banco: cuenta.banco || 'Banco no especificado',
    saldo: cuenta.saldoCalculado || cuenta.saldo || 0,
    moneda: cuenta.moneda || 'CLP',
    tipo: cuenta.tipo || 'Corriente'
  }));
};
