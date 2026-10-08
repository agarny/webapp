#pragma once

#include <napi.h>

// FileManager API.

napi_value fileManagerCanonicalPath(const Napi::CallbackInfo &pInfo);
napi_value fileManagerHasFile(const Napi::CallbackInfo &pInfo);
void fileManagerUnmanage(const Napi::CallbackInfo &pInfo);

// File API.

napi_value fileContents(const Napi::CallbackInfo &pInfo);
void fileCreate(const Napi::CallbackInfo &pInfo);
napi_value fileIssues(const Napi::CallbackInfo &pInfo);
napi_value fileType(const Napi::CallbackInfo &pInfo);
napi_value fileUiJson(const Napi::CallbackInfo &pInfo);
