export interface GeneratedAgentIdentity {
  id: string;
  name: string;
  description?: string;
  wakeWord: string;
  templateId?: string;
}

export interface GeneratedAgentPersona {
  displayName: string;
  role?: string;
  tone: string[];
  style: string[];
  rawMarkdown: string;
}

export interface GeneratedAgentRuntimeConfig {
  musicLibraryDir?: string;
  downloadDir?: string;
  storageDriver?: string;
  panelPort?: number;
  wakeWord: string;
}

export interface GeneratedAgentProfile {
  rootDir: string;
  identity: GeneratedAgentIdentity;
  persona: GeneratedAgentPersona;
  runtimeConfig: GeneratedAgentRuntimeConfig;
  triggersMarkdown: string;
}
