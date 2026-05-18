declare module 'logrocket' {
  interface NetworkRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }

  interface NetworkResponse {
    url: string;
    status: number;
    headers: Record<string, string>;
    body?: string;
  }

  interface LogRocketConfig {
    dom?: {
      inputSanitizer?: boolean;
      textSanitizer?: boolean;
    };
    network?: {
      requestSanitizer?: (request: NetworkRequest) => NetworkRequest;
      responseSanitizer?: (response: NetworkResponse) => NetworkResponse;
    };
    console?: {
      isEnabled?: {
        log?: boolean;
        debug?: boolean;
        info?: boolean;
        warn?: boolean;
        error?: boolean;
      };
    };
  }

  function init(appId: string, config?: LogRocketConfig): void;
  function identify(userId: string, traits?: Record<string, unknown>): void;
  function track(eventName: string, properties?: Record<string, unknown>): void;
  function log(level: string, ...args: unknown[]): void;

  export default {
    init,
    identify,
    track,
    log,
  };
}
