// chipaxAdapter.js - ADAPTADOR COMPLETO CORREGIDO (sin errores ESLint)

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
      monto: saldoPendiente,
      montoTotal: montoOriginal,
      montoPagado: montoPagado,
      saldo: saldoPendiente,
      montoNeto: parseFloat(dte.montoNeto || dte.monto_neto || 0),
      iva: parseFloat(dte.iva || 0),
      
      // Fechas normalizadas
      fecha: dte.fechaEmision || dte.fecha_emision || dte.fecha || new Date().toISOString().split('T')[0],
      fechaEmision: dte.fechaEmision || dte.fecha_emision || dte.fecha || new Date().toISOString().split('T')[0],
      fechaVencimiento: dte.fechaVencimiento || dte.fecha_vencimiento || null,
      fechaEnvio: dte.fechaEnvio || dte.fecha_envio || null,
      
      // Estado calculado
      estado: estaAnulado ? 'Anulado' : (saldoPendiente <= 0 ? 'Pagado' : 'Pendiente'),
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
  
  return resultado;
};

/**
 * ✅ ADAPTADOR PRINCIPAL: Cuentas por pagar CON ESTADOS CORREGIDOS
 */
export const adaptarCuentasPorPagar = (compras) => {
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: entrada no es array');
    return [];
  }

  console.log('💸 Adaptando compras (ESTADOS CORREGIDOS según descubrimiento)...');
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
    
    // ✅ DEFINIR fechaPago CORRECTAMENTE
    const fechaPago = compra.fechaPagoInterna || 
                     compra.fecha_pago_interna || 
                     compra.fechaPago || 
                     compra.fecha_pago;
    
    // ✅ MAPEO CORREGIDO según el descubrimiento del usuario
    let estado = 'Aceptado'; // Default
    let saldoPendiente = montoTotal;
    let descripcionEstado = '';
    let categoria = 'normal'; // Para filtros
    
    if (estaAnulado) {
      estado = 'Anulado';
      saldoPendiente = 0;
      descripcionEstado = 'Factura anulada o rechazada';
      categoria = 'anulado';
    } else {
      const estadoChipax = compra.estado?.toLowerCase() || '';
      
      // ✅ LÓGICA CORREGIDA: Según el descubrimiento del usuario
      if (estadoChipax === 'pagado' || estadoChipax === 'paid') {
        // 🎯 DESCUBRIMIENTO: Las "pagadas" son realmente pendientes de aprobación
        estado = 'Pendiente Aprobación';
        saldoPendiente = montoTotal; // Mantener monto porque necesita aprobación
        descripcionEstado = 'Pendiente de aprobación (aparecía como pagada)';
        categoria = 'pendiente_aprobacion';
      } else if (estadoChipax === 'aceptado' || estadoChipax === 'accepted' || estadoChipax === 'aceptada') {
        estado = 'Aceptado';
        saldoPendiente = montoTotal; // Aceptado = ya aprobado pero no pagado
        descripcionEstado = 'Factura aceptada y aprobada';
        categoria = 'aceptado';
      } else if (fechaPago) {
        estado = 'Pagado Realmente';
        saldoPendiente = 0;
        descripcionEstado = 'Realmente pagado (con fecha de pago)';
        categoria = 'pagado_realmente';
      } else if (estadoChipax === 'pendiente' || estadoChipax === 'pending') {
        estado = 'Pendiente Proceso';
        saldoPendiente = montoTotal;
        descripcionEstado = 'En proceso, aún no aprobado';
        categoria = 'pendiente_proceso';
      } else {
        // Default para estados desconocidos
        estado = 'Estado Desconocido';
        saldoPendiente = montoTotal;
        descripcionEstado = `Estado original: ${estadoChipax || 'Sin estado'}`;
        categoria = 'desconocido';
      }
    }
    
    return {
      id: compra.id || index,
      folio: compra.folio || compra.numero || 'S/N',
      razonSocial: compra.razonSocial || compra.razon_social || compra.proveedor || 'Proveedor no especificado',
      rutProveedor: compra.rutEmisor || compra.rut_emisor || compra.rut || 'Sin RUT',
      proveedor: compra.razonSocial || compra.razon_social || compra.proveedor || 'Proveedor no especificado',
      
      // ✅ CAMPOS PRINCIPALES con estados corregidos
      monto: saldoPendiente,
      montoTotal: montoTotal,
      montoNeto: montoNeto,
      iva: iva,
      
      // ✅ FECHAS NORMALIZADAS
      fecha: compra.fechaEmision || compra.fecha_emision || compra.fecha || new Date().toISOString().split('T')[0],
      fechaVencimiento: compra.fechaVencimiento || compra.fecha_vencimiento || null,
      fechaPago: fechaPago,
      fechaRecepcion: compra.fechaRecepcion || compra.fecha_recepcion || null,
      
      // ✅ ESTADO Y METADATOS CORREGIDOS
      estado: estado,
      estadoOriginal: compra.estado,
      descripcionEstado: descripcionEstado,
      categoria: categoria,
      estaPagado: estado === 'Pagado Realmente',
      estaAnulado: estaAnulado,
      necesitaAprobacion: estado === 'Pendiente Aprobación',
      estaAprobado: estado === 'Aceptado' || estado === 'Pagado Realmente',
      
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
      debug: {
        estadoOriginalChipax: compra.estado,
        fechaPagoDetectada: !!fechaPago,
        motivoMapeo: descripcionEstado,
        datosOriginales: {
          estado: compra.estado,
          fechaPago: fechaPago,
          anulado: compra.anulado
        }
      },
      
      origenDatos: 'compras_estados_corregidos',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // 🔍 DEBUG: Estadísticas detalladas
  const estadisticas = {
    total: resultado.length,
    pendientesAprobacion: resultado.filter(c => c.estado === 'Pendiente Aprobación').length,
    aceptadas: resultado.filter(c => c.estado === 'Aceptado').length,
    pagadasRealmente: resultado.filter(c => c.estado === 'Pagado Realmente').length,
    pendientesProceso: resultado.filter(c => c.estado === 'Pendiente Proceso').length,
    anuladas: resultado.filter(c => c.estado === 'Anulado').length,
    estadosDesconocidos: resultado.filter(c => c.estado === 'Estado Desconocido').length
  };
  
  console.log('🔍 DEBUG ADAPTADOR COMPRAS - ESTADOS CORREGIDOS:');
  console.log(`  📋 Total compras: ${estadisticas.total}`);
  console.log(`  ⏳ Pendientes de Aprobación: ${estadisticas.pendientesAprobacion} (antes aparecían como "pagadas")`);
  console.log(`  ✅ Aceptadas (Aprobadas): ${estadisticas.aceptadas}`);
  console.log(`  💳 Pagadas Realmente: ${estadisticas.pagadasRealmente}`);
  console.log(`  🔄 Pendientes de Proceso: ${estadisticas.pendientesProceso}`);
  console.log(`  ❌ Anuladas: ${estadisticas.anuladas}`);
  console.log(`  ❓ Estados Desconocidos: ${estadisticas.estadosDesconocidos}`);
  
  // ✅ ANÁLISIS DE ESTADOS ORIGINALES
  const estadosOriginales = {};
  resultado.forEach(c => {
    const estadoOrig = c.estadoOriginal || 'Sin estado';
    estadosOriginales[estadoOrig] = (estadosOriginales[estadoOrig] || 0) + 1;
  });
  
  console.log('\n🔍 ANÁLISIS DE ESTADOS ORIGINALES DE CHIPAX:');
  Object.entries(estadosOriginales).forEach(([estado, cantidad]) => {
    console.log(`   "${estado}": ${cantidad} facturas`);
  });
  
  if (resultado.length > 0) {
    const fechaMinima = resultado.reduce((min, c) => c.fecha < min ? c.fecha : min, resultado[0].fecha);
    const fechaMaxima = resultado.reduce((max, c) => c.fecha > max ? c.fecha : max, resultado[0].fecha);
    console.log(`\n  📅 Rango de fechas: ${fechaMinima} → ${fechaMaxima}`);
  }
  
  return resultado;
};

/**
 * ✅ FUNCIÓN AUXILIAR: Filtrar compras pendientes (actualizada)
 */
export const filtrarComprasPendientes = (compras) => {
  if (!Array.isArray(compras)) return [];
  
  return compras.filter(compra => 
    (compra.estado === 'Pendiente Aprobación' || 
     compra.estado === 'Pendiente Proceso' ||
     compra.estado === 'Aceptado') && 
    !compra.estaAnulado &&
    compra.monto > 0
  );
};

/**
 * ✅ FUNCIÓN AUXILIAR: Filtrar solo pendientes de aprobación
 */
export const filtrarPendientesAprobacion = (compras) => {
  if (!Array.isArray(compras)) return [];
  
  return compras.filter(compra => 
    compra.estado === 'Pendiente Aprobación' && 
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
 * ✅ FUNCIÓN AUXILIAR: Filtrar por categoría de estado
 */
export const filtrarPorCategoria = (compras, categoria) => {
  if (!Array.isArray(compras)) return [];
  
  return compras.filter(compra => compra.categoria === categoria);
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
    saldoCalculado: cuenta.saldoCalculado || cuenta.saldo || cuenta.balance || 0,
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

/**
 * ✅ FUNCIÓN UTILIDAD: Obtener estadísticas de estados
 */
export const obtenerEstadisticasEstados = (compras) => {
  if (!Array.isArray(compras)) return {};
  
  const stats = {
    total: compras.length,
    porEstado: {},
    porCategoria: {},
    montosPorEstado: {},
    fechas: {
      masReciente: null,
      masAntigua: null
    }
  };
  
  compras.forEach(compra => {
    // Contar por estado
    const estado = compra.estado || 'Sin estado';
    stats.porEstado[estado] = (stats.porEstado[estado] || 0) + 1;
    
    // Contar por categoría
    const categoria = compra.categoria || 'sin_categoria';
    stats.porCategoria[categoria] = (stats.porCategoria[categoria] || 0) + 1;
    
    // Sumar montos por estado
    stats.montosPorEstado[estado] = (stats.montosPorEstado[estado] || 0) + (compra.monto || 0);
    
    // Fechas
    const fecha = new Date(compra.fecha);
    if (!stats.fechas.masReciente || fecha > new Date(stats.fechas.masReciente)) {
      stats.fechas.masReciente = compra.fecha;
    }
    if (!stats.fechas.masAntigua || fecha < new Date(stats.fechas.masAntigua)) {
      stats.fechas.masAntigua = compra.fecha;
    }
  });
  
  return stats;
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
  filtrarPendientesAprobacion,
  filtrarComprasPorFecha,
  filtrarPorCategoria,
  adaptarDatosChipax,
  obtenerEstadisticasEstados,
  adaptarDTEs,
  adaptarCompras,
  adaptarCuentasCorrientes
};
