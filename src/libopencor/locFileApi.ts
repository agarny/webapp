import libOpenCOR from 'libopencor'
import * as vue from 'vue'

import {
  cppVersion,
  IssueType,
  SedDocument,
  SedInstance,
  SedSimulationType,
  SedSimulationUniformTimeCourse,
  wasmIssuesToIssues,
  type IIssue,
  type IUiJson,
  type IWasmIssues
} from './locApi'

// @ts-expect-error (window.locApi may or may not be defined and that is why we test it)
export const _locApi = window.locApi ?? (await libOpenCOR())

// FileManager API.

class FileManager {
  private _fileManager = cppVersion() ? undefined : _locApi.FileManager.instance()

  unmanage(path: string): void {
    if (cppVersion()) {
      _locApi.fileManagerUnmanage(path)
    } else {
      const files = this._fileManager.files

      for (let i = 0; i < files.size(); ++i) {
        const file = files.get(i)

        if (file.fileName === path) {
          this._fileManager.unmanage(file)

          break
        }
      }
    }
  }
}

export const fileManager = new FileManager()

// File API.

export enum FileType {
  UnknownFile,
  CellmlFile,
  SedmlFile,
  CombineArchive,
  IrretrievableFile
}

export interface IWasmFile {
  type: { value: FileType }
  issues: IWasmIssues
  contents(): Uint8Array
  setContents(ptr: number, length: number): void
  childFileFromFileName(fileName: string): File | null
}

export class File {
  private _path: string
  private _wasmFile: IWasmFile = {} as IWasmFile
  private _document: SedDocument = {} as SedDocument
  private _instance: SedInstance = {} as SedInstance
  private _issues: IIssue[] = []

  constructor(path: string, contents: Uint8Array | undefined = undefined) {
    this._path = path

    if (cppVersion()) {
      _locApi.fileCreate(path, contents)

      this._issues = _locApi.fileIssues(path)
    } else if (contents !== undefined) {
      this._wasmFile = new _locApi.File(path)

      const heapContentsPtr = _locApi._malloc(contents.length)
      const heapContents = new Uint8Array(_locApi.HEAPU8.buffer, heapContentsPtr, contents.length)

      heapContents.set(contents)

      this._wasmFile.setContents(heapContentsPtr, contents.length)

      this._issues = wasmIssuesToIssues(this._wasmFile.issues)
    } else {
      // Note: we should never reach this point since we should always provide some file contents when using the WASM
      //       version of libOpenCOR.

      console.error(`No contents provided for file '${path}'.`)

      return
    }

    if (this._issues.length !== 0) {
      return
    }

    // Retrieve the SED-ML file associated with this file.

    this._document = new SedDocument(this._path, this._wasmFile)
    this._issues = this._document.issues()

    if (this._issues.length !== 0) {
      return
    }

    //---OPENCOR---
    // We only support a limited subset of SED-ML for now, so we need to check a few more things. Might wnat to check
    // https://github.com/opencor/opencor/blob/master/src/plugins/support/SEDMLSupport/src/sedmlfile.cpp#L579-L1492.

    // Make sure that there is only one model.

    const modelCount = this._document.modelCount()

    if (modelCount !== 1) {
      this._issues.push({
        type: IssueType.Warning,
        description: 'Only SED-ML files with one model are currently supported.'
      })

      return
    }

    // Make sure that the SED-ML file has only one simulation.

    const simulationCount = this._document.simulationCount()

    if (simulationCount !== 1) {
      this._issues.push({
        type: IssueType.Warning,
        description: 'Only SED-ML files with one simulation are currently supported.'
      })

      return
    }

    // Make sure that the simulation is a uniform time course simulation.

    const simulation = this._document.simulation(0) as SedSimulationUniformTimeCourse

    if (simulation.type() !== SedSimulationType.UniformTimeCourse) {
      this._issues.push({
        type: IssueType.Warning,
        description: 'Only uniform time course simulations are currently supported.'
      })

      return
    }

    // Make sure that the initial time and output start time are the same, that the output start time and output end
    // time are different, and that the number of steps is greater than zero.

    const initialTime = simulation.initialTime()
    const outputStartTime = simulation.outputStartTime()
    const outputEndTime = simulation.outputEndTime()
    const numberOfSteps = simulation.numberOfSteps()

    if (initialTime !== outputStartTime) {
      this._issues.push({
        type: IssueType.Warning,
        description: `Only uniform time course simulations with the same values for 'initialTime' (${initialTime.toString()}) and 'outputStartTime' (${outputStartTime.toString()}) are currently supported.`
      })
    }

    if (outputStartTime === outputEndTime) {
      this._issues.push({
        type: IssueType.Error,
        description: `The uniform time course simulation must have different values for 'outputStartTime' (${outputStartTime.toString()}) and 'outputEndTime' (${outputEndTime.toString()}).`
      })
    }

    if (numberOfSteps <= 0) {
      this._issues.push({
        type: IssueType.Error,
        description: `The uniform time course simulation must have a positive value for 'numberOfSteps' (${numberOfSteps.toString()}).`
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this._issues.length !== 0) {
      return
    }

    // Retrieve an instance of the model.

    this._instance = this._document.instantiate()
    this._issues = this._instance.issues()
  }

  type(): FileType {
    return cppVersion() ? _locApi.fileType(this._path) : this._wasmFile.type.value
  }

  path(): string {
    return this._path
  }

  issues(): IIssue[] {
    return this._issues
  }

  contents(): Uint8Array {
    return cppVersion() ? _locApi.fileContents(this._path) : this._wasmFile.contents()
  }

  document(): SedDocument {
    return this._document
  }

  instance(): SedInstance {
    return this._instance
  }

  uiJson(): IUiJson | undefined {
    let uiJsonContents: Uint8Array | undefined

    if (cppVersion()) {
      uiJsonContents = _locApi.fileUiJson(this._path)

      if (uiJsonContents === undefined) {
        return undefined
      }
    } else {
      const uiJson = vue.toRaw(this._wasmFile).childFileFromFileName('simulation.json')

      if (uiJson === null) {
        return undefined
      }

      uiJsonContents = uiJson.contents()
    }

    const decoder = new TextDecoder()

    return JSON.parse(decoder.decode(uiJsonContents))
  }
}
