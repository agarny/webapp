import * as vue from 'vue';

import type { File as WasmFile, FileManager as WasmFileManagerInstance } from '@opencor/libopencor-types';

import * as common from '../common/common';

import {
  _cppLocApi,
  _wasmLocApi,
  cppVersion,
  type Issue,
  type UiJson,
  normaliseUiJson,
  SedDocument,
  wasmIssuesToIssues
} from './locApi';

// FileManager API.

class FileManager {
  protected static _instance: FileManager | null = null;
  private _fileManager: WasmFileManagerInstance | null = null;

  static instance(): FileManager {
    FileManager._instance ??= new FileManager();

    return FileManager._instance;
  }

  private constructor() {
    // Have a private constructor so that we cannot instantiate this class directly.
  }

  private fileManager(): WasmFileManagerInstance {
    this._fileManager ??= _wasmLocApi.FileManager.instance();

    return this._fileManager;
  }

  canonicalPath(path: string): string {
    // Note #1: libOpenCOR canonicalises the path of a file when creating it (e.g., it resolves symbolic links, decodes
    //          URLs, and removes "." and ".." segments), so a file may be referred to using different paths, all of
    //          which refer to the same file, i.e. the one with the canonical path. With the C++ version of libOpencOR,
    //          our native module gets that canonical path for us. With the WASM version of libOpenCOR, we do the same
    //          as our native module, i.e. we create a file, without contents, to get its path. If the file is already
    //          managed, then we get it rather than a new file, while if it isn't, then the new file gets unmanaged as
    //          soon as we delete our handle to it.
    // Note #2: canonicalising a path may fail, in which case we use the path as is. Indeed, a canonical path is used
    //          to determine whether two paths refer to the same file and by our main process to identify a file (e.g.,
    //          in our list of recent files, see MainWindow.ts), so it must not prevent a file from being opened (which
    //          will then fail and get reported as such) or a file tab from being found.

    try {
      if (cppVersion()) {
        return _cppLocApi.fileManagerCanonicalPath(path);
      }

      const wasmFile = new _wasmLocApi.File(path);

      try {
        return wasmFile.path;
      } finally {
        wasmFile.delete();
      }
    } catch (error: unknown) {
      console.warn(`OpenCOR: failed to canonicalise path (${path}):`, common.formatError(error));

      return path;
    }
  }

  file(path: string): File | null {
    // Note: the file we are after is already managed, so we just wrap it rather than create (and therefore own) it.

    if (cppVersion()) {
      return _cppLocApi.fileManagerHasFile(path) ? new File(path, undefined, {}) : null;
    }

    // Note #1: libOpenCOR's file manager canonicalises the given path in the same way as libOpenCOR does when creating
    //          a file (see canonicalPath()), so we can retrieve a file using any of its paths.
    // Note #2: our File object takes ownership of the WASM file handle.

    const wasmFile = this.fileManager().fileFromFileNameOrUrl(path);

    return wasmFile ? new File(path, undefined, { wasmFile }) : null;
  }

  unmanage(path: string): void {
    if (cppVersion()) {
      _cppLocApi.fileManagerUnmanage(path);
    } else {
      // Note: same as in file() above, except that we must delete the WASM file handle ourselves.

      const fileManager = this.fileManager();
      const wasmFile = fileManager.fileFromFileNameOrUrl(path);

      if (wasmFile) {
        try {
          fileManager.unmanage(wasmFile);
        } finally {
          wasmFile.delete();
        }
      }
    }
  }
}

export const fileManager = FileManager.instance();

// File API.

export enum FileType {
  UNKNOWN_FILE,
  CELLML_FILE,
  SEDML_FILE,
  COMBINE_ARCHIVE,
  IRRETRIEVABLE_FILE
}

// Information about a file that is already managed by libOpenCOR, in which case a File object only wraps it, i.e. it
// doesn't create (and therefore doesn't own) it.
// Note: with the WASM version of libOpenCOR, the File object takes ownership of the given WASM file handle.

export interface ManagedFile {
  wasmFile?: WasmFile;
}

export class File {
  _path: string;
  private _canonicalPath: string | undefined;
  _wasmFile: WasmFile = {} as WasmFile;
  _issues: Issue[] = [];
  private _isOwner = true;
  private _hasWasmFile = false;
  private _released = false;

  constructor(path: string, contents: Uint8Array | undefined = undefined, managedFile?: ManagedFile) {
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
      // Note: if something goes wrong once our native file has been created (e.g., if libOpenCOR throws an exception),
      //       then we must release it ourselves since we are going to throw, i.e. there won't be a File object to
      //       release it (see release()).

      _cppLocApi.fileCreate(path, contents);

      try {
        this._issues = _cppLocApi.fileIssues(path);
      } catch (error: unknown) {
        _cppLocApi.fileManagerUnmanage(path);

        throw error;
      }
    } else if (contents) {
      // Note: same as above, but for our WASM file.

      this._wasmFile = vue.markRaw(new _wasmLocApi.File(path));
      this._hasWasmFile = true;

      try {
        this._wasmFile.setContents(contents);

        this._issues = wasmIssuesToIssues(this._wasmFile.issues);
      } catch (error: unknown) {
        this._wasmFile.delete();

        throw error;
      }
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

  type(): FileType {
    return cppVersion() ? _cppLocApi.fileType(this._path) : this._wasmFile.type.value;
  }

  path(): string {
    return this._path;
  }

  canonicalPath(): string {
    this._canonicalPath ??= fileManager.canonicalPath(this._path);

    return this._canonicalPath;
  }

  issues(): Issue[] {
    return this._issues;
  }

  contents(): Uint8Array {
    return cppVersion() ? _cppLocApi.fileContents(this._path) : this._wasmFile.contents();
  }

  document(): SedDocument {
    return new SedDocument(this._path, this._wasmFile, this._issues);
  }

  uiJson(): UiJson | undefined {
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

    return normaliseUiJson(res as UiJson);
  }
}
