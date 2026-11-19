export type OpenCORTheme = 'light' | 'dark' | 'system';

export interface OpenCORProps {
  omex?: string | Uint8Array;
  theme?: OpenCORTheme;
}

export type OpenCORChangelogChangeType = 'added' | 'removed' | 'improved' | 'fixed';

export interface OpenCORChangelogChange {
  type: OpenCORChangelogChangeType;
  description: string;
}

export interface OpenCORChangelogEntry {
  version: string;
  changes: OpenCORChangelogChange[];
}

export interface OpenCORExpose {
  changelog: () => OpenCORChangelogEntry[];
  addExternalData: (csv: string, voiExpression: string | undefined, modelParameters: string[]) => void;
  trackSimulationData: (modelParameters: string[]) => void;
  untrackSimulationData: (modelParameters: string[]) => void;
  untrackAllSimulationData: () => void;
}

export type OpenCOREmits = {
  externalData: [OpenCORExternalDataEvent];
  file: [OpenCORFileEvent];
  simulationData: [OpenCORSimulationDataEvent];
};

export interface OpenCORSimulationDataValue {
  data: Float64Array;
  unit: string;
}

// External data events.

export interface OpenCORExternalDataAddedEvent {
  type: 'added';
  csv: string;
  issues: string[];
}

export interface OpenCORExternalDataIssueEvent {
  type: 'issue';
  csv: string;
  issues: string[];
}

export type OpenCORExternalDataEvent = OpenCORExternalDataAddedEvent | OpenCORExternalDataIssueEvent;

// File events.

export interface OpenCORFileOpenedEvent {
  type: 'opened';
  filePath: string;
  issues: string[];
}

export interface OpenCORFileClosedEvent {
  type: 'closed';
  filePath: string;
  issues: string[];
}

export interface OpenCORFileIssueEvent {
  type: 'issue';
  filePath: string;
  issues: string[];
}

export type OpenCORFileEvent = OpenCORFileOpenedEvent | OpenCORFileClosedEvent | OpenCORFileIssueEvent;

// Simulation data events.

export type OpenCORSimulationData = Record<string, OpenCORSimulationDataValue>;

export interface OpenCORSimulationDataUpdatedEvent {
  type: 'updated';
  simulationData: OpenCORSimulationData;
  issues: string[];
}

export interface OpenCORSimulationDataIssueEvent {
  type: 'issue';
  simulationData: OpenCORSimulationData;
  issues: string[];
}

export type OpenCORSimulationDataEvent = OpenCORSimulationDataUpdatedEvent | OpenCORSimulationDataIssueEvent;

export { default, default as OpenCOR } from './src/components/OpenCOR.vue';
