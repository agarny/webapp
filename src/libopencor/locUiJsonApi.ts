import * as jsonschema from 'jsonschema'

import * as common from '../renderer/src/common'

import { IssueType, type IIssue } from './locLoggerApi'

export interface IUiJson {
  input: IUiJsonInput[]
  output: IUiJsonOutput
  parameters?: IUiJsonParameter[]
}

interface IUiJsonInput {
  id?: string
  name: string
  defaultValue: number
  possibleValues?: IUiJsonInputPossibleValue[]
  minimumValue?: number
  maximumValue?: number
  stepValue?: number
  visible?: string
}

interface IUiJsonInputPossibleValue {
  name: string
  value: number
}

interface IUiJsonOutput {
  data: IUiJsonOutputData[]
  plots: IUiJsonOutputPlot[]
}

interface IUiJsonOutputData {
  id: string
  name: string
}

interface IUiJsonOutputPlot {
  xAxisTitle: string
  xValue: string
  yAxisTitle: string
  yValue: string
}

interface IUiJsonParameter {
  name: string
  value: string
}

export function uiJsonIssues(uiJson: IUiJson | undefined): IIssue[] {
  // Make sure that we have some UI JSON.

  if (uiJson === undefined) {
    return [
      {
        type: IssueType.Warning,
        description: 'UI JSON: no UI JSON was provided.'
      }
    ]
  }

  // Check the UI JSON against our schema.

  const validator = new jsonschema.Validator()
  const schema: jsonschema.Schema = {
    additionalProperties: false,
    properties: {
      input: {
        items: {
          oneOf: [
            {
              additionalProperties: false,
              properties: {
                defaultValue: {
                  required: true,
                  type: 'number'
                },
                id: {
                  type: 'string'
                },
                name: {
                  required: true,
                  type: 'string'
                },
                possibleValues: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      name: {
                        required: true,
                        type: 'string'
                      },
                      value: {
                        required: true,
                        type: 'number'
                      }
                    },
                    type: 'object'
                  },
                  minItems: 1,
                  required: true,
                  type: 'array'
                },
                visible: {
                  type: 'string'
                }
              }
            },
            {
              additionalProperties: false,
              properties: {
                defaultValue: {
                  required: true,
                  type: 'number'
                },
                id: {
                  type: 'string'
                },
                maximumValue: {
                  required: true,
                  type: 'number'
                },
                minimumValue: {
                  required: true,
                  type: 'number'
                },
                name: {
                  required: true,
                  type: 'string'
                },
                stepValue: {
                  type: 'number'
                },
                visible: {
                  type: 'string'
                }
              }
            }
          ],
          type: 'object'
        },
        minItems: 1,
        required: true,
        type: 'array'
      },
      output: {
        additionalProperties: false,
        minItems: 1,
        properties: {
          data: {
            items: {
              additionalProperties: false,
              properties: {
                id: {
                  required: true,
                  type: 'string'
                },
                name: {
                  required: true,
                  type: 'string'
                }
              },
              type: 'object'
            },
            minItems: 1,
            required: true,
            type: 'array'
          },
          plots: {
            items: {
              additionalProperties: false,
              properties: {
                xAxisTitle: {
                  required: true,
                  type: 'string'
                },
                xValue: {
                  required: true,
                  type: 'string'
                },
                yAxisTitle: {
                  required: true,
                  type: 'string'
                },
                yValue: {
                  required: true,
                  type: 'string'
                }
              },
              type: 'object'
            },
            maxItems: 9,
            minItems: 1,
            required: true,
            type: 'array'
          }
        },
        required: true,
        type: 'object'
      },
      parameters: {
        items: {
          additionalProperties: false,
          properties: {
            name: {
              required: true,
              type: 'string'
            },
            value: {
              required: true,
              type: 'string'
            }
          },
          type: 'object'
        },
        type: 'array'
      }
    },
    type: 'object'
  }

  const validatorRes = validator.validate(uiJson, schema, { nestedErrors: true })

  if (!validatorRes.valid) {
    const res: IIssue[] = []

    for (const issue of validatorRes.toString().split('\n')) {
      if (issue !== '') {
        res.push({
          type: IssueType.Warning,
          description: 'UI JSON: ' + common.formatIssue(issue)
        })
      }
    }

    return res
  }

  // Make sure that the input information makes sense.

  const res: IIssue[] = []
  const inputIdUsed: Record<string, boolean> = {}

  for (const input of uiJson.input) {
    if (input.id !== undefined) {
      if (input.id === '') {
        res.push({
          type: IssueType.Warning,
          description: 'UI JSON: an input id must not be empty.'
        })
      }

      if (inputIdUsed[input.id]) {
        res.push({
          type: IssueType.Warning,
          description: 'UI JSON: an input id must be unique (' + input.id + ' is used more than once).'
        })
      }

      inputIdUsed[input.id] = true
    }

    if (input.name === '') {
      res.push({
        type: IssueType.Warning,
        description: 'UI JSON: an input name must not be empty.'
      })
    }

    if (input.possibleValues !== undefined) {
      for (const possibleValue of input.possibleValues) {
        if (possibleValue.name === '') {
          res.push({
            type: IssueType.Warning,
            description: 'UI JSON: an input possible value name must not be empty.'
          })
        }
      }

      const values = input.possibleValues.map((value) => {
        return value.value
      })
      const valueUsed: Record<number, boolean> = {}

      for (const value of values) {
        if (valueUsed[value]) {
          res.push({
            type: IssueType.Warning,
            description:
              'UI JSON: an input possible value must have a unique value (' +
              value.toString() +
              ' is used more than once).'
          })
        }

        valueUsed[value] = true
      }

      if (!values.includes(input.defaultValue)) {
        res.push({
          type: IssueType.Warning,
          description:
            'UI JSON: an input default value (' +
            input.defaultValue.toString() +
            ') must be one of the possible values (' +
            values.join(', ') +
            ').'
        })
      }
    }

    if (input.minimumValue !== undefined && input.maximumValue !== undefined) {
      if (input.minimumValue >= input.maximumValue) {
        res.push({
          type: IssueType.Warning,
          description:
            'UI JSON: an input minimum value (' +
            input.minimumValue.toString() +
            ') must be lower than the maximum value (' +
            input.maximumValue.toString() +
            ').'
        })
      }

      if (input.defaultValue < input.minimumValue || input.defaultValue > input.maximumValue) {
        res.push({
          type: IssueType.Warning,
          description:
            'UI JSON: an input default value (' +
            input.defaultValue.toString() +
            ') must be greater or equal than the minimum value (' +
            input.minimumValue.toString() +
            ') and lower or equal than the maximum value (' +
            input.maximumValue.toString() +
            ').'
        })
      }

      const range = input.maximumValue - input.minimumValue

      if (input.stepValue !== undefined) {
        if (input.stepValue <= 0 || input.stepValue > range) {
          res.push({
            type: IssueType.Warning,
            description:
              'UI JSON: an input step value (' +
              input.stepValue.toString() +
              ') must be greater than zero and lower or equal than the range value (' +
              range.toString() +
              ').'
          })
        }

        if (!Number.isInteger(range / input.stepValue)) {
          res.push({
            type: IssueType.Warning,
            description:
              'UI JSON: an input step value (' +
              input.stepValue.toString() +
              ') must be a factor of the range value (' +
              range.toString() +
              ').'
          })
        }
      } else {
        if (!Number.isInteger(range)) {
          res.push({
            type: IssueType.Warning,
            description:
              'UI JSON: a (default) input step value (1) must be a factor of the range value (' +
              range.toString() +
              ').'
          })
        }
      }
    }

    if (input.visible !== undefined) {
      if (input.visible === '') {
        res.push({
          type: IssueType.Warning,
          description: 'UI JSON: an input visible must not be empty.'
        })
      }
    }
  }

  // Make sure that the output information makes sense.

  const outputIdUsed: Record<string, boolean> = {}

  for (const outputData of uiJson.output.data) {
    if (outputData.id === '') {
      res.push({
        type: IssueType.Warning,
        description: 'UI JSON: an output data id must not be empty.'
      })
    }

    if (outputIdUsed[outputData.id]) {
      res.push({
        type: IssueType.Warning,
        description: 'UI JSON: an output data id must be unique (' + outputData.id + ' is used more than once).'
      })
    }

    outputIdUsed[outputData.id] = true

    if (outputData.name === '') {
      res.push({
        type: IssueType.Warning,
        description: 'UI JSON: an output data name must not be empty.'
      })
    }
  }

  for (const outputPlot of uiJson.output.plots) {
    if (outputPlot.xAxisTitle === '') {
      res.push({
        type: IssueType.Warning,
        description: 'UI JSON: an output plot X axis title must not be empty.'
      })
    }

    if (outputPlot.xValue === '') {
      res.push({
        type: IssueType.Warning,
        description: 'UI JSON: an output plot X value must not be empty.'
      })
    }

    if (outputPlot.yAxisTitle === '') {
      res.push({
        type: IssueType.Warning,
        description: 'UI JSON: an output plot Y axis title must not be empty.'
      })
    }

    if (outputPlot.yValue === '') {
      res.push({
        type: IssueType.Warning,
        description: 'UI JSON: an output plot Y value must not be empty.'
      })
    }
  }

  // Make sure that the parameters information makes sense.

  if (uiJson.parameters !== undefined) {
    for (const parameter of uiJson.parameters) {
      if (parameter.name === '') {
        res.push({
          type: IssueType.Warning,
          description: 'UI JSON: a parameter name must not be empty.'
        })
      }

      if (parameter.value === '') {
        res.push({
          type: IssueType.Warning,
          description: 'UI JSON: a parameter value must not be empty.'
        })
      }
    }
  }

  return res
}
