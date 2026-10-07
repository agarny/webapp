#include "common.h"
#include "file.h"

#include <libopencor>

// FileManager API.

napi_value fileManagerHasFile(const Napi::CallbackInfo &pInfo)
{
    return Napi::Boolean::New(pInfo.Env(), fileManager.file(pInfo[0].ToString().Utf8Value()) != nullptr);
}

void fileManagerUnmanage(const Napi::CallbackInfo &pInfo)
{
    auto filePath = pInfo[0].ToString().Utf8Value();

    for (auto file : fileManager.files()) {
        if (file->path() == filePath) {
            files.erase(filePath);

            fileManager.unmanage(file);

            break;
        }
    }
}

// File API.

napi_value fileContents(const Napi::CallbackInfo &pInfo)
{
    auto file = toFile(pInfo[0]);
    auto res = file->contents();

    return Napi::Buffer<unsigned char>::Copy(pInfo.Env(), res.data(), res.size());
}

void fileCreate(const Napi::CallbackInfo &pInfo)
{
    auto contents = (pInfo[1].Type() == napi_object) ? pInfo[1].As<Napi::Buffer<unsigned char>>() : Napi::Buffer<unsigned char>();
    auto file = libOpenCOR::File::create(pInfo[0].ToString().Utf8Value(), contents.IsEmpty());

    if (!contents.IsEmpty()) {
        file->setContents(std::vector<unsigned char>(contents.Data(), contents.Data() + contents.Length()));
    }

    // Keep track of the file so that it doesn't get garbage collected.

    files[file->path()] = file;
}

napi_value fileIssues(const Napi::CallbackInfo &pInfo)
{
    return issues(pInfo, toFile(pInfo[0])->issues());
}

napi_value fileType(const Napi::CallbackInfo &pInfo)
{
    auto file = toFile(pInfo[0]);

    return Napi::Number::New(pInfo.Env(), static_cast<int>(file->type()));
}

napi_value fileUiJson(const Napi::CallbackInfo &pInfo)
{
    auto file = toFile(pInfo[0]);
    auto uiJson = file->childFile("simulation.json");

    if (uiJson == nullptr) {
        return pInfo.Env().Undefined();
    }

    auto res = uiJson->contents();

    return Napi::Buffer<unsigned char>::Copy(pInfo.Env(), res.data(), res.size());
}
