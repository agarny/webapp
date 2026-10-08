import * as vue from 'vue';

import type { File as IWasmFile, FileManager as IWasmFileManagerInstance } from '@opencor/libopencor-types';

import {
  _cppLocApi,
  _wasmLocApi,
  cppVersion,
  type IIssue,
  type IUiJson,
  normaliseUiJson,
  SedDocument,
  wasmIssuesToIssues
} from './locApi';

// FileManager API.

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

  private fileManager(): IWasmFileManagerInstance {
    this._fileManager ??= _wasmLocApi.FileManager.instance();

    return this._fileManager;
  }

  canonicalPath(path: string): string {
    // Note: with the C++ version of libOpenCOR, a file may be referred to using different paths (e.g., through a
    //       symbolic link), all of which refer to the same native file, i.e. the one with the canonical path. With the
    //       WASM version of libOpenCOR, a file is referred to using a URL or a name that we generate (see
    //       locCommon.filePath()), so there is no need to canonicalise it.

    return cppVersion() ? _cppLocApi.fileManagerCanonicalPath(path) : path;
  }

  file(path: string): File | null {
    // Note: the file we are after is already managed, so we just wrap it rather than create (and therefore own) it.

    if (cppVersion()) {
      return _cppLocApi.fileManagerHasFile(path) ? new File(path, undefined, {}) : null;
    }

    // Note: every access to a WASM vector (and to its elements) yields a new handle that must be deleted, except for
    //       the handle of the file we are after, which our File object takes ownership of.

    const fileManager = this.fileManager();
    const files = fileManager.files;
    let res: File | null = null;

    for (const file of files) {
      if (!file) {
        continue;
      }

      if (!res && file.path === path) {
        res = new File(path, undefined, { wasmFile: file });
      } else {
        file.delete();
      }
    }

    files.delete();

    return res;
  }

  unmanage(path: string): void {
    if (cppVersion()) {
      _cppLocApi.fileManagerUnmanage(path);
    } else {
      const fileManager = this.fileManager();
      const files = fileManager.files;

      for (const file of files) {
        if (!file) {
          continue;
        }

        if (file.path === path) {
          fileManager.unmanage(file);
        }

        file.delete();
      }

      files.delete();
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

// Information about a file that is already managed by libOpenCOR, in which case a File object only wraps it, i.e. it
// doesn't create (and therefore doesn't own) it.
// Note: with the WASM version of libOpenCOR, the File object takes ownership of the given WASM file handle.

export interface IManagedFile {
  wasmFile?: IWasmFile;
}

export class File {
  _path: string;
  private _canonicalPath: string | undefined;
  _wasmFile: IWasmFile = {} as IWasmFile;
  _issues: IIssue[] = [];
  private _isOwner = true;
  private _hasWasmFile = false;
  private _released = false;

  constructor(path: string, contents: Uint8Array | undefined = undefined, managedFile?: IManagedFile) {
    this._path = path;

    if (managedFile) {
      this._isOwner = false;

      if (cppVersion()) {
        this._issues = _cppLocApi.fileIssues(path);
      } else if (managedFile.wasmFile) {
        this._wasmFile = vue.markRaw(managedFile.wasmFile);
        this._hasWasmFile = true;

        this._issues = wasmIssuesToIssues(this._wasmFile.issues);
      }
    } else if (cppVersion()) {
      _cppLocApi.fileCreate(path, contents);

      this._issues = _cppLocApi.fileIssues(path);
    } else if (contents) {
      this._wasmFile = vue.markRaw(new _wasmLocApi.File(path));
      this._hasWasmFile = true;

      this._wasmFile.setContents(contents);

      this._issues = wasmIssuesToIssues(this._wasmFile.issues);
    } else {
      // Note: we should never reach this point since we should always provide some file contents when using the WASM
      //       version of libOpenCOR.

      console.warn(`OpenCOR: no contents provided for file '${path}'.`);

      return;
    }
  }

  // Release the resources held by the file.
  // Note: this must only be done once the file is no longer used. With the WASM version of libOpenCOR, our WASM file
  //       handle is what keeps the file alive (libOpenCOR's file manager only keeps a weak reference to it) while, with
  //       the C++ version of libOpenCOR, it is our list of tracked files, but only if we created (i.e. own) the file.

  release(): void {
    if (this._released) {
      return;
    }

    this._released = true;

    if (cppVersion()) {
      if (this._isOwner) {
        _cppLocApi.fileManagerUnmanage(this._path);
      }
    } else if (this._hasWasmFile) {
      this._wasmFile.delete();
    }
  }

  type(): EFileType {
    return cppVersion() ? _cppLocApi.fileType(this._path) : this._wasmFile.type.value;
  }

  path(): string {
    return this._path;
  }

  canonicalPath(): string {
    this._canonicalPath ??= fileManager.canonicalPath(this._path);

    return this._canonicalPath;
  }

  issues(): IIssue[] {
    return this._issues;
  }

  contents(): Uint8Array {
    return cppVersion() ? _cppLocApi.fileContents(this._path) : this._wasmFile.contents();
  }

  document(): SedDocument {
    return new SedDocument(this._path, this._wasmFile, this._issues);
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

      uiJson.delete();
    }

    const decoder = new TextDecoder();
    let res: unknown;

    try {
      res = JSON.parse(decoder.decode(uiJsonContents));
    } catch (_error: unknown) {
      console.warn(`OpenCOR: unable to parse the UI JSON for file '${this._path}'.`);

      return undefined;
    }

    if (!res || typeof res !== 'object' || Array.isArray(res)) {
      console.warn(`OpenCOR: the UI JSON for file '${this._path}' has an unexpected structure.`);

      return undefined;
    }

    return normaliseUiJson(res as IUiJson);
  }
}
