import chipaxService from './services/chipaxService';

const testConnection = async () => {
  try {
    const token = await chipaxService.getChipaxToken();
    console.log('Token obtenido:', token);
    
    const saldos = await chipaxService.Banco.getSaldosBancarios();
    console.log('Saldos:', saldos);
  } catch (error) {
    console.error('Error:', error);
  }
};

testConnection();
