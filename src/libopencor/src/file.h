#pragma once

#include <napi.h>

// FileManager API.

void fileManagerUnmanage(const Napi::CallbackInfo &pInfo);

// File API.

napi_value fileContents(const Napi::CallbackInfo &pInfo);
void fileCreate(const Napi::CallbackInfo &pInfo);
napi_value fileIssues(const Napi::CallbackInfo &pInfo);
napi_value fileType(const Napi::CallbackInfo &pInfo);
