import type { IOpenCORSimulationDataValue } from '../../index';

import * as locApi from '../libopencor/locApi';

import * as common from './common';
import * as dependencies from './dependencies';
import { electronApi } from './electronApi';

// Some file-related methods.

export interface IDataUriInfo {
  res: boolean;
  fileName?: string;
  data?: Uint8Array;
  error?: string;
}

const zipDataFromDataUrl = (dataUrl: string | Uint8Array | File, mimeType: string): IDataUriInfo => {
  // Make sure that we have a string data URL.

  if (dataUrl instanceof Uint8Array || dataUrl instanceof File) {
    return {
      res: false
    };
  }

  // Check whether we have a data URL of the given MIME type.

  const prefix = `data:${mimeType};base64,`;
  const res = dataUrl.startsWith(`#${prefix}`) || dataUrl.startsWith(prefix);

  if (!res) {
    return {
      res: false
    };
  }

  let decodedData: string;

  try {
    decodedData = atob(dataUrl.slice(prefix.length + (dataUrl.startsWith('#') ? 1 : 0)));
  } catch (error: unknown) {
    return {
      res: true,
      error: `The data URL contains invalid Base64 encoding (${common.formatMessage(common.formatError(error), false)}).`
    };
  }

  const data = Uint8Array.from(decodedData, (c) => c.charCodeAt(0));

  if (
    data.length < 4 ||
    data[0] !== 0x50 || // P
    data[1] !== 0x4b || // K
    data[2] !== 0x03 || // ETX
    data[3] !== 0x04 // EOT
  ) {
    return {
      res: true,
      error: `The data URL of MIME type ${mimeType} does not contain a ZIP file.`
    };
  }

  return {
    res: true,
    data
  };
};

export const zipCellmlDataUrl = async (dataUrl: string | Uint8Array | File): Promise<IDataUriInfo> => {
  // Try to retrieve a CellML file from the given data URL.

  const mimeType = 'application/x.vnd.zip-cellml+zip';
  const zipDataUrl = zipDataFromDataUrl(dataUrl, mimeType);

  if (zipDataUrl.res) {
    if (!zipDataUrl.data) {
      return zipDataUrl;
    }

    // Unzip the data.

    try {
      const jsZip = new dependencies._jsZip();
      const zip = await jsZip.loadAsync(zipDataUrl.data);

      // Make sure that the ZIP file contains only one file.

      const fileNames = Object.keys(zip.files);

      if (fileNames.length !== 1) {
        return {
          res: true,
          error: `The data URL of MIME type ${mimeType} does not contain exactly one (CellML) file.`
        };
      }

      // Retrieve the CellML file.

      const fileName = fileNames[0] as string;
      const file = zip.files[fileName];

      if (!file || file.dir) {
        return {
          res: true,
          error: `The data URL of MIME type ${mimeType} does not contain a valid file.`
        };
      }

      // Return the CellML file data.

      return {
        res: true,
        fileName,
        data: await file.async('uint8array')
      };
    } catch (error: unknown) {
      return {
        res: true,
        error: `The data URL of MIME type ${mimeType} contains an invalid ZIP file (${common.formatMessage(common.formatError(error), false)}).`
      };
    }
  }

  // Not a data URL for a zipped CellML file.

  return {
    res: false
  };
};

export const combineArchiveDataUrl = (dataUrl: string | Uint8Array | File): IDataUriInfo => {
  // Try to retrieve a COMBINE archive from the given data URL.

  const mimeType = 'application/zip';
  const zipDataUrl = zipDataFromDataUrl(dataUrl, mimeType);

  if (zipDataUrl.res) {
    if (!zipDataUrl.data) {
      return zipDataUrl;
    }

    return {
      res: true,
      data: zipDataUrl.data
    };
  }

  // Not a data URL for a COMBINE archive.

  return {
    res: false
  };
};

export const filePath = (
  fileFilePathOrFileContents: string | Uint8Array | File,
  dataUrlFileName: string,
  dataUrlCounter: number
): string => {
  return dataUrlFileName
    ? dataUrlFileName
    : dataUrlCounter
      ? `${common.OMEX_PREFIX}${dataUrlCounter}`
      : fileFilePathOrFileContents instanceof File
        ? electronApi
          ? electronApi.filePath(fileFilePathOrFileContents)
          : fileFilePathOrFileContents.name
        : typeof fileFilePathOrFileContents === 'string'
          ? fileFilePathOrFileContents
          : common.xxh64(fileFilePathOrFileContents);
};

export const file = (
  fileFilePathOrFileContents: string | Uint8Array | File,
  dataUrlFileName: string,
  dataUrlCounter: number
): Promise<locApi.File> => {
  if (typeof fileFilePathOrFileContents === 'string') {
    if (common.isUrl(fileFilePathOrFileContents)) {
      return new Promise((resolve, reject) => {
        // First try fetching the URL through OpenCOR's CORS proxy.

        fetch(common.corsProxyUrl(fileFilePathOrFileContents))
          .then((response) => {
            if (response.ok) {
              return response.arrayBuffer();
            }

            // If the fetch through OpenCOR's CORS proxy failed, then throw an error to trigger the catch block below.

            throw new Error(
              `Failed to fetch the file through OpenCOR's CORS proxy. The server responded with a status of ${response.status}.`,
              {
                cause: response.status
              }
            );
          })
          .catch((error: unknown) => {
            // If the fetch through OpenCOR's CORS proxy failed, then try fetching the URL directly, unless the error
            // was a TypeError or an HTTP 403 or 404 error.

            if (
              !(error instanceof TypeError) &&
              (!(error instanceof Error) || typeof error.cause !== 'number' || ![403, 404].includes(error.cause))
            ) {
              throw new Error(common.formatError(error));
            }

            return fetch(fileFilePathOrFileContents).then((response) => {
              if (response.ok) {
                return response.arrayBuffer();
              }

              throw new Error(
                `Failed to fetch the file directly. The server responded with a status of ${response.status}.`
              );
            });
          })
          .then((arrayBuffer) => {
            const fileContents = new Uint8Array(arrayBuffer);

            resolve(
              new locApi.File(filePath(fileFilePathOrFileContents, dataUrlFileName, dataUrlCounter), fileContents)
            );
          })
          .catch((error: unknown) => {
            reject(new Error(common.formatError(error)));
          });
      });
    }

    return new Promise((resolve, reject) => {
      if (electronApi) {
        resolve(new locApi.File(filePath(fileFilePathOrFileContents, dataUrlFileName, dataUrlCounter)));
      } else {
        reject(new Error('Local files cannot be opened.'));
      }
    });
  }

  if (fileFilePathOrFileContents instanceof Uint8Array) {
    return new Promise((resolve) => {
      resolve(
        new locApi.File(
          filePath(fileFilePathOrFileContents, dataUrlFileName, dataUrlCounter),
          fileFilePathOrFileContents
        )
      );
    });
  }

  return new Promise((resolve, reject) => {
    fileFilePathOrFileContents
      .arrayBuffer()
      .then((arrayBuffer) => {
        const fileContents = new Uint8Array(arrayBuffer);

        resolve(new locApi.File(filePath(fileFilePathOrFileContents, dataUrlFileName, dataUrlCounter), fileContents));
      })
      .catch((error: unknown) => {
        reject(new Error(common.formatError(error)));
      });
  });
};

// A method to retrieve the simulation data information for a given name from an instance task.

export enum ESimulationDataInfoType {
  UNKNOWN,
  VOI,
  STATE,
  RATE,
  CONSTANT,
  COMPUTED_CONSTANT,
  ALGEBRAIC
}

export interface ISimulationDataInfo {
  type: ESimulationDataInfoType;
  index: number;
}

// A sentinel value to represent the absence of simulation data information.

export const NoSimulationDataInfo: ISimulationDataInfo = {
  type: ESimulationDataInfoType.UNKNOWN,
  index: -1
};

// A method to check whether the given simulation data information is the sentinel value.

export const isNoSimulationDataInfo = (info: ISimulationDataInfo): boolean => {
  return info === NoSimulationDataInfo;
};

export const simulationDataInfo = (instanceTask: locApi.SedInstanceTask, name: string): ISimulationDataInfo => {
  if (!name) {
    return NoSimulationDataInfo;
  }

  if (name === instanceTask.voiName()) {
    return {
      type: ESimulationDataInfoType.VOI,
      index: -1
    };
  }

  for (let i = 0; i < instanceTask.stateCount(); i++) {
    if (name === instanceTask.stateName(i)) {
      return {
        type: ESimulationDataInfoType.STATE,
        index: i
      };
    }
  }

  for (let i = 0; i < instanceTask.rateCount(); i++) {
    if (name === instanceTask.rateName(i)) {
      return {
        type: ESimulationDataInfoType.RATE,
        index: i
      };
    }
  }

  for (let i = 0; i < instanceTask.constantCount(); i++) {
    if (name === instanceTask.constantName(i)) {
      return {
        type: ESimulationDataInfoType.CONSTANT,
        index: i
      };
    }
  }

  for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
    if (name === instanceTask.computedConstantName(i)) {
      return {
        type: ESimulationDataInfoType.COMPUTED_CONSTANT,
        index: i
      };
    }
  }

  for (let i = 0; i < instanceTask.algebraicVariableCount(); i++) {
    if (name === instanceTask.algebraicVariableName(i)) {
      return {
        type: ESimulationDataInfoType.ALGEBRAIC,
        index: i
      };
    }
  }

  return NoSimulationDataInfo;
};

// A method to retrieve the simulation data value for a given name from an instance task.

export const simulationDataValue = (
  instanceTask: locApi.SedInstanceTask,
  info: ISimulationDataInfo
): IOpenCORSimulationDataValue => {
  switch (info.type) {
    case ESimulationDataInfoType.VOI:
      return {
        data: instanceTask.voi(),
        unit: instanceTask.voiUnit()
      };
    case ESimulationDataInfoType.STATE:
      return {
        data: instanceTask.state(info.index),
        unit: instanceTask.stateUnit(info.index)
      };
    case ESimulationDataInfoType.RATE:
      return {
        data: instanceTask.rate(info.index),
        unit: instanceTask.rateUnit(info.index)
      };
    case ESimulationDataInfoType.CONSTANT:
      return {
        data: instanceTask.constant(info.index),
        unit: instanceTask.constantUnit(info.index)
      };
    case ESimulationDataInfoType.COMPUTED_CONSTANT:
      return {
        data: instanceTask.computedConstant(info.index),
        unit: instanceTask.computedConstantUnit(info.index)
      };
    case ESimulationDataInfoType.ALGEBRAIC:
      return {
        data: instanceTask.algebraicVariable(info.index),
        unit: instanceTask.algebraicVariableUnit(info.index)
      };
    default:
      return { ...common.UNDEFINED_SIMULATION_DATA_VALUE };
  }
};
