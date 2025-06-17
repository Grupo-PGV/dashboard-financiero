// chipaxAdapter.js - Adaptador completo corregido para transformar datos de Chipax al formato del dashboard

// === FUNCIONES AUXILIARES ===

/**
 * Calcula los días vencidos desde una fecha de vencimiento
 */
const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  try {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    
    // Resetear horas para comparar solo fechas
    hoy.setHours(0, 0, 0, 0);
    vencimiento.setHours(0, 0, 0, 0);
    
    const diferencia = hoy - vencimiento;
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    return dias > 0 ? dias : 0;
  } catch (error) {
    console.warn('Error calculando días vencidos:', error);
    return 0;
  }
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

// === FUNCIÓN PRINCIPAL DE ADAPTACIÓN ===

/**
 * Adapta los datos según el tipo de entidad
 */
export const adaptarDatosChipax = (tipo, datos) => {
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

// === FUNCIONES DE ADAPTACIÓN ESPECÍFICAS ===

/**
 * FUNCIÓN ACTUALIZADA: Adapta cuentas corrientes al formato de saldos bancarios
 * Ahora maneja múltiples fuentes de datos y orígenes de saldo
 */
const adaptarCuentasCorrientes = (cuentas) => {
  console.log(`🏦 Adaptando ${cuentas.length} cuentas corrientes`);
  
  return cuentas.map((cuenta, index) => {
    // Log detallado para la primera cuenta
    if (index === 0) {
      console.log('🔍 Estructura de la primera cuenta:', {
        id: cuenta.id,
        nombre: cuenta.nombre,
        banco: cuenta.banco,
        saldo: cuenta.saldo,
        origenDatos: cuenta.origenDatos
      });
    }

    // El saldo ya fue procesado por las funciones del service
    let saldoFinal = cuenta.saldo || 0;
    let origenSaldo = cuenta.origenDatos || 'adaptador';

    console.log(`🏦 Cuenta ${cuenta.nombre}: $${saldoFinal.toLocaleString('es-CL')} (${cuenta.banco}) [${origenSaldo}]`);

    return {
      id: cuenta.id,
      nombre: cuenta.nombre,
      banco: cuenta.banco,
      saldo: saldoFinal,
      moneda: cuenta.moneda || 'CLP',
      simboloMoneda: cuenta.simboloMoneda || '$',
      tipo: cuenta.tipo || 'Cuenta Corriente',
      ultimaActualizacion: cuenta.ultimaActualizacion || new Date().toISOString(),
      
      // Metadatos para debugging y transparencia
      origenSaldo: origenSaldo,
      metadatos: {
        origenDatos: origenSaldo,
        fechaProcesamiento: new Date().toISOString(),
        esConfiable: origenSaldo !== 'fallback'
      }
    };
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
      console.log('🔍 Estructura del primer DTE:', {
        id: dte.id,
        razonSocial: dte.razonSocial,
        montoTotal: dte.montoTotal,
        saldoDeudor: dte.Saldo?.saldoDeudor
      });
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
 * FUNCIÓN CORREGIDA: Adapta compras al formato de cuentas por pagar
 * CORRECCIÓN CRÍTICA: El campo 'proveedor' ahora es SIEMPRE un string, nunca un objeto
 */
const adaptarCompras = (compras) => {
  console.log(`💸 Adaptando ${compras.length} compras`);
  
  return compras.map((compra, index) => {
    // Logging detallado para la primera compra para debugging
    if (index === 0) {
      console.log('🔍 Estructura de la primera compra:', {
        id: compra.id,
        folio: compra.folio,
        tipo: compra.tipo,
        razonSocial: compra.razonSocial,
        rutEmisor: compra.rutEmisor,
        montoTotal: compra.montoTotal,
        Saldo: compra.Saldo,
        fechaPagoInterna: compra.fechaPagoInterna,
        fechaVencimiento: compra.fechaVencimiento
      });
    }

    // ========================================
    // CORRECCIÓN CRÍTICA: PROVEEDOR COMO STRING
    // ========================================
    
    // Extraer el nombre del proveedor como STRING (no objeto)
    let proveedorNombre = 'Sin nombre';
    let proveedorRut = 'Sin RUT';
    
    // Múltiples fuentes posibles para el nombre del proveedor
    if (compra.razonSocial && typeof compra.razonSocial === 'string') {
      proveedorNombre = compra.razonSocial;
    } else if (compra.ClienteProveedor?.razonSocial) {
      proveedorNombre = compra.ClienteProveedor.razonSocial;
    } else if (compra.Proveedor?.razonSocial) {
      proveedorNombre = compra.Proveedor.razonSocial;
    } else if (compra.Proveedor?.nombre) {
      proveedorNombre = compra.Proveedor.nombre;
    } else if (typeof compra.proveedor === 'string') {
      proveedorNombre = compra.proveedor;
    } else if (typeof compra.proveedor === 'object' && compra.proveedor?.nombre) {
      proveedorNombre = compra.proveedor.nombre;
    }
    
    // Múltiples fuentes posibles para el RUT del proveedor
    if (compra.rutEmisor) {
      proveedorRut = compra.rutEmisor;
    } else if (compra.ClienteProveedor?.rut) {
      proveedorRut = compra.ClienteProveedor.rut;
    } else if (compra.Proveedor?.rut) {
      proveedorRut = compra.Proveedor.rut;
    } else if (typeof compra.proveedor === 'object' && compra.proveedor?.rut) {
      proveedorRut = compra.proveedor.rut;
    }

    // ========================================
    // CÁLCULO DEL SALDO PENDIENTE
    // ========================================
    
    // Determinar el monto pendiente de pago
    let saldoPendiente = 0;
    
    // Prioridad 1: Saldo en objeto Saldo
    if (compra.Saldo?.saldo_acreedor && compra.Saldo.saldo_acreedor > 0) {
      saldoPendiente = compra.Saldo.saldo_acreedor;
    } else if (compra.Saldo?.saldoAcreedor && compra.Saldo.saldoAcreedor > 0) {
      saldoPendiente = compra.Saldo.saldoAcreedor;
    } 
    // Prioridad 2: Si no hay fecha de pago, usar monto total
    else if (!compra.fechaPagoInterna && compra.montoTotal) {
      saldoPendiente = compra.montoTotal;
    }
    // Prioridad 3: Campos directos de saldo
    else if (compra.saldoPendiente) {
      saldoPendiente = compra.saldoPendiente;
    } else if (compra.saldo) {
      saldoPendiente = compra.saldo;
    }

    // ========================================
    // CÁLCULO DE FECHAS Y DÍAS VENCIDOS
    // ========================================
    
    const fechaVencimiento = compra.fechaVencimiento || 
                            compra.fecha_vencimiento || 
                            compra.fechaEmision || 
                            compra.fecha_emision;
    
    const diasVencidos = calcularDiasVencidos(fechaVencimiento);
    
    // ========================================
    // DETERMINACIÓN DEL ESTADO
    // ========================================
    
    const estaPagado = compra.fechaPagoInterna !== null || saldoPendiente === 0;
    const estado = estaPagado ? 'pagado' : 'pendiente';

    // ========================================
    // OBJETO ADAPTADO FINAL
    // ========================================
    
    return {
      id: compra.id,
      folio: compra.folio || compra.numero || 'S/N',
      tipo: obtenerTipoDocumento(compra.tipo || compra.tipo_documento),
      tipoNumero: compra.tipo || compra.tipo_documento,
      
      // 🚨 CRÍTICO: proveedor debe ser STRING, no objeto
      proveedor: proveedorNombre, // ✅ SIEMPRE STRING
      
      // Información adicional del proveedor en objeto separado
      proveedorInfo: {
        nombre: proveedorNombre,
        rut: proveedorRut
      },
      
      // Fechas
      fechaEmision: compra.fechaEmision || compra.fecha_emision,
      fechaVencimiento: fechaVencimiento,
      fechaPagoInterna: compra.fechaPagoInterna,
      
      // Montos
      monto: compra.montoTotal || compra.monto_total || 0,
      montoNeto: compra.montoNeto || compra.monto_neto || 0,
      iva: compra.iva || compra.montoIva || 0,
      saldo: saldoPendiente,
      
      // Estado y días vencidos
      diasVencidos: diasVencidos,
      estado: estado,
      pagado: estaPagado,
      
      // Campos adicionales útiles
      observaciones: compra.observaciones || '',
      centroCosto: compra.CentroCosto?.nombre || '',
      numeroInterno: compra.numeroInterno || '',
      
      // Información de auditoría
      fechaCreacion: compra.created_at || compra.fechaCreacion,
      fechaActualizacion: compra.updated_at || compra.fechaActualizacion
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
  const periodos = movimientos.map(mov => ({
    fecha: mov.fecha,
    periodo: mov.periodo || new Date(mov.fecha).toISOString().slice(0, 7),
    ingresos: mov.ingresos || 0,
    egresos: mov.egresos || 0,
    saldo: mov.saldo || 0,
    detalles: mov.detalles || []
  }));

  // Calcular totales
  const totales = periodos.reduce((acc, periodo) => ({
    ingresos: acc.ingresos + periodo.ingresos,
    egresos: acc.egresos + periodo.egresos,
    saldo: acc.ingresos + periodo.ingresos - acc.egresos - periodo.egresos
  }), { ingresos: 0, egresos: 0, saldo: 0 });
  
  return { periodos, totales };
};

// === FUNCIONES DE VERIFICACIÓN Y CALIDAD ===

/**
 * Verifica la calidad de los saldos adaptados
 */
const verificarCalidadSaldos = (cuentasAdaptadas) => {
  console.log('\n🔍 VERIFICANDO CALIDAD DE SALDOS ADAPTADOS:');
  
  const saldoTotal = cuentasAdaptadas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  
  // Analizar origen de los saldos
  const porOrigen = {};
  cuentasAdaptadas.forEach(cuenta => {
    const origen = cuenta.origenSaldo || 'desconocido';
    porOrigen[origen] = (porOrigen[origen] || 0) + 1;
  });
  
  console.log('📊 Saldos por origen:', porOrigen);
  
  // Valores esperados (basados en el contexto del proyecto)
  const saldoEsperado = 186648977; // Total correcto conocido
  const diferencia = Math.abs(saldoTotal - saldoEsperado);
  const porcentajeError = (diferencia / saldoEsperado) * 100;
  const esCorrectoTotal = diferencia < 1000; // Tolerancia de $1000
  
  console.log(`💰 Saldo total calculado: ${saldoTotal.toLocaleString('es-CL')}`);
  console.log(`🎯 Saldo esperado: ${saldoEsperado.toLocaleString('es-CL')}`);
  console.log(`📈 Diferencia: ${diferencia.toLocaleString('es-CL')} (${porcentajeError.toFixed(2)}%)`);
  console.log(`✅ Estado: ${esCorrectoTotal ? 'CORRECTO' : 'NECESITA REVISIÓN'}`);
  
  // Contar cuentas confiables
  const cuentasConfiables = cuentasAdaptadas.filter(c => c.metadatos?.esConfiable).length;
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
 * Función adicional para debugging y verificación
 */
const verificarSaldosConChipax = (cuentasAdaptadas) => {
  console.log('\n🔍 VERIFICACIÓN DE SALDOS CON CHIPAX:');
  
  const saldoTotal = cuentasAdaptadas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  
  console.log('📊 RESUMEN DE SALDOS:');
  cuentasAdaptadas.forEach(cuenta => {
    console.log(`${cuenta.nombre}: ${cuenta.saldo.toLocaleString('es-CL')} (${cuenta.banco})`);
  });
  
  console.log(`💰 TOTAL CALCULADO: ${saldoTotal.toLocaleString('es-CL')}`);
  
  return { saldoTotal, cuentasAdaptadas };
};

// === FUNCIÓN DE TESTING ===

/**
 * Función para probar el adaptador corregido
 */
export const probarAdaptadorCorregido = () => {
  console.log('🧪 PROBANDO ADAPTADOR CORREGIDO');
  
  // Datos de ejemplo que simulan la respuesta de /compras
  const comprasEjemplo = [
    {
      id: 123456,
      folio: 1001,
      tipo: 33,
      razonSocial: "PROVEEDOR EXAMPLE LTDA",
      rutEmisor: "12345678-9",
      montoTotal: 1190000,
      montoNeto: 1000000,
      iva: 190000,
      fechaEmision: "2024-12-01",
      fechaVencimiento: "2024-12-31",
      fechaPagoInterna: null, // null = pendiente
      Saldo: {
        saldo_acreedor: 1190000 // Monto pendiente
      }
    }
  ];
  
  const resultado = adaptarCompras(comprasEjemplo);
  
  console.log('✅ RESULTADO DEL ADAPTADOR:');
  console.log(JSON.stringify(resultado[0], null, 2));
  
  // Verificaciones críticas
  const primerElemento = resultado[0];
  
  console.log('\n🔍 VERIFICACIONES CRÍTICAS:');
  console.log(`✅ proveedor es string: ${typeof primerElemento.proveedor === 'string'}`);
  console.log(`✅ proveedor no es objeto: ${typeof primerElemento.proveedor !== 'object'}`);
  console.log(`✅ proveedorInfo es objeto: ${typeof primerElemento.proveedorInfo === 'object'}`);
  console.log(`✅ Valor de proveedor: "${primerElemento.proveedor}"`);
  
  return resultado;
};

// === EXPORTACIONES ===

// Exportar objeto con todas las funciones para compatibilidad
const chipaxAdapter = {
  adaptarDatosChipax,
  verificarCalidadSaldos,
  verificarSaldosConChipax,
  probarAdaptadorCorregido,
  
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
  adaptarFlujoCaja,
  calcularDiasVencidos,
  obtenerTipoDocumento
};
