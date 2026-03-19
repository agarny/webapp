import * as common from '../common/common.ts';
import * as dependencies from '../common/dependencies.ts';

import { EIssueType, type IIssue } from './locLoggerApi.ts';

export interface IUiJson {
  input: IUiJsonInput[];
  output: IUiJsonOutput;
  parameters: IUiJsonParameter[];
}

export type IUiJsonInput = IUiJsonDiscreteInput | IUiJsonScalarInput;

export interface IUiJsonDiscreteInput {
  defaultValue: number;
  id: string;
  name: string;
  possibleValues: IUiJsonDiscreteInputPossibleValue[];
  visible?: string;
}

export interface IUiJsonDiscreteInputPossibleValue {
  name: string;
  value: number;
}

export interface IUiJsonScalarInput {
  defaultValue: number;
  id: string;
  maximumValue: number;
  minimumValue: number;
  name: string;
  stepValue?: number;
  visible?: string;
}

export interface IUiJsonOutput {
  data: IUiJsonOutputData[];
  externalData?: IUiJsonOutputExternalData[];
  plots: IUiJsonOutputPlot[];
}

export interface IUiJsonOutputData {
  id: string;
  name: string;
}

export interface IUiJsonOutputExternalData {
  data: IUiJsonOutputData[];
  dataSeries: IUiJsonOutputExternalDataSeries[];
  description?: string;
  voiExpression: string;
  voiValues: number[];
}

export interface IUiJsonOutputExternalDataSeries {
  name: string;
  values: number[];
}

export interface IUiJsonOutputPlot {
  xAxisTitle?: string;
  xValue: string;
  yAxisTitle?: string;
  yValue: string;
  name?: string;
  additionalTraces?: IUiJsonOutputPlotAdditionalTrace[];
}

export interface IUiJsonOutputPlotAdditionalTrace {
  xValue: string;
  yValue: string;
  name?: string;
}

export interface IUiJsonParameter {
  name: string;
  value: string;
}

export const isScalarInput = (input: IUiJsonInput): input is IUiJsonScalarInput => {
  return 'maximumValue' in input && 'minimumValue' in input;
};

export const isDiscreteInput = (input: IUiJsonInput): input is IUiJsonDiscreteInput => {
  return 'possibleValues' in input;
};

export const cleanUiJson = (uiJson: IUiJson): IUiJson => {
  const cleanUiJsonRec = (value: unknown): unknown => {
    if (value === undefined || value === null || (typeof value === 'string' && value === '')) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return (value as unknown[]).map(cleanUiJsonRec).filter((v) => v !== undefined);
    }

    if (typeof value === 'object') {
      const object: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const cleaned = cleanUiJsonRec(v);

        if (cleaned !== undefined) {
          object[k] = cleaned as unknown;
        }
      }

      return object;
    }

    return value;
  };

  return cleanUiJsonRec(uiJson) as IUiJson;
};

export const validateUiJson = (uiJson: IUiJson | undefined): IIssue[] => {
  // Make sure that we have some UI JSON.

  if (!uiJson) {
    return [
      {
        type: EIssueType.WARNING,
        description: 'UI JSON: no UI JSON was provided.'
      }
    ];
  }

  // Clean our UI JSON (there were optional values that were not provided and now empty).

  uiJson = cleanUiJson(uiJson);

  // Check the UI JSON against our schema.

  const validator = new dependencies._jsonSchema.Validator();
  const schema: Record<string, unknown> = {
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
                  required: true,
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
                  required: true,
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
            required: true,
            type: 'array'
          },
          externalData: {
            items: {
              additionalProperties: false,
              properties: {
                data: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      id: {
                        type: 'string'
                      },
                      name: {
                        required: true,
                        type: 'string'
                      }
                    },
                    type: 'object'
                  },
                  required: true,
                  type: 'array'
                },
                dataSeries: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      name: {
                        required: true,
                        type: 'string'
                      },
                      values: {
                        items: {
                          required: true,
                          type: 'number'
                        },
                        minItems: 1,
                        required: true,
                        type: 'array'
                      }
                    },
                    type: 'object'
                  },
                  minItems: 1,
                  required: true,
                  type: 'array'
                },
                description: {
                  type: 'string'
                },
                voiExpression: {
                  required: true,
                  type: 'string'
                },
                voiValues: {
                  items: {
                    required: true,
                    type: 'number'
                  },
                  minItems: 1,
                  required: true,
                  type: 'array'
                }
              },
              type: 'object'
            },
            type: 'array'
          },
          plots: {
            items: {
              additionalProperties: false,
              properties: {
                xAxisTitle: {
                  type: 'string'
                },
                xValue: {
                  required: true,
                  type: 'string'
                },
                yAxisTitle: {
                  type: 'string'
                },
                yValue: {
                  required: true,
                  type: 'string'
                },
                name: {
                  type: 'string'
                },
                additionalTraces: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      xValue: {
                        required: true,
                        type: 'string'
                      },
                      yValue: {
                        required: true,
                        type: 'string'
                      },
                      name: {
                        type: 'string'
                      }
                    },
                    type: 'object'
                  },
                  type: 'array'
                }
              },
              type: 'object'
            },
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
        minItems: 1,
        required: true,
        type: 'array'
      }
    },
    type: 'object'
  };

  const validatorRes = validator.validate(uiJson, schema, { nestedErrors: true });

  if (!validatorRes.valid) {
    const res: IIssue[] = [];

    for (const issue of String(validatorRes).split('\n')) {
      if (issue) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: ${common.formatMessage(issue)}`
        });
      }
    }

    return res;
  }

  // Make sure that the input information makes sense.

  const res: IIssue[] = [];
  const inputIdUsed: Record<string, boolean> = {};

  for (const input of uiJson.input) {
    if (input.id) {
      if (inputIdUsed[input.id]) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: an input id must be unique (${input.id} is used more than once).`
        });
      }

      inputIdUsed[input.id] = true;
    } else {
      res.push({
        type: EIssueType.WARNING,
        description: 'UI JSON: an input id must not be empty.'
      });
    }

    if (!input.name) {
      res.push({
        type: EIssueType.WARNING,
        description: 'UI JSON: an input name must not be empty.'
      });
    }

    if ('possibleValues' in input) {
      for (const possibleValue of input.possibleValues) {
        if (!possibleValue.name) {
          res.push({
            type: EIssueType.WARNING,
            description: 'UI JSON: an input possible value name must not be empty.'
          });
        }
      }

      const possibleValues = input.possibleValues.map((possibleValue) => {
        return possibleValue.value;
      });
      const usedPossibleValues: Record<number, boolean> = {};

      for (const possibleValue of possibleValues) {
        if (usedPossibleValues[possibleValue]) {
          res.push({
            type: EIssueType.WARNING,
            description:
              'UI JSON: an input possible value must have a unique value (' +
              String(possibleValue) +
              ' is used more than once).'
          });
        }

        usedPossibleValues[possibleValue] = true;
      }

      if (!possibleValues.includes(input.defaultValue)) {
        res.push({
          type: EIssueType.WARNING,
          description:
            'UI JSON: an input default value (' +
            String(input.defaultValue) +
            ') must be one of the possible values (' +
            possibleValues.join(', ') +
            ').'
        });
      }
    }

    if (isScalarInput(input)) {
      if (input.minimumValue >= input.maximumValue) {
        res.push({
          type: EIssueType.WARNING,
          description:
            'UI JSON: an input minimum value (' +
            String(input.minimumValue) +
            ') must be lower than the maximum value (' +
            String(input.maximumValue) +
            ').'
        });
      }

      if (input.defaultValue < input.minimumValue || input.defaultValue > input.maximumValue) {
        res.push({
          type: EIssueType.WARNING,
          description:
            'UI JSON: an input default value (' +
            String(input.defaultValue) +
            ') must be greater or equal than the minimum value (' +
            String(input.minimumValue) +
            ') and lower or equal than the maximum value (' +
            String(input.maximumValue) +
            ').'
        });
      }

      const range = input.maximumValue - input.minimumValue;

      if (input.stepValue !== undefined && input.stepValue !== null) {
        if (input.stepValue <= 0 || input.stepValue > range) {
          res.push({
            type: EIssueType.WARNING,
            description:
              'UI JSON: an input step value (' +
              String(input.stepValue) +
              ') must be greater than zero and lower or equal than the range value (' +
              String(range) +
              ').'
          });
        }

        if (!common.isDivisible(range, input.stepValue)) {
          res.push({
            type: EIssueType.WARNING,
            description:
              'UI JSON: an input step value (' +
              String(input.stepValue) +
              ') must be a factor of the range value (' +
              String(range) +
              ').'
          });
        }
      } else if (!common.isDivisible(range, 1)) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: a (default) input step value (1) must be a factor of the range value (${String(range)}).`
        });
      }
    }

    if (input.visible !== undefined && input.visible !== null && !input.visible) {
      res.push({
        type: EIssueType.WARNING,
        description: 'UI JSON: an input visible must not be empty.'
      });
    }
  }

  // Make sure that the output information makes sense.

  const outputIdUsed: Record<string, boolean> = {};

  for (const outputData of uiJson.output.data) {
    if (!outputData.id) {
      res.push({
        type: EIssueType.WARNING,
        description: 'UI JSON: an output data id must not be empty.'
      });
    }

    if (outputIdUsed[outputData.id]) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an output data id must be unique (${outputData.id} is used more than once).`
      });
    }

    outputIdUsed[outputData.id] = true;

    if (!outputData.name) {
      res.push({
        type: EIssueType.WARNING,
        description: 'UI JSON: an output data name must not be empty.'
      });
    }
  }

  if (uiJson.output.externalData !== undefined && uiJson.output.externalData !== null) {
    for (const outputExternalData of uiJson.output.externalData) {
      if (!outputExternalData.voiExpression) {
        res.push({
          type: EIssueType.WARNING,
          description: 'UI JSON: an output external data VOI expression must not be empty.'
        });
      } else {
        try {
          dependencies._mathJs.parse(outputExternalData.voiExpression);
        } catch (error: unknown) {
          res.push({
            type: EIssueType.WARNING,
            description:
              'UI JSON: an output external data VOI expression is invalid (' +
              common.formatMessage(common.formatError(error), false) +
              ').'
          });
        }
      }

      if (!outputExternalData.voiValues.length) {
        res.push({
          type: EIssueType.WARNING,
          description: 'UI JSON: an output external data VOI values must not be empty.'
        });
      }

      const outputExternalDataSeriesNames: Record<string, boolean> = {};

      for (const outputExternalDataSeries of outputExternalData.dataSeries) {
        if (outputExternalDataSeriesNames[outputExternalDataSeries.name]) {
          res.push({
            type: EIssueType.WARNING,
            description:
              'UI JSON: an output external data series name must be unique (' +
              outputExternalDataSeries.name +
              ' is used more than once).'
          });
        }

        outputExternalDataSeriesNames[outputExternalDataSeries.name] = true;

        if (!outputExternalDataSeries.name) {
          res.push({
            type: EIssueType.WARNING,
            description: 'UI JSON: an output external data series name must not be empty.'
          });
        }

        if (!outputExternalDataSeries.values.length) {
          res.push({
            type: EIssueType.WARNING,
            description: 'UI JSON: an output external data series values must not be empty.'
          });
        }

        if (outputExternalDataSeries.values.length !== outputExternalData.voiValues.length) {
          res.push({
            type: EIssueType.WARNING,
            description:
              'UI JSON: an output external data series values length (' +
              String(outputExternalDataSeries.values.length) +
              ') must match the VOI values length (' +
              String(outputExternalData.voiValues.length) +
              ').'
          });
        }
      }

      const outputExternalDataIds: Record<string, boolean> = {};

      for (const outputExternalDataEntry of outputExternalData.data) {
        if (!outputExternalDataEntry.id) {
          res.push({
            type: EIssueType.WARNING,
            description: 'UI JSON: an output external data id must not be empty.'
          });
        }

        if (outputExternalDataIds[outputExternalDataEntry.id]) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output external data id must be unique (${outputExternalDataEntry.id} is used more than once).`
          });
        }

        outputExternalDataIds[outputExternalDataEntry.id] = true;

        if (outputExternalDataEntry.id && outputIdUsed[outputExternalDataEntry.id]) {
          res.push({
            type: EIssueType.WARNING,
            description:
              'UI JSON: an output data id must be globally unique across simulation and external data (' +
              outputExternalDataEntry.id +
              ' is used more than once).'
          });
        }

        if (outputExternalDataEntry.id) {
          outputIdUsed[outputExternalDataEntry.id] = true;
        }

        if (!outputExternalDataEntry.name) {
          res.push({
            type: EIssueType.WARNING,
            description: 'UI JSON: an output external data name must not be empty.'
          });
        }

        if (!outputExternalDataSeriesNames[outputExternalDataEntry.name]) {
          res.push({
            type: EIssueType.WARNING,
            description:
              'UI JSON: an output external data name (' +
              outputExternalDataEntry.name +
              ') must match one of the data series names for that external data set.'
          });
        }
      }

      if (!outputExternalData.dataSeries.length) {
        res.push({
          type: EIssueType.WARNING,
          description: 'UI JSON: an output external data series entries must not be empty.'
        });
      }
    }
  }

  for (const outputPlot of uiJson.output.plots) {
    if (!outputPlot.xValue) {
      res.push({
        type: EIssueType.WARNING,
        description: 'UI JSON: an output plot X value must not be empty.'
      });
    }

    if (!outputPlot.yValue) {
      res.push({
        type: EIssueType.WARNING,
        description: 'UI JSON: an output plot Y value must not be empty.'
      });
    }

    if (outputPlot.additionalTraces !== undefined && outputPlot.additionalTraces !== null) {
      for (const additionalTrace of outputPlot.additionalTraces) {
        if (!additionalTrace.xValue) {
          res.push({
            type: EIssueType.WARNING,
            description: 'UI JSON: an output plot additional trace X value must not be empty.'
          });
        }

        if (!additionalTrace.yValue) {
          res.push({
            type: EIssueType.WARNING,
            description: 'UI JSON: an output plot additional trace Y value must not be empty.'
          });
        }
      }
    }
  }

  // Make sure that the parameters information makes sense.

  for (const parameter of uiJson.parameters) {
    if (!parameter.name) {
      res.push({
        type: EIssueType.WARNING,
        description: 'UI JSON: a parameter name must not be empty.'
      });
    }

    if (!parameter.value) {
      res.push({
        type: EIssueType.WARNING,
        description: 'UI JSON: a parameter value must not be empty.'
      });
    }
  }

  return res;
};
