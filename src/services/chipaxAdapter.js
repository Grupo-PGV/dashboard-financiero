// chipaxAdapter.js - Adaptador completo para transformar datos de Chipax al formato del dashboard

/**
 * Calcula los días vencidos desde una fecha
 * @param {string} fecha - Fecha en formato ISO
 * @returns {number} Días vencidos (positivo) o por vencer (negativo)
 */
const calcularDiasVencidos = (fecha) => {
  if (!fecha) return 0;
  
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaVencimiento = new Date(fecha);
    fechaVencimiento.setHours(0, 0, 0, 0);
    
    const diffTime = hoy - fechaVencimiento;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculando días vencidos:', error);
    return 0;
  }
};

/**
 * Formatea un RUT chileno
 * @param {string} rut - RUT sin formato
 * @returns {string} RUT formateado
 */
const formatearRut = (rut) => {
  if (!rut) return '';
  
  // Limpiar RUT de puntos y guiones
  const rutLimpio = rut.toString().replace(/\./g, '').replace(/-/g, '');
  
  // Separar número y dígito verificador
  const rutNumero = rutLimpio.slice(0, -1);
  const rutDv = rutLimpio.slice(-1);
  
  // Formatear con puntos
  const rutFormateado = rutNumero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${rutFormateado}-${rutDv}`;
};

/**
 * Adapta los saldos bancarios desde cuentas corrientes
 */
const adaptarSaldosBancarios = (datos) => {
  console.log('🔄 Adaptando saldos bancarios...');
  
  if (!datos || (!Array.isArray(datos) && !datos.items)) {
    console.warn('⚠️ No se recibieron datos de cuentas corrientes');
    return [];
  }
  
  const cuentas = Array.isArray(datos) ? datos : (datos.items || []);
  
  const saldosAdaptados = cuentas.map(cuenta => ({
    id: cuenta.id,
    nombre: cuenta.nombre || cuenta.descripcion || `Cuenta ${cuenta.numero || cuenta.id}`,
    banco: cuenta.banco?.nombre || cuenta.nombre_banco || cuenta.institucion || 'Banco no especificado',
    numeroCuenta: cuenta.numero || cuenta.numero_cuenta || '',
    tipo: cuenta.tipo || 'cuenta_corriente',
    moneda: cuenta.moneda || 'CLP',
    saldo: parseFloat(cuenta.saldo || cuenta.saldo_actual || cuenta.balance || 0),
    disponible: parseFloat(cuenta.saldo_disponible || cuenta.disponible || cuenta.saldo || 0),
    sobregiro: parseFloat(cuenta.sobregiro || 0),
    fechaActualizacion: cuenta.fecha_actualizacion || cuenta.updated_at || new Date().toISOString()
  }));
  
  console.log(`✅ ${saldosAdaptados.length} cuentas bancarias adaptadas`);
  
  // Mostrar resumen
  const totalCLP = saldosAdaptados
    .filter(c => c.moneda === 'CLP')
    .reduce((sum, c) => sum + c.saldo, 0);
  console.log(`💰 Total en CLP: ${totalCLP.toLocaleString('es-CL')}`);
  
  return saldosAdaptados;
};

/**
 * Adapta las cuentas por cobrar (facturas de venta)
 */
const adaptarCuentasPorCobrar = (datos) => {
  console.log('🔄 Adaptando cuentas por cobrar...');
  
  if (!datos || (!Array.isArray(datos) && !datos.items)) {
    console.warn('⚠️ No se recibieron datos de ventas');
    return [];
  }
  
  const facturas = Array.isArray(datos) ? datos : (datos.items || []);
  
  const cuentasAdaptadas = facturas
    .filter(factura => {
      // Filtrar solo facturas pendientes de cobro
      const tieneSaldoPendiente = (factura.saldo_pendiente || 0) > 0;
      const noPagada = !factura.pagado || factura.estado_pago !== 'pagado';
      const montoMayorQueCero = (factura.monto_total || factura.total || 0) > 0;
      
      return tieneSaldoPendiente || (noPagada && montoMayorQueCero);
    })
    .map(factura => {
      const montoTotal = parseFloat(factura.monto_total || factura.total || 0);
      const montoPagado = parseFloat(factura.monto_pagado || factura.pagado || 0);
      const saldoPendiente = parseFloat(factura.saldo_pendiente || (montoTotal - montoPagado) || montoTotal);
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero || `Doc-${factura.id}`,
        tipo: factura.tipo_dte || factura.tipo || 'Factura',
        cliente: {
          rut: formatearRut(factura.rut_receptor || factura.rut_cliente || ''),
          nombre: factura.razon_social_receptor || factura.nombre_receptor || factura.cliente || 'Cliente no especificado'
        },
        monto: montoTotal,
        saldo: saldoPendiente,
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision || factura.fecha || new Date().toISOString(),
        fechaVencimiento: factura.fecha_vencimiento || factura.fecha_pago || null,
        diasVencidos: calcularDiasVencidos(factura.fecha_vencimiento || factura.fecha_pago),
        estado: factura.estado || 'pendiente',
        estadoPago: factura.estado_pago || 'pendiente',
        observaciones: factura.observaciones || factura.notas || '',
        // Campos adicionales útiles
        ordenCompra: factura.orden_compra || factura.oc || '',
        vendedor: factura.vendedor || '',
        condicionPago: factura.condicion_pago || ''
      };
    });
  
  console.log(`✅ ${cuentasAdaptadas.length} cuentas por cobrar adaptadas`);
  
  // Mostrar resumen
  const totalPorCobrar = cuentasAdaptadas.reduce((sum, c) => sum + c.saldo, 0);
  const vencidas = cuentasAdaptadas.filter(c => c.diasVencidos > 0).length;
  console.log(`💰 Total por cobrar: ${totalPorCobrar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  console.log(`⚠️ Facturas vencidas: ${vencidas}`);
  
  return cuentasAdaptadas;
};

/**
 * Adapta las cuentas por pagar (facturas de compra)
 */
const adaptarCuentasPorPagar = (datos) => {
  console.log('🔄 Adaptando cuentas por pagar...');
  
  if (!datos || (!Array.isArray(datos) && !datos.items)) {
    console.warn('⚠️ No se recibieron datos de compras');
    return [];
  }
  
  const facturas = Array.isArray(datos) ? datos : (datos.items || []);
  
  const cuentasAdaptadas = facturas
    .filter(factura => {
      // Filtrar solo facturas pendientes de pago
      const tieneSaldoPendiente = (factura.saldo_pendiente || 0) > 0;
      const noPagada = !factura.pagado || factura.estado_pago !== 'pagado';
      const montoMayorQueCero = (factura.monto_total || factura.total || 0) > 0;
      
      return tieneSaldoPendiente || (noPagada && montoMayorQueCero);
    })
    .map(factura => {
      const montoTotal = parseFloat(factura.monto_total || factura.total || 0);
      const montoPagado = parseFloat(factura.monto_pagado || factura.pagado || 0);
      const saldoPendiente = parseFloat(factura.saldo_pendiente || (montoTotal - montoPagado) || montoTotal);
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero || `Doc-${factura.id}`,
        tipo: factura.tipo_dte || factura.tipo || 'Factura',
        proveedor: {
          rut: formatearRut(factura.rut_emisor || factura.rut_proveedor || ''),
          nombre: factura.razon_social || factura.razon_social_emisor || factura.proveedor || 'Proveedor no especificado'
        },
        monto: montoTotal,
        saldo: saldoPendiente,
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision || factura.fecha || new Date().toISOString(),
        fechaVencimiento: factura.fecha_vencimiento || factura.fecha_pago || null,
        diasVencidos: calcularDiasVencidos(factura.fecha_vencimiento || factura.fecha_pago),
        estado: factura.estado || 'pendiente',
        estadoPago: factura.estado_pago || 'pendiente',
        observaciones: factura.observaciones || factura.notas || '',
        // Campos adicionales útiles
        ordenCompra: factura.orden_compra || factura.oc || '',
        centroCosto: factura.centro_costo || '',
        categoria: factura.categoria || factura.clasificacion || ''
      };
    });
  
  console.log(`✅ ${cuentasAdaptadas.length} cuentas por pagar adaptadas`);
  
  // Mostrar resumen
  const totalPorPagar = cuentasAdaptadas.reduce((sum, c) => sum + c.saldo, 0);
  const vencidas = cuentasAdaptadas.filter(c => c.diasVencidos > 0).length;
  console.log(`💸 Total por pagar: ${totalPorPagar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  console.log(`⚠️ Facturas vencidas: ${vencidas}`);
  
  return cuentasAdaptadas;
};

/**
 * Adapta los clientes
 */
const adaptarClientes = (datos) => {
  console.log('🔄 Adaptando clientes...');
  
  if (!datos || (!Array.isArray(datos) && !datos.items)) {
    console.warn('⚠️ No se recibieron datos de clientes');
    return [];
  }
  
  const clientes = Array.isArray(datos) ? datos : (datos.items || []);
  
  const clientesAdaptados = clientes.map(cliente => ({
    id: cliente.id,
    rut: formatearRut(cliente.rut || cliente.rut_cliente || ''),
    nombre: cliente.razon_social || cliente.nombre || 'Sin nombre',
    nombreFantasia: cliente.nombre_fantasia || '',
    direccion: cliente.direccion || cliente.direccion_comercial || '',
    comuna: cliente.comuna || '',
    ciudad: cliente.ciudad || '',
    telefono: cliente.telefono || cliente.fono || '',
    email: cliente.email || cliente.correo || '',
    contacto: cliente.contacto || '',
    condicionPago: cliente.condicion_pago || cliente.plazo_pago || '',
    limiteCredito: parseFloat(cliente.limite_credito || 0),
    estado: cliente.estado || cliente.activo ? 'activo' : 'inactivo',
    observaciones: cliente.observaciones || cliente.notas || ''
  }));
  
  console.log(`✅ ${clientesAdaptados.length} clientes adaptados`);
  
  return clientesAdaptados;
};

/**
 * Adapta los proveedores
 */
const adaptarProveedores = (datos) => {
  console.log('🔄 Adaptando proveedores...');
  
  if (!datos || (!Array.isArray(datos) && !datos.items)) {
    console.warn('⚠️ No se recibieron datos de proveedores');
    return [];
  }
  
  const proveedores = Array.isArray(datos) ? datos : (datos.items || []);
  
  const proveedoresAdaptados = proveedores.map(proveedor => ({
    id: proveedor.id,
    rut: formatearRut(proveedor.rut || proveedor.rut_proveedor || ''),
    nombre: proveedor.razon_social || proveedor.nombre || 'Sin nombre',
    nombreFantasia: proveedor.nombre_fantasia || '',
    direccion: proveedor.direccion || '',
    comuna: proveedor.comuna || '',
    ciudad: proveedor.ciudad || '',
    telefono: proveedor.telefono || proveedor.fono || '',
    email: proveedor.email || proveedor.correo || '',
    contacto: proveedor.contacto || '',
    condicionPago: proveedor.condicion_pago || proveedor.plazo_pago || '',
    estado: proveedor.estado || proveedor.activo ? 'activo' : 'inactivo',
    categoria: proveedor.categoria || proveedor.tipo || '',
    observaciones: proveedor.observaciones || proveedor.notas || ''
  }));
  
  console.log(`✅ ${proveedoresAdaptados.length} proveedores adaptados`);
  
  return proveedoresAdaptados;
};

/**
 * Adapta el flujo de caja
 */
const adaptarFlujoCaja = (datos, saldoInicial = 0) => {
  console.log('🔄 Adaptando flujo de caja...');
  
  if (!datos) {
    console.warn('⚠️ No se recibieron datos de flujo de caja');
    // Retornar flujo de caja vacío con estructura esperada
    return generarFlujoCajaVacio();
  }
  
  // Si los datos vienen en un formato específico de Chipax
  if (datos.flujos || datos.movimientos) {
    return adaptarFlujoCajaDesdeMovimientos(datos.flujos || datos.movimientos, saldoInicial);
  }
  
  // Si no hay datos específicos, generar flujo basado en facturas
  return generarFlujoCajaVacio();
};

/**
 * Genera un flujo de caja vacío con la estructura esperada
 */
const generarFlujoCajaVacio = () => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const mesActual = new Date().getMonth();
  const añoActual = new Date().getFullYear();
  
  // Generar los próximos 6 meses
  return Array.from({ length: 6 }, (_, index) => {
    const mesIndex = (mesActual + index) % 12;
    const año = mesActual + index >= 12 ? añoActual + 1 : añoActual;
    
    return {
      mes: meses[mesIndex],
      año: año,
      periodo: `${meses[mesIndex]} ${año}`,
      ingresos: 0,
      egresos: 0,
      saldo: 0,
      saldoAcumulado: 0
    };
  });
};

/**
 * Adapta el flujo de caja desde movimientos
 */
const adaptarFlujoCajaDesdeMovimientos = (movimientos, saldoInicial) => {
  const flujosPorMes = {};
  let saldoAcumulado = saldoInicial;
  
  movimientos.forEach(mov => {
    const fecha = new Date(mov.fecha || mov.fecha_movimiento);
    const mes = fecha.toLocaleString('es-CL', { month: 'long' });
    const año = fecha.getFullYear();
    const periodo = `${mes} ${año}`;
    
    if (!flujosPorMes[periodo]) {
      flujosPorMes[periodo] = {
        mes: mes.charAt(0).toUpperCase() + mes.slice(1),
        año: año,
        periodo: periodo,
        ingresos: 0,
        egresos: 0,
        saldo: 0,
        saldoAcumulado: 0
      };
    }
    
    const monto = parseFloat(mov.monto || 0);
    if (mov.tipo === 'ingreso' || monto > 0) {
      flujosPorMes[periodo].ingresos += Math.abs(monto);
    } else {
      flujosPorMes[periodo].egresos += Math.abs(monto);
    }
  });
  
  // Convertir a array y calcular saldos
  const flujoOrdenado = Object.values(flujosPorMes)
    .sort((a, b) => {
      const fechaA = new Date(`${a.año}-${a.mes}-01`);
      const fechaB = new Date(`${b.año}-${b.mes}-01`);
      return fechaA - fechaB;
    })
    .map(flujo => {
      flujo.saldo = flujo.ingresos - flujo.egresos;
      saldoAcumulado += flujo.saldo;
      flujo.saldoAcumulado = saldoAcumulado;
      return flujo;
    });
  
  console.log(`✅ Flujo de caja adaptado para ${flujoOrdenado.length} períodos`);
  
  return flujoOrdenado;
};

/**
 * Función principal de adaptación que determina qué adaptador usar
 */
export const adaptarDatosChipax = (tipo, datos) => {
  console.log(`🔄 Adaptando datos tipo: ${tipo}`);
  
  switch (tipo) {
    case 'saldosBancarios':
    case 'cuentas_corrientes':
      return adaptarSaldosBancarios(datos);
      
    case 'cuentasPorCobrar':
    case 'ventas':
    case 'facturas_venta':
      return adaptarCuentasPorCobrar(datos);
      
    case 'cuentasPorPagar':
    case 'compras':
    case 'facturas_compra':
      return adaptarCuentasPorPagar(datos);
      
    case 'clientes':
      return adaptarClientes(datos);
      
    case 'proveedores':
      return adaptarProveedores(datos);
      
    case 'flujoCaja':
    case 'flujo_caja':
      return adaptarFlujoCaja(datos);
      
    default:
      console.warn(`⚠️ Tipo de adaptación no reconocido: ${tipo}`);
      return datos;
  }
};

// Exportar todas las funciones individuales también
export default {
  adaptarDatosChipax,
  adaptarSaldosBancarios,
  adaptarCuentasPorCobrar,
  adaptarCuentasPorPagar,
  adaptarClientes,
  adaptarProveedores,
  adaptarFlujoCaja,
  // Funciones helper
  calcularDiasVencidos,
  formatearRut,
  generarFlujoCajaVacio
};
