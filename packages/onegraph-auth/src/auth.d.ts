import {Storage} from './storage';
import {findMissingAuthServices} from './helpers';
type Service =
  | 'box'
  | 'dribbble'
  | 'dropbox'
  | 'eventil'
  | 'facebook'
  | 'github'
  | 'gmail'
  | 'google'
  | 'google-calendar'
  | 'google-compute'
  | 'google-docs'
  | 'google-translate'
  | 'hubspot'
  | 'intercom'
  | 'quickbooks'
  | 'salesforce'
  | 'slack'
  | 'spotify'
  | 'stripe'
  | 'trello'
  | 'twilio'
  | 'twitter'
  | 'youtube'
  | 'zeit'
  | 'zendesk';
type Opts = {
  oneGraphOrigin?: string;
  appId: string;
  oauthFinishOrigin?: string;
  oauthFinishPath?: string;
  saveAuthToStorage?: boolean;
  storage?: Storage;
  communicationMode?: CommunicationMode;
  graphqlUrl?: string;
};
type LogoutResult = {
  result: 'success' | 'failure';
};
type ServiceStatus = {
  isLoggedIn: boolean;
};
type LoggedInServices = {
  [service: string]: {
    serviceEnum: string;
    foreignUserIds: string[];
    usedTestFlow: boolean;
  };
};
type ServiceInfo = {
  service: string;
  serviceEnum: string;
  friendlyServiceName: string;
  supportsTestFlow: boolean;
};
type ServicesList = ServiceInfo[];
type ServicesStatus = {};
type AuthResponse = {
  token: Token;
};
export default OneGraphAuth;
type CommunicationMode = 'post_message' | 'redirect';
type Token = {
  accessToken: string;
  expireDate: number;
  refreshToken?: string;
};
declare class OneGraphAuth {
  constructor(opts: Opts);
  oneGraphOrigin: string;
  appId: string;
  supportedServices: string[];
  closeAuthWindow: (service: Service) => void;
  cleanup: (service: Service) => void;
  accessToken: () => Token | null;
  tokenExpireDate: () => Date | null;
  tokenExpiresSecondsFromNow: () => number | null;
  refreshToken: (refreshToken: string) => Promise<Token | null>;
  authHeaders: () => {
    Authorization?: string;
  };
  friendlyServiceName(service: Service): string;
  setToken: (token: Token) => void;
  login: (
    service: Service,
    scopes: Array<string> | null,
    useTestFlow?: boolean | null,
  ) => Promise<AuthResponse>;
  isLoggedIn: (
    args:
      | Service
      | {
          service: string;
          foreignUserId?: string | null;
        },
  ) => Promise<boolean>;
  servicesStatus: () => Promise<ServicesStatus>;
  allServices: () => Promise<ServicesList>;
  loggedInServices: () => Promise<LoggedInServices>;
  logout: (
    service: Service,
    foreignUserId?: string | null,
  ) => Promise<LogoutResult>;
  destroy: () => void;
  findMissingAuthServices: typeof findMissingAuthServices;
}
