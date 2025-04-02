import {
  _locAPI,
  cppVersion,
  wasmIssuesToIssues,
  wasmVersion,
  type IIssue,
  type IWasmFile,
  type IWasmIssues
} from './locAPI'

// SED API.

interface IWasmSEDDocument {
  issues: IWasmIssues
  modelCount: number
  simulationCount: number
  simulation(index: number): IWasmSEDSimulation
}

export class SEDDocument {
  private _filePath: string
  private _sedDocument: IWasmSEDDocument = {} as IWasmSEDDocument

  constructor(filePath: string, wasmFile: IWasmFile) {
    this._filePath = filePath

    if (cppVersion()) {
      _locAPI.sedDocumentCreate(this._filePath)
    } else {
      this._sedDocument = new _locAPI.SedDocument(wasmFile)
    }
  }

  issues(): IIssue[] {
    return cppVersion() ? _locAPI.sedDocumentIssues(this._filePath) : wasmIssuesToIssues(this._sedDocument.issues)
  }

  modelCount(): number {
    return cppVersion() ? _locAPI.sedDocumentModelCount(this._filePath) : this._sedDocument.modelCount
  }

  simulationCount(): number {
    return cppVersion() ? _locAPI.sedDocumentSimulationCount(this._filePath) : this._sedDocument.simulationCount
  }

  simulation(index: number): SEDSimulation {
    let type: SEDSimulationType

    if (cppVersion()) {
      type = _locAPI.sedDocumentSimulationType(this._filePath, index)
    } else {
      switch (this._sedDocument.simulation(index).constructor.name) {
        case 'SedAnalysis':
          type = SEDSimulationType.Analysis

          break
        case 'SedSteadyState':
          type = SEDSimulationType.SteadyState

          break
        case 'SedOneStep':
          type = SEDSimulationType.OneStep

          break
        default: // 'SedUniformTimeCourse'.
          type = SEDSimulationType.UniformTimeCourse
      }
    }

    if (type === SEDSimulationType.Analysis) {
      return new SEDSimulationAnalysis(type, this._filePath, this._sedDocument, index)
    }

    if (type === SEDSimulationType.SteadyState) {
      return new SEDSimulationSteadyState(type, this._filePath, this._sedDocument, index)
    }

    if (type === SEDSimulationType.OneStep) {
      return new SEDSimulationOneStep(type, this._filePath, this._sedDocument, index)
    }

    return new SEDSimulationUniformTimeCourse(type, this._filePath, this._sedDocument, index)
  }
}

export enum SEDSimulationType {
  Analysis,
  SteadyState,
  OneStep,
  UniformTimeCourse
}

interface IWasmSEDSimulation {
  type: SEDSimulationType
}

export class SEDSimulation {
  protected _filePath: string
  protected _index: number
  private _type: SEDSimulationType

  constructor(type: SEDSimulationType, filePath: string, _sedDocument: IWasmSEDDocument, index: number) {
    this._type = type
    this._filePath = filePath
    this._index = index
  }

  type(): SEDSimulationType {
    return this._type
  }
}

export class SEDSimulationAnalysis extends SEDSimulation {}

export class SEDSimulationSteadyState extends SEDSimulation {}

interface IWasmSEDSimulationOneStep extends IWasmSEDSimulation {
  step: number
}

export class SEDSimulationOneStep extends SEDSimulation {
  private _wasmSEDSimulationOneStep: IWasmSEDSimulationOneStep = {} as IWasmSEDSimulationOneStep

  constructor(type: SEDSimulationType, filePath: string, sedDocument: IWasmSEDDocument, index: number) {
    super(type, filePath, sedDocument, index)

    if (wasmVersion()) {
      this._wasmSEDSimulationOneStep = sedDocument.simulation(index) as IWasmSEDSimulationOneStep
    }
  }

  step(): number {
    return cppVersion()
      ? _locAPI.sedDocumentSimulationOneStepStep(this._filePath, this._index)
      : this._wasmSEDSimulationOneStep.step
  }
}

interface IWasmSEDSimulationUniformTimeCourse extends IWasmSEDSimulation {
  initialTime: number
  outputStartTime: number
  outputEndTime: number
  numberOfSteps: number
}

export class SEDSimulationUniformTimeCourse extends SEDSimulation {
  private _wasmSEDSimulationUniformTimeCourse: IWasmSEDSimulationUniformTimeCourse =
    {} as IWasmSEDSimulationUniformTimeCourse

  constructor(type: SEDSimulationType, filePath: string, sedDocument: IWasmSEDDocument, index: number) {
    super(type, filePath, sedDocument, index)

    if (wasmVersion()) {
      this._wasmSEDSimulationUniformTimeCourse = sedDocument.simulation(index) as IWasmSEDSimulationUniformTimeCourse
    }
  }

  initialTime(): number {
    return cppVersion()
      ? _locAPI.sedDocumentSimulationUniformTimeCourseInitialTime(this._filePath, this._index)
      : this._wasmSEDSimulationUniformTimeCourse.initialTime
  }

  outputStartTime(): number {
    return cppVersion()
      ? _locAPI.sedDocumentSimulationUniformTimeCourseOutputStartTime(this._filePath, this._index)
      : this._wasmSEDSimulationUniformTimeCourse.outputStartTime
  }

  outputEndTime(): number {
    return cppVersion()
      ? _locAPI.sedDocumentSimulationUniformTimeCourseOutputEndTime(this._filePath, this._index)
      : this._wasmSEDSimulationUniformTimeCourse.outputEndTime
  }

  numberOfSteps(): number {
    return cppVersion()
      ? _locAPI.sedDocumentSimulationUniformTimeCourseNumberOfSteps(this._filePath, this._index)
      : this._wasmSEDSimulationUniformTimeCourse.numberOfSteps
  }
}
