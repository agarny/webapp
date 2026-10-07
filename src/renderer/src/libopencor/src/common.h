#pragma once

#include <map>
#include <span>
#include <libopencor>

#include <napi.h>

extern libOpenCOR::FileManager fileManager;
extern std::map<std::string, libOpenCOR::FilePtr> &files;
extern std::map<size_t, libOpenCOR::SedDocumentPtr> &sedDocuments;
extern std::map<size_t, libOpenCOR::SedInstancePtr> &sedInstances;

libOpenCOR::FilePtr toFile(const Napi::Value &pValue);
libOpenCOR::SedDocumentPtr toSedDocument(const Napi::Value &pValue);
libOpenCOR::SedInstancePtr toSedInstance(const Napi::Value &pValue);
size_t toSizeT(const Napi::Value &pValue);
int32_t toInt32(const Napi::Value &pValue);
double toDouble(const Napi::Value &pValue);
std::string toString(const Napi::Value &pValue);

void releaseAll();

napi_value issues(const Napi::CallbackInfo &pInfo, libOpenCOR::IssuePtrs pIssues);

napi_value doublesToNapiFloat64Array(const Napi::Env &pEnv, std::span<const double> pDoubles);
