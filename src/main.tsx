import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import './lib/monaco';
import './index.css';
import App from './App';

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'sm',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
