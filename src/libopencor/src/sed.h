#pragma once

#include <napi.h>

// SedDocument API.

void sedDocumentCreate(const Napi::CallbackInfo &pInfo);
void sedDocumentInstantiate(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentIssues(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentModelCount(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationCount(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationType(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationOneStepStep(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationUniformTimeCourseInitialTime(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationUniformTimeCourseOutputStartTime(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationUniformTimeCourseOutputEndTime(const Napi::CallbackInfo &pInfo);
napi_value sedDocumentSimulationUniformTimeCourseNumberOfSteps(const Napi::CallbackInfo &pInfo);

// SedInstance API.

napi_value sedInstanceIssues(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceRun(const Napi::CallbackInfo &pInfo);

// SedInstanceTask API.

napi_value sedInstanceTaskVoiUnit(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskVoi(const Napi::CallbackInfo &pInfo);
napi_value sedInstanceTaskState(const Napi::CallbackInfo &pInfo);
