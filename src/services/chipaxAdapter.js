/**
 * 🔄 CHIPAX ADAPTER - VERSIÓN ACTUALIZADA
 * 
 * Archivo: chipaxAdapter.js
 * 
 * Adaptador actualizado para trabajar con el nuevo servicio de saldos mejorado.
 * Mantiene compatibilidad con el dashboard existente.
 */

// =====================================
// 📊 CONFIGURACIÓN Y CONSTANTES
// =====================================

// Formateo de moneda chilena
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};

// Mapeo de nombres de bancos para consistencia
const MAPEO_BANCOS = {
  'banconexion2': 'Banco de Chile',
  'banco de chile': 'Banco de Chile',
  'santander': 'Banco Santander',
  'banco santander': 'Banco Santander',
  'BCI': 'Banco BCI',
  'banco bci': 'Banco BCI',
  'generico': 'Banco Internacional',
  'banco internacional': 'Banco Internacional',
  'chipax_wallet': 'Chipax Wallet'
};

// =====================================
// 🔄 ADAPTADORES PRINCIPALES
// =====================================

/**
 * ✅ ADAPTADOR: Cuentas por cobrar (SIN CAMBIOS)
 * Mantiene la funcionalidad existente que ya funciona
 */
const adaptarCuentasPorCobrar = (facturas) => {
  if (!Array.isArray(facturas)) {
    console.warn('⚠️ adaptarCuentasPorCobrar: datos no son array');
    return [];
  }

  console.log('💰 Adaptando cuentas por cobrar...');
  console.log(`🔍 INPUT DEBUG: {tipo: '${typeof facturas}', esArray: ${Array.isArray(facturas)}, longitud: ${facturas.length}}`);

  // Filtrar solo facturas pendientes
  const facturasPendientes = facturas.filter(factura => {
    const estado = factura.estado || factura.status || '';
    return estado.toLowerCase().includes('pendiente') || 
           estado.toLowerCase().includes('emitida') ||
           estado.toLowerCase().includes('enviada');
  });

  console.log(`📊 Facturas pendientes encontradas: ${facturasPendientes.length} de ${facturas.length} totales`);

  const cuentasPorCobrar = facturasPendientes.map(factura => ({
    id: factura.id || factura.folio || Math.random(),
    cliente: factura.cliente || factura.razon_social || factura.receptor || 'Cliente no identificado',
    monto: factura.monto_total || factura.total || factura.neto || 0,
    fecha: factura.fecha || factura.fecha_emision || new Date().toISOString().split('T')[0],
    estado: factura.estado || 'Pendiente',
    folio: factura.folio || factura.numero || factura.id || 'S/N',
    tipo: factura.tipo_documento || factura.tipo || 'Factura',
    montoFormateado: formatCurrency(factura.monto_total || factura.total || factura.neto || 0)
  }));

  console.log(`✅ ${cuentasPorCobrar.length} cuentas por cobrar adaptadas correctamente`);
  return cuentasPorCobrar;
};

/**
 * ✅ ADAPTADOR: Cuentas por pagar (SIN CAMBIOS)
 * Mantiene la funcionalidad existente que ya funciona
 */
const adaptarCuentasPorPagar = (compras) => {
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: datos no son array');
    return [];
  }

  console.log('💸 Adaptando cuentas por pagar...');
  console.log(`🔍 INPUT DEBUG: {tipo: '${typeof compras}', esArray: ${Array.isArray(compras)}, longitud: ${compras.length}}`);

  // Buscar facturas de 2024-2025 con montos significativos
  const comprasRelevantes = compras.filter(compra => {
    const fecha = new Date(compra.fecha || compra.fecha_recepcion);
    const año = fecha.getFullYear();
    const monto = compra.monto_total || compra.total || compra.neto || 0;
    
    // Filtrar por año y monto mínimo
    return (año >= 2024) && (monto > 10000);
  });

  console.log(`📊 Compras relevantes encontradas: ${comprasRelevantes.length} de ${compras.length} totales`);

  const cuentasPorPagar = comprasRelevantes.map(compra => ({
    id: compra.id || compra.folio || Math.random(),
    proveedor: compra.proveedor || compra.razon_social || compra.emisor || 'Proveedor no identificado',
    monto: compra.monto_total || compra.total || compra.neto || 0,
    fecha: compra.fecha || compra.fecha_recepcion || new Date().toISOString().split('T')[0],
    estado: compra.estado || 'Pendiente',
    folio: compra.folio || compra.numero || compra.id || 'S/N',
    tipo: compra.tipo_documento || compra.tipo || 'Factura de Compra',
    montoFormateado: formatCurrency(compra.monto_total || compra.total || compra.neto || 0)
  }));

  console.log(`✅ ${cuentasPorPagar.length} cuentas por pagar adaptadas correctamente`);
  return cuentasPorPagar;
};

/**
 * 🔄 ADAPTADOR MEJORADO: Saldos bancarios
 * Actualizado para trabajar con el nuevo servicio de saldos
 */
const adaptarSaldosBancarios = (cuentas) => {
  if (!Array.isArray(cuentas)) {
    console.warn('⚠️ adaptarSaldosBancarios: datos no son array');
    console.warn(`   Tipo recibido: ${typeof cuentas}`);
    console.warn(`   Datos: ${JSON.stringify(cuentas, null, 2)}`);
    return [];
  }

  console.log('🏦 Adaptando saldos bancarios con servicio mejorado...');
  console.log(`🔍 INPUT DEBUG: {tipo: '${typeof cuentas}', esArray: ${Array.isArray(cuentas)}, longitud: ${cuentas.length}}`);

  // Verificar si los datos vienen del nuevo servicio
  const tieneDetalleCalculo = cuentas.some(cuenta => cuenta.detalleCalculo);
  if (tieneDetalleCalculo) {
    console.log('✅ Detectados datos del servicio mejorado');
  }

  const saldosAdaptados = cuentas.map((cuenta, index) => {
    // Normalizar nombre del banco
    let nombreBanco = cuenta.banco || cuenta.nombreBanco || cuenta.alias || `Banco ${index + 1}`;
    nombreBanco = MAPEO_BANCOS[nombreBanco.toLowerCase()] || nombreBanco;

    // Obtener saldo (priorizar saldoCalculado del nuevo servicio)
    const saldo = cuenta.saldoCalculado || cuenta.saldo || cuenta.balance || 0;

    // Información adicional del nuevo servicio
    const detalleCalculo = cuenta.detalleCalculo || {};
    const ultimaActualizacion = cuenta.ultimaActualizacion || new Date().toISOString();
    const origenSaldo = cuenta.origenSaldo || 'desconocido';

    // Determinar confiabilidad basada en el origen y método
    let nivelConfiabilidad = 'media';
    if (origenSaldo === 'chipax_cartolas_calculado') {
      nivelConfiabilidad = 'alta';
    } else if (origenSaldo === 'saldos_conocidos_fallback') {
      nivelConfiabilidad = 'baja';
    }

    const cuentaAdaptada = {
      id: cuenta.id || index,
      nombre: cuenta.nombre || cuenta.numeroCuenta || cuenta.alias || `Cuenta ${index + 1}`,
      banco: nombreBanco,
      saldo: saldo,
      saldoCalculado: saldo,
      moneda: cuenta.moneda || 'CLP',
      tipo: cuenta.tipo || cuenta.tipoCuenta || 'Cuenta Corriente',
      
      // Información adicional del nuevo servicio
      ultimaActualizacion: ultimaActualizacion,
      origenSaldo: origenSaldo,
      nivelConfiabilidad: nivelConfiabilidad,
      
      // Formateo para mostrar
      saldoFormateado: formatCurrency(saldo),
      
      // Detalles técnicos (para debugging)
      debug: {
        metodoCalculo: detalleCalculo.metodoCalculo || 'desconocido',
        cartolasUsadas: detalleCalculo.cartolasUsadas || 0,
        periodoAnalizado: detalleCalculo.periodoAnalizado || 'N/A',
        saldoInicial: detalleCalculo.saldoInicial || 0,
        ingresos2025: detalleCalculo.ingresos2025 || 0,
        egresos2025: detalleCalculo.egresos2025 || 0
      }
    };

    // Log detallado para debugging
    if (tieneDetalleCalculo) {
      console.log(`🏦 ${nombreBanco}:`);
      console.log(`   💰 Saldo: $${saldo.toLocaleString('es-CL')}`);
      console.log(`   🔍 Método: ${detalleCalculo.metodoCalculo || 'N/A'}`);
      console.log(`   📊 Cartolas: ${detalleCalculo.cartolasUsadas || 0}`);
      console.log(`   🎯 Confiabilidad: ${nivelConfiabilidad}`);
    }

    return cuentaAdaptada;
  });

  // Calcular totales y mostrar resumen
  const totalSaldos = saldosAdaptados.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  const cuentasConSaldo = saldosAdaptados.filter(cuenta => cuenta.saldo !== 0);
  
  console.log(`✅ ${saldosAdaptados.length} saldos bancarios adaptados correctamente`);
  console.log(`💰 Total saldos: $${totalSaldos.toLocaleString('es-CL')}`);
  console.log(`🏦 Cuentas con saldo: ${cuentasConSaldo.length}`);
  
  if (tieneDetalleCalculo) {
    const cuentasAltaConfiabilidad = saldosAdaptados.filter(c => c.nivelConfiabilidad === 'alta').length;
    const cuentasMediaConfiabilidad = saldosAdaptados.filter(c => c.nivelConfiabilidad === 'media').length;
    const cuentasBajaConfiabilidad = saldosAdaptados.filter(c => c.nivelConfiabilidad === 'baja').length;
    
    console.log(`🎯 Confiabilidad: ${cuentasAltaConfiabilidad} alta, ${cuentasMediaConfiabilidad} media, ${cuentasBajaConfiabilidad} baja`);
  }

  return saldosAdaptados;
};

// =====================================
// 🧮 FUNCIONES DE CÁLCULO DE TOTALES
// =====================================

/**
 * Calcular total de cuentas por cobrar
 */
const calcularTotalCuentasPorCobrar = (cuentasPorCobrar) => {
  if (!Array.isArray(cuentasPorCobrar)) return 0;
  
  return cuentasPorCobrar.reduce((total, cuenta) => {
    return total + (cuenta.monto || 0);
  }, 0);
};

/**
 * Calcular total de cuentas por pagar
 */
const calcularTotalCuentasPorPagar = (cuentasPorPagar) => {
  if (!Array.isArray(cuentasPorPagar)) return 0;
  
  return cuentasPorPagar.reduce((total, cuenta) => {
    return total + (cuenta.monto || 0);
  }, 0);
};

/**
 * Calcular total de saldos bancarios
 */
const calcularTotalSaldosBancarios = (saldosBancarios) => {
  if (!Array.isArray(saldosBancarios)) return 0;
  
  return saldosBancarios.reduce((total, cuenta) => {
    return total + (cuenta.saldo || 0);
  }, 0);
};

// =====================================
// 📊 FUNCIONES DE RESUMEN Y ANÁLISIS
// =====================================

/**
 * Generar resumen completo de datos financieros
 */
const generarResumenFinanciero = (cuentasPorCobrar, cuentasPorPagar, saldosBancarios) => {
  const totalCobrar = calcularTotalCuentasPorCobrar(cuentasPorCobrar);
  const totalPagar = calcularTotalCuentasPorPagar(cuentasPorPagar);
  const totalSaldos = calcularTotalSaldosBancarios(saldosBancarios);
  
  const liquidezProyectada = totalSaldos + totalCobrar - totalPagar;
  
  return {
    cuentasPorCobrar: {
      cantidad: cuentasPorCobrar.length,
      total: totalCobrar,
      totalFormateado: formatCurrency(totalCobrar)
    },
    cuentasPorPagar: {
      cantidad: cuentasPorPagar.length,
      total: totalPagar,
      totalFormateado: formatCurrency(totalPagar)
    },
    saldosBancarios: {
      cantidad: saldosBancarios.length,
      total: totalSaldos,
      totalFormateado: formatCurrency(totalSaldos),
      cuentasActivas: saldosBancarios.filter(c => c.saldo > 0).length
    },
    liquidez: {
      proyectada: liquidezProyectada,
      proyectadaFormateada: formatCurrency(liquidezProyectada),
      estado: liquidezProyectada > 0 ? 'positiva' : 'negativa'
    },
    fechaCalculo: new Date().toISOString()
  };
};

/**
 * Validar calidad de datos financieros
 */
const validarCalidadDatos = (cuentasPorCobrar, cuentasPorPagar, saldosBancarios) => {
  const validacion = {
    cuentasPorCobrar: {
      esValido: Array.isArray(cuentasPorCobrar) && cuentasPorCobrar.length > 0,
      cantidad: Array.isArray(cuentasPorCobrar) ? cuentasPorCobrar.length : 0,
      conMontos: Array.isArray(cuentasPorCobrar) ? cuentasPorCobrar.filter(c => c.monto > 0).length : 0
    },
    cuentasPorPagar: {
      esValido: Array.isArray(cuentasPorPagar) && cuentasPorPagar.length > 0,
      cantidad: Array.isArray(cuentasPorPagar) ? cuentasPorPagar.length : 0,
      conMontos: Array.isArray(cuentasPorPagar) ? cuentasPorPagar.filter(c => c.monto > 0).length : 0
    },
    saldosBancarios: {
      esValido: Array.isArray(saldosBancarios) && saldosBancarios.length > 0,
      cantidad: Array.isArray(saldosBancarios) ? saldosBancarios.length : 0,
      conSaldos: Array.isArray(saldosBancarios) ? saldosBancarios.filter(c => c.saldo !== 0).length : 0,
      altaConfiabilidad: Array.isArray(saldosBancarios) ? saldosBancarios.filter(c => c.nivelConfiabilidad === 'alta').length : 0
    }
  };
  
  const calidadGeneral = (
    validacion.cuentasPorCobrar.esValido &&
    validacion.cuentasPorPagar.esValido &&
    validacion.saldosBancarios.esValido
  ) ? 'buena' : 'regular';
  
  return {
    ...validacion,
    calidadGeneral,
    fechaValidacion: new Date().toISOString()
  };
};

// =====================================
// 🔧 FUNCIONES DE UTILIDAD
// =====================================

/**
 * Formatear fecha para mostrar
 */
const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin fecha';
  
  try {
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return 'Fecha inválida';
  }
};

/**
 * Determinar estado visual basado en monto
 */
const determinarEstadoVisual = (monto, tipo = 'neutral') => {
  if (tipo === 'saldo') {
    if (monto > 1000000) return 'excelente'; // > 1M
    if (monto > 100000) return 'bueno';      // > 100K
    if (monto > 0) return 'regular';         // > 0
    return 'critico';                        // <= 0
  }
  
  if (tipo === 'deuda') {
    if (monto > 10000000) return 'critico';  // > 10M
    if (monto > 5000000) return 'regular';   // > 5M
    if (monto > 1000000) return 'bueno';     // > 1M
    return 'excelente';                      // <= 1M
  }
  
  return 'neutral';
};

/**
 * Obtener información de confiabilidad de saldos
 */
const obtenerInfoConfiabilidad = (saldosBancarios) => {
  if (!Array.isArray(saldosBancarios)) {
    return { nivel: 'desconocido', mensaje: 'Datos no válidos' };
  }
  
  const cuentasAlta = saldosBancarios.filter(c => c.nivelConfiabilidad === 'alta').length;
  const cuentasMedia = saldosBancarios.filter(c => c.nivelConfiabilidad === 'media').length;
  const cuentasBaja = saldosBancarios.filter(c => c.nivelConfiabilidad === 'baja').length;
  const total = saldosBancarios.length;
  
  if (total === 0) {
    return { nivel: 'sin_datos', mensaje: 'No hay datos de saldos' };
  }
  
  const porcentajeAlta = (cuentasAlta / total) * 100;
  
  if (porcentajeAlta >= 80) {
    return { 
      nivel: 'alta', 
      mensaje: `${porcentajeAlta.toFixed(0)}% de cuentas con alta confiabilidad`,
      detalles: { alta: cuentasAlta, media: cuentasMedia, baja: cuentasBaja }
    };
  } else if (porcentajeAlta >= 50) {
    return { 
      nivel: 'media', 
      mensaje: `${porcentajeAlta.toFixed(0)}% de cuentas con alta confiabilidad`,
      detalles: { alta: cuentasAlta, media: cuentasMedia, baja: cuentasBaja }
    };
  } else {
    return { 
      nivel: 'baja', 
      mensaje: `Solo ${porcentajeAlta.toFixed(0)}% de cuentas con alta confiabilidad`,
      detalles: { alta: cuentasAlta, media: cuentasMedia, baja: cuentasBaja }
    };
  }
};

// =====================================
// 🔧 FUNCIONES DE FILTRADO ADICIONALES
// =====================================

/**
 * Filtrar compras por rango de fechas
 */
const filtrarComprasPorFecha = (compras, fechaInicio, fechaFin) => {
  if (!Array.isArray(compras)) {
    console.warn('⚠️ filtrarComprasPorFecha: datos no son array');
    return [];
  }

  console.log(`🔍 Filtrando compras por fecha: ${fechaInicio} - ${fechaFin}`);

  const fechaInicioObj = new Date(fechaInicio);
  const fechaFinObj = new Date(fechaFin);

  const comprasFiltradas = compras.filter(compra => {
    const fechaCompra = new Date(compra.fecha || compra.fecha_recepcion || compra.fecha_emision);
    
    // Validar que la fecha sea válida
    if (isNaN(fechaCompra.getTime())) {
      return false;
    }

    return fechaCompra >= fechaInicioObj && fechaCompra <= fechaFinObj;
  });

  console.log(`✅ ${comprasFiltradas.length} compras filtradas de ${compras.length} totales`);
  return comprasFiltradas;
};

/**
 * Filtrar facturas por rango de fechas
 */
const filtrarFacturasPorFecha = (facturas, fechaInicio, fechaFin) => {
  if (!Array.isArray(facturas)) {
    console.warn('⚠️ filtrarFacturasPorFecha: datos no son array');
    return [];
  }

  console.log(`🔍 Filtrando facturas por fecha: ${fechaInicio} - ${fechaFin}`);

  const fechaInicioObj = new Date(fechaInicio);
  const fechaFinObj = new Date(fechaFin);

  const facturasFiltradas = facturas.filter(factura => {
    const fechaFactura = new Date(factura.fecha || factura.fecha_emision || factura.fecha_recepcion);
    
    // Validar que la fecha sea válida
    if (isNaN(fechaFactura.getTime())) {
      return false;
    }

    return fechaFactura >= fechaInicioObj && fechaFactura <= fechaFinObj;
  });

  console.log(`✅ ${facturasFiltradas.length} facturas filtradas de ${facturas.length} totales`);
  return facturasFiltradas;
};

/**
 * Filtrar por año específico
 */
const filtrarPorAno = (datos, ano) => {
  if (!Array.isArray(datos)) {
    console.warn('⚠️ filtrarPorAno: datos no son array');
    return [];
  }

  console.log(`🔍 Filtrando datos por año: ${ano}`);

  const datosFiltrados = datos.filter(item => {
    const fecha = new Date(item.fecha || item.fecha_emision || item.fecha_recepcion);
    
    if (isNaN(fecha.getTime())) {
      return false;
    }

    return fecha.getFullYear() === parseInt(ano);
  });

  console.log(`✅ ${datosFiltrados.length} items filtrados para año ${ano}`);
  return datosFiltrados;
};

/**
 * Obtener estadísticas por período
 */
const obtenerEstadisticasPorPeriodo = (datos, tipoPeriodo = 'mes') => {
  if (!Array.isArray(datos)) {
    console.warn('⚠️ obtenerEstadisticasPorPeriodo: datos no son array');
    return {};
  }

  console.log(`📊 Generando estadísticas por ${tipoPeriodo}...`);

  const estadisticas = {};

  datos.forEach(item => {
    const fecha = new Date(item.fecha || item.fecha_emision || item.fecha_recepcion);
    
    if (isNaN(fecha.getTime())) {
      return;
    }

    let clave;
    switch (tipoPeriodo) {
      case 'año':
        clave = fecha.getFullYear().toString();
        break;
      case 'mes':
        clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'día':
        clave = fecha.toISOString().split('T')[0];
        break;
      default:
        clave = fecha.getFullYear().toString();
    }

    if (!estadisticas[clave]) {
      estadisticas[clave] = {
        cantidad: 0,
        totalMonto: 0,
        items: []
      };
    }

    estadisticas[clave].cantidad++;
    estadisticas[clave].totalMonto += item.monto_total || item.total || item.neto || 0;
    estadisticas[clave].items.push(item);
  });

  console.log(`✅ Estadísticas generadas para ${Object.keys(estadisticas).length} períodos`);
  return estadisticas;
};

// =====================================
// 🚀 EXPORTACIONES COMPLETAS
// =====================================

// Exportar todas las funciones individualmente
export {
  adaptarCuentasPorCobrar,
  adaptarCuentasPorPagar,
  adaptarSaldosBancarios,
  calcularTotalCuentasPorCobrar,
  calcularTotalCuentasPorPagar,
  calcularTotalSaldosBancarios,
  generarResumenFinanciero,
  validarCalidadDatos,
  formatearFecha,
  determinarEstadoVisual,
  obtenerInfoConfiabilidad,
  formatCurrency,
  filtrarComprasPorFecha,
  filtrarFacturasPorFecha,
  filtrarPorAno,
  obtenerEstadisticasPorPeriodo
};

// Exportar todas las funciones
export default {
  adaptarCuentasPorCobrar,
  adaptarCuentasPorPagar,
  adaptarSaldosBancarios,
  calcularTotalCuentasPorCobrar,
  calcularTotalCuentasPorPagar,
  calcularTotalSaldosBancarios,
  generarResumenFinanciero,
  validarCalidadDatos,
  formatearFecha,
  determinarEstadoVisual,
  obtenerInfoConfiabilidad,
  formatCurrency,
  filtrarComprasPorFecha,
  filtrarFacturasPorFecha,
  filtrarPorAno,
  obtenerEstadisticasPorPeriodo
};
