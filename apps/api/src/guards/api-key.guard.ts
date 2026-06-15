import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

/**
 * API Key guard that validates the x-api-key header against the API_KEY_SECRET env var.
 * Used to protect upload endpoints accessed by the desktop app.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];

    const expectedKey = process.env.API_KEY_SECRET;

    if (!expectedKey) {
      throw new UnauthorizedException(
        "API key authentication is not configured"
      );
    }

    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    return true;
  }
}
