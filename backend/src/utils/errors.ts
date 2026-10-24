export class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly code: string) {
    super(message);
  }
}

export class BlockchainServiceError extends ApiError {
  constructor(message: string, code = "BLOCKCHAIN_ERROR", statusCode = 502) {
    super(message, statusCode, code);
  }
}
