import { electronApi } from './electronApi'
import * as locApi from './libopencor/locApi'

// Some file-related methods.

export function isRemoteFilePath(filePath: string): boolean {
  return filePath.startsWith('http://') || filePath.startsWith('https://')
}

export function filePath(fileOrFilePath: string | File): string {
  return fileOrFilePath instanceof File
    ? electronApi !== undefined
      ? electronApi.filePath(fileOrFilePath)
      : fileOrFilePath.name
    : fileOrFilePath
}

export function file(fileOrFilePath: string | File): Promise<locApi.File> {
  if (typeof fileOrFilePath === 'string') {
    if (isRemoteFilePath(fileOrFilePath)) {
      return new Promise((resolve, reject) => {
        fetch(`https://corsproxy.io/?url=${fileOrFilePath}`)
          .then((response) => {
            if (response.ok) {
              return response.arrayBuffer()
            }

            throw new Error(`The server responded with a status of ${String(response.status)}.`)
          })
          .then((arrayBuffer) => {
            const fileContents = new Uint8Array(arrayBuffer)

            resolve(new locApi.File(filePath(fileOrFilePath), fileContents))
          })
          .catch((error: unknown) => {
            reject(error instanceof Error ? error : new Error(String(error)))
          })
      })
    }

    return new Promise((resolve, reject) => {
      if (electronApi !== undefined) {
        resolve(new locApi.File(filePath(fileOrFilePath)))
      } else {
        reject(new Error('Local files cannot be opened.'))
      }
    })
  }

  return new Promise((resolve, reject) => {
    fileOrFilePath
      .arrayBuffer()
      .then((arrayBuffer) => {
        const fileContents = new Uint8Array(arrayBuffer)

        resolve(new locApi.File(filePath(fileOrFilePath), fileContents))
      })
      .catch((error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)))
      })
  })
}

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
  type: ESimulationDataInfoType
  index: number
}

export function simulationDataInfo(instanceTask: locApi.SedInstanceTask, name: string): ISimulationDataInfo {
  if (name === '') {
    return {
      type: ESimulationDataInfoType.UNKNOWN,
      index: -1
    }
  }

  if (name === instanceTask.voiName()) {
    return {
      type: ESimulationDataInfoType.VOI,
      index: -1
    }
  }

  for (let i = 0; i < instanceTask.stateCount(); i++) {
    if (name === instanceTask.stateName(i)) {
      return {
        type: ESimulationDataInfoType.STATE,
        index: i
      }
    }
  }

  for (let i = 0; i < instanceTask.rateCount(); i++) {
    if (name === instanceTask.rateName(i)) {
      return {
        type: ESimulationDataInfoType.RATE,
        index: i
      }
    }
  }

  for (let i = 0; i < instanceTask.constantCount(); i++) {
    if (name === instanceTask.constantName(i)) {
      return {
        type: ESimulationDataInfoType.CONSTANT,
        index: i
      }
    }
  }

  for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
    if (name === instanceTask.computedConstantName(i)) {
      return {
        type: ESimulationDataInfoType.COMPUTED_CONSTANT,
        index: i
      }
    }
  }

  for (let i = 0; i < instanceTask.algebraicCount(); i++) {
    if (name === instanceTask.algebraicName(i)) {
      return {
        type: ESimulationDataInfoType.ALGEBRAIC,
        index: i
      }
    }
  }

  return {
    type: ESimulationDataInfoType.UNKNOWN,
    index: -1
  }
}

// A method to retrieve the simulation data for a given name from an instance task.

export function simulationData(instanceTask: locApi.SedInstanceTask, info: ISimulationDataInfo): number[] {
  switch (info.type) {
    case ESimulationDataInfoType.VOI:
      return instanceTask.voi()
    case ESimulationDataInfoType.STATE:
      return instanceTask.state(info.index)
    case ESimulationDataInfoType.RATE:
      return instanceTask.rate(info.index)
    case ESimulationDataInfoType.CONSTANT:
      return instanceTask.constant(info.index)
    case ESimulationDataInfoType.COMPUTED_CONSTANT:
      return instanceTask.computedConstant(info.index)
    case ESimulationDataInfoType.ALGEBRAIC:
      return instanceTask.algebraic(info.index)
    default:
      return []
  }
}
