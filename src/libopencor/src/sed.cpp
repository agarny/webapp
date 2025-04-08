#include "common.h"
#include "sed.h"

#include <libopencor>

// SedDocument API.

void sedDocumentCreate(const Napi::CallbackInfo &pInfo)
{
    auto file = valueToFile(pInfo[0]);
    auto sedDocument = libOpenCOR::SedDocument::create(file);

    fileData[file].sedDocument = sedDocument;
}

void sedDocumentInstantiate(const Napi::CallbackInfo &pInfo)
{
    auto file = valueToFile(pInfo[0]);
    auto sedDocument = valueToSedDocument(pInfo[0]);

    fileData[file].sedInstance = sedDocument->instantiate();
}

napi_value sedDocumentIssues(const Napi::CallbackInfo &pInfo)
{
    return issues(pInfo, valueToSedDocument(pInfo[0])->issues());
}

napi_value sedDocumentModelCount(const Napi::CallbackInfo &pInfo)
{
    return Napi::Number::New(pInfo.Env(), valueToSedDocument(pInfo[0])->modelCount());
}

napi_value sedDocumentSimulationCount(const Napi::CallbackInfo &pInfo)
{
    return Napi::Number::New(pInfo.Env(), valueToSedDocument(pInfo[0])->simulationCount());
}

napi_value sedDocumentSimulationType(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));

    if (std::dynamic_pointer_cast<libOpenCOR::SedAnalysis>(simulation) != nullptr) {
        return Napi::Number::New(pInfo.Env(), 0);
    }

    if (std::dynamic_pointer_cast<libOpenCOR::SedSteadyState>(simulation) != nullptr) {
        return Napi::Number::New(pInfo.Env(), 1);
    }

    if (std::dynamic_pointer_cast<libOpenCOR::SedOneStep>(simulation) != nullptr) {
        return Napi::Number::New(pInfo.Env(), 2);
    }

    return Napi::Number::New(pInfo.Env(), 3); // libOpenCOR::SedUniformTimeCourse.
}

napi_value sedDocumentSimulationOneStepStep(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto oneStep = std::dynamic_pointer_cast<libOpenCOR::SedOneStep>(simulation);

    return Napi::Number::New(pInfo.Env(), oneStep->step());
}

napi_value sedDocumentSimulationUniformTimeCourseInitialTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->initialTime());
}

napi_value sedDocumentSimulationUniformTimeCourseOutputStartTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->outputStartTime());
}

napi_value sedDocumentSimulationUniformTimeCourseOutputEndTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->outputEndTime());
}

napi_value sedDocumentSimulationUniformTimeCourseNumberOfSteps(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->numberOfSteps());
}

// SedInstance API.

napi_value sedInstanceIssues(const Napi::CallbackInfo &pInfo)
{
    return issues(pInfo, valueToSedInstance(pInfo[0])->issues());
}

napi_value sedInstanceRun(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);

    return Napi::Number::New(pInfo.Env(), sedInstance->run());
}

// SedInstanceTask API.

napi_value sedInstanceTaskVoiUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->voiUnit());
}
