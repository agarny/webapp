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
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationCount"), Napi::Function::New(pEnv, sedDocumentSimulationCount));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationType"), Napi::Function::New(pEnv, sedDocumentSimulationType));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSerialise"), Napi::Function::New(pEnv, sedDocumentSerialise));

    // SedModel API.

    pExports.Set(Napi::String::New(pEnv, "sedModelFilePath"), Napi::Function::New(pEnv, sedModelFilePath));
    pExports.Set(Napi::String::New(pEnv, "sedModelAddChange"), Napi::Function::New(pEnv, sedModelAddChange));
    pExports.Set(Napi::String::New(pEnv, "sedModelRemoveAllChanges"), Napi::Function::New(pEnv, sedModelRemoveAllChanges));

    // SedOneStep API.

    pExports.Set(Napi::String::New(pEnv, "sedOneStepStep"), Napi::Function::New(pEnv, sedOneStepStep));

    // SedUniformTimeCourse API.

    pExports.Set(Napi::String::New(pEnv, "sedUniformTimeCourseInitialTime"), Napi::Function::New(pEnv, sedUniformTimeCourseInitialTime));
    pExports.Set(Napi::String::New(pEnv, "sedUniformTimeCourseSetInitialTime"), Napi::Function::New(pEnv, sedUniformTimeCourseSetInitialTime));
    pExports.Set(Napi::String::New(pEnv, "sedUniformTimeCourseOutputStartTime"), Napi::Function::New(pEnv, sedUniformTimeCourseOutputStartTime));
    pExports.Set(Napi::String::New(pEnv, "sedUniformTimeCourseSetOutputStartTime"), Napi::Function::New(pEnv, sedUniformTimeCourseSetOutputStartTime));
    pExports.Set(Napi::String::New(pEnv, "sedUniformTimeCourseOutputEndTime"), Napi::Function::New(pEnv, sedUniformTimeCourseOutputEndTime));
    pExports.Set(Napi::String::New(pEnv, "sedUniformTimeCourseSetOutputEndTime"), Napi::Function::New(pEnv, sedUniformTimeCourseSetOutputEndTime));
    pExports.Set(Napi::String::New(pEnv, "sedUniformTimeCourseNumberOfSteps"), Napi::Function::New(pEnv, sedUniformTimeCourseNumberOfSteps));
    pExports.Set(Napi::String::New(pEnv, "sedUniformTimeCourseSetNumberOfSteps"), Napi::Function::New(pEnv, sedUniformTimeCourseSetNumberOfSteps));

    // SolverCvode API.
    // TODO: this is only temporary until we have full support for our different solvers.

    pExports.Set(Napi::String::New(pEnv, "solverCvodeMaximumStep"), Napi::Function::New(pEnv, solverCvodeMaximumStep));
    pExports.Set(Napi::String::New(pEnv, "solverCvodeSetMaximumStep"), Napi::Function::New(pEnv, solverCvodeSetMaximumStep));

    // SedInstance API.

    pExports.Set(Napi::String::New(pEnv, "sedInstanceHasIssues"), Napi::Function::New(pEnv, sedInstanceHasIssues));
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
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskAlgebraicVariableCount"), Napi::Function::New(pEnv, sedInstanceTaskAlgebraicVariableCount));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskAlgebraicVariableName"), Napi::Function::New(pEnv, sedInstanceTaskAlgebraicVariableName));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskAlgebraicVariableUnit"), Napi::Function::New(pEnv, sedInstanceTaskAlgebraicVariableUnit));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskAlgebraicVariable"), Napi::Function::New(pEnv, sedInstanceTaskAlgebraicVariable));

    return pExports;
}

NODE_API_MODULE(libOpenCOR, init)
