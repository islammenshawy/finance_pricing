import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import RefreshPlugin from '@rspack/plugin-react-refresh';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  experiments: {
    css: true,
  },
  entry: {
    main: './src/main.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isDev ? '[name].js' : '[name].[contenthash].js',
    publicPath: 'auto',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                  development: isDev,
                  refresh: isDev,
                },
              },
            },
          },
        },
      },
      {
        test: /\.css$/,
        use: ['postcss-loader'],
        type: 'css',
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico|webp)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './index.html',
      inject: true,
    }),
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    // Module Federation for MFE
    // Exposes granular components for flexible consumption by host applications
    new rspack.container.ModuleFederationPlugin({
      name: 'loanPricing',
      filename: 'remoteEntry.js',
      exposes: {
        // UI Primitives - Basic building blocks (SearchBar, Button, Input, etc.)
        './ui': './src/mfe/index.ts',

        // Grid System - DataGrid, Toolbar, Cells for tabular data
        './grid': './src/mfe/grid.ts',

        // Pages - Full page components (LoanPricingPage, CustomerPage)
        './pages': './src/mfe/pages.ts',

        // Hooks - State management and business logic hooks
        './hooks': './src/mfe/hooks.ts',

        // Legacy exports (for backwards compatibility)
        './LoanPricingPage': './src/components/pricing/LoanPricingPage.tsx',
        './CustomerPage': './src/components/customers/CustomerPage.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        '@tanstack/react-query': {
          singleton: true,
        },
        'react-redux': {
          singleton: true,
        },
        '@reduxjs/toolkit': {
          singleton: true,
        },
      },
    }),
    isDev ? new RefreshPlugin() : null,
  ].filter(Boolean) as rspack.RspackPluginInstance[],
  devServer: {
    port: 4000,
    hot: true,
    historyApiFallback: true,
    allowedHosts: 'all', // Allow Docker host.docker.internal for visual regression testing
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    ],
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  devtool: isDev ? 'eval-source-map' : 'source-map',
});
