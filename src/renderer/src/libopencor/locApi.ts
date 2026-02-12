import { corsProxyUrl, formatError } from '../common/common.ts';

import type { EFileType, IWasmFile, IWasmFileManager } from './locFileApi.ts';
import type { IIssue } from './locLoggerApi.ts';
import type { IWasmSedChangeAttribute, IWasmSedDocument } from './locSedApi.ts';

export interface ICppLocApi {
  // FileManager API.

  fileManagerUnmanage: (path: string) => void;

  // File API.

  fileContents: (path: string) => Uint8Array;
  fileCreate: (path: string, contents?: Uint8Array) => void;
  fileIssues: (path: string) => IIssue[];
  fileType: (path: string) => EFileType;
  fileUiJson: (path: string) => Uint8Array | undefined;

  // SedDocument API.

  sedDocumentCreate: (path: string) => number;
  sedDocumentInstantiate: (documentId: number) => number;
  sedDocumentIssues: (documentId: number) => IIssue[];
  sedDocumentModelCount: (documentId: number) => number;
  sedDocumentSimulationCount: (documentId: number) => number;
  sedDocumentSimulationType: (documentId: number, index: number) => number;
  sedDocumentSerialise: (documentId: number) => string;

  // SedModel API.

  sedModelFilePath: (documentId: number, index: number) => string;
  sedModelAddChange: (
    documentId: number,
    index: number,
    componentName: string,
    variableName: string,
    newValue: string
  ) => void;
  sedModelRemoveAllChanges: (documentId: number, index: number) => void;

  // SedOneStep API.

  sedOneStepStep: (documentId: number, index: number) => number;

  // SedUniformTimeCourse API.

  sedUniformTimeCourseInitialTime: (documentId: number, index: number) => number;
  sedUniformTimeCourseSetInitialTime: (documentId: number, index: number, value: number) => void;
  sedUniformTimeCourseOutputStartTime: (documentId: number, index: number) => number;
  sedUniformTimeCourseSetOutputStartTime: (documentId: number, index: number, value: number) => void;
  sedUniformTimeCourseOutputEndTime: (documentId: number, index: number) => number;
  sedUniformTimeCourseSetOutputEndTime: (documentId: number, index: number, value: number) => void;
  sedUniformTimeCourseNumberOfSteps: (documentId: number, index: number) => number;
  sedUniformTimeCourseSetNumberOfSteps: (documentId: number, index: number, value: number) => void;

  // SolverCvode API.
  // TODO: this is only temporary until we have full support for our different solvers.

  solverCvodeMaximumStep: (documentId: number, index: number) => number;
  solverCvodeSetMaximumStep: (documentId: number, index: number, value: number) => void;

  // SedInstance API.

  sedInstanceHasIssues: (instanceId: number) => boolean;
  sedInstanceIssues: (instanceId: number) => IIssue[];
  sedInstanceRun: (instanceId: number) => number;

  // SedInstanceTask API.

  sedInstanceTaskVoiName: (instanceId: number, index: number) => string;
  sedInstanceTaskVoiUnit: (instanceId: number, index: number) => string;
  sedInstanceTaskVoi: (instanceId: number, index: number) => Float64Array;
  sedInstanceTaskStateCount: (instanceId: number, index: number) => number;
  sedInstanceTaskStateName: (instanceId: number, index: number, stateIndex: number) => string;
  sedInstanceTaskStateUnit: (instanceId: number, index: number, stateIndex: number) => string;
  sedInstanceTaskState: (instanceId: number, index: number, stateIndex: number) => Float64Array;
  sedInstanceTaskRateCount: (instanceId: number, index: number) => number;
  sedInstanceTaskRateName: (instanceId: number, index: number, rateIndex: number) => string;
  sedInstanceTaskRateUnit: (instanceId: number, index: number, rateIndex: number) => string;
  sedInstanceTaskRate: (instanceId: number, index: number, rateIndex: number) => Float64Array;
  sedInstanceTaskConstantCount: (instanceId: number, index: number) => number;
  sedInstanceTaskConstantName: (instanceId: number, index: number, constantIndex: number) => string;
  sedInstanceTaskConstantUnit: (instanceId: number, index: number, constantIndex: number) => string;
  sedInstanceTaskConstant: (instanceId: number, index: number, constantIndex: number) => Float64Array;
  sedInstanceTaskComputedConstantCount: (instanceId: number, index: number) => number;
  sedInstanceTaskComputedConstantName: (instanceId: number, index: number, computedConstantIndex: number) => string;
  sedInstanceTaskComputedConstantUnit: (instanceId: number, index: number, computedConstantIndex: number) => string;
  sedInstanceTaskComputedConstant: (instanceId: number, index: number, computedConstantIndex: number) => Float64Array;
  sedInstanceTaskAlgebraicVariableCount: (instanceId: number, index: number) => number;
  sedInstanceTaskAlgebraicVariableName: (instanceId: number, index: number, algebraicVariableIndex: number) => string;
  sedInstanceTaskAlgebraicVariableUnit: (instanceId: number, index: number, algebraicVariableIndex: number) => string;
  sedInstanceTaskAlgebraicVariable: (instanceId: number, index: number, algebraicVariableIndex: number) => Float64Array;

  // Version API.

  version: () => string;
}

export interface IWasmLocApi {
  // Memory management.

  HEAPU8: Uint8Array;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;

  // FileManager API.

  FileManager: IWasmFileManager;

  // File API.

  File: new (
    path: string
  ) => IWasmFile;

  // SedDocument API

  SedDocument: new (
    wasmFile: IWasmFile
  ) => IWasmSedDocument;
  SedChangeAttribute: new (componentName: string, variableName: string, newValue: string) => IWasmSedChangeAttribute;

  // Version API.

  versionString: () => string;
}

// Retrieve the version of libOpenCOR that is to be used. Two options:
//  - OpenCOR: libOpenCOR can be accessed using window.locApi, which references our C++ API.
//  - OpenCOR's Web app: libOpenCOR can be accessed using our WebAssembly module.

export let _cppLocApi = {} as ICppLocApi;
export let _wasmLocApi = {} as IWasmLocApi;

export const initialiseLocApi = async (): Promise<void> => {
  // @ts-expect-error (window.locApi may or may not be defined which is why we test it)
  if (window.locApi) {
    // We are running OpenCOR, so libOpenCOR can be accessed using window.locApi.

    // @ts-expect-error (window.locApi is defined)
    _cppLocApi = window.locApi;
  } else {
    // We are running OpenCOR's Web app, so we must import libOpenCOR's WebAssembly module.

    try {
      const libOpenCOR = (
        await import(corsProxyUrl('https://opencor.ws/libopencor/downloads/wasm/libopencor-0.20260211.0.js'))
      ).default;

      _wasmLocApi = (await libOpenCOR()) as IWasmLocApi;
    } catch (error: unknown) {
      console.error('Failed to load libOpenCOR:', formatError(error));

      throw error;
    }
  }
};

// Logger API.

export { EIssueType, type IIssue, type IWasmIssues, wasmIssuesToIssues } from './locLoggerApi.ts';

// File API.

export { EFileType, File, fileManager, type IWasmFile } from './locFileApi.ts';

// SED-ML API.

export {
  ESedSimulationType,
  SedDocument,
  SedInstance,
  SedInstanceTask,
  SedUniformTimeCourse
} from './locSedApi.ts';

// UI JSON API.

export {
  type IUiJson,
  type IUiJsonDiscreteInput,
  type IUiJsonDiscreteInputPossibleValue,
  type IUiJsonInput,
  type IUiJsonOutput,
  type IUiJsonOutputData,
  type IUiJsonOutputPlot,
  type IUiJsonOutputPlotAdditionalTrace,
  type IUiJsonParameter,
  type IUiJsonScalarInput,
  isScalarInput,
  isDiscreteInput,
  cleanUiJson,
  validateUiJson
} from './locUiJsonApi.ts';

// Version API.

export { cppVersion, version, wasmVersion } from './locVersionApi.ts';
