export interface IAppConfig {
  app: {
    port: number;
    host: string;
  };
  redis: {
    host: string;
    port: number;
  };
  service: {
    expiration_ttl: number;
  };
}
