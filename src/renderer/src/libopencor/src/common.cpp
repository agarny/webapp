#include "common.h"

libOpenCOR::FileManager fileManager = libOpenCOR::FileManager::instance();
std::map<std::string, libOpenCOR::FilePtr> files;
std::map<size_t, libOpenCOR::SedDocumentPtr> sedDocuments;
std::map<size_t, libOpenCOR::SedInstancePtr> sedInstances;

// Note: the following functions throw a JavaScript exception (rather than return nullptr) if the file, SED-ML document,
//       or SED-ML instance is unknown (e.g., it has been released). This way, an invalid call results in a JavaScript
//       error rather than in a crash of the renderer process.

libOpenCOR::FilePtr toFile(const Napi::Value &pValue)
{
    auto filePath = pValue.ToString().Utf8Value();
    auto file = fileManager.file(filePath);

    if (file == nullptr) {
        throw Napi::Error::New(pValue.Env(), "Unknown file: " + filePath + ".");
    }

    return file;
}

// Note: we use find() rather than operator[] since the latter would (re)insert an entry for an unknown (e.g., released)
//       ID.

libOpenCOR::SedDocumentPtr toSedDocument(const Napi::Value &pValue)
{
    auto id = toSizeT(pValue);
    auto iter = sedDocuments.find(id);

    if (iter == sedDocuments.end()) {
        throw Napi::Error::New(pValue.Env(), "Unknown SED-ML document: " + std::to_string(id) + ".");
    }

    return iter->second;
}

libOpenCOR::SedInstancePtr toSedInstance(const Napi::Value &pValue)
{
    auto id = toSizeT(pValue);
    auto iter = sedInstances.find(id);

    if (iter == sedInstances.end()) {
        throw Napi::Error::New(pValue.Env(), "Unknown SED-ML instance: " + std::to_string(id) + ".");
    }

    return iter->second;
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

napi_value doublesToNapiFloat64Array(const Napi::Env &pEnv, std::span<const double> pDoubles)
{
    const size_t byteLength = pDoubles.size() * sizeof(double);
    auto buffer = Napi::ArrayBuffer::New(pEnv, byteLength);

    std::memcpy(buffer.Data(), pDoubles.data(), byteLength);

    return Napi::Float64Array::New(pEnv, pDoubles.size(), buffer, 0);
}
