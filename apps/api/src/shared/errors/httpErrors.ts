export class HttpError extends Error {
  code: string;
  publicMessage: string;
  status: number;

  constructor(status: number, code: string, publicMessage: string) {
    super(publicMessage);
    this.code = code;
    this.publicMessage = publicMessage;
    this.status = status;
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(code: string, publicMessage: string) {
    super(503, code, publicMessage);
  }
}

export class UpstreamTimeoutError extends HttpError {
  constructor(code: string, publicMessage: string) {
    super(504, code, publicMessage);
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
