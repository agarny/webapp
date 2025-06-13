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

void sedDocumentModelRemoveAllChanges(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto model = sedDocument->model(valueToInt32(pInfo[1]));

    model->removeAllChanges();
}

void sedDocumentModelAddChange(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto model = sedDocument->model(valueToInt32(pInfo[1]));
    auto changeAttribute = libOpenCOR::SedChangeAttribute::create(valueToString(pInfo[2]),
                                                                  valueToString(pInfo[3]),
                                                                  valueToString(pInfo[4]));

    model->addChange(changeAttribute);
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

void sedDocumentSimulationUniformTimeCourseSetOutputStartTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    uniformTimeCourse->setOutputStartTime(valueToDouble(pInfo[2]));
}

napi_value sedDocumentSimulationUniformTimeCourseOutputEndTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->outputEndTime());
}

void sedDocumentSimulationUniformTimeCourseSetOutputEndTime(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    uniformTimeCourse->setOutputEndTime(valueToDouble(pInfo[2]));
}

napi_value sedDocumentSimulationUniformTimeCourseNumberOfSteps(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->numberOfSteps());
}

void sedDocumentSimulationUniformTimeCourseSetNumberOfSteps(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = valueToSedDocument(pInfo[0]);
    auto simulation = sedDocument->simulation(valueToInt32(pInfo[1]));
    auto uniformTimeCourse = std::dynamic_pointer_cast<libOpenCOR::SedUniformTimeCourse>(simulation);

    uniformTimeCourse->setNumberOfSteps(valueToInt32(pInfo[2]));
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

napi_value sedInstanceTaskVoiName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->voiName());
}

napi_value sedInstanceTaskVoiUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->voiUnit());
}

napi_value sedInstanceTaskVoi(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->voi());
}

napi_value sedInstanceTaskStateCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->stateCount());
}

napi_value sedInstanceTaskStateName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->stateName(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskStateUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->stateUnit(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskState(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->state(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskRateCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->rateCount());
}

napi_value sedInstanceTaskRateName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->rateName(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskRateUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->rateUnit(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskRate(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->rate(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskConstantCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->constantCount());
}

napi_value sedInstanceTaskConstantName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->constantName(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskConstantUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->constantUnit(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskConstant(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->constant(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskComputedConstantCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->computedConstantCount());
}

napi_value sedInstanceTaskComputedConstantName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->computedConstantName(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskComputedConstantUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->computedConstantUnit(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskComputedConstant(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->computedConstant(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskAlgebraicCount(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::Number::New(pInfo.Env(), task->algebraicCount());
}

napi_value sedInstanceTaskAlgebraicName(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->algebraicName(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskAlgebraicUnit(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return Napi::String::New(pInfo.Env(), task->algebraicUnit(valueToInt32(pInfo[2])));
}

napi_value sedInstanceTaskAlgebraic(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = valueToSedInstance(pInfo[0]);
    auto task = sedInstance->task(valueToInt32(pInfo[1]));

    return doublesToNapiArray(pInfo.Env(), task->algebraic(valueToInt32(pInfo[2])));
}
