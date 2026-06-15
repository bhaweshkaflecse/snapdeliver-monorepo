import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as crypto from "crypto";

/**
 * JWT auth guard that validates Bearer tokens from the Authorization header.
 * Uses the JWT_SECRET env var to verify token signatures.
 * Protects dashboard endpoints (events, analytics).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid Authorization header");
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new UnauthorizedException("JWT authentication is not configured");
    }

    try {
      const payload = this.verifyToken(token, secret);
      // Attach decoded payload to request for downstream use
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  /**
   * Verifies a JWT token using HMAC-SHA256.
   * Performs manual verification without external dependencies.
   */
  private verifyToken(
    token: string,
    secret: string
  ): Record<string, unknown> {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const data = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("base64url");

    if (signatureB64 !== expectedSignature) {
      throw new Error("Invalid signature");
    }

    // Decode and parse payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired");
    }

    return payload;
  }
}
