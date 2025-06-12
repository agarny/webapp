import * as vue from 'vue'

import {
  _locApi,
  cppVersion,
  wasmIssuesToIssues,
  wasmVersion,
  type IIssue,
  type IWasmFile,
  type IWasmIssues
} from './locApi'

// SED-ML API.

class SedBase {
  protected _filePath: string

  constructor(filePath: string) {
    this._filePath = filePath
  }
}

interface IWasmSedDocument {
  issues: IWasmIssues
  modelCount: number
  simulationCount: number
  simulation(index: number): IWasmSedSimulation
  instantiate(): IWasmSedInstance
}

export class SedDocument extends SedBase {
  private _wasmSedDocument: IWasmSedDocument = {} as IWasmSedDocument

  constructor(filePath: string, wasmFile: IWasmFile) {
    super(filePath)

    if (cppVersion()) {
      _locApi.sedDocumentCreate(this._filePath)
    } else {
      this._wasmSedDocument = new _locApi.SedDocument(wasmFile)
    }
  }

  issues(): IIssue[] {
    return cppVersion() ? _locApi.sedDocumentIssues(this._filePath) : wasmIssuesToIssues(this._wasmSedDocument.issues)
  }

  modelCount(): number {
    return cppVersion() ? _locApi.sedDocumentModelCount(this._filePath) : this._wasmSedDocument.modelCount
  }

  simulationCount(): number {
    return cppVersion() ? _locApi.sedDocumentSimulationCount(this._filePath) : this._wasmSedDocument.simulationCount
  }

  simulation(index: number): SedSimulation {
    let type: SedSimulationType

    if (cppVersion()) {
      type = _locApi.sedDocumentSimulationType(this._filePath, index)
    } else {
      switch (this._wasmSedDocument.simulation(index).constructor.name) {
        case 'SedAnalysis':
          type = SedSimulationType.Analysis

          break
        case 'SedSteadyState':
          type = SedSimulationType.SteadyState

          break
        case 'SedOneStep':
          type = SedSimulationType.OneStep

          break
        default: // 'SedUniformTimeCourse'.
          type = SedSimulationType.UniformTimeCourse
      }
    }

    if (type === SedSimulationType.Analysis) {
      return new SedSimulationAnalysis(this._filePath, index, this._wasmSedDocument, type)
    }

    if (type === SedSimulationType.SteadyState) {
      return new SedSimulationSteadyState(this._filePath, index, this._wasmSedDocument, type)
    }

    if (type === SedSimulationType.OneStep) {
      return new SedSimulationOneStep(this._filePath, index, this._wasmSedDocument, type)
    }

    return new SedSimulationUniformTimeCourse(this._filePath, index, this._wasmSedDocument, type)
  }

  instantiate(): SedInstance {
    return new SedInstance(this._filePath, this._wasmSedDocument)
  }
}

export enum SedSimulationType {
  Analysis,
  SteadyState,
  OneStep,
  UniformTimeCourse
}

interface IWasmSedSimulation {
  type: SedSimulationType
}

export class SedSimulation extends SedBase {
  protected _index: number
  private _type: SedSimulationType

  constructor(filePath: string, index: number, _wasmSedDocument: IWasmSedDocument, type: SedSimulationType) {
    super(filePath)

    this._index = index
    this._type = type
  }

  type(): SedSimulationType {
    return this._type
  }
}

export class SedSimulationAnalysis extends SedSimulation {}

export class SedSimulationSteadyState extends SedSimulation {}

interface IWasmSedSimulationOneStep extends IWasmSedSimulation {
  step: number
}

export class SedSimulationOneStep extends SedSimulation {
  private _wasmSedSimulationOneStep: IWasmSedSimulationOneStep = {} as IWasmSedSimulationOneStep

  constructor(filePath: string, index: number, _wasmSedDocument: IWasmSedDocument, type: SedSimulationType) {
    super(filePath, index, _wasmSedDocument, type)

    if (wasmVersion()) {
      this._wasmSedSimulationOneStep = _wasmSedDocument.simulation(index) as IWasmSedSimulationOneStep
    }
  }

  step(): number {
    return cppVersion()
      ? _locApi.sedDocumentSimulationOneStepStep(this._filePath, this._index)
      : this._wasmSedSimulationOneStep.step
  }
}

interface IWasmSedSimulationUniformTimeCourse extends IWasmSedSimulation {
  initialTime: number
  outputStartTime: number
  outputEndTime: number
  numberOfSteps: number
}

export class SedSimulationUniformTimeCourse extends SedSimulation {
  private _wasmSedSimulationUniformTimeCourse: IWasmSedSimulationUniformTimeCourse =
    {} as IWasmSedSimulationUniformTimeCourse

  constructor(filePath: string, index: number, _wasmSedDocument: IWasmSedDocument, type: SedSimulationType) {
    super(filePath, index, _wasmSedDocument, type)

    if (wasmVersion()) {
      this._wasmSedSimulationUniformTimeCourse = _wasmSedDocument.simulation(
        index
      ) as IWasmSedSimulationUniformTimeCourse
    }
  }

  initialTime(): number {
    return cppVersion()
      ? _locApi.sedDocumentSimulationUniformTimeCourseInitialTime(this._filePath, this._index)
      : this._wasmSedSimulationUniformTimeCourse.initialTime
  }

  outputStartTime(): number {
    return cppVersion()
      ? _locApi.sedDocumentSimulationUniformTimeCourseOutputStartTime(this._filePath, this._index)
      : this._wasmSedSimulationUniformTimeCourse.outputStartTime
  }

  setOutputStartTime(value: number): void {
    if (cppVersion()) {
      _locApi.sedDocumentSimulationUniformTimeCourseSetOutputStartTime(this._filePath, this._index, value)
    } else {
      this._wasmSedSimulationUniformTimeCourse.outputStartTime = value
    }
  }

  outputEndTime(): number {
    return cppVersion()
      ? _locApi.sedDocumentSimulationUniformTimeCourseOutputEndTime(this._filePath, this._index)
      : this._wasmSedSimulationUniformTimeCourse.outputEndTime
  }

  setOutputEndTime(value: number): void {
    if (cppVersion()) {
      _locApi.sedDocumentSimulationUniformTimeCourseSetOutputEndTime(this._filePath, this._index, value)
    } else {
      this._wasmSedSimulationUniformTimeCourse.outputEndTime = value
    }
  }

  numberOfSteps(): number {
    return cppVersion()
      ? _locApi.sedDocumentSimulationUniformTimeCourseNumberOfSteps(this._filePath, this._index)
      : this._wasmSedSimulationUniformTimeCourse.numberOfSteps
  }

  setNumberOfSteps(value: number): void {
    if (cppVersion()) {
      _locApi.sedDocumentSimulationUniformTimeCourseSetNumberOfSteps(this._filePath, this._index, value)
    } else {
      this._wasmSedSimulationUniformTimeCourse.numberOfSteps = value
    }
  }
}

interface IWasmSedInstance {
  issues: IWasmIssues
  task(index: number): IWasmSedInstanceTask
  run(): number
}

export class SedInstance extends SedBase {
  private _wasmSedInstance: IWasmSedInstance = {} as IWasmSedInstance

  constructor(filePath: string, wasmSedDocument: IWasmSedDocument) {
    super(filePath)

    if (cppVersion()) {
      _locApi.sedDocumentInstantiate(this._filePath)
    } else {
      this._wasmSedInstance = wasmSedDocument.instantiate()
    }
  }

  issues(): IIssue[] {
    return cppVersion() ? _locApi.sedInstanceIssues(this._filePath) : wasmIssuesToIssues(this._wasmSedInstance.issues)
  }

  task(index: number): SedInstanceTask {
    return new SedInstanceTask(this._filePath, index, this._wasmSedInstance)
  }

  run(): number {
    return cppVersion() ? _locApi.sedInstanceRun(this._filePath) : vue.toRaw(this._wasmSedInstance).run()
  }
}

interface IWasmSedInstanceTask {
  voiName: string
  voiUnit: string
  voiAsArray: number[]
  stateCount: number
  stateName(index: number): string
  stateUnit(index: number): string
  stateAsArray(index: number): number[]
  rateCount: number
  rateName(index: number): string
  rateUnit(index: number): string
  rateAsArray(index: number): number[]
  constantCount: number
  constantName(index: number): string
  constantUnit(index: number): string
  constantAsArray(index: number): number[]
  computedConstantCount: number
  computedConstantName(index: number): string
  computedConstantUnit(index: number): string
  computedConstantAsArray(index: number): number[]
  algebraicCount: number
  algebraicName(index: number): string
  algebraicUnit(index: number): string
  algebraicAsArray(index: number): number[]
}

export class SedInstanceTask extends SedBase {
  private _index: number
  private _wasmSedInstanceTask: IWasmSedInstanceTask = {} as IWasmSedInstanceTask

  constructor(filePath: string, index: number, wasmSedInstance: IWasmSedInstance) {
    super(filePath)

    this._index = index

    if (wasmVersion()) {
      this._wasmSedInstanceTask = vue.toRaw(wasmSedInstance).task(index)
    }
  }

  voiName(): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskVoiName(this._filePath, this._index)
      : this._wasmSedInstanceTask.voiName
  }

  voiUnit(): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskVoiUnit(this._filePath, this._index)
      : this._wasmSedInstanceTask.voiUnit
  }

  voi(): number[] {
    return cppVersion() ? _locApi.sedInstanceTaskVoi(this._filePath, this._index) : this._wasmSedInstanceTask.voiAsArray
  }

  stateCount(): number {
    return cppVersion()
      ? _locApi.sedInstanceTaskStateCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.stateCount
  }

  stateName(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskStateName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.stateName(index)
  }

  stateUnit(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskStateUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.stateUnit(index)
  }

  state(index: number): number[] {
    return cppVersion()
      ? _locApi.sedInstanceTaskState(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.stateAsArray(index)
  }

  rateCount(): number {
    return cppVersion()
      ? _locApi.sedInstanceTaskRateCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.rateCount
  }

  rateName(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskRateName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.rateName(index)
  }

  rateUnit(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskRateUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.rateUnit(index)
  }

  rate(index: number): number[] {
    return cppVersion()
      ? _locApi.sedInstanceTaskRate(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.rateAsArray(index)
  }

  constantCount(): number {
    return cppVersion()
      ? _locApi.sedInstanceTaskConstantCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.constantCount
  }

  constantName(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskConstantName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.constantName(index)
  }

  constantUnit(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskConstantUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.constantUnit(index)
  }

  constant(index: number): number[] {
    return cppVersion()
      ? _locApi.sedInstanceTaskConstant(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.constantAsArray(index)
  }

  computedConstantCount(): number {
    return cppVersion()
      ? _locApi.sedInstanceTaskComputedConstantCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.computedConstantCount
  }

  computedConstantName(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskComputedConstantName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.computedConstantName(index)
  }

  computedConstantUnit(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskComputedConstantUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.computedConstantUnit(index)
  }

  computedConstant(index: number): number[] {
    return cppVersion()
      ? _locApi.sedInstanceTaskComputedConstant(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.computedConstantAsArray(index)
  }

  algebraicCount(): number {
    return cppVersion()
      ? _locApi.sedInstanceTaskAlgebraicCount(this._filePath, this._index)
      : this._wasmSedInstanceTask.algebraicCount
  }

  algebraicName(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskAlgebraicName(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.algebraicName(index)
  }

  algebraicUnit(index: number): string {
    return cppVersion()
      ? _locApi.sedInstanceTaskAlgebraicUnit(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.algebraicUnit(index)
  }

  algebraic(index: number): number[] {
    return cppVersion()
      ? _locApi.sedInstanceTaskAlgebraic(this._filePath, this._index, index)
      : this._wasmSedInstanceTask.algebraicAsArray(index)
  }
}
