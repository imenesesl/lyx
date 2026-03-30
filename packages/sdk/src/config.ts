interface LyxRuntimeConfig {
  registryUrl: string;
}

let config: LyxRuntimeConfig = {
  registryUrl: "http://localhost:3456",
};

export function getLyxConfig(): LyxRuntimeConfig {
  return config;
}

export function setLyxConfig(partial: Partial<LyxRuntimeConfig>): void {
  config = { ...config, ...partial };
}
