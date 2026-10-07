#include "common.h"
#include "sed.h"

#include <libopencor>

namespace {

// Note: the following functions throw a JavaScript exception (rather than return nullptr) if the SED-ML model, SED-ML
//       simulation, or SED-ML instance task is unknown. This way, an invalid call results in a JavaScript error rather
//       than in a crash of the renderer process.

libOpenCOR::SedModelPtr toSedModel(const Napi::CallbackInfo &pInfo)
{
    auto model = toSedDocument(pInfo[0])->model(toSizeT(pInfo[1]));

    if (model == nullptr) {
        throw Napi::Error::New(pInfo.Env(), "Unknown SED-ML model.");
    }

    return model;
}

template<typename T>
std::shared_ptr<T> toSedSimulation(const Napi::CallbackInfo &pInfo)
{
    auto simulation = std::dynamic_pointer_cast<T>(toSedDocument(pInfo[0])->simulation(toSizeT(pInfo[1])));

    if (simulation == nullptr) {
        throw Napi::Error::New(pInfo.Env(), "Unknown or unexpected SED-ML simulation.");
    }

    return simulation;
}

libOpenCOR::SedInstanceTaskPtr toSedInstanceTask(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstance(pInfo[0])->task(toSizeT(pInfo[1]));

    if (task == nullptr) {
        throw Napi::Error::New(pInfo.Env(), "Unknown SED-ML instance task.");
    }

    return task;
}

// Retrieve the first values of the given values.
// Note: the number of values is optional and allows us to retrieve only the values that have been computed so far (e.g.,
//       while a simulation is running), thus avoiding the copy of values that are not needed.

std::span<const double> firstValues(std::span<const double> pValues, const Napi::Value &pCount)
{
    if (!pCount.IsNumber()) {
        return pValues;
    }

    return pValues.first(std::min(toSizeT(pCount), pValues.size()));
}

} // namespace

// SedDocument API.

napi_value sedDocumentCreate(const Napi::CallbackInfo &pInfo)
{
    static size_t documentId {std::numeric_limits<std::size_t>::max()};

    auto id = ++documentId;
    auto file = toFile(pInfo[0]);
    auto sedDocument = libOpenCOR::SedDocument::create(file);

    sedDocuments[id] = sedDocument;

    return Napi::Number::New(pInfo.Env(), static_cast<double>(id));
}

napi_value sedDocumentInstantiate(const Napi::CallbackInfo &pInfo)
{
    static size_t instanceId {std::numeric_limits<std::size_t>::max()};

    auto id = ++instanceId;
    auto sedDocument = toSedDocument(pInfo[0]);
    auto sedInstance = sedDocument->instantiate();

    sedInstances[id] = sedInstance;

    return Napi::Number::New(pInfo.Env(), static_cast<double>(id));
}

void sedDocumentRelease(const Napi::CallbackInfo &pInfo)
{
    sedDocuments.erase(toSizeT(pInfo[0]));
}

napi_value sedDocumentIssues(const Napi::CallbackInfo &pInfo)
{
    return issues(pInfo, toSedDocument(pInfo[0])->issues());
}

napi_value sedDocumentModelCount(const Napi::CallbackInfo &pInfo)
{
    return Napi::Number::New(pInfo.Env(), toSedDocument(pInfo[0])->modelCount());
}

napi_value sedDocumentSimulationCount(const Napi::CallbackInfo &pInfo)
{
    return Napi::Number::New(pInfo.Env(), toSedDocument(pInfo[0])->simulationCount());
}

napi_value sedDocumentSerialise(const Napi::CallbackInfo &pInfo)
{
    auto sedDocument = toSedDocument(pInfo[0]);

    return Napi::String::New(pInfo.Env(), sedDocument->serialise());
}

napi_value sedDocumentSimulationType(const Napi::CallbackInfo &pInfo)
{
    auto simulation = toSedSimulation<libOpenCOR::SedSimulation>(pInfo);

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

// SedModel API.

napi_value sedModelFilePath(const Napi::CallbackInfo &pInfo)
{
    auto file = toSedModel(pInfo)->file();

    if (file == nullptr) {
        throw Napi::Error::New(pInfo.Env(), "The SED-ML model has no file.");
    }

    return Napi::String::New(pInfo.Env(), file->path());
}

void sedModelAddChange(const Napi::CallbackInfo &pInfo)
{
    auto model = toSedModel(pInfo);
    auto changeAttribute = libOpenCOR::SedChangeAttribute::create(toString(pInfo[2]),
                                                                  toString(pInfo[3]),
                                                                  toString(pInfo[4]));

    model->addChange(changeAttribute);
}

void sedModelRemoveAllChanges(const Napi::CallbackInfo &pInfo)
{
    auto model = toSedModel(pInfo);

    model->removeAllChanges();
}

// SedOneStep API.

napi_value sedOneStepStep(const Napi::CallbackInfo &pInfo)
{
    auto oneStep = toSedSimulation<libOpenCOR::SedOneStep>(pInfo);

    return Napi::Number::New(pInfo.Env(), oneStep->step());
}

// SedUniformTimeCourse API.

napi_value sedUniformTimeCourseInitialTime(const Napi::CallbackInfo &pInfo)
{
    auto uniformTimeCourse = toSedSimulation<libOpenCOR::SedUniformTimeCourse>(pInfo);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->initialTime());
}

void sedUniformTimeCourseSetInitialTime(const Napi::CallbackInfo &pInfo)
{
    auto uniformTimeCourse = toSedSimulation<libOpenCOR::SedUniformTimeCourse>(pInfo);

    uniformTimeCourse->setInitialTime(toDouble(pInfo[2]));
}

napi_value sedUniformTimeCourseOutputStartTime(const Napi::CallbackInfo &pInfo)
{
    auto uniformTimeCourse = toSedSimulation<libOpenCOR::SedUniformTimeCourse>(pInfo);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->outputStartTime());
}

void sedUniformTimeCourseSetOutputStartTime(const Napi::CallbackInfo &pInfo)
{
    auto uniformTimeCourse = toSedSimulation<libOpenCOR::SedUniformTimeCourse>(pInfo);

    uniformTimeCourse->setOutputStartTime(toDouble(pInfo[2]));
}

napi_value sedUniformTimeCourseOutputEndTime(const Napi::CallbackInfo &pInfo)
{
    auto uniformTimeCourse = toSedSimulation<libOpenCOR::SedUniformTimeCourse>(pInfo);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->outputEndTime());
}

void sedUniformTimeCourseSetOutputEndTime(const Napi::CallbackInfo &pInfo)
{
    auto uniformTimeCourse = toSedSimulation<libOpenCOR::SedUniformTimeCourse>(pInfo);

    uniformTimeCourse->setOutputEndTime(toDouble(pInfo[2]));
}

napi_value sedUniformTimeCourseNumberOfSteps(const Napi::CallbackInfo &pInfo)
{
    auto uniformTimeCourse = toSedSimulation<libOpenCOR::SedUniformTimeCourse>(pInfo);

    return Napi::Number::New(pInfo.Env(), uniformTimeCourse->numberOfSteps());
}

void sedUniformTimeCourseSetNumberOfSteps(const Napi::CallbackInfo &pInfo)
{
    auto uniformTimeCourse = toSedSimulation<libOpenCOR::SedUniformTimeCourse>(pInfo);

    uniformTimeCourse->setNumberOfSteps(toInt32(pInfo[2]));
}

// SolverCvode API.
// TODO: this is only temporary until we have full support for our different solvers.

namespace {

libOpenCOR::SolverCvodePtr solverCvode(const Napi::CallbackInfo &pInfo)
{
    // Note: the simulation's ODE solver is not necessarily CVODE (e.g., it could be Forward Euler or not set at all),
    //       hence we return nullptr in that case (but we throw a JavaScript exception if the simulation is unknown).

    auto simulation = toSedSimulation<libOpenCOR::SedUniformTimeCourse>(pInfo);

    return std::dynamic_pointer_cast<libOpenCOR::SolverCvode>(simulation->odeSolver());
}

} // namespace

napi_value solverCvodeExists(const Napi::CallbackInfo &pInfo)
{
    return Napi::Boolean::New(pInfo.Env(), solverCvode(pInfo) != nullptr);
}

napi_value solverCvodeMaximumStep(const Napi::CallbackInfo &pInfo)
{
    auto solver = solverCvode(pInfo);

    if (solver == nullptr) {
        return pInfo.Env().Undefined();
    }

    return Napi::Number::New(pInfo.Env(), solver->maximumStep());
}

void solverCvodeSetMaximumStep(const Napi::CallbackInfo &pInfo)
{
    auto solver = solverCvode(pInfo);

    if (solver != nullptr) {
        solver->setMaximumStep(toDouble(pInfo[2]));
    }
}

// SedInstance API.

napi_value sedInstanceHasIssues(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(pInfo[0]);

    return Napi::Boolean::New(pInfo.Env(), sedInstance->hasIssues());
}

napi_value sedInstanceIssues(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(pInfo[0]);

    return issues(pInfo, sedInstance->issues());
}

napi_value sedInstanceStatus(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(pInfo[0]);

    return Napi::Number::New(pInfo.Env(), static_cast<int>(sedInstance->status()));
}

napi_value sedInstanceProgress(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(pInfo[0]);

    return Napi::Number::New(pInfo.Env(), sedInstance->progress());
}

napi_value sedInstanceStartRun(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(pInfo[0]);

    return Napi::Boolean::New(pInfo.Env(), sedInstance->startRun());
}

napi_value sedInstanceWaitForRun(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(pInfo[0]);

    return Napi::Number::New(pInfo.Env(), sedInstance->waitForRun());
}

void sedInstancePauseRun(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(pInfo[0]);

    sedInstance->pauseRun();
}

void sedInstanceResumeRun(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(pInfo[0]);

    sedInstance->resumeRun();
}

void sedInstanceStopRun(const Napi::CallbackInfo &pInfo)
{
    auto sedInstance = toSedInstance(pInfo[0]);

    sedInstance->stopRun();
}

void sedInstanceRelease(const Napi::CallbackInfo &pInfo)
{
    // Note: libOpenCOR waits for a run to finish before deleting an instance, so we stop any run first. Indeed, a
    //       paused run would otherwise never finish (and therefore hang the renderer process) while a running one would
    //       block the renderer process until it finishes.

    auto iter = sedInstances.find(toSizeT(pInfo[0]));

    if (iter != sedInstances.end()) {
        iter->second->stopRun();

        sedInstances.erase(iter);
    }
}

// SedInstanceTask API.

napi_value sedInstanceTaskVoiName(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->voiName());
}

napi_value sedInstanceTaskVoiUnit(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->voiUnit());
}

napi_value sedInstanceTaskVoi(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return doublesToNapiFloat64Array(pInfo.Env(), firstValues(task->voi(), pInfo[2]));
}

napi_value sedInstanceTaskStateCount(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::Number::New(pInfo.Env(), task->stateCount());
}

napi_value sedInstanceTaskStateName(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->stateName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskStateUnit(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->stateUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskState(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return doublesToNapiFloat64Array(pInfo.Env(), firstValues(task->state(toInt32(pInfo[2])), pInfo[3]));
}

napi_value sedInstanceTaskRateCount(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::Number::New(pInfo.Env(), task->rateCount());
}

napi_value sedInstanceTaskRateName(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->rateName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskRateUnit(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->rateUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskRate(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return doublesToNapiFloat64Array(pInfo.Env(), firstValues(task->rate(toInt32(pInfo[2])), pInfo[3]));
}

napi_value sedInstanceTaskConstantCount(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::Number::New(pInfo.Env(), task->constantCount());
}

napi_value sedInstanceTaskConstantName(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->constantName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskConstantUnit(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->constantUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskConstant(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return doublesToNapiFloat64Array(pInfo.Env(), firstValues(task->constant(toInt32(pInfo[2])), pInfo[3]));
}

napi_value sedInstanceTaskComputedConstantCount(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::Number::New(pInfo.Env(), task->computedConstantCount());
}

napi_value sedInstanceTaskComputedConstantName(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->computedConstantName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskComputedConstantUnit(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->computedConstantUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskComputedConstant(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return doublesToNapiFloat64Array(pInfo.Env(), firstValues(task->computedConstant(toInt32(pInfo[2])), pInfo[3]));
}

napi_value sedInstanceTaskAlgebraicVariableCount(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::Number::New(pInfo.Env(), task->algebraicVariableCount());
}

napi_value sedInstanceTaskAlgebraicVariableName(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->algebraicVariableName(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskAlgebraicVariableUnit(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return Napi::String::New(pInfo.Env(), task->algebraicVariableUnit(toInt32(pInfo[2])));
}

napi_value sedInstanceTaskAlgebraicVariable(const Napi::CallbackInfo &pInfo)
{
    auto task = toSedInstanceTask(pInfo);

    return doublesToNapiFloat64Array(pInfo.Env(), firstValues(task->algebraicVariable(toInt32(pInfo[2])), pInfo[3]));
}
