import * as vue from 'vue';

import {
  _cppLocApi,
  _wasmLocApi,
  cppVersion,
  type IIssue,
  type IUiJson,
  type IWasmIssues,
  SedDocument,
  wasmIssuesToIssues
} from './locApi.ts';

// FileManager API.

interface IWasmFileManagerInstance {
  files: {
    size(): number;
    get(index: number): IWasmFile;
  };
  unmanage(file: IWasmFile): void;
}

export interface IWasmFileManager {
  instance(): IWasmFileManagerInstance;
}

class FileManager {
  protected static _instance: FileManager | null = null;
  private _fileManager: IWasmFileManagerInstance | null = null;

  static instance(): FileManager {
    FileManager._instance ??= new FileManager();

    return FileManager._instance;
  }

  private constructor() {
    // Have a private constructor so that we cannot instantiate this class directly.
  }

  private fileManager() {
    this._fileManager ??= _wasmLocApi.FileManager.instance();

    return this._fileManager;
  }

  file(path: string): File | null {
    if (cppVersion()) {
      const contents = _cppLocApi.fileContents(path);

      if (contents) {
        return new File(path, contents);
      }

      return null;
    }

    const fileManager = this.fileManager();
    const files = fileManager.files;

    for (let i = 0; i < files.size(); ++i) {
      const file = files.get(i);

      if (file.path === path) {
        return new File(path, file.contents());
      }
    }

    return null;
  }

  unmanage(path: string): void {
    if (cppVersion()) {
      _cppLocApi.fileManagerUnmanage(path);
    } else {
      const fileManager = this.fileManager();
      const files = fileManager.files;

      for (let i = 0; i < files.size(); ++i) {
        const file = files.get(i);

        if (file.path === path) {
          fileManager.unmanage(file);

          break;
        }
      }
    }
  }
}

export const fileManager = FileManager.instance();

// File API.

export enum EFileType {
  UNKNOWN_FILE,
  CELLML_FILE,
  SEDML_FILE,
  COMBINE_ARCHIVE,
  IRRETRIEVABLE_FILE
}

export interface IWasmFile {
  type: { value: EFileType };
  issues: IWasmIssues;
  path: string;
  contents(): Uint8Array;
  setContents(contents: Uint8Array): void;
  childFileFromFileName(fileName: string): File | null;
}

export class File {
  _path: string;
  _wasmFile: IWasmFile = {} as IWasmFile;
  _issues: IIssue[] = [];

  constructor(path: string, contents: Uint8Array | undefined = undefined) {
    this._path = path;

    if (cppVersion()) {
      _cppLocApi.fileCreate(path, contents);

      this._issues = _cppLocApi.fileIssues(path);
    } else if (contents) {
      this._wasmFile = vue.markRaw(new _wasmLocApi.File(path));

      this._wasmFile.setContents(contents);

      this._issues = wasmIssuesToIssues(this._wasmFile.issues);
    } else {
      // Note: we should never reach this point since we should always provide some file contents when using the WASM
      //       version of libOpenCOR.

      console.error(`No contents provided for file '${path}'.`);

      return;
    }
  }

  type(): EFileType {
    return cppVersion() ? _cppLocApi.fileType(this._path) : this._wasmFile.type.value;
  }

  path(): string {
    return this._path;
  }

  issues(): IIssue[] {
    return this._issues;
  }

  contents(): Uint8Array {
    return cppVersion() ? _cppLocApi.fileContents(this._path) : this._wasmFile.contents();
  }

  document(): SedDocument {
    return new SedDocument(this._path, this._wasmFile);
  }

  uiJson(): IUiJson | undefined {
    let uiJsonContents: Uint8Array | undefined;

    if (cppVersion()) {
      uiJsonContents = _cppLocApi.fileUiJson(this._path);

      if (!uiJsonContents) {
        return undefined;
      }
    } else {
      const uiJson = this._wasmFile.childFileFromFileName('simulation.json');

      if (!uiJson) {
        return undefined;
      }

      uiJsonContents = uiJson.contents();
    }

    const decoder = new TextDecoder();

    return JSON.parse(decoder.decode(uiJsonContents));
  }
}
