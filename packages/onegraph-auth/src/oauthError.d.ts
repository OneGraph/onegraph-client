export default OAuthError;
declare function OAuthError(
  errorObject: ErrorObject,
  fileName?: string,
  lineNumber?: number,
): Error;
declare namespace OAuthError {
  const __proto__: ErrorConstructor;
}
type ErrorObject = {
  error: string;
  error_description: string;
};
