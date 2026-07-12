export class HttpError extends Error {
  code: string;
  publicMessage: string;
  retryable: boolean;
  status: number;

  constructor(
    status: number,
    code: string,
    publicMessage: string,
    options: { cause?: unknown; retryable?: boolean } = {},
  ) {
    super(publicMessage);
    this.name = new.target.name;
    this.cause = options.cause;
    this.code = code;
    this.publicMessage = publicMessage;
    this.retryable = options.retryable ?? status >= 500;
    this.status = status;
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(
    code: string,
    publicMessage: string,
    options: { cause?: unknown; retryable?: boolean } = {},
  ) {
    super(503, code, publicMessage, options);
  }
}

export class BadRequestError extends HttpError {
  constructor(code: string, publicMessage: string, cause?: unknown) {
    super(400, code, publicMessage, { cause, retryable: false });
  }
}

export class ConflictError extends HttpError {
  constructor(code: string, publicMessage: string, cause?: unknown) {
    super(409, code, publicMessage, { cause, retryable: false });
  }
}

export class BadGatewayError extends HttpError {
  constructor(
    code: string,
    publicMessage: string,
    options: { cause?: unknown; retryable?: boolean } = {},
  ) {
    super(502, code, publicMessage, options);
  }
}

export class UpstreamTimeoutError extends HttpError {
  constructor(code: string, publicMessage: string, cause?: unknown) {
    super(504, code, publicMessage, { cause, retryable: true });
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
