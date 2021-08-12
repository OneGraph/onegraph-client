export default OAuthError;

declare class OAuthError extends Error {
  readonly oauthError: ErrorObject;
  constructor(errorObject: ErrorObject, fileName?: string, lineNumber?: number);
}

type ErrorObject = {
  error: string;
  error_description: string;
};
