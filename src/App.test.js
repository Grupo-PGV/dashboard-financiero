import { render, screen } from '@testing-library/react';
import App from './App';

test('muestra la pantalla de login de PGR Seguridad', () => {
  render(<App />);
  expect(screen.getByText(/PGR Seguridad/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
});
