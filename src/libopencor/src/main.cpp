#include "file.h"
#include "sed.h"
#include "version.h"

Napi::Object init(Napi::Env pEnv, Napi::Object pExports)
{
    // Note: this must be in sync with src/preload/index.ts.

    // Some general methods.

    pExports.Set(Napi::String::New(pEnv, "version"), Napi::Function::New(pEnv, version));

    // FileManager API.

    pExports.Set(Napi::String::New(pEnv, "fileManagerUnmanage"), Napi::Function::New(pEnv, fileManagerUnmanage));

    // File API.

    pExports.Set(Napi::String::New(pEnv, "fileContents"), Napi::Function::New(pEnv, fileContents));
    pExports.Set(Napi::String::New(pEnv, "fileCreate"), Napi::Function::New(pEnv, fileCreate));
    pExports.Set(Napi::String::New(pEnv, "fileIssues"), Napi::Function::New(pEnv, fileIssues));
    pExports.Set(Napi::String::New(pEnv, "fileType"), Napi::Function::New(pEnv, fileType));
    pExports.Set(Napi::String::New(pEnv, "fileUiJson"), Napi::Function::New(pEnv, fileUiJson));

    // SedDocument API.

    pExports.Set(Napi::String::New(pEnv, "sedDocumentCreate"), Napi::Function::New(pEnv, sedDocumentCreate));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentInstantiate"), Napi::Function::New(pEnv, sedDocumentInstantiate));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentIssues"), Napi::Function::New(pEnv, sedDocumentIssues));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentModelCount"), Napi::Function::New(pEnv, sedDocumentModelCount));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentModelRemoveAllChanges"), Napi::Function::New(pEnv, sedDocumentModelRemoveAllChanges));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentModelAddChange"), Napi::Function::New(pEnv, sedDocumentModelAddChange));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationCount"), Napi::Function::New(pEnv, sedDocumentSimulationCount));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationType"), Napi::Function::New(pEnv, sedDocumentSimulationType));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationOneStepStep"), Napi::Function::New(pEnv, sedDocumentSimulationOneStepStep));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseInitialTime"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseInitialTime));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseOutputStartTime"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseOutputStartTime));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseSetOutputStartTime"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseSetOutputStartTime));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseOutputEndTime"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseOutputEndTime));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseSetOutputEndTime"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseSetOutputEndTime));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseNumberOfSteps"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseNumberOfSteps));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseSetNumberOfSteps"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseSetNumberOfSteps));

    // SedInstance API.

    pExports.Set(Napi::String::New(pEnv, "sedInstanceIssues"), Napi::Function::New(pEnv, sedInstanceIssues));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceRun"), Napi::Function::New(pEnv, sedInstanceRun));

    // SedInstanceTask API.

    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskVoiName"), Napi::Function::New(pEnv, sedInstanceTaskVoiName));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskVoiUnit"), Napi::Function::New(pEnv, sedInstanceTaskVoiUnit));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskVoi"), Napi::Function::New(pEnv, sedInstanceTaskVoi));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskStateCount"), Napi::Function::New(pEnv, sedInstanceTaskStateCount));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskStateName"), Napi::Function::New(pEnv, sedInstanceTaskStateName));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskStateUnit"), Napi::Function::New(pEnv, sedInstanceTaskStateUnit));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskState"), Napi::Function::New(pEnv, sedInstanceTaskState));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskRateCount"), Napi::Function::New(pEnv, sedInstanceTaskRateCount));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskRateName"), Napi::Function::New(pEnv, sedInstanceTaskRateName));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskRateUnit"), Napi::Function::New(pEnv, sedInstanceTaskRateUnit));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskRate"), Napi::Function::New(pEnv, sedInstanceTaskRate));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskConstantCount"), Napi::Function::New(pEnv, sedInstanceTaskConstantCount));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskConstantName"), Napi::Function::New(pEnv, sedInstanceTaskConstantName));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskConstantUnit"), Napi::Function::New(pEnv, sedInstanceTaskConstantUnit));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskConstant"), Napi::Function::New(pEnv, sedInstanceTaskConstant));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskComputedConstantCount"), Napi::Function::New(pEnv, sedInstanceTaskComputedConstantCount));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskComputedConstantName"), Napi::Function::New(pEnv, sedInstanceTaskComputedConstantName));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskComputedConstantUnit"), Napi::Function::New(pEnv, sedInstanceTaskComputedConstantUnit));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskComputedConstant"), Napi::Function::New(pEnv, sedInstanceTaskComputedConstant));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskAlgebraicCount"), Napi::Function::New(pEnv, sedInstanceTaskAlgebraicCount));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskAlgebraicName"), Napi::Function::New(pEnv, sedInstanceTaskAlgebraicName));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskAlgebraicUnit"), Napi::Function::New(pEnv, sedInstanceTaskAlgebraicUnit));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskAlgebraic"), Napi::Function::New(pEnv, sedInstanceTaskAlgebraic));

    return pExports;
}

NODE_API_MODULE(libOpenCOR, init)
