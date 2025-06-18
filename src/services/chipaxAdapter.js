// chipaxAdapter.js - ADAPTADOR COMPLETO CON TODAS LAS EXPORTACIONES

/**
 * ✅ ADAPTADOR: Cuentas por cobrar (DTEs de venta)
 */
export const adaptarCuentasPorCobrar = (dtes) => {
  if (!Array.isArray(dtes)) {
    console.warn('⚠️ adaptarCuentasPorCobrar: entrada no es array');
    return [];
  }

  console.log('📊 Adaptando DTEs por cobrar...');
  console.log(`🔍 INPUT DEBUG: {tipo: '${typeof dtes}', esArray: ${Array.isArray(dtes)}, longitud: ${dtes.length}}`);

  const resultado = dtes.map((dte, index) => {
    // Calcular montos
    const montoOriginal = parseFloat(dte.montoTotal || dte.monto_total || dte.monto || 0);
    let montoPagado = 0;
    let saldoPendiente = montoOriginal;

    // 1. Intentar usar campo directo de saldo
    if (dte.saldo !== undefined && dte.saldo !== null) {
      saldoPendiente = parseFloat(dte.saldo);
    } else if (dte.montoPendiente !== undefined && dte.montoPendiente !== null) {
      saldoPendiente = parseFloat(dte.montoPendiente);
    } else if (dte.montoAdeudado !== undefined && dte.montoAdeudado !== null) {
      saldoPendiente = parseFloat(dte.montoAdeudado);
    } else {
      // 2. Calcular basado en pagos si están disponibles
      if (dte.montoPagado !== undefined && dte.montoPagado !== null) {
        montoPagado = parseFloat(dte.montoPagado);
        saldoPendiente = Math.max(0, montoOriginal - montoPagado);
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
      cliente: dte.razonSocial || dte.razon_social || dte.cliente || 'Cliente no especificado',
      
      // Campos principales mejorados
      monto: saldoPendiente,                                            // Saldo realmente pendiente
      montoTotal: montoOriginal,                                        // Monto original de la factura
      montoPagado: montoPagado,                                         // Lo que ya se ha pagado
      saldo: saldoPendiente,                                            // Alias para compatibilidad
      montoNeto: parseFloat(dte.montoNeto || dte.monto_neto || 0),
      iva: parseFloat(dte.iva || 0),
      
      // Fechas normalizadas
      fecha: dte.fechaEmision || dte.fecha_emision || dte.fecha || new Date().toISOString().split('T')[0],
      fechaEmision: dte.fechaEmision || dte.fecha_emision || dte.fecha || new Date().toISOString().split('T')[0],
      fechaVencimiento: dte.fechaVencimiento || dte.fecha_vencimiento || null,
      fechaEnvio: dte.fechaEnvio || dte.fecha_envio || null,
      
      // Estado calculado de manera más robusta
      estado: estaAnulado ? 'Anulado' : 
              (saldoPendiente <= 0 ? 'Pagado' : 'Pendiente'),
      estaPagado: saldoPendiente <= 0 && !estaAnulado,
      estaAnulado: estaAnulado,
      
      // Información adicional
      tipo: dte.tipo || dte.tipo_documento || 33,
      moneda: dte.idMoneda === 1000 || dte.moneda === 'CLP' ? 'CLP' : 'USD',
      descuento: parseFloat(dte.descuento || 0),
      
      // Para debugging
      origenDatos: 'dtes_por_cobrar',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // Debug: Estadísticas
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
  
  console.log('🔍 DEBUG ADAPTADOR CUENTAS POR COBRAR:');
  console.log(`  📋 Total cuentas: ${estadisticas.total}`);
  console.log(`  ⏳ Pendientes: ${estadisticas.pendientes}`);
  console.log(`  ✅ Pagadas: ${estadisticas.pagadas}`);
  console.log(`  ❌ Anuladas: ${estadisticas.anuladas}`);
  console.log(`  💵 Monto pendiente: ${estadisticas.montoTotalPendiente.toLocaleString('es-CL')}`);
  console.log(`  💰 Monto total: ${estadisticas.montoTotalGeneral.toLocaleString('es-CL')}`);
  
  return resultado;
};

/**
 * ✅ ADAPTADOR CORREGIDO: Cuentas por pagar (SIN FILTRO de pagadas)
 */
export const adaptarCuentasPorPagar = (compras) => {
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: entrada no es array');
    return [];
  }

  console.log('💸 Adaptando compras (SIN FILTRO de pagadas - mostrando todas)...');
  console.log(`🔍 INPUT DEBUG: {tipo: '${typeof compras}', esArray: ${Array.isArray(compras)}, longitud: ${compras.length}}`);

  const resultado = compras.map((compra, index) => {
    // Calcular montos
    const montoTotal = parseFloat(compra.montoTotal || compra.monto_total || compra.monto || 0);
    const montoNeto = parseFloat(compra.montoNeto || compra.monto_neto || 0);
    const iva = parseFloat(compra.iva || 0);
    
    // Verificar si está anulado
    const estaAnulado = compra.anulado === 'S' || 
                       compra.anulado === true || 
                       compra.estado === 'anulado' ||
                       compra.estado === 'rechazado';
    
    // ✅ CAMBIO PRINCIPAL: NO FILTRAR POR ESTADO DE PAGO
    // Determinar estado sin filtrar pagadas
    let estado = 'Pendiente';
    let saldoPendiente = montoTotal;
    
    if (estaAnulado) {
      estado = 'Anulado';
      saldoPendiente = 0;
    } else {
      // ✅ NUEVO: Determinar estado basado en información disponible
      const fechaPago = compra.fechaPagoInterna || 
                       compra.fecha_pago_interna || 
                       compra.fechaPago || 
                       compra.fecha_pago;
      
      const estadoChipax = compra.estado;
      
      // Mapear estados de Chipax
      if (estadoChipax === 'pagado' || estadoChipax === 'paid') {
        estado = 'Pagado';
        saldoPendiente = 0;
      } else if (estadoChipax === 'aceptado' || estadoChipax === 'accepted') {
        estado = 'Aceptado';
        // ✅ MANTENER MONTO: Aceptado pero no necesariamente pagado
        saldoPendiente = montoTotal;
      } else if (estadoChipax === 'pendiente' || estadoChipax === 'pending') {
        estado = 'Pendiente';
        saldoPendiente = montoTotal;
      } else if (fechaPago) {
        estado = 'Pagado';
        saldoPendiente = 0;
      } else {
        // ✅ DEFAULT: Si no sabemos, asumir pendiente
        estado = 'Pendiente';
        saldoPendiente = montoTotal;
      }
    }
    
    return {
      id: compra.id || index,
      folio: compra.folio || compra.numero || 'S/N',
      razonSocial: compra.razonSocial || compra.razon_social || compra.proveedor || 'Proveedor no especificado',
      rutProveedor: compra.rutEmisor || compra.rut_emisor || compra.rut || 'Sin RUT',
      proveedor: compra.razonSocial || compra.razon_social || compra.proveedor || 'Proveedor no especificado',
      
      // ✅ CAMPOS PRINCIPALES (sin filtrar por pago)
      monto: saldoPendiente,                // Monto según estado
      montoTotal: montoTotal,               // Monto original siempre
      montoNeto: montoNeto,
      iva: iva,
      
      // ✅ FECHAS NORMALIZADAS
      fecha: compra.fechaEmision || compra.fecha_emision || compra.fecha || new Date().toISOString().split('T')[0],
      fechaVencimiento: compra.fechaVencimiento || compra.fecha_vencimiento || null,
      fechaPago: compra.fechaPago || compra.fecha_pago || null,
      fechaRecepcion: compra.fechaRecepcion || compra.fecha_recepcion || null,
      
      // ✅ ESTADO Y METADATOS
      estado: estado,
      estadoOriginal: compra.estado,        // Guardar estado original de Chipax
      estaPagado: estado === 'Pagado',
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
      origenDatos: 'compras_sin_filtro_pago',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // 🔍 DEBUG: Estadísticas detalladas SIN filtrar
  const estadisticas = {
    total: resultado.length,
    pendientes: resultado.filter(c => c.estado === 'Pendiente').length,
    aceptadas: resultado.filter(c => c.estado === 'Aceptado').length,
    pagadas: resultado.filter(c => c.estado === 'Pagado').length,
    anuladas: resultado.filter(c => c.estado === 'Anulado').length,
    montoTotalPendiente: resultado
      .filter(c => c.estado === 'Pendiente' || c.estado === 'Aceptado')
      .reduce((sum, c) => sum + c.monto, 0),
    montoTotalGeneral: resultado.reduce((sum, c) => sum + c.montoTotal, 0)
  };
  
  console.log('🔍 DEBUG ADAPTADOR COMPRAS - TODAS LAS FACTURAS:');
  console.log(`  📋 Total compras: ${estadisticas.total}`);
  console.log(`  ⏳ Pendientes: ${estadisticas.pendientes}`);
  console.log(`  ✅ Aceptadas: ${estadisticas.aceptadas}`);
  console.log(`  💳 Pagadas: ${estadisticas.pagadas}`);
  console.log(`  ❌ Anuladas: ${estadisticas.anuladas}`);
  console.log(`  💵 Monto pendiente+aceptado: ${estadisticas.montoTotalPendiente.toLocaleString('es-CL')}`);
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
 * ✅ ADAPTADOR: Saldos bancarios
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

/**
 * ✅ FUNCIÓN GENÉRICA: Adaptador de datos Chipax
 */
export const adaptarDatosChipax = (tipo, datos) => {
  console.log(`🔄 Adaptando datos tipo: ${tipo}`);
  
  switch (tipo) {
    case 'cuentasPorCobrar':
    case 'dtes':
      return adaptarCuentasPorCobrar(datos);
    
    case 'cuentasPorPagar':
    case 'compras':
      return adaptarCuentasPorPagar(datos);
    
    case 'saldosBancarios':
    case 'cuentas':
      return adaptarSaldosBancarios(datos);
    
    default:
      console.warn(`⚠️ Tipo de adaptador no reconocido: ${tipo}`);
      return Array.isArray(datos) ? datos : [];
  }
};

// === EXPORTACIONES PARA COMPATIBILIDAD ===
export const adaptarDTEs = adaptarCuentasPorCobrar;
export const adaptarCompras = adaptarCuentasPorPagar;
export const adaptarCuentasCorrientes = adaptarSaldosBancarios;

// === EXPORTACIÓN POR DEFECTO ===
export default {
  adaptarCuentasPorCobrar,
  adaptarCuentasPorPagar,
  adaptarSaldosBancarios,
  filtrarComprasPendientes,
  filtrarComprasPorFecha,
  adaptarDatosChipax,
  adaptarDTEs,
  adaptarCompras,
  adaptarCuentasCorrientes
};
