#include "common.h"

libOpenCOR::FileManager fileManager = libOpenCOR::FileManager::instance();
std::map<std::string, libOpenCOR::FilePtr> files;
std::map<size_t, libOpenCOR::SedDocumentPtr> sedDocuments;
std::map<size_t, libOpenCOR::SedInstancePtr> sedInstances;

libOpenCOR::FilePtr toFile(const Napi::Value &pValue)
{
    return fileManager.file(pValue.ToString().Utf8Value());
}

libOpenCOR::SedDocumentPtr toSedDocument(size_t pId)
{
    return sedDocuments[pId];
}

libOpenCOR::SedInstancePtr toSedInstance(size_t pId)
{
    return sedInstances[pId];
}

size_t toSizeT(const Napi::Value &pValue)
{
    return static_cast<size_t>(pValue.As<Napi::Number>().Uint32Value());
}

int32_t toInt32(const Napi::Value &pValue)
{
    return pValue.As<Napi::Number>().Int32Value();
}

double toDouble(const Napi::Value &pValue)
{
    return pValue.As<Napi::Number>().DoubleValue();
}

std::string toString(const Napi::Value &pValue)
{
    return pValue.As<Napi::String>().Utf8Value();
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

napi_value doublesToNapiFloat64Array(const Napi::Env &pEnv, const std::vector<double> &pDoubles)
{
    const size_t byteLength = pDoubles.size() * sizeof(double);
    auto buffer = Napi::ArrayBuffer::New(pEnv, byteLength);

    std::memcpy(buffer.Data(), pDoubles.data(), byteLength);

    return Napi::Float64Array::New(pEnv, pDoubles.size(), buffer, 0);
}
