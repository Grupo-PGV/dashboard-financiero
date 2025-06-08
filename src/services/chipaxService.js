// chipaxService.js - Corrección del EgresosService

export const EgresosService = {
  getFacturasCompra: async () => {
    try {
      console.log('🛒 Obteniendo facturas de compra pendientes de pago...');
      
      // CAMBIO IMPORTANTE: Usar el endpoint /compras en lugar de /dtes
      const response = await fetchAllPaginatedData('/compras');
      
      console.log(`📊 Total facturas de compra: ${response.items?.length || 0}`);
      
      // Filtrar solo las pendientes de pago si es necesario
      // Basándonos en la estructura real de Chipax, no hay campo "pagado"
      // pero podemos usar fechaPagoInterna o estado
      const facturasPendientesPago = response.items?.filter(factura => {
        // Incluir todas las facturas por ahora
        // Puedes ajustar este filtro según necesites
        return factura.montoTotal > 0;
      }) || [];
      
      console.log(`💸 Facturas pendientes de pago: ${facturasPendientesPago.length}`);
      
      return {
        ...response,
        items: facturasPendientesPago
      };
    } catch (error) {
      console.error('❌ Error obteniendo facturas de compra:', error);
      return { items: [] };
    }
  },
  
  getFacturasPendientesAprobacion: async () => {
    console.log('⏳ No hay endpoint para facturas pendientes de aprobación');
    return [];
  },
  
  getPagosProgramados: async () => {
    console.log('📅 No hay endpoint para pagos programados');
    return [];
  }
};
