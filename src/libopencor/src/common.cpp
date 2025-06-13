#include "common.h"

libOpenCOR::FileManager fileManager = libOpenCOR::FileManager::instance();
std::map<libOpenCOR::FilePtr, FileData> fileData;

libOpenCOR::FilePtr valueToFile(const Napi::Value &pValue)
{
    return fileManager.file(pValue.ToString().Utf8Value());
}

libOpenCOR::SedDocumentPtr valueToSedDocument(const Napi::Value &pValue)
{
    return fileData[valueToFile(pValue)].sedDocument;
}

libOpenCOR::SedInstancePtr valueToSedInstance(const Napi::Value &pValue)
{
    return fileData[valueToFile(pValue)].sedInstance;
}

int32_t valueToInt32(const Napi::Value &pValue)
{
    return pValue.As<Napi::Number>().Int32Value();
}

double valueToDouble(const Napi::Value &pValue)
{
    return pValue.As<Napi::Number>().DoubleValue();
}

std::string valueToString(const Napi::Value &pValue)
{
    return pValue.As<Napi::String>().Utf8Value();
}

void untrackFileData(libOpenCOR::FilePtr pFile)
{
    fileData.erase(pFile);
}

napi_value issues(const Napi::CallbackInfo &pInfo, libOpenCOR::IssuePtrs pIssues)
{
    auto env = pInfo.Env();
    auto res = Napi::Array::New(env);

    for (const auto &issue : pIssues) {
        auto object = Napi::Object::New(env);

        object.Set("type", Napi::Number::New(env, static_cast<int>(issue->type())));
        object.Set("description", Napi::String::New(env, issue->description()));

        res.Set(res.Length(), object);
    }

    return res;
}

napi_value doublesToNapiArray(const Napi::Env &pEnv, const std::vector<double> &pDoubles)
{
    auto array = Napi::Array::New(pEnv, pDoubles.size());

    for (size_t i = 0; i < pDoubles.size(); ++i) {
        array[i] = Napi::Number::New(pEnv, pDoubles[i]);
    }

    return array;
}
