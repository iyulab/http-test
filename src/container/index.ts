/**
 * Container Module
 *
 * Dependency injection container for managing application dependencies.
 */

export { Container, container, ContainerKeys } from './Container';
export {
  setupContainer,
  createTestContainer,
  resolveTestManagerDependencies,
  InternalKeys
} from './setup';
export type { ContainerSetupOptions } from './setup';
