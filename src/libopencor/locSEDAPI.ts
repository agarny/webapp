import * as vue from 'vue'

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
  instantiate(): IWasmSEDInstance
}

export class SEDDocument {
  private _filePath: string
  private _wasmSEDDocument: IWasmSEDDocument = {} as IWasmSEDDocument

  constructor(filePath: string, wasmFile: IWasmFile) {
    this._filePath = filePath

    if (cppVersion()) {
      _locAPI.sedDocumentCreate(this._filePath)
    } else {
      this._wasmSEDDocument = new _locAPI.SedDocument(wasmFile)
    }
  }

  issues(): IIssue[] {
    return cppVersion() ? _locAPI.sedDocumentIssues(this._filePath) : wasmIssuesToIssues(this._wasmSEDDocument.issues)
  }

  modelCount(): number {
    return cppVersion() ? _locAPI.sedDocumentModelCount(this._filePath) : this._wasmSEDDocument.modelCount
  }

  simulationCount(): number {
    return cppVersion() ? _locAPI.sedDocumentSimulationCount(this._filePath) : this._wasmSEDDocument.simulationCount
  }

  simulation(index: number): SEDSimulation {
    let type: SEDSimulationType

    if (cppVersion()) {
      type = _locAPI.sedDocumentSimulationType(this._filePath, index)
    } else {
      switch (this._wasmSEDDocument.simulation(index).constructor.name) {
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
      return new SEDSimulationAnalysis(this._filePath, index, this._wasmSEDDocument, type)
    }

    if (type === SEDSimulationType.SteadyState) {
      return new SEDSimulationSteadyState(this._filePath, index, this._wasmSEDDocument, type)
    }

    if (type === SEDSimulationType.OneStep) {
      return new SEDSimulationOneStep(this._filePath, index, this._wasmSEDDocument, type)
    }

    return new SEDSimulationUniformTimeCourse(this._filePath, index, this._wasmSEDDocument, type)
  }

  instantiate(): SEDInstance {
    return new SEDInstance(this._filePath, this._wasmSEDDocument)
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

  constructor(filePath: string, index: number, _wasmSEDDocument: IWasmSEDDocument, type: SEDSimulationType) {
    this._filePath = filePath
    this._index = index
    this._type = type
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

  constructor(filePath: string, index: number, _wasmSEDDocument: IWasmSEDDocument, type: SEDSimulationType) {
    super(filePath, index, _wasmSEDDocument, type)

    if (wasmVersion()) {
      this._wasmSEDSimulationOneStep = _wasmSEDDocument.simulation(index) as IWasmSEDSimulationOneStep
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

  constructor(filePath: string, index: number, _wasmSEDDocument: IWasmSEDDocument, type: SEDSimulationType) {
    super(filePath, index, _wasmSEDDocument, type)

    if (wasmVersion()) {
      this._wasmSEDSimulationUniformTimeCourse = _wasmSEDDocument.simulation(
        index
      ) as IWasmSEDSimulationUniformTimeCourse
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

  setOutputStartTime(value: number): void {
    if (cppVersion()) {
      _locAPI.sedDocumentSimulationUniformTimeCourseSetOutputStartTime(this._filePath, this._index, value)
    } else {
      this._wasmSEDSimulationUniformTimeCourse.outputStartTime = value
    }
  }

  outputEndTime(): number {
    return cppVersion()
      ? _locAPI.sedDocumentSimulationUniformTimeCourseOutputEndTime(this._filePath, this._index)
      : this._wasmSEDSimulationUniformTimeCourse.outputEndTime
  }

  setOutputEndTime(value: number): void {
    if (cppVersion()) {
      _locAPI.sedDocumentSimulationUniformTimeCourseSetOutputEndTime(this._filePath, this._index, value)
    } else {
      this._wasmSEDSimulationUniformTimeCourse.outputEndTime = value
    }
  }

  numberOfSteps(): number {
    return cppVersion()
      ? _locAPI.sedDocumentSimulationUniformTimeCourseNumberOfSteps(this._filePath, this._index)
      : this._wasmSEDSimulationUniformTimeCourse.numberOfSteps
  }

  setNumberOfSteps(value: number): void {
    if (cppVersion()) {
      _locAPI.sedDocumentSimulationUniformTimeCourseSetNumberOfSteps(this._filePath, this._index, value)
    } else {
      this._wasmSEDSimulationUniformTimeCourse.numberOfSteps = value
    }
  }
}

interface IWasmSEDInstance {
  issues: IWasmIssues
  task(index: number): IWasmSEDInstanceTask
  run(): number
}

export class SEDInstance {
  private _filePath: string
  private _wasmSEDInstance: IWasmSEDInstance = {} as IWasmSEDInstance

  constructor(filePath: string, wasmSEDDocument: IWasmSEDDocument) {
    this._filePath = filePath

    if (cppVersion()) {
      _locAPI.sedDocumentInstantiate(this._filePath)
    } else {
      this._wasmSEDInstance = wasmSEDDocument.instantiate()
    }
  }

  issues(): IIssue[] {
    return cppVersion() ? _locAPI.sedInstanceIssues(this._filePath) : wasmIssuesToIssues(this._wasmSEDInstance.issues)
  }

  task(index: number): SEDInstanceTask {
    return new SEDInstanceTask(this._filePath, index, this._wasmSEDInstance)
  }

  run(): number {
    return cppVersion() ? _locAPI.sedInstanceRun(this._filePath) : vue.toRaw(this._wasmSEDInstance).run()
  }
}

interface IWasmSEDInstanceTask {
  voiName: string
  voiUnit: string
  voiAsArray: number[]
  stateCount: number
  stateName(index: number): string
  stateUnit(index: number): string
  stateAsArray(index: number): number[]
}

export class SEDInstanceTask {
  private _filePath: string
  private _index: number
  private _wasmSEDInstanceTask: IWasmSEDInstanceTask = {} as IWasmSEDInstanceTask

  constructor(filePath: string, index: number, wasmSEDInstance: IWasmSEDInstance) {
    this._filePath = filePath
    this._index = index

    if (wasmVersion()) {
      this._wasmSEDInstanceTask = vue.toRaw(wasmSEDInstance).task(index)
    }
  }

  voiName(): string {
    return cppVersion()
      ? _locAPI.sedInstanceTaskVoiName(this._filePath, this._index)
      : this._wasmSEDInstanceTask.voiName
  }

  voiUnit(): string {
    return cppVersion()
      ? _locAPI.sedInstanceTaskVoiUnit(this._filePath, this._index)
      : this._wasmSEDInstanceTask.voiUnit
  }

  voi(): number[] {
    return cppVersion() ? _locAPI.sedInstanceTaskVoi(this._filePath, this._index) : this._wasmSEDInstanceTask.voiAsArray
  }

  stateCount(): number {
    return cppVersion()
      ? _locAPI.sedInstanceTaskStateCount(this._filePath, this._index)
      : this._wasmSEDInstanceTask.stateCount
  }

  stateName(index: number): string {
    return cppVersion()
      ? _locAPI.sedInstanceTaskStateName(this._filePath, this._index, index)
      : this._wasmSEDInstanceTask.stateName(index)
  }

  stateUnit(index: number): string {
    return cppVersion()
      ? _locAPI.sedInstanceTaskStateUnit(this._filePath, this._index, index)
      : this._wasmSEDInstanceTask.stateUnit(index)
  }

  state(index: number): number[] {
    return cppVersion()
      ? _locAPI.sedInstanceTaskState(this._filePath, this._index, index)
      : this._wasmSEDInstanceTask.stateAsArray(index)
  }
}
