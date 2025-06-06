// chipaxAdapter.js - Sección actualizada para adaptarCuentasPorPagar

/**
 * Adapta las cuentas por pagar (facturas de compra) desde Chipax
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
      // Basándonos en la estructura real de Chipax:
      // - No tienen campo "pagado" explícito
      // - fechaPagoInterna podría indicar si está pagada
      // - Por ahora incluimos todas las facturas
      return factura.montoTotal > 0;
    })
    .map(factura => {
      // Calcular días vencidos basado en fechaPagoInterna
      const fechaPago = factura.fechaPagoInterna || factura.fechaVencimiento;
      const diasVencidos = calcularDiasVencidos(fechaPago);
      
      return {
        id: factura.id,
        folio: factura.folio || `Doc-${factura.id}`,
        tipo: factura.tipo === 33 ? 'Factura' : factura.tipo === 34 ? 'Factura Exenta' : 'Documento',
        proveedor: {
          rut: formatearRut(factura.rutEmisor || ''),
          nombre: factura.razonSocial || 'Proveedor no especificado'
        },
        monto: factura.montoTotal || 0,
        saldo: factura.montoTotal || 0, // Asumimos que el saldo es el total si no está pagada
        moneda: factura.idMoneda === 1000 ? 'CLP' : 'Otra',
        fechaEmision: factura.fechaEmision || new Date().toISOString(),
        fechaVencimiento: factura.fechaPagoInterna || factura.fechaVencimiento || null,
        diasVencidos: diasVencidos,
        estado: factura.estado || 'pendiente',
        estadoPago: diasVencidos > 0 ? 'vencido' : 'pendiente',
        observaciones: factura.referencias || '',
        // Campos adicionales útiles
        montoNeto: factura.montoNeto || 0,
        iva: factura.iva || 0,
        montoExento: factura.montoExento || 0,
        eventoReceptor: factura.eventoReceptor,
        eventoReceptorLeyenda: factura.eventoReceptorLeyenda
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
 * Formatea un RUT chileno
 */
const formatearRut = (rut) => {
  if (!rut) return '';
  // Mantener formato con guión si ya lo tiene
  if (rut.includes('-')) return rut;
  // Si no tiene guión, agregarlo
  const rutLimpio = rut.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length > 1) {
    return rutLimpio.slice(0, -1) + '-' + rutLimpio.slice(-1);
  }
  return rut;
};

/**
 * Calcula los días vencidos de una factura
 */
const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  const hoy = new Date();
  const fechaVenc = new Date(fechaVencimiento);
  
  // Limpiar horas para comparar solo fechas
  hoy.setHours(0, 0, 0, 0);
  fechaVenc.setHours(0, 0, 0, 0);
  
  // Calcula la diferencia en días
  const diffTime = hoy.getTime() - fechaVenc.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Exportar la función
export { adaptarCuentasPorPagar };
