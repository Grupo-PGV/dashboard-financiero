// chipaxAdapter.js - Corrección para el problema de renderizado en Cuentas por Pagar

/**
 * Adapta los datos de compras de Chipax al formato del dashboard
 * CORRECCIÓN: proveedor ahora es string para evitar error de renderizado
 */
export const adaptarCompras = (compras) => {
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCompras: Se esperaba un array, recibido:', typeof compras);
    return [];
  }

  return compras.map(compra => {
    // SOLUCIÓN: Convertir proveedor a string y mantener info detallada por separado
    const proveedorNombre = compra.razonSocial || compra.nombre || 'Sin nombre';
    const proveedorRut = compra.rutEmisor || compra.rut || 'Sin RUT';

    return {
      id: compra.id || compra.folio || Math.random(),
      numero: compra.folio || compra.numero || 'S/N',
      fecha: compra.fecha || compra.fechaEmision || new Date().toISOString().split('T')[0],
      
      // ✅ CORRECCIÓN PRINCIPAL: proveedor como string
      proveedor: proveedorNombre,
      
      // ✅ NUEVA: Información detallada del proveedor en objeto separado
      proveedorInfo: {
        nombre: proveedorNombre,
        rut: proveedorRut,
        razonSocial: compra.razonSocial
      },
      
      monto: compra.montoTotal || compra.total || compra.monto || 0,
      moneda: compra.moneda || 'CLP',
      tipo: compra.tipo || compra.tipoDocumento || 'Compra',
      estado: compra.estado || 'Pendiente',
      
      // Campos adicionales para análisis
      descripcion: compra.descripcion || compra.detalle || '',
      categoria: compra.categoria || 'Sin categoría',
      
      // Fechas importantes
      fechaVencimiento: compra.fechaVencimiento || null,
      fechaPago: compra.fechaPago || null,
      
      // Información contable
      centroCosto: compra.centroCosto || null,
      proyecto: compra.proyecto || null,
      
      // Metadatos
      creadoEn: compra.creadoEn || new Date().toISOString(),
      actualizadoEn: compra.actualizadoEn || new Date().toISOString()
    };
  });
};

/**
 * Función auxiliar para validar que el adaptador funciona correctamente
 */
export const probarAdaptadorCorregido = (datosComprasSample) => {
  console.log('🧪 Probando adaptador corregido...');
  
  const resultado = adaptarCompras(datosComprasSample);
  
  // Verificar que proveedor sea string
  const proveedoresString = resultado.every(compra => typeof compra.proveedor === 'string');
  
  console.log('✅ Todos los proveedores son strings:', proveedoresString);
  console.log('📊 Muestra del resultado:', resultado[0]);
  
  return {
    esValido: proveedoresString,
    muestra: resultado[0],
    total: resultado.length
  };
};
