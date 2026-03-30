import * as common from '../common/common';
import * as dependencies from '../common/dependencies';

import { EIssueType, type IIssue } from './locLoggerApi';

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
  voiExpression?: string;
  voiValues: Float64Array;
}

export interface IUiJsonOutputExternalDataSeries {
  name: string;
  values: Float64Array;
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

export const uiJsonReplacer = (_key: string, value: unknown): unknown => {
  return value instanceof Float64Array ? Array.from(value) : value;
};

export const normaliseUiJson = (uiJson: IUiJson): IUiJson => {
  for (const externalData of uiJson.output.externalData ?? []) {
    if (!(externalData.voiValues instanceof Float64Array)) {
      externalData.voiValues = new Float64Array(externalData.voiValues);
    }

    for (const dataSeries of externalData.dataSeries) {
      if (!(dataSeries.values instanceof Float64Array)) {
        dataSeries.values = new Float64Array(dataSeries.values);
      }
    }
  }

  return uiJson;
};

const uiJsonForSchemaValidation = (uiJson: IUiJson): unknown => {
  if (!uiJson.output.externalData?.length) {
    return uiJson;
  }

  return {
    ...uiJson,
    output: {
      ...uiJson.output,
      externalData: uiJson.output.externalData.map((externalData) => ({
        ...externalData,
        voiValues: Array.from(externalData.voiValues),
        dataSeries: externalData.dataSeries.map((dataSeries) => ({
          ...dataSeries,
          values: Array.from(dataSeries.values)
        }))
      }))
    }
  };
};

export const cleanUiJson = (uiJson: IUiJson): IUiJson => {
  const cleanUiJsonRec = (value: unknown): unknown => {
    if (value === undefined || value === null || (typeof value === 'string' && value === '')) {
      return undefined;
    }

    if (value instanceof Float64Array) {
      return value;
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

interface IValidateUiJsonOptions {
  allModelParameters?: string[];
  editableModelParameters?: string[];
}

const listOfItems = (items: Set<string>): string => {
  if (items.size === 0) {
    return '';
  }

  const list = [...items].map((item) => `'${item}'`);

  if (list.length === 1) {
    return list[0];
  }

  if (list.length === 2) {
    return `${list[0]} or ${list[1]}`;
  }

  return `${list.slice(0, -1).join(', ')}, or ${list[list.length - 1]}`;
};

export const validateUiJson = (uiJson: IUiJson | undefined, options?: IValidateUiJsonOptions): IIssue[] => {
  // Make sure that we have some UI JSON.

  if (!uiJson) {
    return [
      {
        type: EIssueType.WARNING,
        description: 'UI JSON: no UI JSON was provided.'
      }
    ];
  }

  // Clean our UI JSON (in case there were optional values that were not provided and are now empty).

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
          externalData: {
            items: {
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

  const validatorRes = validator.validate(uiJsonForSchemaValidation(uiJson), schema, {
    nestedErrors: true
  });

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

  const allModelParametersSet = new Set(options?.allModelParameters ?? []);
  const editableModelParametersSet = new Set(options?.editableModelParameters ?? []);

  // Make sure that the input information makes sense.

  const res: IIssue[] = [];
  const inputIdUsed: Record<string, boolean> = {};

  for (const input of uiJson.input) {
    if (input.id) {
      if (inputIdUsed[input.id]) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: an input id must be unique ('${input.id}' is used more than once).`
        });
      }

      inputIdUsed[input.id] = true;
    } else {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an input id must not be empty.`
      });
    }

    if (!input.name) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an input name must not be empty.`
      });
    }

    if ('possibleValues' in input) {
      for (const possibleValue of input.possibleValues) {
        if (!possibleValue.name) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an input possible value name must not be empty.`
          });
        }
      }

      const possibleValues = input.possibleValues.map((possibleValue) => {
        return possibleValue.value;
      });
      const listOfPossibleValues = listOfItems(new Set(possibleValues.map((possibleValue) => String(possibleValue))));
      const usedPossibleValues: Record<number, boolean> = {};

      for (const possibleValue of possibleValues) {
        if (usedPossibleValues[possibleValue]) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an input possible value must have a unique value ('${possibleValue}' is used more than once).`
          });
        }

        usedPossibleValues[possibleValue] = true;
      }

      if (!possibleValues.includes(input.defaultValue)) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: an input default value must be one of the possible values ('${input.defaultValue}' is not one of ${listOfPossibleValues}).`
        });
      }
    }

    if (isScalarInput(input)) {
      if (input.minimumValue >= input.maximumValue) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: an input minimum value must be lower than the maximum value (${input.minimumValue} is not lower than ${input.maximumValue}).`
        });
      }

      if (input.defaultValue < input.minimumValue || input.defaultValue > input.maximumValue) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: an input default value must be greater or equal than the minimum value and lower or equal than the maximum value (${input.defaultValue} is not between ${input.minimumValue} and ${input.maximumValue}).`
        });
      }

      const range = input.maximumValue - input.minimumValue;

      if (input.stepValue !== undefined && input.stepValue !== null) {
        if (input.stepValue <= 0 || input.stepValue > range) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an input step value must be greater than zero and lower or equal than the range value (${input.stepValue} is not between 0 and ${range}).`
          });
        }

        if (!common.isDivisible(range, input.stepValue)) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an input step value must be a factor of the range value (${input.stepValue} is not a factor of ${range}).`
          });
        }
      } else if (!common.isDivisible(range, 1)) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: an input step value must be a factor of the range value (1 is not a factor of ${range}).`
        });
      }
    }

    if (input.visible !== undefined && input.visible !== null && !input.visible) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an input visible must not be empty.`
      });
    }
  }

  // Make sure that the output information makes sense.

  const outputIdUsed: Record<string, boolean> = {};
  const listOfAllModelParameters = listOfItems(allModelParametersSet);

  for (const outputData of uiJson.output.data) {
    if (!outputData.id) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an output data id must not be empty.`
      });
    }

    if (outputIdUsed[outputData.id]) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an output data id must be unique ('${outputData.id}' is used more than once).`
      });
    }

    outputIdUsed[outputData.id] = true;

    if (!outputData.name) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an output data name must not be empty.`
      });
    } else if (allModelParametersSet.size > 0 && !allModelParametersSet.has(outputData.name)) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an output data name must match one of the available options ('${outputData.name}' is not one of ${listOfAllModelParameters}).`
      });
    }
  }

  if (uiJson.output.externalData !== undefined && uiJson.output.externalData !== null) {
    for (const outputExternalData of uiJson.output.externalData) {
      if (outputExternalData.voiExpression) {
        try {
          dependencies._mathJs.parse(outputExternalData.voiExpression);
        } catch (error: unknown) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output external data VOI expression must be valid ('${outputExternalData.voiExpression}' is not: ${common.formatMessage(common.formatError(error), false)}).`
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
            description: `UI JSON: an output external data series name must be unique ('${outputExternalDataSeries.name}' is used more than once).`
          });
        }

        outputExternalDataSeriesNames[outputExternalDataSeries.name] = true;

        if (!outputExternalDataSeries.name) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output external data series name must not be empty.`
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
            description: `UI JSON: an output external data series values length must match the output external data VOI values length (${outputExternalDataSeries.values.length} is not equal to ${outputExternalData.voiValues.length}).`
          });
        }
      }

      const outputExternalDataIds: Record<string, boolean> = {};
      const listOfOutputExternalDataSeriesNames = listOfItems(new Set(Object.keys(outputExternalDataSeriesNames)));

      for (const outputExternalDataEntry of outputExternalData.data) {
        if (!outputExternalDataEntry.id) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output external data id must not be empty.`
          });
        }

        if (outputExternalDataIds[outputExternalDataEntry.id]) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output external data id must be unique ('${outputExternalDataEntry.id}' is used more than once).`
          });
        }

        outputExternalDataIds[outputExternalDataEntry.id] = true;

        if (outputExternalDataEntry.id && outputIdUsed[outputExternalDataEntry.id]) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output external data id must be unique across simulation and external data ('${outputExternalDataEntry.id}' is used more than once).`
          });
        }

        if (outputExternalDataEntry.id) {
          outputIdUsed[outputExternalDataEntry.id] = true;
        }

        if (!outputExternalDataEntry.name) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output external data name must not be empty.`
          });
        }

        if (!outputExternalDataSeriesNames[outputExternalDataEntry.name]) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output external data name must match of one of the available options ('${outputExternalDataEntry.name}' is not one of ${listOfOutputExternalDataSeriesNames}).`
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
    const parsePlotValue = (value: string, axisLabel: 'X value' | 'Y value'): void => {
      if (!value) {
        return;
      }

      try {
        dependencies._mathJs.parse(value);
      } catch (error: unknown) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: an output plot ${axisLabel} must be valid ('${value}' is not: ${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    };

    if (!outputPlot.xValue) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an output plot X value must not be empty.`
      });
    } else {
      parsePlotValue(outputPlot.xValue, 'X value');
    }

    if (!outputPlot.yValue) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: an output plot Y value must not be empty.`
      });
    } else {
      parsePlotValue(outputPlot.yValue, 'Y value');
    }

    if (outputPlot.additionalTraces !== undefined && outputPlot.additionalTraces !== null) {
      for (const additionalTrace of outputPlot.additionalTraces) {
        if (!additionalTrace.xValue) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output plot additional trace X value must not be empty.`
          });
        } else {
          parsePlotValue(additionalTrace.xValue, 'X value');
        }

        if (!additionalTrace.yValue) {
          res.push({
            type: EIssueType.WARNING,
            description: `UI JSON: an output plot additional trace Y value must not be empty.`
          });
        } else {
          parsePlotValue(additionalTrace.yValue, 'Y value');
        }
      }
    }
  }

  // Make sure that the parameters information makes sense.

  const listOfEditableModelParameters = listOfItems(editableModelParametersSet);

  for (const parameter of uiJson.parameters) {
    if (!parameter.name) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: a parameter name must not be empty.`
      });
    } else if (editableModelParametersSet.size > 0 && !editableModelParametersSet.has(parameter.name)) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: a parameter name must match one of the available options ('${parameter.name}' is not one of ${listOfEditableModelParameters}).`
      });
    }

    if (!parameter.value) {
      res.push({
        type: EIssueType.WARNING,
        description: `UI JSON: a parameter value must not be empty.`
      });
    } else {
      try {
        dependencies._mathJs.parse(parameter.value);
      } catch (error: unknown) {
        res.push({
          type: EIssueType.WARNING,
          description: `UI JSON: a parameter value must be valid ('${parameter.value}' is not: ${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    }
  }

  return res;
};
