//@flow

export interface Storage {
  getItem(key: string): ?string;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class InMemoryStorage implements Storage {
  state: {[key: string]: string} = {};
  getItem = (key: string): ?string => {
    return this.state[key];
  };
  setItem = (key: string, value: string): void => {
    this.state[key] = value;
  };
  removeItem = (key: string): void => {
    delete this.state[key];
  };
}

const OG_PREFIX = 'oneGraph:';

export class LocalStorage implements Storage {
  getItem(key: string): ?string {
    return localStorage.getItem(OG_PREFIX + key);
  }
  setItem(key: string, value: string): void {
    return localStorage.setItem(OG_PREFIX + key, value);
  }
  removeItem(key: string): void {
    return localStorage.removeItem(OG_PREFIX + key);
  }
}

const DEBUG_KEY = '__og_debug';

export function hasLocalStorage() {
  try {
    localStorage.setItem(DEBUG_KEY, 'debug');
    localStorage.removeItem(DEBUG_KEY);
    return true;
  } catch (e) {
    return (
      // $FlowFixMe
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === 'QuotaExceededError' ||
        // Firefox
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
      // acknowledge QuotaExceededError only if there's something already stored
      localStorage.length !== 0
    );
  }
}
