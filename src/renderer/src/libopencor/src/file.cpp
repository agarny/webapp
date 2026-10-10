#include "common.h"
#include "file.h"

#include <libopencor>

// FileManager API.

napi_value fileManagerCanonicalPath(const Napi::CallbackInfo &pInfo)
{
    // Note: libOpenCOR canonicalises the path of a file when creating it (e.g., it resolves symbolic links and decodes
    //       URLs), so we create a file, without retrieving its contents, to get the canonical version of the given
    //       path. If the file is already managed, then we get it rather than a new file, while if it isn't, then the
    //       new file gets unmanaged as soon as it goes out of scope.

    auto file = libOpenCOR::File::create(pInfo[0].ToString().Utf8Value(), false);

    return Napi::String::New(pInfo.Env(), file->path());
}

napi_value fileManagerHasFile(const Napi::CallbackInfo &pInfo)
{
    return Napi::Boolean::New(pInfo.Env(), managedFile(pInfo[0].ToString().Utf8Value()) != nullptr);
}

void fileManagerUnmanage(const Napi::CallbackInfo &pInfo)
{
    // Note: libOpenCOR canonicalises the path of a file (e.g., it resolves symbolic links and decodes URLs), so the
    //       given file path may differ from the path of the file, hence we retrieve the file through managedFile()
    //       rather than compare file paths ourselves.

    auto file = managedFile(pInfo[0].ToString().Utf8Value());

    if (file != nullptr) {
        files.erase(file->path());

        fileManager.unmanage(file);
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
