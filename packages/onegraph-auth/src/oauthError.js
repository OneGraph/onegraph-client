type ErrorObject = {
  error: string,
  error_description: string,
};

function OAuthError(
  errorObject: ErrorObject,
  fileName?: string,
  lineNumber?: number,
) {
  const message = `OAuthError: ${errorObject.error} ${
    errorObject.error_description
  }`;
  const instance = new Error(message, fileName, lineNumber);
  instance.oauthError = errorObject;
  Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
  if (Error.captureStackTrace) {
    Error.captureStackTrace(instance, OAuthError);
  }
  return instance;
}

OAuthError.prototype = Object.create(Error.prototype, {
  constructor: {
    value: Error,
    enumerable: false,
    writable: true,
    configurable: true,
  },
});

if (Object.setPrototypeOf) {
  Object.setPrototypeOf(OAuthError, Error);
} else {
  OAuthError.__proto__ = Error;
}

export default OAuthError;
