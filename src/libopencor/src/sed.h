#pragma once

#include <napi.h>

// SedDocument API.

void sedDocumentCreate(const Napi::CallbackInfo &pInfo);
void sedDocumentInstantiate(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentIssues(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentModelCount(const Napi::CallbackInfo &pInfo);
void sedDocumentModelRemoveAllChanges(const Napi::CallbackInfo &pInfo);
void sedDocumentModelAddChange(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationCount(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationType(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationOneStepStep(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationUniformTimeCourseInitialTime(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationUniformTimeCourseOutputStartTime(const Napi::CallbackInfo &pInfo);
void sedDocumentSimulationUniformTimeCourseSetOutputStartTime(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationUniformTimeCourseOutputEndTime(const Napi::CallbackInfo &pInfo);
void sedDocumentSimulationUniformTimeCourseSetOutputEndTime(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationUniformTimeCourseNumberOfSteps(const Napi::CallbackInfo &pInfo);
void sedDocumentSimulationUniformTimeCourseSetNumberOfSteps(const Napi::CallbackInfo &pInfo);

// SedInstance API.

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
napi_value sedInstanceTaskAlgebraicCount(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskAlgebraicName(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskAlgebraicUnit(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskAlgebraic(const Napi::CallbackInfo &pInfo);
