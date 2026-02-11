#pragma once

#include <napi.h>

// SedDocument API.

napi_value sedDocumentCreate(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentInstantiate(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentIssues(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentModelCount(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationCount(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationType(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSerialise(const Napi::CallbackInfo &pInfo);

// SedModel API.

napi_value sedModelFilePath(const Napi::CallbackInfo &pInfo);
void sedModelAddChange(const Napi::CallbackInfo &pInfo);
void sedModelRemoveAllChanges(const Napi::CallbackInfo &pInfo);

// SedOneStep API.

napi_value sedOneStepStep(const Napi::CallbackInfo &pInfo);

// SedUniformTimeCourse API.

napi_value sedUniformTimeCourseInitialTime(const Napi::CallbackInfo &pInfo);
void sedUniformTimeCourseSetInitialTime(const Napi::CallbackInfo &pInfo);
napi_value sedUniformTimeCourseOutputStartTime(const Napi::CallbackInfo &pInfo);
void sedUniformTimeCourseSetOutputStartTime(const Napi::CallbackInfo &pInfo);
napi_value sedUniformTimeCourseOutputEndTime(const Napi::CallbackInfo &pInfo);
void sedUniformTimeCourseSetOutputEndTime(const Napi::CallbackInfo &pInfo);
napi_value sedUniformTimeCourseNumberOfSteps(const Napi::CallbackInfo &pInfo);
void sedUniformTimeCourseSetNumberOfSteps(const Napi::CallbackInfo &pInfo);

// SolverCvode API.
// TODO: this is only temporary until we have full support for our different solvers.

napi_value solverCvodeMaximumStep(const Napi::CallbackInfo &pInfo);
void solverCvodeSetMaximumStep(const Napi::CallbackInfo &pInfo);

// SedInstance API.

napi_value sedInstanceHasIssues(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceIssues(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceRun(const Napi::CallbackInfo &pInfo);

// SedInstanceTask API.

napi_value sedInstanceTaskVoiName(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskVoiUnit(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskVoi(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskStateCount(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskStateName(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskStateUnit(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskState(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskRateCount(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskRateName(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskRateUnit(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskRate(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskConstantCount(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskConstantName(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskConstantUnit(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskConstant(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskComputedConstantCount(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskComputedConstantName(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskComputedConstantUnit(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskComputedConstant(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskAlgebraicVariableCount(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskAlgebraicVariableName(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskAlgebraicVariableUnit(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskAlgebraicVariable(const Napi::CallbackInfo &pInfo);
