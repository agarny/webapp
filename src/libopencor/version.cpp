#include "version.h"

#include <libopencor>

Napi::String version(const Napi::CallbackInfo &pInfo)
{
    return Napi::String::New(pInfo.Env(), libOpenCOR::versionString());
}
