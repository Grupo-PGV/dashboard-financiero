// ===================================================================
// 🔧 CHIPAX ADAPTER COMPLETO - VERSIÓN FINAL CON ESTADOS CORREGIDOS
// ===================================================================
// chipaxAdapter.js - Adaptador completo para normalizar datos de Chipax API

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
          // 4. Último recurso: asumir que el saldo es el monto total
          saldoPendiente = montoOriginal;
        }
      }
    }

    // Verificar si está anulado
    const estaAnulado = dte.anulado === 'S' || 
                       dte.anulado === true || 
                       dte.estado === 'anulado';

    return {
      id: dte.id || index,
      folio: dte.folio || dte.numero || 'S/N',
      razonSocial: dte.razonSocial || dte.razon_social || dte.cliente || 'Cliente no especificado',
      rutCliente: dte.rutReceptor || dte.rut_receptor || dte.rut || 'Sin RUT',
      cliente: dte.razonSocial || dte.razon_social || dte.cliente || 'Cliente no especificado',
      
      // ✅ CAMPOS PRINCIPALES - saldo es lo más importante para el resumen
      monto: saldoPendiente, // Este se usa en el resumen
      saldo: saldoPendiente, // Para compatibilidad
      montoTotal: montoOriginal,
      montoPagado: montoPagado,
      saldoPendiente: saldoPendiente,
      
      // Fechas
      fecha: dte.fechaEmision || dte.fecha_emision || dte.fecha || new Date().toISOString().split('T')[0],
      fechaEmision: dte.fechaEmision || dte.fecha_emision || dte.fecha || new Date().toISOString().split('T')[0],
      fechaVencimiento: dte.fechaVencimiento || dte.fecha_vencimiento || null,
      
      // Estados
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
    
    // ✅ FECHA DE PAGO REAL (no la interna que puede ser falsa)
    const fechaPagoReal = compra.fechaPago || 
                         compra.fecha_pago || 
                         (compra.fechaPagoInterna && compra.eventoReceptor === 'D' ? compra.fechaPagoInterna : null);
    
    // ✅ NORMALIZAR ESTADO CHIPAX
    const estadoChipax = (compra.estado || '').toLowerCase().trim();
    
    // ✅ LÓGICA DE ESTADOS CORREGIDA según descubrimiento
    let estado, saldoPendiente, descripcionEstado, categoria;
    
    if (estaAnulado) {
      estado = 'Anulado';
      saldoPendiente = 0;
      descripcionEstado = 'Factura anulada o rechazada';
      categoria = 'anulado';
    } else {
      // 🎯 MAPEO CORREGIDO basado en descubrimiento real
      switch (estadoChipax) {
        case 'pagado':
        case 'paid':
          // ⚠️ CORRECCIÓN CRÍTICA: Las "pagadas" son pendientes de aprobación
          estado = 'Pendiente Aprobación';
          saldoPendiente = montoTotal;
          descripcionEstado = 'Pendiente de aprobación (aparecía como pagada en Chipax)';
          categoria = 'pendiente_aprobacion';
          break;
          
        case 'aceptado':
        case 'accepted':
        case 'aceptada':
          estado = 'Aceptado';
          saldoPendiente = montoTotal; // Aceptado = aprobado pero no pagado
          descripcionEstado = 'Factura aceptada y aprobada, pendiente de pago';
          categoria = 'aceptado';
          break;
          
        case 'pendiente':
        case 'pending':
          estado = 'Pendiente Proceso';
          saldoPendiente = montoTotal;
          descripcionEstado = 'En proceso, aún no aprobado';
          categoria = 'pendiente_proceso';
          break;
          
        default:
          // ✅ CORRECCIÓN: Estados desconocidos son pendientes de aprobación
          estado = 'Pendiente Aprobación';
          saldoPendiente = montoTotal;
          descripcionEstado = `Pendiente de aprobación (estado original: ${estadoChipax || compra.estado || 'Sin estado'})`;
          categoria = 'pendiente_aprobacion';
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
      fechaPago: fechaPagoReal,
      fechaRecepcion: compra.fechaRecepcion || compra.fecha_recepcion || null,
      
      // ✅ ESTADO Y METADATOS CORREGIDOS
      estado: estado,
      estadoOriginal: compra.estado,
      estadoChipax: estadoChipax, // Para debugging
      descripcionEstado: descripcionEstado,
      categoria: categoria,
      
      // ✅ BANDERAS BOOLEANAS CORREGIDAS
      estaPagado: estado === 'Pagado Realmente',
      estaAnulado: estaAnulado,
      necesitaAprobacion: estado === 'Pendiente Aprobación',
      estaAprobado: estado === 'Aceptado' || estado === 'Pagado Realmente',
      estaPendiente: estado.includes('Pendiente'),
      
      // Información adicional
      tipo: compra.tipo || compra.tipo_documento || 33,
      tipoCompra: compra.tipoCompra || compra.tipo_compra || 'Del Giro',
      moneda: compra.idMoneda === 1000 || compra.moneda === 'CLP' ? 'CLP' : 'USD',
      descuento: parseFloat(compra.descuento || 0),
      
      // Metadatos útiles
      periodo: compra.periodo || null,
      estadoSII: compra.estado || 'Sin estado',
      eventoReceptor: compra.eventoReceptor || compra.evento_receptor || null,
      
      // ✅ DEBUG MEJORADO
      debug: {
        estadoOriginalChipax: compra.estado,
        estadoChipaxNormalizado: estadoChipax,
        estadoCorregido: estado,
        fechaPagoReal: fechaPagoReal,
        fechaPagoInterna: compra.fechaPagoInterna,
        motivoMapeo: descripcionEstado,
        cambioRealizado: estadoChipax === 'pagado' ? 'RECLASIFICADO de Pagado a Pendiente Aprobación' : 'Sin cambio'
      },
      
      origenDatos: 'compras_estados_corregidos_v2',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // 🔍 ESTADÍSTICAS DETALLADAS con estados corregidos
  const estadisticas = {
    total: resultado.length,
    reclasificadas: resultado.filter(c => c.debug.cambioRealizado.includes('RECLASIFICADO')).length,
    porEstadoCorregido: {},
    montosPorEstado: {},
    añosEncontrados: {}
  };
  
  resultado.forEach(compra => {
    // Contar por estado corregido
    const estado = compra.estado;
    estadisticas.porEstadoCorregido[estado] = (estadisticas.porEstadoCorregido[estado] || 0) + 1;
    estadisticas.montosPorEstado[estado] = (estadisticas.montosPorEstado[estado] || 0) + compra.montoTotal;
    
    // Años encontrados
    const año = new Date(compra.fecha).getFullYear();
    if (!isNaN(año) && año >= 2020 && año <= 2030) {
      estadisticas.añosEncontrados[año] = (estadisticas.añosEncontrados[año] || 0) + 1;
    }
  });
  
  console.log('🔍 ESTADÍSTICAS DE ESTADOS CORREGIDOS:');
  console.log(`   📋 Total facturas procesadas: ${estadisticas.total}`);
  console.log(`   🔄 Facturas reclasificadas: ${estadisticas.reclasificadas}`);
  
  console.log('\n📊 DISTRIBUCIÓN POR ESTADO CORREGIDO:');
  Object.entries(estadisticas.porEstadoCorregido).forEach(([estado, cantidad]) => {
    const monto = estadisticas.montosPorEstado[estado];
    console.log(`   ${estado}: ${cantidad} facturas ($${monto.toLocaleString()})`);
  });
  
  console.log('\n📅 DISTRIBUCIÓN POR AÑO:');
  Object.entries(estadisticas.añosEncontrados)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))
    .forEach(([año, cantidad]) => {
      console.log(`   ${año}: ${cantidad} facturas`);
    });
  
  // ✅ ANÁLISIS ESPECÍFICO DE FACTURAS 2025
  const facturas2025 = resultado.filter(c => new Date(c.fecha).getFullYear() === 2025);
  if (facturas2025.length > 0) {
    console.log('\n🎯 ANÁLISIS ESPECÍFICO FACTURAS 2025:');
    console.log(`   📋 Total 2025: ${facturas2025.length} facturas`);
    
    const estados2025 = {};
    facturas2025.forEach(c => {
      estados2025[c.estado] = (estados2025[c.estado] || 0) + 1;
    });
    
    Object.entries(estados2025).forEach(([estado, cantidad]) => {
      console.log(`   ${estado}: ${cantidad} facturas 2025`);
    });
  }
  
  return resultado;
};

/**
 * ✅ ADAPTADOR: Saldos bancarios
 */
export const adaptarSaldosBancarios = (cuentas) => {
  if (!Array.isArray(cuentas)) {
    console.warn('⚠️ adaptarSaldosBancarios: datos no son array');
    return [];
  }

  console.log('🏦 Adaptando saldos bancarios...');
  console.log(`🔍 INPUT DEBUG: {tipo: '${typeof cuentas}', esArray: ${Array.isArray(cuentas)}, longitud: ${cuentas.length}}`);

  return cuentas.map((cuenta, index) => ({
    id: cuenta.id || index,
    nombre: cuenta.nombre || cuenta.nombreCuenta || cuenta.alias || `Cuenta ${index + 1}`,
    banco: cuenta.banco || cuenta.nombreBanco || 'Banco no especificado',
    saldo: cuenta.saldoCalculado || cuenta.saldo || cuenta.balance || 0,
    saldoCalculado: cuenta.saldoCalculado || cuenta.saldo || cuenta.balance || 0,
    moneda: cuenta.moneda || 'CLP',
    tipo: cuenta.tipo || cuenta.tipoCuenta || 'Corriente',
    ultimaActualizacion: cuenta.ultimaActualizacion || null,
    
    // Información adicional
    numeroCuenta: cuenta.numeroCuenta || cuenta.numero_cuenta || null,
    sucursal: cuenta.sucursal || null,
    
    // Para debugging
    origenDatos: 'saldos_bancarios',
    fechaProcesamiento: new Date().toISOString()
  }));
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
 * ✅ FUNCIÓN AUXILIAR: Filtrar por año específico
 */
export const filtrarComprasPorAño = (compras, año) => {
  if (!Array.isArray(compras)) return [];
  
  return compras.filter(compra => {
    const fechaCompra = new Date(compra.fecha);
    return fechaCompra.getFullYear() === año;
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
 * ✅ FUNCIÓN: Obtener resumen por estados corregidos
 */
export const obtenerResumenEstadosCorregidos = (facturas, añoFiltro = null) => {
  let facturasFiltradas = facturas;
  
  if (añoFiltro) {
    facturasFiltradas = filtrarComprasPorAño(facturas, añoFiltro);
  }
  
  const resumen = {
    totalFacturas: facturasFiltradas.length,
    año: añoFiltro || 'Todos',
    estados: {},
    montos: {},
    totalMonto: 0,
    fechaAnalisis: new Date().toISOString().split('T')[0]
  };
  
  facturasFiltradas.forEach(factura => {
    const estado = factura.estado;
    const monto = factura.montoTotal || 0;
    
    resumen.estados[estado] = (resumen.estados[estado] || 0) + 1;
    resumen.montos[estado] = (resumen.montos[estado] || 0) + monto;
    resumen.totalMonto += monto;
  });
  
  return resumen;
};

/**
 * ✅ FUNCIÓN: Detectar facturas mal clasificadas
 */
export const detectarFacturasMalClasificadas = (facturas) => {
  const malClasificadas = facturas.filter(factura => 
    factura.debug?.cambioRealizado?.includes('RECLASIFICADO')
  );
  
  console.log(`🔍 DETECCIÓN DE RECLASIFICACIONES:`);
  console.log(`   📋 Facturas reclasificadas: ${malClasificadas.length}`);
  
  if (malClasificadas.length > 0) {
    console.log('\n📊 EJEMPLOS DE RECLASIFICACIONES:');
    malClasificadas.slice(0, 5).forEach((factura, index) => {
      console.log(`   ${index + 1}. Folio ${factura.folio}: "${factura.estadoOriginal}" → "${factura.estado}"`);
    });
  }
  
  return malClasificadas;
};

/**
 * ✅ FUNCIÓN: Validar clasificación de estados
 */
export const validarClasificacionEstados = (facturas) => {
  const validacion = {
    totalValidadas: 0,
    sinFechaPagoPeroPagadas: [],
    conFechaPagoPeroNoPagadas: [],
    estadosInconsistentes: []
  };
  
  facturas.forEach(factura => {
    validacion.totalValidadas++;
    
    // Validar coherencia entre estado y fecha de pago
    if (factura.estado === 'Pagado Realmente' && !factura.fechaPago) {
      validacion.sinFechaPagoPeroPagadas.push(factura);
    }
    
    if (factura.fechaPago && factura.estado !== 'Pagado Realmente') {
      validacion.conFechaPagoPeroNoPagadas.push(factura);
    }
    
    // Detectar estados inconsistentes
    if (factura.estado === 'Estado Desconocido') {
      validacion.estadosInconsistentes.push(factura);
    }
  });
  
  console.log('🔍 VALIDACIÓN DE CLASIFICACIÓN:');
  console.log(`   ✅ Total validadas: ${validacion.totalValidadas}`);
  console.log(`   ⚠️ Pagadas sin fecha: ${validacion.sinFechaPagoPeroPagadas.length}`);
  console.log(`   ⚠️ Con fecha pero no pagadas: ${validacion.conFechaPagoPeroNoPagadas.length}`);
  console.log(`   ❓ Estados inconsistentes: ${validacion.estadosInconsistentes.length}`);
  
  return validacion;
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
  // Adaptadores principales
  adaptarCuentasPorCobrar,
  adaptarCuentasPorPagar,
  adaptarSaldosBancarios,
  
  // Filtros y utilidades
  filtrarComprasPendientes,
  filtrarPendientesAprobacion,
  filtrarComprasPorFecha,
  filtrarComprasPorAño,
  filtrarPorCategoria,
  
  // Análisis y validación
  obtenerResumenEstadosCorregidos,
  detectarFacturasMalClasificadas,
  validarClasificacionEstados,
  obtenerEstadisticasEstados,
  
  // Función genérica
  adaptarDatosChipax,
  
  // Aliases para compatibilidad
  adaptarDTEs,
  adaptarCompras,
  adaptarCuentasCorrientes
};
