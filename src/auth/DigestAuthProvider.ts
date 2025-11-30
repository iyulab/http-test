/**
 * DigestAuthProvider
 *
 * Handles HTTP Digest Authentication.
 * Note: Digest auth requires a challenge from the server first,
 * so this provider marks requests for digest auth handling.
 */
import { HttpRequest } from '../types';
import { IAuthProvider, AuthContext } from './IAuthProvider';

export class DigestAuthProvider implements IAuthProvider {
  readonly name = 'digest';

  canHandle(request: HttpRequest): boolean {
    // Check for @auth digest directive
    if (request.auth?.type === 'digest') {
      return true;
    }

    return false;
  }

  async applyAuth(request: HttpRequest, context: AuthContext): Promise<HttpRequest> {
    const result = { ...request, headers: { ...request.headers } };

    if (!request.auth || request.auth.type !== 'digest') {
      return result;
    }

    // Digest auth requires a challenge from server first
    // For now, we just mark the request and let the executor handle
    // the actual digest auth flow with the server challenge

    // If we have a challenge from a previous 401 response
    if (context.challenge) {
      const digestHeader = this.computeDigestHeader(
        request,
        context.challenge,
        this.replaceVariables(request.auth.username || '', context),
        this.replaceVariables(request.auth.password || '', context)
      );
      if (digestHeader) {
        result.headers['Authorization'] = digestHeader;
      }
    }

    // Keep the auth config so the executor knows to handle 401 responses
    return result;
  }

  private computeDigestHeader(
    request: HttpRequest,
    challenge: string,
    username: string,
    password: string
  ): string | null {
    // Parse the WWW-Authenticate challenge
    const params = this.parseChallenge(challenge);
    if (!params.realm || !params.nonce) {
      return null;
    }

    const realm = params.realm;
    const nonce = params.nonce;
    const qop = params.qop || '';
    const opaque = params.opaque || '';
    const algorithm = params.algorithm || 'MD5';

    // Generate cnonce for qop
    const cnonce = this.generateCnonce();
    const nc = '00000001';

    // Compute digest components
    const uri = new URL(request.url).pathname || '/';
    const method = request.method;

    // HA1 = MD5(username:realm:password)
    const ha1 = this.md5(`${username}:${realm}:${password}`);

    // HA2 = MD5(method:uri)
    const ha2 = this.md5(`${method}:${uri}`);

    // Response
    let response: string;
    if (qop) {
      // MD5(HA1:nonce:nc:cnonce:qop:HA2)
      response = this.md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    } else {
      // MD5(HA1:nonce:HA2)
      response = this.md5(`${ha1}:${nonce}:${ha2}`);
    }

    // Build Authorization header
    let header = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;

    if (qop) {
      header += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    }
    if (opaque) {
      header += `, opaque="${opaque}"`;
    }
    if (algorithm !== 'MD5') {
      header += `, algorithm=${algorithm}`;
    }

    return header;
  }

  private parseChallenge(challenge: string): Record<string, string> {
    const params: Record<string, string> = {};
    const regex = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
    let match;

    while ((match = regex.exec(challenge)) !== null) {
      params[match[1]] = match[2] || match[3];
    }

    return params;
  }

  private generateCnonce(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private md5(str: string): string {
    // Use Node.js crypto for MD5
    const crypto = require('crypto');
    return crypto.createHash('md5').update(str).digest('hex');
  }

  private replaceVariables(value: string, context: AuthContext): string {
    return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const replacement = context.variables.get(varName.trim());
      return replacement !== undefined ? replacement : match;
    });
  }
}
