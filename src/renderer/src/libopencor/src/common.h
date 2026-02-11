#pragma once

#include <libopencor>

#include <napi.h>

extern libOpenCOR::FileManager fileManager;
extern std::map<std::string, libOpenCOR::FilePtr> files;
extern std::map<size_t, libOpenCOR::SedDocumentPtr> sedDocuments;
extern std::map<size_t, libOpenCOR::SedInstancePtr> sedInstances;

libOpenCOR::FilePtr toFile(const Napi::Value &pValue);
libOpenCOR::SedDocumentPtr toSedDocument(size_t pId);
libOpenCOR::SedInstancePtr toSedInstance(size_t pId);
size_t toSizeT(const Napi::Value &pValue);
int32_t toInt32(const Napi::Value &pValue);
double toDouble(const Napi::Value &pValue);
std::string toString(const Napi::Value &pValue);

napi_value issues(const Napi::CallbackInfo &pInfo, libOpenCOR::IssuePtrs pIssues);

napi_value doublesToNapiFloat64Array(const Napi::Env &pEnv, const std::vector<double> &pDoubles);
