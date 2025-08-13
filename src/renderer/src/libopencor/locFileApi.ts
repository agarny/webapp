import * as vue from 'vue'

import {
  _cppLocApi,
  _wasmLocApi,
  cppVersion,
  EIssueType,
  ESedSimulationType,
  SedDocument,
  SedInstance,
  SedSimulationUniformTimeCourse,
  wasmIssuesToIssues,
  type IIssue,
  type IUiJson,
  type IWasmIssues
} from './locApi.js'

// FileManager API.

interface IWasmFileManagerInstance {
  files: {
    size(): number
    get(index: number): { fileName: string }
  }
  unmanage(file: unknown): void
}

export interface IWasmFileManager {
  instance(): IWasmFileManagerInstance
}

class FileManager {
  private _fileManager: IWasmFileManagerInstance | undefined = undefined

  private fileManager() {
    if (this._fileManager === undefined && !cppVersion()) {
      this._fileManager = _wasmLocApi.FileManager.instance()
    }

    return this._fileManager
  }

  unmanage(path: string): void {
    if (cppVersion()) {
      _cppLocApi.fileManagerUnmanage(path)
    } else {
      const fileManager = this.fileManager()

      if (fileManager !== undefined) {
        const files = fileManager.files

        for (let i = 0; i < files.size(); ++i) {
          const file = files.get(i)

          if (file.fileName === path) {
            fileManager.unmanage(file)

            break
          }
        }
      }
    }
  }
}

export const fileManager = new FileManager()

// File API.

export enum EFileType {
  UNKNOWN_FILE,
  CELLML_FILE,
  SEDML_FILE,
  COMBINE_ARCHIVE,
  IRRETRIEVABLE_FILE
}

export interface IWasmFile {
  type: { value: EFileType }
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
      _cppLocApi.fileCreate(path, contents)

      this._issues = _cppLocApi.fileIssues(path)
    } else if (contents !== undefined) {
      this._wasmFile = new _wasmLocApi.File(path)

      const heapContentsPtr = _wasmLocApi._malloc(contents.length)
      const heapContents = new Uint8Array(_wasmLocApi.HEAPU8.buffer, heapContentsPtr, contents.length)

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

    this._document = vue.markRaw(new SedDocument(this._path, this._wasmFile))
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
        type: EIssueType.WARNING,
        description: 'Only SED-ML files with one model are currently supported.'
      })

      return
    }

    // Make sure that the SED-ML file has only one simulation.

    const simulationCount = this._document.simulationCount()

    if (simulationCount !== 1) {
      this._issues.push({
        type: EIssueType.WARNING,
        description: 'Only SED-ML files with one simulation are currently supported.'
      })

      return
    }

    // Make sure that the simulation is a uniform time course simulation.

    const simulation = this._document.simulation(0) as SedSimulationUniformTimeCourse

    if (simulation.type() !== ESedSimulationType.UNIFORM_TIME_COURSE) {
      this._issues.push({
        type: EIssueType.WARNING,
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
        type: EIssueType.WARNING,
        description: `Only uniform time course simulations with the same values for 'initialTime' (${String(initialTime)}) and 'outputStartTime' (${String(outputStartTime)}) are currently supported.`
      })
    }

    if (outputStartTime === outputEndTime) {
      this._issues.push({
        type: EIssueType.ERROR,
        description: `The uniform time course simulation must have different values for 'outputStartTime' (${String(outputStartTime)}) and 'outputEndTime' (${String(outputEndTime)}).`
      })
    }

    if (numberOfSteps <= 0) {
      this._issues.push({
        type: EIssueType.ERROR,
        description: `The uniform time course simulation must have a positive value for 'numberOfSteps' (${String(numberOfSteps)}).`
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

  type(): EFileType {
    return cppVersion() ? _cppLocApi.fileType(this._path) : this._wasmFile.type.value
  }

  path(): string {
    return this._path
  }

  issues(): IIssue[] {
    return this._issues
  }

  contents(): Uint8Array {
    return cppVersion() ? _cppLocApi.fileContents(this._path) : this._wasmFile.contents()
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
      uiJsonContents = _cppLocApi.fileUiJson(this._path)

      if (uiJsonContents === undefined) {
        return undefined
      }
    } else {
      const uiJson = this._wasmFile.childFileFromFileName('simulation.json')

      if (uiJson === null) {
        return undefined
      }

      uiJsonContents = uiJson.contents()
    }

    const decoder = new TextDecoder()

    return JSON.parse(decoder.decode(uiJsonContents))
  }
}
