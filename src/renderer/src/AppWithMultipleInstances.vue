<template>
  <div class="h-screen">
    <Splitter class="h-full" layout="vertical">
      <SplitterPanel :size="15">
        <OpenCOR />
      </SplitterPanel>
      <SplitterPanel :size="50">
        <Splitter>
          <SplitterPanel :size="15">
            <OpenCOR
              omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/lorenz.cellml"
            />
          </SplitterPanel>
          <SplitterPanel :size="50">
            <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/lorenz.omex" />
          </SplitterPanel>
          <SplitterPanel :size="35">
            <OpenCOR
              omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex"
            />
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
      <SplitterPanel :size="35">
        <OpenCOR
          omex="https://models.physiomeproject.org/workspace/b7c/rawfile/e0ae8d2d56aaaa091e23e1ee7e84cacbda1dfb6b/lorenz.omex"
        />
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<style>
  @import "tailwindcss/preflight.css" layer(base);
</style>
