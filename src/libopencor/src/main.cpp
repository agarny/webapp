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

    // SedDocument API.

    pExports.Set(Napi::String::New(pEnv, "sedDocumentCreate"), Napi::Function::New(pEnv, sedDocumentCreate));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentInstantiate"), Napi::Function::New(pEnv, sedDocumentInstantiate));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentIssues"), Napi::Function::New(pEnv, sedDocumentIssues));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentModelCount"), Napi::Function::New(pEnv, sedDocumentModelCount));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationCount"), Napi::Function::New(pEnv, sedDocumentSimulationCount));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationType"), Napi::Function::New(pEnv, sedDocumentSimulationType));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationOneStepStep"), Napi::Function::New(pEnv, sedDocumentSimulationOneStepStep));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseInitialTime"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseInitialTime));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseOutputStartTime"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseOutputStartTime));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseOutputEndTime"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseOutputEndTime));
    pExports.Set(Napi::String::New(pEnv, "sedDocumentSimulationUniformTimeCourseNumberOfSteps"), Napi::Function::New(pEnv, sedDocumentSimulationUniformTimeCourseNumberOfSteps));

    // SedInstance API.

    pExports.Set(Napi::String::New(pEnv, "sedInstanceIssues"), Napi::Function::New(pEnv, sedInstanceIssues));
    pExports.Set(Napi::String::New(pEnv, "sedInstanceRun"), Napi::Function::New(pEnv, sedInstanceRun));

    // SedInstanceTask API.

    pExports.Set(Napi::String::New(pEnv, "sedInstanceTaskVoiUnit"), Napi::Function::New(pEnv, sedInstanceTaskVoiUnit));

    return pExports;
}

NODE_API_MODULE(libOpenCOR, init)
