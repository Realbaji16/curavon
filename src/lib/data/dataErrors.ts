export class DataAuthError extends Error {
  readonly name = 'DataAuthError';

  constructor(message = 'Sign in to continue.') {
    super(message);
  }
}

export class DataPermissionError extends Error {
  readonly name = 'DataPermissionError';

  constructor(message = 'You do not have permission for this data operation.') {
    super(message);
  }
}

export class DataValidationError extends Error {
  readonly name = 'DataValidationError';

  constructor(message = 'Invalid data request.') {
    super(message);
  }
}

export class DataUnavailableError extends Error {
  readonly name = 'DataUnavailableError';

  constructor(message = 'Data is temporarily unavailable.') {
    super(message);
  }
}

export type DataError =
  | DataAuthError
  | DataPermissionError
  | DataValidationError
  | DataUnavailableError;
