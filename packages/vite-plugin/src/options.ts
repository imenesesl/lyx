export interface LyxPluginOptions {
  /** Path to mfe.config.json (auto-detected if omitted) */
  configPath?: string;
  /** Override the dev server port */
  port?: number;
  /** Registry URL for auto-registration during dev/build */
  registryUrl?: string;
}

export interface LyxHostPluginOptions {
  /** Registry URL to fetch MFE entries from */
  registryUrl?: string;
}
