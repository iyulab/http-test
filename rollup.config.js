import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import { preserveShebangs } from 'rollup-plugin-preserve-shebangs';
import { dts } from 'rollup-plugin-dts';

const plugins = [
  resolve({
    exportConditions: ['node'],
    preferBuiltins: true
  }),
  commonjs(), 
  typescript({
    declaration: false,
  }),
  json(),
  preserveShebangs()
];

/**
 * @type {import('rollup').RollupOptions}
 */
export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs'
      },
      {
        file: 'dist/index.es.js',
        format: 'es'
      }
    ],
    plugins
  },
  {
    input: 'src/program.ts',
    output: {
      file: 'dist/program.cjs',
      format: 'cjs'
    },
    plugins
  },
  {
    input: 'dist/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];