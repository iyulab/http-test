/**
 * Authentication Module
 *
 * Provides authentication provider system for HTTP requests.
 */

// Core types and interfaces
export type { IAuthProvider, AuthContext } from './IAuthProvider';

// Registry
export { AuthRegistry } from './AuthRegistry';
export type { AuthRegistrationOptions } from './AuthRegistry';

// Built-in providers
export { BasicAuthProvider } from './BasicAuthProvider';
export { BearerTokenProvider } from './BearerTokenProvider';
export { DigestAuthProvider } from './DigestAuthProvider';
export { OAuth2Provider } from './OAuth2Provider';
