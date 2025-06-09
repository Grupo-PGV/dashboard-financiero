// chipaxAdapter.js - Adaptador completo para transformar datos de Chipax al formato del dashboard
// VERSIÓN CORREGIDA PARA NETLIFY BUILD

// === FUNCIONES AUXILIARES ===

/**
 * Calcula los días vencidos desde una fecha
 */
const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diferencia = hoy - vencimiento;
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  
  return dias > 0 ? dias : 0;
};

/**
 * Obtiene el nombre del tipo de documento según su código
 */
const obtenerTipoDocumento = (tipo) => {
  const tipos = {
    30: 'Factura',
    32: 'Factura de venta exenta',
    33: 'Factura electrónica',
    34: 'Factura no afecta o exenta electrónica',
    35: 'Boleta',
    38: 'Boleta exenta',
    39: 'Boleta electrónica',
    41: 'Boleta exenta electrónica',
    46: 'Factura de compra',
    52: 'Guía de despacho',
    56: 'Nota de débito',
    61: 'Nota de crédito',
    110: 'Factura de exportación',
    111: 'Nota de débito de exportación',
    112: 'Nota de crédito de exportación'
  };
  
  return tipos[tipo] || `Tipo ${tipo}`;
};

/**
 * Determina el estado de un DTE basado en su información
 */
const determinarEstadoDTE = (dte, saldoPendiente) => {
  if (dte.anulado) return 'anulado';
  if (saldoPendiente === 0) return 'pagado';
  if (saldoPendiente > 0) return 'pendiente';
  return 'desconocido';
};

/**
 * Obtiene el nombre del mes
 */
const obtenerNombreMes = (numeroMes) => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[numeroMes];
};

/**
 * Obtiene el número del mes
 */
const obtenerNumeroMes = (nombreMes) => {
  const meses = {
    'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 
    'Mayo': 4, 'Junio': 5, 'Julio': 6, 'Agosto': 7,
    'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
  };
  return meses[nombreMes] || 0;
};

// === FUNCIONES DE ADAPTACIÓN ESPECÍFICAS ===

/**
 * VERSIÓN MEJORADA: Adapta cuentas corrientes con soporte para saldos iniciales
 * Ahora maneja correctamente los datos del nuevo servicio de saldos
 */
const adaptarCuentasCorrientes = (cuentas) => {
  console.log(`💰 Adaptando ${cuentas.length} cuentas corrientes (versión actualizada)`);
  
  return cuentas.map((cuenta, index) => {
    // Log detallado para la primera cuenta
    if (index === 0) {
      console.log('🔍 Estructura completa de la primera cuenta corriente:');
      console.log(JSON.stringify(cuenta, null, 2));
    }

    // NUEVA LÓGICA: Usar saldo ya calculado por el nuevo servicio
    let saldoFinal = 0;
    let origenSaldo = 'desconocido';
    
    // PRIORIDAD 1: Si el saldo ya viene calculado desde el nuevo servicio
    if (cuenta.saldo !== undefined && cuenta.origenSaldo === 'saldo_inicial_mas_movimientos_2025') {
      saldoFinal = cuenta.saldo;
      origenSaldo = 'saldo_inicial_mas_movimientos_2025';
      console.log(`✅ Cuenta ${cuenta.nombre}: Usando saldo calculado con saldos iniciales: $${saldoFinal.toLocaleString('es-CL')}`);
    }
    // PRIORIDAD 2: Usar saldo calculado desde flujo de caja (método legacy)
    else if (cuenta.saldoCalculado !== undefined) {
      saldoFinal = cuenta.saldoCalculado;
      origenSaldo = 'flujo_caja_calculado';
      console.log(`✅ Cuenta ${cuenta.nombre}: Usando saldo calculado desde flujo de caja: $${saldoFinal.toLocaleString('es-CL')}`);
    } 
    // PRIORIDAD 3: Usar objeto Saldo si está disponible
    else if (cuenta.Saldo) {
      const debe = cuenta.Saldo.debe || 0;
      const haber = cuenta.Saldo.haber || 0;
      const saldoDeudor = cuenta.Saldo.saldo_deudor || 0;
      const saldoAcreedor = cuenta.Saldo.saldo_acreedor || 0;
      
      // Usar la lógica contable estándar: deudor - acreedor
      saldoFinal = saldoDeudor - saldoAcreedor;
      origenSaldo = 'objeto_saldo';
      
      if (index === 0) {
        console.log('💵 Cálculo de saldo desde objeto Saldo:', {
          debe,
          haber,
          saldoDeudor,
          saldoAcreedor,
          saldoFinal,
          logica: 'saldo_deudor - saldo_acreedor'
        });
      }
    }
    // PRIORIDAD 4: Campo saldo directo (menos confiable)
    else if (cuenta.saldo !== undefined) {
      saldoFinal = cuenta.saldo;
      origenSaldo = 'campo_saldo_directo';
      console.log(`⚠️ Cuenta ${cuenta.nombre}: Usando campo saldo directo: $${saldoFinal.toLocaleString('es-CL')}`);
    }
    
    // Log del resultado para cada cuenta
    console.log(`🏦 Cuenta ${cuenta.nombre || cuenta.numeroCuenta || cuenta.id}: $${saldoFinal.toLocaleString('es-CL')} (${cuenta.banco || 'Sin banco'}) [${origenSaldo}]`);
    
    // Crear objeto adaptado mejorado
    const cuentaAdaptada = {
      id: cuenta.id,
      nombre: cuenta.nombre || cuenta.numeroCuenta || 'Cuenta sin número',
      banco: cuenta.banco || 
             cuenta.Banco?.nombre || 
             cuenta.TipoCuentaCorriente?.tipoCuenta || 
             'Banco no especificado',
      saldo: saldoFinal,
      moneda: cuenta.moneda || cuenta.Moneda?.moneda || 'CLP',
      simboloMoneda: cuenta.simboloMoneda || cuenta.Moneda?.simbolo || '$',
      tipo: cuenta.tipo || cuenta.TipoCuentaCorriente?.nombreCorto || 'Cuenta Corriente',
      ultimaActualizacion: cuenta.ultimaActualizacion || 
                          cuenta.ultimoMovimiento || 
                          cuenta.fechaUltimaActualizacion || 
                          cuenta.updated_at || 
                          new Date().toISOString(),
      
      // Campos adicionales para debugging y transparencia
      origenSaldo,
      totalMovimientos: cuenta.totalMovimientos || 0,
      
      // Detalles del cálculo si están disponibles
      detalleCalculo: cuenta.detalleCalculo || null,
      
      // Campos adicionales para compatibilidad
      saldoDeudor: cuenta.Saldo?.saldo_deudor || 0,
      saldoAcreedor: cuenta.Saldo?.saldo_acreedor || 0,
      
      // Metadatos
      metadatos: {
        origenDatos: cuenta.origenSaldo || origenSaldo,
        metodologiaCalculo: origenSaldo === 'saldo_inicial_mas_movimientos_2025' 
          ? 'Saldo inicial 2025 + movimientos del año'
          : origenSaldo === 'flujo_caja_calculado' 
          ? 'Calculado desde movimientos de flujo de caja'
          : 'Método legacy',
        fechaProcesamiento: new Date().toISOString(),
        esConfiable: origenSaldo === 'saldo_inicial_mas_movimientos_2025' || 
                     origenSaldo === 'flujo_caja_calculado'
      }
    };
    
    return cuentaAdaptada;
  });
};

/**
 * Adapta DTEs (Documentos Tributarios Electrónicos) al formato de cuentas por cobrar
 */
const adaptarDTEs = (dtes) => {
  console.log(`📊 Adaptando ${dtes.length} DTEs`);
  
  return dtes.map((dte, index) => {
    // Log detallado para el primer DTE
    if (index === 0) {
      console.log('🔍 Estructura del primer DTE:', JSON.stringify(dte, null, 2));
    }

    // Extraer información del cliente
    const cliente = dte.razonSocial || 
                   dte.ClienteProveedor?.razonSocial || 
                   dte.ClienteProveedor?.nombre ||
                   'Cliente sin identificar';

    // Calcular saldo pendiente real
    const montoTotal = dte.montoTotal || dte.total || 0;
    const saldoPendiente = dte.Saldo?.saldoDeudor || dte.saldoDeudor || dte.saldo || montoTotal;

    // Determinar estado
    const estado = determinarEstadoDTE(dte, saldoPendiente);

    // Calcular días vencidos
    const diasVencidos = calcularDiasVencidos(dte.fechaVencimiento);

    return {
      id: dte.id,
      folio: dte.folio,
      cliente,
      rut: dte.ClienteProveedor?.rut || dte.rut || '',
      monto: montoTotal,
      saldo: saldoPendiente,
      fecha: dte.fechaEmision || dte.created_at || new Date().toISOString(),
      fechaVencimiento: dte.fechaVencimiento || null,
      tipo: obtenerTipoDocumento(dte.tipo),
      estado,
      diasVencidos,
      moneda: dte.Moneda?.moneda || 'CLP',
      observaciones: dte.observaciones || '',
      sucursal: dte.sucursal || dte.Sucursal?.nombre || ''
    };
  });
};

/**
 * Adapta compras al formato de cuentas por pagar
 * CORREGIDO: El campo proveedor ahora es siempre string
 */
const adaptarCompras = (compras) => {
  console.log(`💸 Adaptando ${compras.length} compras`);
  
  return compras.map((compra, index) => {
    // Log detallado para la primera compra
    if (index === 0) {
      console.log('🔍 Estructura de la primera compra:', JSON.stringify(compra, null, 2));
    }

    // CORRECCIÓN CRÍTICA: Asegurar que proveedor sea siempre string
    let nombreProveedor;
    if (typeof compra.proveedor === 'object' && compra.proveedor !== null) {
      nombreProveedor = compra.proveedor.nombre || compra.proveedor.razonSocial || 'Proveedor sin nombre';
    } else if (typeof compra.proveedor === 'string') {
      nombreProveedor = compra.proveedor;
    } else if (compra.Proveedor) {
      nombreProveedor = compra.Proveedor.razonSocial || compra.Proveedor.nombre || 'Proveedor sin nombre';
    } else {
      nombreProveedor = 'Proveedor no especificado';
    }

    // Calcular saldo pendiente
    const montoTotal = compra.montoTotal || compra.total || 0;
    const saldoPendiente = compra.saldo || compra.saldoPendiente || montoTotal;

    // Determinar estado de pago
    const estaPagado = compra.fechaPagoInterna !== null || saldoPendiente === 0;

    return {
      id: compra.id,
      proveedor: nombreProveedor, // ✅ SIEMPRE STRING
      rut: compra.Proveedor?.rut || compra.rut || '',
      monto: montoTotal,
      saldo: saldoPendiente,
      fecha: compra.fechaEmision || compra.created_at || new Date().toISOString(),
      fechaVencimiento: compra.fechaVencimiento || null,
      tipo: 'Compra',
      estado: estaPagado ? 'pagado' : 'pendiente',
      pagado: estaPagado,
      observaciones: compra.observaciones || '',
      centroCosto: compra.CentroCosto?.nombre || ''
    };
  });
};

/**
 * Adapta clientes al formato esperado
 */
const adaptarClientes = (clientes) => {
  return clientes.map(cliente => ({
    id: cliente.id,
    nombre: cliente.razonSocial || cliente.nombre || 'Sin nombre',
    rut: cliente.rut || 'Sin RUT',
    email: cliente.email || cliente.correo || '',
    telefono: cliente.telefono || cliente.fono || '',
    direccion: cliente.direccion || cliente.direccionComercial || '',
    comuna: cliente.comuna || '',
    ciudad: cliente.ciudad || '',
    giro: cliente.giro || '',
    contacto: cliente.contacto || cliente.nombreContacto || '',
    plazoPago: cliente.plazoPago || 30,
    activo: cliente.activo !== false
  }));
};

/**
 * Adapta proveedores al formato esperado
 */
const adaptarProveedores = (proveedores) => {
  return proveedores.map(proveedor => ({
    id: proveedor.id,
    nombre: proveedor.razonSocial || proveedor.nombre || 'Sin nombre',
    rut: proveedor.rut || 'Sin RUT',
    email: proveedor.email || proveedor.correo || '',
    telefono: proveedor.telefono || proveedor.fono || '',
    direccion: proveedor.direccion || '',
    comuna: proveedor.comuna || '',
    ciudad: proveedor.ciudad || '',
    giro: proveedor.giro || '',
    contacto: proveedor.contacto || proveedor.nombreContacto || '',
    banco: proveedor.banco || '',
    numeroCuenta: proveedor.numeroCuenta || proveedor.cuentaBancaria || '',
    tipoCuenta: proveedor.tipoCuenta || '',
    activo: proveedor.activo !== false
  }));
};

/**
 * Adapta flujo de caja al formato esperado
 */
const adaptarFlujoCaja = (datos) => {
  console.log('💵 Adaptando flujo de caja, datos recibidos:', datos);
  
  // Si viene un objeto con arrFlujoCaja
  if (datos.arrFlujoCaja && Array.isArray(datos.arrFlujoCaja)) {
    return procesarFlujoCaja(datos.arrFlujoCaja);
  }
  
  // Si ya es un array de movimientos
  if (Array.isArray(datos)) {
    return procesarFlujoCaja(datos);
  }
  
  // Si no hay datos
  return {
    periodos: [],
    totales: { ingresos: 0, egresos: 0, saldo: 0 }
  };
};

/**
 * Procesa los movimientos del flujo de caja agrupándolos por período
 */
const procesarFlujoCaja = (movimientos) => {
  // Agrupar por mes
  const periodosPorMes = {};
  
  movimientos.forEach(mov => {
    const fecha = new Date(mov.fecha || mov.fechaMovimiento);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    if (!periodosPorMes[mesKey]) {
      periodosPorMes[mesKey] = {
        fecha: mesKey,
        ingresos: 0,
        egresos: 0,
        movimientos: []
      };
    }
    
    const monto = mov.monto || mov.montoMovimiento || 0;
    
    if (monto > 0) {
      periodosPorMes[mesKey].ingresos += monto;
    } else {
      periodosPorMes[mesKey].egresos += Math.abs(monto);
    }
    
    periodosPorMes[mesKey].movimientos.push(mov);
  });
  
  // Convertir a array y ordenar por fecha
  const periodos = Object.values(periodosPorMes)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  
  // Calcular totales
  const totales = periodos.reduce((acc, periodo) => ({
    ingresos: acc.ingresos + periodo.ingresos,
    egresos: acc.egresos + periodo.egresos,
    saldo: acc.ingresos + periodo.ingresos - acc.egresos - periodo.egresos
  }), { ingresos: 0, egresos: 0, saldo: 0 });
  
  return { periodos, totales };
};

// === FUNCIÓN PRINCIPAL DE ADAPTACIÓN ===

/**
 * FUNCIÓN PRINCIPAL: Adapta los datos según el tipo de entidad
 * Esta es la función que se exporta y usa en toda la aplicación
 */
export const adaptarDatosChipax = (tipo, datos) => {
  console.log(`🔄 Adaptando datos Chipax de tipo: ${tipo}`);
  
  if (!datos || !Array.isArray(datos)) {
    console.warn(`⚠️ Datos inválidos para tipo ${tipo}:`, datos);
    return [];
  }

  console.log(`🔄 Adaptando ${datos.length} registros de tipo ${tipo}`);

  let resultado = [];

  switch (tipo) {
    case 'saldosBancarios':
      resultado = adaptarCuentasCorrientes(datos);
      
      // Verificar calidad de los saldos adaptados
      const verificacion = verificarCalidadSaldos(resultado);
      
      // Agregar información de verificación al resultado
      resultado.metadatosVerificacion = verificacion;
      
      break;
    
    case 'cuentasPorCobrar':
      resultado = adaptarDTEs(datos);
      break;
    
    case 'cuentasPorPagar':
      resultado = adaptarCompras(datos);
      break;
    
    case 'clientes':
      resultado = adaptarClientes(datos);
      break;
    
    case 'proveedores':
      resultado = adaptarProveedores(datos);
      break;
    
    case 'flujoCaja':
      resultado = adaptarFlujoCaja(datos);
      break;
    
    default:
      console.warn(`⚠️ Tipo de adaptación no reconocido: ${tipo}`);
      resultado = datos;
  }

  console.log(`✅ Adaptación completada para tipo ${tipo}: ${Array.isArray(resultado) ? resultado.length : 'N/A'} elementos`);
  
  return resultado;
};

// === FUNCIONES DE UTILIDAD ===

/**
 * NUEVA FUNCIÓN: Verificar y reportar calidad de los saldos adaptados
 */
const verificarCalidadSaldos = (cuentasAdaptadas, totalEsperado = 186648977) => {
  console.log('\n🔍 VERIFICACIÓN DE CALIDAD DE SALDOS:');
  console.log('=====================================');
  
  const saldoTotal = cuentasAdaptadas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  
  // Análisis por origen de datos
  const porOrigen = {};
  cuentasAdaptadas.forEach(cuenta => {
    const origen = cuenta.origenSaldo;
    if (!porOrigen[origen]) {
      porOrigen[origen] = { cuentas: 0, total: 0 };
    }
    porOrigen[origen].cuentas++;
    porOrigen[origen].total += cuenta.saldo;
  });
  
  console.log('📊 RESUMEN POR ORIGEN DE DATOS:');
  Object.entries(porOrigen).forEach(([origen, stats]) => {
    console.log(`${origen}: ${stats.cuentas} cuentas, $${stats.total.toLocaleString('es-CL')}`);
  });
  
  console.log('\n📊 RESUMEN TOTAL:');
  console.log(`💰 Total calculado: $${saldoTotal.toLocaleString('es-CL')}`);
  console.log(`🎯 Total esperado: $${totalEsperado.toLocaleString('es-CL')}`);
  
  const diferencia = Math.abs(saldoTotal - totalEsperado);
  const porcentajeError = (diferencia / totalEsperado) * 100;
  const esCorrectoTotal = porcentajeError < 1;
  
  console.log(`📏 Diferencia: $${diferencia.toLocaleString('es-CL')} (${porcentajeError.toFixed(2)}%)`);
  console.log(`✅ Estado: ${esCorrectoTotal ? 'CORRECTO' : 'NECESITA REVISIÓN'}`);
  
  // Contar cuentas confiables
  const cuentasConfiables = cuentasAdaptadas.filter(c => c.metadatos.esConfiable).length;
  console.log(`🔒 Cuentas confiables: ${cuentasConfiables}/${cuentasAdaptadas.length}`);
  
  return { 
    saldoTotal, 
    esCorrectoTotal, 
    diferencia, 
    porcentajeError,
    porOrigen,
    cuentasConfiables,
    calidadGeneral: esCorrectoTotal && cuentasConfiables === cuentasAdaptadas.length ? 'excelente' : 
                    esCorrectoTotal ? 'buena' : 'necesita_mejora'
  };
};

/**
 * FUNCIÓN ADICIONAL PARA DEBUGGING
 */
const verificarSaldosConChipax = (cuentasAdaptadas) => {
  console.log('\n🔍 VERIFICACIÓN DE SALDOS CON CHIPAX:');
  
  const saldoTotal = cuentasAdaptadas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  
  console.log('📊 RESUMEN DE SALDOS:');
  cuentasAdaptadas.forEach(cuenta => {
    console.log(`${cuenta.nombre}: ${cuenta.saldo.toLocaleString('es-CL')} (${cuenta.banco})`);
  });
  
  console.log(`💰 TOTAL CALCULADO: ${saldoTotal.toLocaleString('es-CL')}`);
  
  // Comparar con valores esperados de Chipax
  const valoresEsperados = {
    total: 186648977, // Total correcto de Chipax
    cuentas: {}
  };
  
  console.log('\n🎯 COMPARACIÓN CON CHIPAX:');
  console.log(`Esperado: ${valoresEsperados.total.toLocaleString('es-CL')}`);
  console.log(`Calculado: ${saldoTotal.toLocaleString('es-CL')}`);
  console.log(`Diferencia: ${(saldoTotal - valoresEsperados.total).toLocaleString('es-CL')}`);
  
  const esCorrectoTotal = Math.abs(saldoTotal - valoresEsperados.total) < 1000; // Tolerancia de $1000
  console.log(`✅ Saldo total ${esCorrectoTotal ? 'CORRECTO' : 'INCORRECTO'}`);
  
  return { saldoTotal, esCorrectoTotal };
};

// === EXPORTACIONES ===

// Exportar objeto con todas las funciones para compatibilidad
const chipaxAdapter = {
  adaptarDatosChipax,
  verificarCalidadSaldos,
  verificarSaldosConChipax,
  
  // Funciones individuales para uso directo
  adaptarCuentasCorrientes,
  adaptarDTEs,
  adaptarCompras,
  adaptarClientes,
  adaptarProveedores,
  adaptarFlujoCaja
};

// Export default para compatibilidad
export default chipaxAdapter;

// Exportaciones nombradas adicionales
export { 
  verificarCalidadSaldos,
  verificarSaldosConChipax,
  adaptarCuentasCorrientes,
  adaptarDTEs,
  adaptarCompras,
  adaptarClientes,
  adaptarProveedores,
  adaptarFlujoCaja
};
